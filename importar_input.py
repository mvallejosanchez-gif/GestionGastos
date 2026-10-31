from __future__ import annotations

import csv
import hashlib
import json
import re
import sqlite3
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Iterable

import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent
DEFAULT_INPUT_DIR = ROOT_DIR / 'input'
DEFAULT_DB_PATH = ROOT_DIR / 'gastos.db'


def to_db_date(value):
    if value is None or value == '':
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        text = str(value).strip()
        if not text:
            return None
        text = text.replace('T', ' ')
        for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y', '%d/%m/%Y %H:%M:%S', '%Y/%m/%d %H:%M:%S', '%Y/%m/%d'):
            try:
                return datetime.strptime(text, fmt).strftime('%Y-%m-%d %H:%M:%S')
            except ValueError:
                pass
        try:
            return pd.to_datetime(text).strftime('%Y-%m-%d %H:%M:%S')
        except Exception:
            return text

    return dt.strftime('%Y-%m-%d %H:%M:%S')


def to_db_datetime(value):
    return to_db_date(value)


def money_to_cents(value):
    if value in (None, '', 'nan', 'NaN'):
        return 0
    if value is not None and hasattr(value, 'item'):
        try:
            value = value.item()
        except Exception:
            pass
    if value is None:
        return 0
    if isinstance(value, float) and pd.isna(value):
        return 0

    text = str(value).strip()
    if not text or text.lower() in {'nan', 'none'}:
        return 0

    text = text.replace('€', '').replace('$', '').replace(' ', '')
    text = text.replace('(', '-').replace(')', '')
    if text.startswith('+'):
        text = text[1:]

    if ',' in text and '.' in text:
        if text.rfind(',') > text.rfind('.'):
            text = text.replace('.', '').replace(',', '.')
        else:
            text = text.replace(',', '')
    elif ',' in text:
        text = text.replace(',', '.')

    try:
        return int(round(float(text) * 100))
    except Exception:
        return 0


def normalize_text(value):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    text = str(value).strip()
    return text if text else None


def build_unique_key(row: dict) -> str:
    payload = {
        'fuente': normalize_text(row.get('fuente')) or 'DESCONOCIDO',
        'f_valor': normalize_text(row.get('f_valor')) or normalize_text(row.get('fecha')) or '',
        'fecha': normalize_text(row.get('fecha')) or '',
        'concepto': normalize_text(row.get('concepto')) or '',
        'movimiento': normalize_text(row.get('movimiento')) or '',
        'importe_cent': int(row.get('importe_cent') or 0),
        'divisa': normalize_text(row.get('divisa')) or 'EUR',
        'observaciones': normalize_text(row.get('observaciones')) or '',
        'categoria2': normalize_text(row.get('categoria2')) or 'PENDIENTE',
    }
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()


def _normalize_match_text(value) -> str:
    text = normalize_text(value)
    if not text:
        return ''
    try:
        text = text.encode('latin-1').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    return ' '.join(text.casefold().split())


def build_import_match_keys(row: dict) -> set[tuple]:
    importe_cent = row.get('importe_cent')
    if importe_cent is None or pd.isna(importe_cent):
        importe_cent = 0

    date_values = {
        to_db_datetime(normalize_text(row.get(field)))
        for field in ('f_valor', 'fecha')
        if normalize_text(row.get(field))
    }
    text_values = {
        _normalize_match_text(row.get(field))
        for field in ('concepto', 'observaciones')
    } - {''}
    transaction_text = ' '.join(
        _normalize_match_text(row.get(field))
        for field in ('concepto', 'observaciones', 'movimiento')
    )
    if 'interest' in transaction_text or 'interes' in transaction_text:
        text_values.add('__interest_payment__')
    return {
        (
            _normalize_match_text(row.get('fuente')),
            date_value,
            text_value,
            int(importe_cent or 0),
            _normalize_match_text(row.get('divisa')) or 'eur',
        )
        for date_value in date_values
        for text_value in text_values
    }


