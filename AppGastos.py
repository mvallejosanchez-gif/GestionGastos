from __future__ import annotations

import calendar
import sqlite3
import uuid
from datetime import date, datetime, timedelta
from io import BytesIO
from pathlib import Path

import pandas as pd
from flask import Flask, jsonify, render_template, request, send_file

from importar_input import import_files, preview_import_files

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / 'gastos.db'

MONTHLY_BUDGETS_CENTS = {
    'Mantenimiento Casa': 3000,
    'Prestamo': 69800,
    'Agua': 2500,
    'Comunidad': 9330,
    'Telefonia': 3520,
    'Energía': 5000,
    'Suscripciones': 2098,
    'Supermercado': 50000,
    'Comida a Domicilio': 6000,
    'Loteria': 1500,
    'Amazon': None,
    'Ropa': 3000,
    'Efectivo': None,
    'Comun Niños': 22000,
    'Seguro Salud': 6789,
    'Combustible': 20000,
    'Mantenimiento Vehiculos': 10000,
    'Seguro Casa': 5480,
    'Seguro Coche': 3700,
    'Seguro Moto': 1400,
    'Restaurante': 10000,
    'Ocio': None,
    'Otros': 2000,
    'Patronato': 11931,
    'Comidas Trabajo': 1000,
    'Dentista, Farmacia, otros': 2000,
}

app = Flask(__name__)