def existing_import_match_keys(conn: sqlite3.Connection) -> set[tuple]:
    fields = ('fuente', 'f_valor', 'fecha', 'concepto', 'importe_cent', 'divisa', 'observaciones')
    keys = set()
    for row in conn.execute(
        'SELECT fuente, f_valor, fecha, concepto, importe_cent, divisa, observaciones FROM movimientos'
    ):
        keys.update(build_import_match_keys(dict(zip(fields, row))))
    return keys


def find_missing_snapshot_updates(
    conn: sqlite3.Connection,
    rows: Iterable[dict],
    selected_keys: set[str] | None = None,
) -> dict[str, tuple[int, int]]:
    fields = ('id', 'fuente', 'f_valor', 'fecha', 'concepto', 'importe_cent', 'divisa', 'observaciones')
    existing_by_match_key: dict[tuple, set[int]] = {}
    for values in conn.execute(
        '''
        SELECT id, fuente, f_valor, fecha, concepto, importe_cent, divisa, observaciones
        FROM movimientos
        WHERE disponible_cent IS NULL
        '''
    ):
        record = dict(zip(fields, values))
        for match_key in build_import_match_keys(record):
            existing_by_match_key.setdefault(match_key, set()).add(record['id'])

    updates = {}
    for row in rows:
        disponible_cent = row.get('disponible_cent')
        if disponible_cent is None:
            continue
        clave = build_unique_key(row)
        if selected_keys is not None and clave not in selected_keys:
            continue
        match_ids = set()
        for match_key in build_import_match_keys(row):
            match_ids.update(existing_by_match_key.get(match_key, ()))
        if len(match_ids) == 1:
            updates[clave] = (match_ids.pop(), int(disponible_cent))
    return updates


def ensure_catalog(conn: sqlite3.Connection, row: dict):
    categoria2 = normalize_text(row.get('categoria2')) or 'PENDIENTE'
    categoria1 = normalize_text(row.get('categoria1')) or 'PENDIENTE'
    categoria0 = normalize_text(row.get('categoria0')) or 'PENDIENTE'

    conn.execute(
        'INSERT OR IGNORE INTO categorias (categoria2, categoria1, categoria0) VALUES (?, ?, ?)',
        (categoria2, categoria1, categoria0),
    )

    fuente = normalize_text(row.get('fuente'))
    if fuente:
        conn.execute(
            'INSERT OR IGNORE INTO cuentas (fuente, contabilidad2, disponible_cero, ahorro_no_disponible_cent) VALUES (?, ?, 0, 0)',
            (fuente, 'BANCO' if fuente.upper() != 'EFECTIVO' else 'EFECTIVO'),
        )


def insert_rows(conn: sqlite3.Connection, rows: Iterable[dict]) -> dict:
    inserted = 0
    skipped = 0
    for row in rows:
        if not row:
            continue
        row['categoria2'] = normalize_text(row.get('categoria2')) or 'PENDIENTE'
        row['categoria1'] = normalize_text(row.get('categoria1')) or 'PENDIENTE'
        row['categoria0'] = normalize_text(row.get('categoria0')) or 'PENDIENTE'
        ensure_catalog(conn, row)
        clave = build_unique_key(row)
        row['clave'] = clave
        try:
            cursor = conn.execute(
                '''
                INSERT OR IGNORE INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, disponible_cent, divisa2, observaciones, categoria2,
                    comentarios, comentarios2, key_legacy, clave
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    row.get('fuente'),
                    to_db_datetime(row.get('f_valor') or row.get('fecha')),
                    to_db_datetime(row.get('fecha') or row.get('f_valor')),
                    normalize_text(row.get('concepto')),
                    normalize_text(row.get('movimiento')),
                    int(row.get('importe_cent') or 0),
                    normalize_text(row.get('divisa')) or 'EUR',
                    row.get('disponible_cent'),
                    normalize_text(row.get('divisa2')),
                    normalize_text(row.get('observaciones')),
                    normalize_text(row.get('categoria2')) or 'PENDIENTE',
                    normalize_text(row.get('comentarios')),
                    normalize_text(row.get('comentarios2')),
                    normalize_text(row.get('key_legacy')),
                    clave,
                ),
            )
            if cursor.rowcount == 1:
                inserted += 1
            else:
                skipped += 1
        except Exception:
            skipped += 1
    conn.commit()
    return {'inserted': inserted, 'skipped': skipped}


def parse_trade_republic_csv(path: Path):
    rows = []
    csv_path = str(path)
    with open(csv_path, newline='', encoding='utf-8-sig') as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if not row:
                continue
            amount = row.get('amount') or row.get('Amount') or 0
            fee = row.get('fee') or row.get('Fee') or 0
            tax = row.get('tax') or row.get('Tax') or 0
            if amount:
                importe = float(str(amount).replace(',', '.'))
            else:
                shares = float(str(row.get('shares') or 0).replace(',', '.'))
                price = float(str(row.get('price') or 0).replace(',', '.'))
                importe = shares * price
                transaction_type = str(row.get('type') or row.get('Type') or '').upper()
                if transaction_type == 'BUY':
                    importe = -abs(importe)
                elif transaction_type == 'SELL':
                    importe = abs(importe)
            importe += float(str(fee).replace(',', '.')) + float(str(tax).replace(',', '.'))
            rows.append({
                'fuente': 'TRADE REPUBLIC',
                'f_valor': row.get('date') or row.get('Date'),
                'fecha': row.get('date') or row.get('Date'),
                'concepto': row.get('name') or row.get('Name') or row.get('description') or row.get('Description') or 'Trade Republic',
                'movimiento': row.get('type') or row.get('Type') or 'Movimiento',
                'importe_cent': money_to_cents(importe),
                'divisa': row.get('currency') or row.get('Currency') or 'EUR',
                'observaciones': row.get('description') or row.get('Description') or '',
                'categoria2': 'PENDIENTE',
                'categoria1': 'PENDIENTE',
                'categoria0': 'PENDIENTE',
            })
    return rows


def parse_revolut_csv(path: Path):
    rows = []
    df = pd.read_csv(path, encoding='utf-8-sig')
    for _, row in df.iterrows():
        fecha = _row_value(row, ['Fecha de inicio', 'Fecha']) or _row_value(
            row, ['Fecha de finalización', 'Fecha de cierre']
        )
        f_valor = _row_value(
            row, ['Fecha de finalización', 'Fecha de cierre', 'Fecha']
        ) or fecha
        if f_valor is None:
            continue

        importe_cent = money_to_cents(row.get('Importe')) - money_to_cents(row.get('Comisión'))
        rows.append({
            'fuente': 'REVOLUT',
            'f_valor': f_valor,
            'fecha': fecha or f_valor,
            'concepto': row.get('Descripción') or row.get('Description') or 'Revolut',
            'movimiento': row.get('Tipo') or row.get('Type') or 'Movimiento',
            'importe_cent': importe_cent,
            'disponible_cent': money_to_cents(row.get('Saldo')) if pd.notna(row.get('Saldo')) else None,
            'divisa': row.get('Divisa') or row.get('Currency') or 'EUR',
            'observaciones': row.get('Descripción') or row.get('Description') or '',
            'categoria2': 'PENDIENTE',
            'categoria1': 'PENDIENTE',
            'categoria0': 'PENDIENTE',
        })
    return rows


def _read_excel_with_header(path: Path, expected_tokens):
    df = pd.read_excel(path, header=None)
    candidate_index = None
    candidate_score = -1

    for index, row in df.iterrows():
        values = [str(value).strip() for value in row.tolist() if pd.notna(value) and str(value).strip()]
        if not values:
            continue
        normalized = ' '.join(value.lower() for value in values)
        score = sum(1 for token in expected_tokens if token.lower() in normalized)
        if score > candidate_score:
            candidate_index = index
            candidate_score = score

    if candidate_index is None or candidate_score < 2:
        candidate_index = 0
        candidate_score = 0

    header_row = df.iloc[candidate_index].tolist()
    columns = []
    for i, value in enumerate(header_row):
        text = '' if pd.isna(value) else str(value).strip()
        columns.append(text or f'col_{i}')

    data = df.iloc[candidate_index + 1:].copy()
    data.columns = columns
    return data


def _row_value(row, aliases):
    for alias in aliases:
        for key in row.index:
            if isinstance(key, str) and key.strip().lower() == alias.lower():
                value = row[key]
                if isinstance(value, pd.Series):
                    non_null = value.dropna()
                    if non_null.empty:
                        continue
                    value = non_null.iloc[0]
                if pd.notna(value) and str(value).strip() not in {'', 'nan', 'NaN'}:
                    return value
    return None


def parse_pibank_xlsx(path: Path):
    df = _read_excel_with_header(path, ['FECHA', 'FECHA VALOR', 'DESCRIPCION', 'IMPORTE'])
    rows = []
    for _, row in df.iterrows():
        if row.isna().all():
            continue
        importe = _row_value(row, ['IMPORTE', 'Importe'])
        fecha = _row_value(row, ['FECHA', 'Fecha'])
        f_valor = _row_value(row, ['FECHA VALOR', 'Fecha valor', 'Fecha Valor'])
        concepto = _row_value(row, ['DESCRIPCION', 'Descripcion', 'Concepto'])
        movimiento = _row_value(row, ['TIPO', 'Tipo', 'Movimiento'])
        if concepto is None and 'TRANSFERENCIA' in str(_row_value(row, ['NOTA', 'Nota']) or ''):
            concepto = _row_value(row, ['NOTA', 'Nota'])
        if fecha is None and f_valor is not None:
            fecha = f_valor
        if f_valor is None and fecha is not None:
            f_valor = fecha
        rows.append({
            'fuente': 'PIBANK',
            'f_valor': f_valor,
            'fecha': fecha,
            'concepto': concepto or 'Pibank',
            'movimiento': movimiento or 'Movimiento',
            'importe_cent': money_to_cents(importe),
            'divisa': 'EUR',
            'observaciones': _row_value(row, ['NOTA', 'Nota']) or '',
            'categoria2': 'PENDIENTE',
            'categoria1': 'PENDIENTE',
            'categoria0': 'PENDIENTE',
        })
    return rows


def parse_bbva_xlsx(path: Path):
    df = _read_excel_with_header(path, ['F.Valor', 'Fecha', 'Concepto', 'Movimiento', 'Importe'])
    rows = []
    for _, row in df.iterrows():
        if row.isna().all():
            continue
        disponible = _row_value(row, ['Disponible'])
        rows.append({
            'fuente': 'BBVA',
            'f_valor': _row_value(row, ['F.Valor', 'Fecha valor', 'Fecha Valor', 'Fecha']) or _row_value(row, ['Fecha']),
            'fecha': _row_value(row, ['Fecha', 'F. Valor', 'F.Valor']) or _row_value(row, ['F.Valor']),
            'concepto': _row_value(row, ['Concepto', 'Descripción', 'Descripcion']) or 'BBVA',
            'movimiento': _row_value(row, ['Movimiento']) or 'Movimiento',
            'importe_cent': money_to_cents(_row_value(row, ['Importe', 'Importe (€)']) or 0),
            'divisa': _row_value(row, ['Divisa']) or 'EUR',
            'disponible_cent': money_to_cents(disponible) if disponible is not None else None,
            'observaciones': _row_value(row, ['Observaciones']) or '',
            'categoria2': _row_value(row, ['Categoría2', 'Categoria2']) or 'PENDIENTE',
            'categoria1': _row_value(row, ['Categoría1', 'Categoria1']) or 'PENDIENTE',
            'categoria0': _row_value(row, ['Categoria0', 'Categoría0']) or 'PENDIENTE',
        })
    return rows


def parse_bankinter_xlsx(path: Path):
    df = _read_excel_with_header(path, ['Fecha contable', 'Fecha valor', 'Fecha', 'Importe'])
    rows = []
    for _, row in df.iterrows():
        if row.isna().all():
            continue
        fecha = _row_value(row, ['Fecha contable', 'Fecha']) or _row_value(row, ['Fecha valor'])
        f_valor = _row_value(row, ['Fecha valor', 'Fecha Valor', 'F.Valor']) or fecha
        rows.append({
            'fuente': 'BANKINTER',
            'f_valor': f_valor,
            'fecha': fecha,
            'concepto': _row_value(row, ['Descripción', 'Descripcion', 'Concepto']) or 'Bankinter',
            'movimiento': _row_value(row, ['Movimiento', 'Tipo']) or 'Movimiento',
            'importe_cent': money_to_cents(_row_value(row, ['Importe', 'Importe (€)']) or 0),
            'disponible_cent': (
                money_to_cents(_row_value(row, ['Saldo', 'Disponible']))
                if _row_value(row, ['Saldo', 'Disponible']) is not None
                else None
            ),
            'divisa': 'EUR',
            'observaciones': _row_value(row, ['Observaciones', 'Nota']) or '',
            'categoria2': 'PENDIENTE',
            'categoria1': 'PENDIENTE',
            'categoria0': 'PENDIENTE',
        })
    return rows


def parse_efectivo_xlsx(path: Path):
    rows = []
    df = pd.read_excel(path)
    for _, row in df.iterrows():
        if row.isna().all():
            continue
        movimiento = normalize_text(row.get('Movimiento')) or normalize_text(row.get('Tipo')) or 'Movimiento'
        if movimiento.casefold() == 'interno':
            continue

        rows.append({
            'fuente': 'EFECTIVO',
            'f_valor': row.get('Fecha') or row.get('F.Valor') or row.get('F. Valor'),
            'fecha': row.get('Fecha') or row.get('F. Valor') or row.get('F.Valor'),
            'concepto': row.get('Concepto') or row.get('Descripción') or 'Efectivo',
            'movimiento': movimiento,
            'importe_cent': money_to_cents(row.get('Importe') or row.get('Importe (€)') or 0),
            'divisa': 'EUR',
            'observaciones': row.get('Observaciones') or '',
            'categoria2': row.get('Categoría2') or row.get('Categoria2') or 'PENDIENTE',
            'categoria1': row.get('Categoría1') or row.get('Categoria1') or 'PENDIENTE',
            'categoria0': row.get('Categoria0') or row.get('Categoría0') or 'PENDIENTE',
        })
    return rows


FILE_PARSERS = (
    ('transactions_', parse_trade_republic_csv),
    ('account-statement_', parse_revolut_csv),
    ('movimientos_es', parse_pibank_xlsx),
    ('pibank', parse_pibank_xlsx),
    ('movimientos_', parse_bankinter_xlsx),
    ('bankinter', parse_bankinter_xlsx),
    ('ultimos movimientos', parse_bbva_xlsx),
    ('ultimos mov', parse_bbva_xlsx),
    ('ultimo movimientos', parse_bbva_xlsx),
    ('bbva', parse_bbva_xlsx),
    ('gastos_', parse_efectivo_xlsx),
)


def normalize_bank_filename(name: str | Path) -> str:
    text = str(name).lower()
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(ch for ch in text if not unicodedata.combining(ch))
    return text.replace('_', ' ').replace('-', ' ')


def detect_parser(path: Path):
    name = normalize_bank_filename(path.name)
    for token, parser in FILE_PARSERS:
        if normalize_bank_filename(token) in name:
            return parser

    if path.suffix.lower() == '.csv':
        if 'transactions' in name or 'account statement' in name:
            return parse_trade_republic_csv if 'transactions' in name else parse_revolut_csv
        return parse_trade_republic_csv

    if path.suffix.lower() in {'.xls', '.xlsx', '.xlsm', '.xlsb'}:
        if 'pibank' in name or ('movimientos' in name and 'es' in name):
            return parse_pibank_xlsx
        if 'movimientos' in name:
            return parse_bankinter_xlsx
        if 'ultimos' in name or 'ultimo' in name or 'bbva' in name:
            return parse_bbva_xlsx
    return None


def _date_from_filename(name: str) -> datetime | None:
    patterns = (
        (re.compile(r'(?<!\d)(\d{4})[Yy][\s_.-]*(\d{1,2})[Mm][\s_.-]*(\d{1,2})[Dd]'), 'ymd'),
        (re.compile(r'(?<!\d)(\d{4})[-_. ](\d{1,2})[-_. ](\d{1,2})(?!\d)'), 'ymd'),
        (re.compile(r'(?<!\d)(\d{1,2})[-_. ](\d{1,2})[-_. ](\d{4})(?!\d)'), 'dmy'),
        (re.compile(r'(?<!\d)(\d{8})(?!\d)'), 'compact'),
    )
    dates = []
    for pattern, date_format in patterns:
        for match in pattern.finditer(name):
            try:
                if date_format == 'ymd':
                    value = datetime(int(match[1]), int(match[2]), int(match[3]))
                elif date_format == 'dmy':
                    value = datetime(int(match[3]), int(match[2]), int(match[1]))
                else:
                    compact = match[1]
                    if 1900 <= int(compact[:4]) <= 2100:
                        value = datetime.strptime(compact, '%Y%m%d')
                    else:
                        value = datetime.strptime(compact, '%d%m%Y')
                dates.append(value)
            except ValueError:
                continue
    return max(dates, default=None)


def _collect_input_rows_with_cleanup(
    input_dir: Path | str = DEFAULT_INPUT_DIR,
) -> tuple[list[dict], int, list[str]]:
    input_dir = Path(input_dir)
    if not input_dir.exists():
        return [], 0, []

    bank_by_parser = {
        parse_trade_republic_csv: 'TRADE REPUBLIC',
        parse_revolut_csv: 'REVOLUT',
        parse_pibank_xlsx: 'PIBANK',
        parse_bankinter_xlsx: 'BANKINTER',
        parse_bbva_xlsx: 'BBVA',
        parse_efectivo_xlsx: 'EFECTIVO',
    }
    parsed_files = []
    for path in sorted(input_dir.iterdir()):
        if not path.is_file():
            continue
        parser = detect_parser(path)
        if parser is None:
            continue
        try:
            parsed = parser(path)
        except Exception:
            continue
        parsed_files.append({
            'path': path,
            'bank': bank_by_parser[parser],
            'rows': parsed,
            'modified': path.stat().st_mtime,
            'filename_date': _date_from_filename(path.name),
        })

    files_by_bank = {}
    for entry in parsed_files:
        files_by_bank.setdefault(entry['bank'], []).append(entry)

    retained_files = []
    deleted_files = []
    for bank_files in files_by_bank.values():
        newest = max(
            bank_files,
            key=lambda entry: (
                entry['filename_date'].timestamp()
                if entry['filename_date'] is not None
                else entry['modified'],
                entry['modified'],
                entry['path'].name.casefold(),
            ),
        )
        retained_files.append(newest)
        for entry in bank_files:
            if entry is newest:
                continue
            entry['path'].unlink()
            deleted_files.append(entry['path'].name)

    all_rows = []
    for entry in sorted(retained_files, key=lambda item: item['path'].name.casefold()):
        path = entry['path']
        for row in entry['rows']:
            if row.get('f_valor') is None and row.get('fecha') is not None:
                row['f_valor'] = row['fecha']
            if row.get('fecha') is None and row.get('f_valor') is not None:
                row['fecha'] = row['f_valor']
            row['fuente'] = normalize_text(row.get('fuente')) or path.stem
            row['categoria2'] = normalize_text(row.get('categoria2')) or 'PENDIENTE'
            row['categoria1'] = normalize_text(row.get('categoria1')) or 'PENDIENTE'
            row['categoria0'] = normalize_text(row.get('categoria0')) or 'PENDIENTE'
            row['source_file'] = path.name
            all_rows.append(row)

    return all_rows, len(retained_files), deleted_files


def collect_input_rows(
    input_dir: Path | str = DEFAULT_INPUT_DIR,
    include_deleted_files: bool = False,
) -> tuple[list[dict], int] | tuple[list[dict], int, list[str]]:
    rows, processed_files, deleted_files = _collect_input_rows_with_cleanup(input_dir)
    if include_deleted_files:
        return rows, processed_files, deleted_files
    return rows, processed_files


def collect_input_rows_for_import(input_dir: Path | str) -> tuple[list[dict], int, list[str]]:
    collected = collect_input_rows(input_dir, include_deleted_files=True)
    if len(collected) == 3:
        rows, processed_files, deleted_files = collected
        return rows, processed_files, deleted_files
    rows, processed_files = collected
    return rows, processed_files, []


def preview_import_files(input_dir: Path | str = DEFAULT_INPUT_DIR, db_path: Path | str = DEFAULT_DB_PATH) -> dict:
    input_dir = Path(input_dir)
    db_path = Path(db_path)
    if not input_dir.exists():
        return {'rows': [], 'count': 0, 'files': 0, 'message': 'No existe la carpeta input'}

    conn = sqlite3.connect(db_path)
    schema_sql = ROOT_DIR / 'schema.sql'
    if schema_sql.exists():
        conn.executescript(schema_sql.read_text(encoding='utf-8'))

    all_rows, processed_files, deleted_files = collect_input_rows_for_import(input_dir)
    existing_claves = {row[0] for row in conn.execute('SELECT clave FROM movimientos WHERE clave IS NOT NULL')}
    existing_match_keys = existing_import_match_keys(conn)
    snapshot_updates = find_missing_snapshot_updates(conn, all_rows)
    preview_rows = []
    seen = set()
    seen_match_keys = set()

    for row in all_rows:
        row['categoria2'] = normalize_text(row.get('categoria2')) or 'PENDIENTE'
        row['categoria1'] = normalize_text(row.get('categoria1')) or 'PENDIENTE'
        row['categoria0'] = normalize_text(row.get('categoria0')) or 'PENDIENTE'
        clave = build_unique_key(row)
        row['clave'] = clave
        match_keys = build_import_match_keys(row)
        if clave in snapshot_updates:
            preview_rows.append({
                'fuente': normalize_text(row.get('fuente')),
                'f_valor': normalize_text(row.get('f_valor')) or normalize_text(row.get('fecha')),
                'fecha': normalize_text(row.get('fecha')) or normalize_text(row.get('f_valor')),
                'concepto': normalize_text(row.get('concepto')),
                'movimiento': normalize_text(row.get('movimiento')),
                'importe_cent': int(row.get('importe_cent') or 0),
                'disponible_cent': int(row.get('disponible_cent')),
                'divisa': normalize_text(row.get('divisa')) or 'EUR',
                'categoria2': normalize_text(row.get('categoria2')) or 'PENDIENTE',
                'observaciones': normalize_text(row.get('observaciones')) or '',
                'source_file': normalize_text(row.get('source_file')),
                'clave': clave,
                'update_snapshot': True,
            })
            continue
        if clave in existing_claves or match_keys & existing_match_keys or clave in seen or match_keys & seen_match_keys:
            continue
        seen.add(clave)
        seen_match_keys.update(match_keys)
        importe_cent = row.get('importe_cent')
        if importe_cent is None or pd.isna(importe_cent):
            importe_cent = 0
        preview_rows.append({
            'fuente': normalize_text(row.get('fuente')),
            'f_valor': normalize_text(row.get('f_valor')) or normalize_text(row.get('fecha')),
            'fecha': normalize_text(row.get('fecha')) or normalize_text(row.get('f_valor')),
            'concepto': normalize_text(row.get('concepto')),
            'movimiento': normalize_text(row.get('movimiento')),
            'importe_cent': int(importe_cent or 0),
            'disponible_cent': row.get('disponible_cent'),
            'divisa': normalize_text(row.get('divisa')) or 'EUR',
            'categoria2': normalize_text(row.get('categoria2')) or 'PENDIENTE',
            'observaciones': normalize_text(row.get('observaciones')) or '',
            'source_file': normalize_text(row.get('source_file')),
            'clave': clave,
            'update_snapshot': False,
        })

    conn.close()
    return {
        'rows': preview_rows,
        'count': len(preview_rows),
        'files': processed_files,
        'deleted_files': deleted_files,
        'message': 'Registros pendientes de importación',
    }


def import_files(
    input_dir: Path | str = DEFAULT_INPUT_DIR,
    db_path: Path | str = DEFAULT_DB_PATH,
    selected_keys: set[str] | None = None,
    row_overrides: dict[str, dict] | None = None,
) -> dict:
    input_dir = Path(input_dir)
    db_path = Path(db_path)
    if not input_dir.exists():
        return {'imported': 0, 'skipped': 0, 'files': 0, 'message': 'No existe la carpeta input'}

    conn = sqlite3.connect(db_path)
    schema_sql = ROOT_DIR / 'schema.sql'
    if schema_sql.exists():
        conn.executescript(schema_sql.read_text(encoding='utf-8'))

    all_rows, processed_files, deleted_files = collect_input_rows_for_import(input_dir)
    existing_claves = {row[0] for row in conn.execute('SELECT clave FROM movimientos WHERE clave IS NOT NULL')}
    existing_match_keys = existing_import_match_keys(conn)
    snapshot_updates = find_missing_snapshot_updates(conn, all_rows, selected_keys)
    updated = 0
    for mov_id, disponible_cent in snapshot_updates.values():
        cursor = conn.execute(
            'UPDATE movimientos SET disponible_cent = ? WHERE id = ? AND disponible_cent IS NULL',
            (disponible_cent, mov_id),
        )
        updated += cursor.rowcount

    pending_rows = []
    seen = set()
    seen_match_keys = set()

    for row in all_rows:
        row['categoria2'] = normalize_text(row.get('categoria2')) or 'PENDIENTE'
        row['categoria1'] = normalize_text(row.get('categoria1')) or 'PENDIENTE'
        row['categoria0'] = normalize_text(row.get('categoria0')) or 'PENDIENTE'
        clave = build_unique_key(row)
        row['clave'] = clave
        match_keys = build_import_match_keys(row)
        if clave in existing_claves or match_keys & existing_match_keys or clave in seen or match_keys & seen_match_keys:
            continue
        seen.add(clave)
        seen_match_keys.update(match_keys)
        if selected_keys is not None and clave not in selected_keys:
            continue
        if row_overrides and clave in row_overrides:
            row.update(row_overrides[clave])
        pending_rows.append(row)

    summary = insert_rows(conn, pending_rows)
    conn.close()
    summary['updated'] = updated
    summary['files'] = processed_files
    summary['deleted_files'] = deleted_files
    summary['message'] = 'Importación completada'
    return summary


def main() -> None:
    result = import_files()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