@app.after_request
def add_no_store_headers(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_app_settings(conn: sqlite3.Connection) -> None:
    conn.execute(
        '''
        CREATE TABLE IF NOT EXISTS app_config (
            clave TEXT PRIMARY KEY,
            valor TEXT NOT NULL
        )
        '''
    )
    conn.execute(
        'INSERT OR IGNORE INTO app_config (clave, valor) VALUES (?, ?)',
        ('meses_saldo_historico', '18'),
    )
    conn.commit()


def get_balance_history_months(conn: sqlite3.Connection) -> int:
    ensure_app_settings(conn)
    row = conn.execute(
        'SELECT valor FROM app_config WHERE clave = ?',
        ('meses_saldo_historico',),
    ).fetchone()
    try:
        return min(60, max(1, int(row['valor'])))
    except (TypeError, ValueError):
        return 18


def ensure_account_balance_flag(conn: sqlite3.Connection) -> None:
    columns = {row['name'] for row in conn.execute('PRAGMA table_info(cuentas)')}
    if 'incluir_en_saldos' not in columns:
        conn.execute('ALTER TABLE cuentas ADD COLUMN incluir_en_saldos INTEGER NOT NULL DEFAULT 1')
        conn.commit()


def normalize_optional(value):
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        return text if text else None
    return value


def normalize_payload(payload: dict, allow_empty: bool = False):
    valid_fields = {
        'fuente', 'fecha', 'f_valor', 'concepto', 'movimiento', 'importe_cent',
        'divisa', 'disponible_cent', 'divisa2', 'observaciones', 'categoria2',
        'comentarios', 'comentarios2', 'key_legacy', 'clave'
    }

    normalized = {}
    for field in valid_fields:
        if field in payload:
            value = normalize_optional(payload.get(field))
            if field in {'importe_cent', 'disponible_cent'} and value is not None:
                try:
                    value = int(value)
                except (TypeError, ValueError):
                    raise ValueError(f'Campo {field} debe ser un entero')
            normalized[field] = value

    if not allow_empty and not normalized:
        raise ValueError('No hay campos válidos para actualizar')
    return normalized


def ensure_valid_categoria(conn: sqlite3.Connection, categoria: str | None):
    if categoria is None:
        return None

    normalized = str(categoria).strip()
    if not normalized:
        return None

    exists = conn.execute(
        'SELECT 1 FROM categorias WHERE categoria2 = ?',
        (normalized,),
    ).fetchone()
    if exists is not None:
        return normalized

    if normalized.upper() == 'PENDIENTE':
        conn.execute(
            'INSERT OR IGNORE INTO categorias (categoria2, categoria1, categoria0) VALUES (?, ?, ?)',
            (normalized, 'PENDIENTE', 'PENDIENTE'),
        )
        return normalized

    raise ValueError('Categoría no válida')


def fetch_movement_by_id(conn: sqlite3.Connection, mov_id: int):
    return conn.execute(
        '''
        SELECT id, fuente, f_valor, fecha, concepto, movimiento, importe_cent,
               divisa, disponible_cent, divisa2, observaciones, categoria2,
               comentarios, comentarios2, key_legacy, clave
        FROM movimientos WHERE id = ?
        ''',
        (mov_id,),
    ).fetchone()


@app.get('/')
def index():
    return render_template('index.html')


@app.get('/api/importar_input/preview')
def api_importar_input_preview():
    try:
        result = preview_import_files()
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({'error': str(exc), 'rows': [], 'count': 0}), 500


@app.route('/api/importar_input', methods=['GET', 'POST'])
def api_importar_input():
    if request.method == 'GET':
        return api_importar_input_preview()

    try:
        payload = request.get_json(silent=True) or {}
        selected_keys = payload.get('claves')
        if selected_keys is not None:
            if not isinstance(selected_keys, list) or not all(isinstance(key, str) for key in selected_keys):
                return jsonify({'error': 'La selección de importación no es válida'}), 400
            selected_keys = set(selected_keys)
        result = import_files(selected_keys=selected_keys)
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({'error': str(exc), 'inserted': 0, 'skipped': 0}), 500


@app.get('/api/options')
def api_options():
    conn = get_db()
    fuentes = [
        row['fuente']
        for row in conn.execute(
            'SELECT fuente FROM cuentas ORDER BY fuente COLLATE NOCASE ASC'
        ).fetchall()
    ]
    categorias = [
        row['categoria2']
        for row in conn.execute(
            'SELECT categoria2 FROM categorias ORDER BY categoria2 COLLATE NOCASE ASC'
        ).fetchall()
    ]
    conn.close()
    return jsonify({'fuentes': fuentes, 'categorias': categorias})


@app.get('/api/config/cuentas')
def api_config_cuentas():
    conn = get_db()
    ensure_account_balance_flag(conn)
    meses_saldo_historico = get_balance_history_months(conn)
    cuentas = conn.execute(
        '''
        SELECT fuente, ahorro_no_disponible_cent, incluir_en_saldos
        FROM cuentas
        ORDER BY fuente COLLATE NOCASE ASC
        '''
    ).fetchall()
    conn.close()
    return jsonify({
        'cuentas': [dict(row) for row in cuentas],
        'meses_saldo_historico': meses_saldo_historico,
    })


@app.put('/api/config/saldo-historico')
def api_update_saldo_historico():
    payload = request.get_json(silent=True) or {}
    try:
        months = int(payload.get('meses_saldo_historico'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Indica un número de meses válido'}), 400
    if not 1 <= months <= 60:
        return jsonify({'error': 'El rango debe estar entre 1 y 60 meses'}), 400

    conn = get_db()
    ensure_app_settings(conn)
    conn.execute(
        'UPDATE app_config SET valor = ? WHERE clave = ?',
        (str(months), 'meses_saldo_historico'),
    )
    conn.commit()
    conn.close()
    return jsonify({'meses_saldo_historico': months})


@app.put('/api/config/cuentas/<path:fuente>')
def api_update_config_cuenta(fuente: str):
    payload = request.get_json(silent=True) or {}
    if 'ahorro_no_disponible_cent' not in payload and 'incluir_en_saldos' not in payload:
        return jsonify({'error': 'No hay parámetros de cuenta para actualizar'}), 400

    updates = {}
    if 'ahorro_no_disponible_cent' in payload:
        try:
            amount_cent = int(payload['ahorro_no_disponible_cent'])
        except (TypeError, ValueError):
            return jsonify({'error': 'El importe debe expresarse en céntimos enteros'}), 400
        if amount_cent < 0:
            return jsonify({'error': 'El importe no puede ser negativo'}), 400
        updates['ahorro_no_disponible_cent'] = amount_cent
    if 'incluir_en_saldos' in payload:
        updates['incluir_en_saldos'] = 1 if payload['incluir_en_saldos'] else 0

    conn = get_db()
    ensure_account_balance_flag(conn)
    assignments = ', '.join(f'{column} = ?' for column in updates)
    cursor = conn.execute(
        f'UPDATE cuentas SET {assignments} WHERE fuente = ?',
        [*updates.values(), fuente],
    )
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Cuenta no encontrada'}), 404

    conn.commit()
    row = conn.execute(
        'SELECT fuente, ahorro_no_disponible_cent, incluir_en_saldos FROM cuentas WHERE fuente = ?',
        (fuente,),
    ).fetchone()
    conn.close()
    return jsonify(dict(row))


@app.get('/api/summary')
def api_summary():
    conn = get_db()
    total = conn.execute('SELECT COUNT(*) AS total FROM movimientos').fetchone()['total']
    top_categorias = conn.execute(
        'SELECT categoria2, COUNT(*) AS total FROM movimientos GROUP BY categoria2 ORDER BY total DESC LIMIT 10'
    ).fetchall()
    top_fuentes = conn.execute(
        'SELECT fuente, COUNT(*) AS total FROM movimientos GROUP BY fuente ORDER BY total DESC LIMIT 10'
    ).fetchall()
    conn.close()
    return jsonify({
        'total': total,
        'topCategorias': [dict(row) for row in top_categorias],
        'topFuentes': [dict(row) for row in top_fuentes],
    })


@app.get('/api/presupuestos')
def api_presupuestos():
    requested_month = request.args.get('month', '').strip()
    try:
        month = datetime.strptime(requested_month, '%Y-%m').strftime('%Y-%m')
    except ValueError:
        month = datetime.now().strftime('%Y-%m')

    conn = get_db()
    rows = conn.execute(
        '''
        SELECT c.categoria1, c.categoria2,
               COALESCE(SUM(m.importe_cent), 0) AS importe_cent
        FROM categorias c
        LEFT JOIN movimientos m
          ON m.categoria2 = c.categoria2
         AND strftime('%Y-%m', date(COALESCE(m.f_valor, m.fecha))) = ?
        WHERE c.categoria0 = 'Gasto'
        GROUP BY c.categoria1, c.categoria2
        ORDER BY c.categoria1 COLLATE NOCASE, c.categoria2 COLLATE NOCASE
        ''',
        (month,),
    ).fetchall()
    conn.close()

    groups = {}
    budget_total_cent = 0
    actual_total_cent = 0
    for row in rows:
        category1 = row['categoria1'] or '(sin categoría)'
        category2 = row['categoria2'] or '(sin categoría)'
        budget_cent = MONTHLY_BUDGETS_CENTS.get(category2)
        actual_cent = -int(row['importe_cent'] or 0)
        group = groups.setdefault(category1, {
            'categoria1': category1,
            'budget_cent': None,
            'actual_cent': 0,
            'children': [],
        })
        group['actual_cent'] += actual_cent
        actual_total_cent += actual_cent
        if budget_cent is not None:
            if group['budget_cent'] is None:
                group['budget_cent'] = 0
            group['budget_cent'] += budget_cent
            budget_total_cent += budget_cent
        group['children'].append({
            'categoria2': category2,
            'budget_cent': budget_cent,
            'actual_cent': actual_cent,
            'difference_cent': budget_cent - actual_cent if budget_cent is not None else None,
        })

    for group in groups.values():
        group['difference_cent'] = (
            group['budget_cent'] - group['actual_cent']
            if group['budget_cent'] is not None
            else None
        )

    return jsonify({
        'month': month,
        'groups': list(groups.values()),
        'budget_total_cent': budget_total_cent,
        'actual_total_cent': actual_total_cent,
        'difference_total_cent': budget_total_cent - actual_total_cent,
    })


@app.get('/api/dashboard')
def api_dashboard():
    raw_fuentes = request.args.getlist('fuentes')
    if not raw_fuentes:
        single = request.args.get('fuente', '').strip()
        if single:
            raw_fuentes = [single]
    fuentes_seleccionadas = []
    for value in raw_fuentes:
        for item in value.split(','):
            clean = item.strip()
            if clean:
                fuentes_seleccionadas.append(clean)
    fuentes_seleccionadas = list(dict.fromkeys(fuentes_seleccionadas))
    sin_fuentes = request.args.get('sin_fuentes') == '1'

    date_start = request.args.get('date_start', '').strip() or None
    date_end = request.args.get('date_end', '').strip() or None
    selected_categories = {
        level: request.args.get(level, '').strip()
        for level in ('categoria0', 'categoria1', 'categoria2')
    }
    selected_categories = {level: value for level, value in selected_categories.items() if value}

    conn = get_db()
    date_min = conn.execute(
        'SELECT MIN(date(COALESCE(f_valor, fecha))) AS min_date FROM movimientos'
    ).fetchone()['min_date']
    date_max = conn.execute(
        'SELECT MAX(date(COALESCE(f_valor, fecha))) AS max_date FROM movimientos'
    ).fetchone()['max_date']

    if date_start is None:
        date_start = date_min
    if date_end is None:
        date_end = date_max

    where_clauses = []
    params = []
    if sin_fuentes:
        where_clauses.append('1 = 0')
    elif fuentes_seleccionadas:
        placeholders = ', '.join('?' for _ in fuentes_seleccionadas)
        where_clauses.append(f'm.fuente IN ({placeholders})')
        params.extend(fuentes_seleccionadas)
    if date_start:
        where_clauses.append('date(COALESCE(m.f_valor, m.fecha)) >= date(?)')
        params.append(date_start)
    if date_end:
        where_clauses.append('date(COALESCE(m.f_valor, m.fecha)) <= date(?)')
        params.append(date_end)
    for level, value in selected_categories.items():
        where_clauses.append(f'c.{level} = ?')
        params.append(value)

    sql_where = ''
    if where_clauses:
        sql_where = ' WHERE ' + ' AND '.join(where_clauses)

    totals_by_category = {}
    for level in ('categoria0', 'categoria1', 'categoria2'):
        rows = conn.execute(
            f'''
            SELECT COALESCE(c.{level}, '(blank)') AS {level},
                   SUM(m.importe_cent) AS total_cent
            FROM movimientos m
            LEFT JOIN categorias c ON c.categoria2 = m.categoria2
            {sql_where}
            GROUP BY COALESCE(c.{level}, '(blank)')
            ORDER BY total_cent DESC
            ''',
            params,
        ).fetchall()
        totals_by_category[level] = [dict(row) for row in rows]

    cuentas_query = 'SELECT fuente, disponible_cero, ahorro_no_disponible_cent FROM cuentas'
    if sin_fuentes:
        cuentas = []
    elif fuentes_seleccionadas:
        placeholders = ', '.join('?' for _ in fuentes_seleccionadas)
        cuentas = conn.execute(
            f'{cuentas_query} WHERE fuente IN ({placeholders}) ORDER BY fuente COLLATE NOCASE ASC',
            fuentes_seleccionadas,
        ).fetchall()
    else:
        cuentas = conn.execute(f'{cuentas_query} ORDER BY fuente COLLATE NOCASE ASC').fetchall()

    total_general = 0
    for cuenta in cuentas:
        fuente = cuenta['fuente']
        if cuenta['disponible_cero']:
            continue

        snapshot_sql = '''
            SELECT id, COALESCE(f_valor, fecha) AS fecha_snapshot, disponible_cent
            FROM movimientos
            WHERE fuente = ? AND disponible_cent IS NOT NULL
        '''
        snapshot_params = [fuente]
        if date_end:
            snapshot_sql += ' AND date(COALESCE(f_valor, fecha)) <= date(?)'
            snapshot_params.append(date_end)
        snapshot_sql += ' ORDER BY datetime(COALESCE(f_valor, fecha)) DESC, id DESC LIMIT 1'
        snapshot = conn.execute(snapshot_sql, snapshot_params).fetchone()

        if snapshot is not None:
            movements_sql = '''
                SELECT COALESCE(SUM(importe_cent), 0)
                FROM movimientos
                WHERE fuente = ? AND datetime(COALESCE(f_valor, fecha)) > datetime(?)
            '''
            movements_params = [fuente, snapshot['fecha_snapshot']]
            if date_end:
                movements_sql += ' AND date(COALESCE(f_valor, fecha)) <= date(?)'
                movements_params.append(date_end)
            later_movements_cent = conn.execute(movements_sql, movements_params).fetchone()[0]
            balance_cent = max(
                int(snapshot['disponible_cent'])
                - int(cuenta['ahorro_no_disponible_cent'] or 0)
                + int(later_movements_cent or 0),
                0,
            )
        else:
            movements_sql = 'SELECT COALESCE(SUM(importe_cent), 0) FROM movimientos WHERE fuente = ?'
            movements_params = [fuente]
            if date_end:
                movements_sql += ' AND date(COALESCE(f_valor, fecha)) <= date(?)'
                movements_params.append(date_end)
            movement_total_cent = conn.execute(movements_sql, movements_params).fetchone()[0]
            balance_cent = max(
                int(movement_total_cent or 0) - int(cuenta['ahorro_no_disponible_cent'] or 0),
                0,
            )
        total_general += balance_cent

    fuentes = [
        row['fuente']
        for row in conn.execute(
            'SELECT fuente FROM cuentas ORDER BY fuente COLLATE NOCASE ASC'
        ).fetchall()
    ]
    conn.close()

    return jsonify({
        'fuentes': fuentes,
        'fuentes_seleccionadas': fuentes_seleccionadas,
        'date_start': date_start,
        'date_end': date_end,
        'date_min': date_min,
        'date_max': date_max,
        'categorias_seleccionadas': selected_categories,
        'total_general': total_general,
        'totales_por_categoria0': totals_by_category['categoria0'],
        'totales_por_categoria1': totals_by_category['categoria1'],
        'totales_por_categoria2': totals_by_category['categoria2'],
    })


def _duplicate_api_dashboard_saldos():
    raw_fuentes = request.args.getlist('fuentes')
    if not raw_fuentes:
        single = request.args.get('fuente', '').strip()
        if single:
            raw_fuentes = [single]
    fuentes_seleccionadas = list(dict.fromkeys(
        item.strip()
        for value in raw_fuentes
        for item in value.split(',')
        if item.strip()
    ))
    sin_fuentes = request.args.get('sin_fuentes') == '1'

    conn = get_db()
    months = get_balance_history_months(conn)
    today = date.today()
    current_month = today.replace(day=1)
    start_month_index = current_month.year * 12 + current_month.month - 1 - months
    start_year, start_month_zero = divmod(start_month_index, 12)
    history_start = date(start_year, start_month_zero + 1, 1)

    if sin_fuentes:
        accounts = []
    elif fuentes_seleccionadas:
        placeholders = ', '.join('?' for _ in fuentes_seleccionadas)
        accounts = conn.execute(
            f'''
            SELECT fuente, disponible_cero, ahorro_no_disponible_cent
            FROM cuentas WHERE fuente IN ({placeholders})
            ORDER BY fuente COLLATE NOCASE ASC
            ''',
            fuentes_seleccionadas,
        ).fetchall()
    else:
        accounts = conn.execute(
            'SELECT fuente, disponible_cero, ahorro_no_disponible_cent FROM cuentas ORDER BY fuente COLLATE NOCASE ASC'
        ).fetchall()

    account_balances = {}
    for account in accounts:
        fuente = account['fuente']
        excluded_cent = int(account['ahorro_no_disponible_cent'] or 0)
        if account['disponible_cero']:
            account_balances[fuente] = {
                history_start + timedelta(days=offset): 0
                for offset in range((today - history_start).days + 1)
            }
            continue

        baseline = conn.execute(
            '''
            SELECT datetime(COALESCE(f_valor, fecha)) AS instante, disponible_cent
            FROM movimientos
            WHERE fuente = ? AND disponible_cent IS NOT NULL
              AND date(COALESCE(f_valor, fecha)) < ?
            ORDER BY datetime(COALESCE(f_valor, fecha)) DESC, id DESC
            LIMIT 1
            ''',
            (fuente, history_start.isoformat()),
        ).fetchone()

        if baseline is None:
            balance = None
            events = conn.execute(
                '''
                SELECT date(COALESCE(f_valor, fecha)) AS dia, importe_cent, disponible_cent
                FROM movimientos
                WHERE fuente = ?
                  AND date(COALESCE(f_valor, fecha)) >= ?
                  AND date(COALESCE(f_valor, fecha)) <= ?
                ORDER BY datetime(COALESCE(f_valor, fecha)), id
                ''',
                (fuente, history_start.isoformat(), today.isoformat()),
            ).fetchall()
        else:
            balance = int(baseline['disponible_cent'])
            events = conn.execute(
                '''
                SELECT date(COALESCE(f_valor, fecha)) AS dia, importe_cent, disponible_cent
                FROM movimientos
                WHERE fuente = ?
                  AND datetime(COALESCE(f_valor, fecha)) > datetime(?)
                  AND date(COALESCE(f_valor, fecha)) <= ?
                ORDER BY datetime(COALESCE(f_valor, fecha)), id
                ''',
                (fuente, baseline['instante'], today.isoformat()),
            ).fetchall()

        events_by_day = {}
        for event in events:
            event_day = date.fromisoformat(event['dia'])
            if event_day < history_start:
                if event['disponible_cent'] is not None:
                    balance = int(event['disponible_cent'])
                elif balance is not None:
                    balance += int(event['importe_cent'] or 0)
            else:
                events_by_day.setdefault(event_day, []).append(event)

        daily_balances = {}
        for offset in range((today - history_start).days + 1):
            day = history_start + timedelta(days=offset)
            for event in events_by_day.get(day, []):
                if event['disponible_cent'] is not None:
                    balance = int(event['disponible_cent'])
                elif balance is not None:
                    balance += int(event['importe_cent'] or 0)
            daily_balances[day] = (
                max(balance - excluded_cent, 0)
                if balance is not None
                else None
            )
        account_balances[fuente] = daily_balances

    aggregate_by_day = {}
    for offset in range((today - history_start).days + 1):
        day = history_start + timedelta(days=offset)
        values = [balances[day] for balances in account_balances.values() if balances.get(day) is not None]
        aggregate_by_day[day] = sum(values) if values else None

    history_by_day = {day: [] for day in range(1, 32)}
    for month_offset in range(1, months + 1):
        month_index = current_month.year * 12 + current_month.month - 1 - month_offset
        year, month_zero = divmod(month_index, 12)
        month_number = month_zero + 1
        for day_number in range(1, calendar.monthrange(year, month_number)[1] + 1):
            value = aggregate_by_day.get(date(year, month_number, day_number))
            if value is not None:
                history_by_day[day_number].append(value)

    days = list(range(1, 32))
    current_month_length = calendar.monthrange(today.year, today.month)[1]
    actual = [
        aggregate_by_day.get(date(today.year, today.month, day_number))
        if day_number <= min(today.day, current_month_length)
        else None
        for day_number in days
    ]
    average = [
        int(round(sum(values) / len(values))) if values else None
        for values in (history_by_day[day_number] for day_number in days)
    ]
    minimum = [min(values) if values else None for values in (history_by_day[day] for day in days)]
    maximum = [max(values) if values else None for values in (history_by_day[day] for day in days)]

    conn.close()
    previous_month_end = current_month - timedelta(days=1)
    return jsonify({
        'month': current_month.strftime('%Y-%m'),
        'months_history': months,
        'history_start': history_start.isoformat(),
        'history_end': previous_month_end.isoformat(),
        'days': days,
        'actual': actual,
        'average': average,
        'minimum': minimum,
        'maximum': maximum,
    })


@app.get('/api/dashboard/saldos')
def api_dashboard_saldos():
    raw_fuentes = request.args.getlist('fuentes')
    if not raw_fuentes:
        single = request.args.get('fuente', '').strip()
        if single:
            raw_fuentes = [single]
    fuentes_seleccionadas = list(dict.fromkeys(
        item.strip()
        for value in raw_fuentes
        for item in value.split(',')
        if item.strip()
    ))
    sin_fuentes = request.args.get('sin_fuentes') == '1'

    conn = get_db()
    ensure_account_balance_flag(conn)
    months = get_balance_history_months(conn)
    today = date.today()
    current_month = today.replace(day=1)
    start_month_index = current_month.year * 12 + current_month.month - 1 - months
    start_year, start_month_zero = divmod(start_month_index, 12)
    history_start = date(start_year, start_month_zero + 1, 1)

    if sin_fuentes:
        accounts = []
    elif fuentes_seleccionadas:
        placeholders = ', '.join('?' for _ in fuentes_seleccionadas)
        accounts = conn.execute(
            f'''
            SELECT fuente, disponible_cero, ahorro_no_disponible_cent
            FROM cuentas WHERE fuente IN ({placeholders}) AND incluir_en_saldos = 1
            ORDER BY fuente COLLATE NOCASE ASC
            ''',
            fuentes_seleccionadas,
        ).fetchall()
    else:
        accounts = conn.execute(
            'SELECT fuente, disponible_cero, ahorro_no_disponible_cent FROM cuentas WHERE incluir_en_saldos = 1 ORDER BY fuente COLLATE NOCASE ASC'
        ).fetchall()

    account_balances = {}
    for account in accounts:
        fuente = account['fuente']
        excluded_cent = int(account['ahorro_no_disponible_cent'] or 0)
        if account['disponible_cero']:
            account_balances[fuente] = {
                history_start + timedelta(days=offset): 0
                for offset in range((today - history_start).days + 1)
            }
            continue

        baseline = conn.execute(
            '''
            SELECT datetime(COALESCE(f_valor, fecha)) AS instante, disponible_cent
            FROM movimientos
            WHERE fuente = ? AND disponible_cent IS NOT NULL
              AND date(COALESCE(f_valor, fecha)) < ?
            ORDER BY datetime(COALESCE(f_valor, fecha)) DESC, id DESC
            LIMIT 1
            ''',
            (fuente, history_start.isoformat()),
        ).fetchone()

        if baseline is None:
            balance = None
            events = conn.execute(
                '''
                SELECT date(COALESCE(f_valor, fecha)) AS dia, importe_cent, disponible_cent
                FROM movimientos
                WHERE fuente = ?
                  AND date(COALESCE(f_valor, fecha)) >= ?
                  AND date(COALESCE(f_valor, fecha)) <= ?
                ORDER BY datetime(COALESCE(f_valor, fecha)), id
                ''',
                (fuente, history_start.isoformat(), today.isoformat()),
            ).fetchall()
        else:
            balance = int(baseline['disponible_cent'])
            events = conn.execute(
                '''
                SELECT date(COALESCE(f_valor, fecha)) AS dia, importe_cent, disponible_cent
                FROM movimientos
                WHERE fuente = ?
                  AND datetime(COALESCE(f_valor, fecha)) > datetime(?)
                  AND date(COALESCE(f_valor, fecha)) <= ?
                ORDER BY datetime(COALESCE(f_valor, fecha)), id
                ''',
                (fuente, baseline['instante'], today.isoformat()),
            ).fetchall()

        events_by_day = {}
        for event in events:
            event_day = date.fromisoformat(event['dia'])
            if event_day < history_start:
                if event['disponible_cent'] is not None:
                    balance = int(event['disponible_cent'])
                elif balance is not None:
                    balance += int(event['importe_cent'] or 0)
            else:
                events_by_day.setdefault(event_day, []).append(event)

        daily_balances = {}
        for offset in range((today - history_start).days + 1):
            day = history_start + timedelta(days=offset)
            for event in events_by_day.get(day, []):
                if event['disponible_cent'] is not None:
                    balance = int(event['disponible_cent'])
                elif balance is not None:
                    balance += int(event['importe_cent'] or 0)
            daily_balances[day] = (
                max(balance - excluded_cent, 0)
                if balance is not None
                else None
            )
        account_balances[fuente] = daily_balances

    aggregate_by_day = {}
    for offset in range((today - history_start).days + 1):
        day = history_start + timedelta(days=offset)
        values = [
            balances[day]
            for balances in account_balances.values()
            if balances.get(day) is not None
        ]
        aggregate_by_day[day] = sum(values) if values else None

    historical_by_day = {day: [] for day in range(1, 32)}
    for month_offset in range(1, months + 1):
        month_index = current_month.year * 12 + current_month.month - 1 - month_offset
        year, month_zero = divmod(month_index, 12)
        month_number = month_zero + 1
        for day_number in range(1, calendar.monthrange(year, month_number)[1] + 1):
            value = aggregate_by_day.get(date(year, month_number, day_number))
            if value is not None:
                historical_by_day[day_number].append({
                    'date': date(year, month_number, day_number),
                    'value': value,
                })

    days = list(range(1, 32))
    current_month_length = calendar.monthrange(today.year, today.month)[1]
    actual = [
        aggregate_by_day.get(date(today.year, today.month, day_number))
        if day_number <= min(today.day, current_month_length)
        else None
        for day_number in days
    ]
    average = []
    minimum = []
    minimum_date = []
    maximum = []
    maximum_date = []
    for day_number in days:
        values = historical_by_day[day_number]
        average.append(
            int(round(sum(point['value'] for point in values) / len(values)))
            if values else None
        )
        if values:
            minimum_point = min(values, key=lambda point: (point['value'], point['date']))
            maximum_value = max(point['value'] for point in values)
            maximum_point = min(
                (point for point in values if point['value'] == maximum_value),
                key=lambda point: point['date'],
            )
            minimum.append(minimum_point['value'])
            minimum_date.append(minimum_point['date'].isoformat())
            maximum.append(maximum_point['value'])
            maximum_date.append(maximum_point['date'].isoformat())
        else:
            minimum.append(None)
            minimum_date.append(None)
            maximum.append(None)
            maximum_date.append(None)

    first_historical_date = min(
        (point['date'] for points in historical_by_day.values() for point in points),
        default=None,
    )

    conn.close()
    previous_month_end = current_month - timedelta(days=1)
    return jsonify({
        'month': current_month.strftime('%Y-%m'),
        'months_history': months,
        'history_start': history_start.isoformat(),
        'history_end': previous_month_end.isoformat(),
        'days': days,
        'actual': actual,
        'average': average,
        'minimum': minimum,
        'minimum_date': minimum_date,
        'first_date': first_historical_date.isoformat() if first_historical_date else None,
        'maximum': maximum,
        'maximum_date': maximum_date,
    })


def build_movimientos_query_params():
    q = request.args.get('q', '').strip()
    fuente = request.args.get('fuente', '').strip()
    categoria = request.args.get('categoria', '').strip()
    date_start = request.args.get('date_start', '').strip()
    date_end = request.args.get('date_end', '').strip()

    where_clauses = []
    params = []

    if q:
        search_cols = [
            'fuente', 'concepto', 'movimiento', 'observaciones', 'categoria2',
            'comentarios', 'comentarios2', 'clave', 'key_legacy'
        ]
        search_clause = ' OR '.join(f'{col} LIKE ?' for col in search_cols)
        where_clauses.append(f'({search_clause})')
        params.extend([f'%{q}%'] * len(search_cols))

    if fuente:
        where_clauses.append('fuente = ?')
        params.append(fuente)

    if categoria:
        where_clauses.append('categoria2 = ?')
        params.append(categoria)

    if date_start:
        where_clauses.append('date(COALESCE(f_valor, fecha)) >= date(?)')
        params.append(date_start)

    if date_end:
        where_clauses.append('date(COALESCE(f_valor, fecha)) <= date(?)')
        params.append(date_end)

    sql_where = ''
    if where_clauses:
        sql_where = ' WHERE ' + ' AND '.join(where_clauses)
    return sql_where, params


@app.get('/api/movimientos')
def api_movimientos():
    page = max(1, int(request.args.get('page', 1)))
    limit = max(1, min(200, int(request.args.get('limit', 50))))
    sql_where, params = build_movimientos_query_params()

    conn = get_db()
    total = conn.execute(
        f'SELECT COUNT(*) AS total FROM movimientos{sql_where}',
        params,
    ).fetchone()['total']

    rows = conn.execute(
        f'''
        SELECT id, fuente, f_valor, fecha, concepto, movimiento, importe_cent,
               divisa, disponible_cent, divisa2, observaciones, categoria2,
               comentarios, comentarios2, key_legacy, clave,
               CASE
                 WHEN disponible_cent IS NULL THEN NULL
                 WHEN COALESCE((SELECT disponible_cero FROM cuentas WHERE cuentas.fuente = movimientos.fuente), 0) = 1 THEN 0
                 ELSE MAX(disponible_cent - COALESCE((SELECT ahorro_no_disponible_cent FROM cuentas WHERE cuentas.fuente = movimientos.fuente), 0), 0)
               END AS disponible_calculado_cent
        FROM movimientos{sql_where}
        ORDER BY f_valor DESC, id DESC
        LIMIT ? OFFSET ?
        ''',
        params + [limit, (page - 1) * limit],
    ).fetchall()
    conn.close()

    return jsonify({
        'page': page,
        'limit': limit,
        'total': total,
        'pages': max(1, (total + limit - 1) // limit),
        'items': [dict(row) for row in rows],
    })


@app.get('/api/movimientos/export')
def export_movimientos():
    sql_where, params = build_movimientos_query_params()
    conn = get_db()
    rows = conn.execute(
        f'''
        SELECT id, fuente, f_valor, fecha, concepto, movimiento, importe_cent,
               divisa, disponible_cent, divisa2, observaciones, categoria2,
               comentarios, comentarios2, key_legacy, clave
        FROM movimientos{sql_where}
        ORDER BY f_valor DESC, id DESC
        ''',
        params,
    ).fetchall()
    conn.close()

    df = pd.DataFrame([dict(row) for row in rows])
    if df.empty:
        df = pd.DataFrame([
            {'id': '', 'fuente': '', 'f_valor': '', 'fecha': '', 'concepto': '', 'movimiento': '', 'importe_cent': '',
             'divisa': '', 'disponible_cent': '', 'divisa2': '', 'observaciones': '', 'categoria2': '', 'comentarios': '',
             'comentarios2': '', 'key_legacy': '', 'clave': ''}
        ])

    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='movimientos')

    output.seek(0)
    filename = 'movimientos_filtrados.xlsx'
    return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', as_attachment=True, download_name=filename)


@app.get('/api/movimientos/<int:mov_id>')
def get_movimiento(mov_id: int):
    conn = get_db()
    row = conn.execute(
        '''
        SELECT id, fuente, f_valor, fecha, concepto, movimiento, importe_cent,
               divisa, disponible_cent, divisa2, observaciones, categoria2,
               comentarios, comentarios2, key_legacy, clave
        FROM movimientos WHERE id = ?
        ''',
        (mov_id,),
    ).fetchone()
    conn.close()
    if row is None:
        return jsonify({'error': 'Movimiento no encontrado'}), 404
    return jsonify(dict(row))


@app.post('/api/movimientos')
def create_movimiento():
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({'error': 'No se recibieron datos para crear'}), 400

    conn = get_db()
    try:
        fields = normalize_payload(payload)
        if 'fuente' not in fields or not fields['fuente']:
            return jsonify({'error': 'La fuente es obligatoria'}), 400
        if 'categoria2' in fields and fields['categoria2'] is not None:
            ensure_valid_categoria(conn, fields['categoria2'])

        if 'f_valor' not in fields or not fields['f_valor']:
            fields['f_valor'] = fields.get('fecha') or '2000-01-01 00:00:00'
        if 'fecha' not in fields or not fields['fecha']:
            fields['fecha'] = fields['f_valor']
        if 'importe_cent' not in fields:
            fields['importe_cent'] = 0
        if 'clave' not in fields or not fields['clave']:
            fields['clave'] = f"manual-{uuid.uuid4().hex}"
        if 'divisa' not in fields or not fields['divisa']:
            fields['divisa'] = 'EUR'
        if 'categoria2' not in fields or not fields['categoria2']:
            fields['categoria2'] = 'PENDIENTE'
        ensure_valid_categoria(conn, fields['categoria2'])

        columns = [
            'fuente', 'f_valor', 'fecha', 'concepto', 'movimiento', 'importe_cent',
            'divisa', 'disponible_cent', 'divisa2', 'observaciones', 'categoria2',
            'comentarios', 'comentarios2', 'key_legacy', 'clave'
        ]
        values = [fields.get(column) for column in columns]
        placeholders = ', '.join('?' for _ in columns)
        sql = f'INSERT INTO movimientos ({", ".join(columns)}) VALUES ({placeholders})'
        cursor = conn.execute(sql, values)
        conn.commit()
        row = fetch_movement_by_id(conn, cursor.lastrowid)
        return jsonify(dict(row))
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    finally:
        conn.close()


@app.post('/api/movimientos/<int:mov_id>/clone')
def clone_movimiento(mov_id: int):
    conn = get_db()
    try:
        row = fetch_movement_by_id(conn, mov_id)
        if row is None:
            return jsonify({'error': 'Movimiento no encontrado'}), 404

        source = dict(row)
        clone = {key: value for key, value in source.items() if key not in {'id'}}
        clone['clave'] = f"clone-{uuid.uuid4().hex}"
        clone['key_legacy'] = source.get('key_legacy')
        clone['concepto'] = source.get('concepto')
        clone['movimiento'] = source.get('movimiento')
        clone['categoria2'] = source.get('categoria2') or 'PENDIENTE'
        ensure_valid_categoria(conn, clone['categoria2'])

        columns = [
            'fuente', 'f_valor', 'fecha', 'concepto', 'movimiento', 'importe_cent',
            'divisa', 'disponible_cent', 'divisa2', 'observaciones', 'categoria2',
            'comentarios', 'comentarios2', 'key_legacy', 'clave'
        ]
        values = [clone.get(column) for column in columns]
        placeholders = ', '.join('?' for _ in columns)
        cursor = conn.execute(
            f'INSERT INTO movimientos ({", ".join(columns)}) VALUES ({placeholders})',
            values,
        )
        conn.commit()
        cloned_row = fetch_movement_by_id(conn, cursor.lastrowid)
        return jsonify(dict(cloned_row))
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    finally:
        conn.close()


@app.route('/api/movimientos/<int:mov_id>', methods=['POST', 'PUT'])
def update_movimiento(mov_id: int):
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({'error': 'No se recibieron datos para actualizar'}), 400

    conn = get_db()
    try:
        updates = normalize_payload(payload)
        if not updates:
            return jsonify({'error': 'No hay campos válidos para actualizar'}), 400
        if 'categoria2' in updates and updates['categoria2'] is not None:
            ensure_valid_categoria(conn, updates['categoria2'])

        assignments = ', '.join(f'{field} = ?' for field in updates)
        params = list(updates.values()) + [mov_id]
        conn.execute(f'UPDATE movimientos SET {assignments} WHERE id = ?', params)
        conn.commit()
        row = fetch_movement_by_id(conn, mov_id)
        return jsonify(dict(row))
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    finally:
        conn.close()


@app.delete('/api/movimientos/<int:mov_id>')
def delete_movimiento(mov_id: int):
    conn = get_db()
    try:
        row = fetch_movement_by_id(conn, mov_id)
        if row is None:
            return jsonify({'error': 'Movimiento no encontrado'}), 404

        conn.execute('DELETE FROM movimientos WHERE id = ?', (mov_id,))
        conn.commit()
        return jsonify({'deleted_id': mov_id, 'status': 'ok'})
    finally:
        conn.close()


if __name__ == '__main__':
    app.run(debug=False, use_reloader=False, host='0.0.0.0', port=5000)
