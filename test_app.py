import sqlite3
import tempfile
import unittest
import json
from datetime import date
from pathlib import Path
from unittest.mock import patch

import pandas as pd

from AppGastos import app, DB_PATH
from importar_input import (
    collect_input_rows,
    import_files,
    insert_rows,
    parse_bbva_xlsx,
    parse_bankinter_xlsx,
    parse_revolut_csv,
    parse_trade_republic_csv,
    preview_import_files,
)


class GastosAppTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_get_movimientos(self):
        response = self.client.get('/api/movimientos?limit=5')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIn('items', payload)
        self.assertIn('total', payload)
        self.assertGreaterEqual(len(payload['items']), 1)

    def test_update_movimiento(self):
        conn = sqlite3.connect(DB_PATH)
        row = conn.execute(
            'SELECT id, categoria2, comentarios FROM movimientos ORDER BY id LIMIT 1'
        ).fetchone()
        next_category = conn.execute(
            'SELECT categoria2 FROM categorias WHERE categoria2 != ? ORDER BY categoria2 LIMIT 1',
            (row[1],),
        ).fetchone()
        conn.close()

        self.assertIsNotNone(row)
        row_id = row[0]
        new_category = next_category[0]
        new_comment = 'Editado por prueba'

        response = self.client.post(
            f'/api/movimientos/{row_id}',
            json={'categoria2': new_category, 'comentarios': new_comment}
        )
        self.assertEqual(response.status_code, 200)

        conn = sqlite3.connect(DB_PATH)
        updated = conn.execute(
            'SELECT categoria2, comentarios FROM movimientos WHERE id = ?', (row_id,)
        ).fetchone()
        conn.close()

        self.assertEqual(updated[0], new_category)
        self.assertEqual(updated[1], new_comment)

    def test_create_movimiento(self):
        conn = sqlite3.connect(DB_PATH)
        category = conn.execute('SELECT categoria2 FROM categorias ORDER BY categoria2 LIMIT 1').fetchone()[0]
        source = conn.execute('SELECT fuente FROM cuentas ORDER BY fuente LIMIT 1').fetchone()[0]
        conn.close()

        response = self.client.post('/api/movimientos', json={
            'fuente': source,
            'f_valor': '2026-10-12 12:00:00',
            'fecha': '2026-10-12',
            'concepto': 'Línea creada por prueba',
            'movimiento': 'Alta manual',
            'importe_cent': 555,
            'divisa': 'EUR',
            'categoria2': category,
            'clave': 'prueba-nueva-clave-1',
        })
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload['concepto'], 'Línea creada por prueba')
        self.assertIn('id', payload)

    def test_clone_movimiento(self):
        conn = sqlite3.connect(DB_PATH)
        row = conn.execute(
            'SELECT id, fuente, concepto, movimiento, categoria2, importe_cent, clave FROM movimientos ORDER BY id LIMIT 1'
        ).fetchone()
        conn.close()

        response = self.client.post(f'/api/movimientos/{row[0]}/clone')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertNotEqual(payload['id'], row[0])
        self.assertEqual(payload['concepto'], row[2])
        self.assertEqual(payload['movimiento'], row[3])

    def test_delete_movimiento(self):
        conn = sqlite3.connect(DB_PATH)
        row = conn.execute(
            'SELECT id FROM movimientos ORDER BY id DESC LIMIT 1'
        ).fetchone()
        conn.close()

        self.assertIsNotNone(row)
        response = self.client.delete(f'/api/movimientos/{row[0]}')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload['deleted_id'], row[0])

    def test_dashboard(self):
        response = self.client.get('/api/dashboard?fuentes=BBVA,AMAZON')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIn('totales_por_categoria1', payload)
        self.assertIn('total_general', payload)
        self.assertIn('fuentes', payload)
        self.assertIn('fuentes_seleccionadas', payload)
        self.assertIsInstance(payload['totales_por_categoria1'], list)

    def test_dashboard_date_range_filter(self):
        response = self.client.get('/api/dashboard?date_start=2024-01-01&date_end=2024-12-31')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIn('date_start', payload)
        self.assertIn('date_end', payload)
        self.assertIn('total_general', payload)

    def test_dashboard_total_excludes_accounts_not_in_balance_totals(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                'INSERT INTO cuentas (fuente, contabilidad2) VALUES (?, ?)',
                ('AMAZON', 'BANCO'),
            )
            conn.execute(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, disponible_cent, categoria2, clave
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    'AMAZON', '2026-10-18', '2026-10-18', 'Snapshot Amazon',
                    'Movimiento', 0, 'EUR', 28331, 'PENDIENTE', 'amazon-snapshot',
                ),
            )
            conn.commit()
            conn.close()

            with patch('AppGastos.DB_PATH', db_path):
                config_response = self.client.get('/api/config/cuentas')
                self.assertEqual(config_response.status_code, 200)

                conn = sqlite3.connect(db_path)
                conn.execute(
                    'UPDATE cuentas SET incluir_en_saldos = 0 WHERE fuente = ?',
                    ('AMAZON',),
                )
                conn.commit()
                conn.close()

                response = self.client.get('/api/dashboard?fuentes=AMAZON')

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json()['total_general'], 0)

    def test_dashboard_saldos_can_select_a_previous_month(self):
        class FixedDate(date):
            @classmethod
            def today(cls):
                return cls(2026, 3, 10)

        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                'INSERT INTO cuentas (fuente, contabilidad2) VALUES (?, ?)',
                ('BBVA', 'BANCO'),
            )
            conn.execute(
                'CREATE TABLE app_config (clave TEXT PRIMARY KEY, valor TEXT NOT NULL)'
            )
            conn.execute(
                'INSERT INTO app_config (clave, valor) VALUES (?, ?)',
                ('meses_saldo_historico', '2'),
            )
            for movement_date, balance, key in (
                ('2026-01-01', 10000, 'january-snapshot'),
                ('2026-02-10', 15000, 'february-snapshot'),
            ):
                conn.execute(
                    '''
                    INSERT INTO movimientos (
                        fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                        divisa, disponible_cent, categoria2, clave
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        'BBVA', movement_date, movement_date, 'Saldo', 'Snapshot',
                        0, 'EUR', balance, 'PENDIENTE', key,
                    ),
                )
            conn.commit()
            conn.close()

            with patch('AppGastos.DB_PATH', db_path), patch('AppGastos.date', FixedDate):
                response = self.client.get('/api/dashboard/saldos?month=2026-02')
                invalid_response = self.client.get('/api/dashboard/saldos?month=2025-12')

            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertEqual(payload['month'], '2026-02')
            self.assertEqual(payload['available_months'], ['2026-03', '2026-02', '2026-01'])
            self.assertEqual(payload['actual'][9], 15000)
            self.assertEqual(payload['average'][9], 10000)
            self.assertEqual(invalid_response.status_code, 400)

    def test_dashboard_movements_apply_same_source_date_and_category_filters(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                'INSERT INTO categorias (categoria2, categoria1, categoria0) VALUES (?, ?, ?)',
                ('Supermercado', 'Casa', 'Hogar'),
            )
            conn.execute(
                'INSERT INTO categorias (categoria2, categoria1, categoria0) VALUES (?, ?, ?)',
                ('Combustible', 'Coche', 'Transporte'),
            )
            for source in ('BBVA', 'BANKINTER'):
                conn.execute(
                    'INSERT INTO cuentas (fuente, contabilidad2) VALUES (?, ?)',
                    (source, 'BANCO'),
                )
            movements = [
                ('BBVA', '2026-10-10', 'Compra de comida', -2500, 'Supermercado'),
                ('BANKINTER', '2026-10-10', 'Gasolina', -3000, 'Combustible'),
                ('BBVA', '2026-09-10', 'Compra antigua', -1000, 'Supermercado'),
            ]
            for index, (source, day, description, amount, category) in enumerate(movements):
                conn.execute(
                    '''
                    INSERT INTO movimientos (
                        fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                        divisa, categoria2, clave
                    ) VALUES (?, ?, ?, ?, ?, ?, 'EUR', ?, ?)
                    ''',
                    (source, day, day, description, 'Pago', amount, category, f'test-{index}'),
                )
            conn.commit()
            conn.close()

            with patch('AppGastos.DB_PATH', db_path):
                response = self.client.get(
                    '/api/dashboard/movimientos?fuentes=BBVA&date_start=2026-10-01'
                    '&date_end=2026-10-31&categoria0=Hogar'
                )
            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertEqual(payload['total'], 1)
            self.assertEqual(payload['items'][0]['concepto'], 'Compra de comida')
            self.assertEqual(payload['items'][0]['categoria2'], 'Supermercado')

    def test_input_importer_avoids_duplicates(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            csv_path = input_dir / 'transactions_2026-01-01_2026-02-01.csv'
            csv_path.write_text(
                'date,type,name,amount,fee,tax,currency,description\n'
                '2026-01-10,BUY,Supermercado,10.00,0,0,EUR,Compra\n'
                '2026-01-12,TRANSFER_INBOUND,Transferencia,50.00,0,0,EUR,Ingreso\n',
                encoding='utf-8',
            )
            db_path = Path(tmpdir) / 'gastos.db'

            first = import_files(input_dir=input_dir, db_path=db_path)
            second = import_files(input_dir=input_dir, db_path=db_path)

            self.assertGreater(first['inserted'], 0)
            self.assertEqual(second['inserted'], 0)

            conn = sqlite3.connect(db_path)
            total = conn.execute('SELECT COUNT(*) FROM movimientos').fetchone()[0]
            conn.close()
            self.assertEqual(total, 2)

    def test_bbva_import_updates_missing_snapshots_and_uses_latest_same_day_balance(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            workbook = input_dir / 'ultimos movimientos.xlsx'
            pd.DataFrame([
                ['Últimos movimientos', None, None, None, None, None, None, None, None],
                ['Fecha de generación del informe: 18/10/2026', None, None, None, None, None, None, None, None],
                [None] * 9,
                ['F.Valor', 'Fecha', 'Concepto', 'Movimiento', 'Importe', 'Divisa', 'Disponible', 'Divisa', 'Observaciones'],
                ['17/10/2026', '19/10/2026', 'Carrefour', 'Pago con tarjeta', -16.07, 'EUR', 99.03, 'EUR', 'CARREFOUR'],
                ['17/10/2026', '19/10/2026', 'Tamoil', 'Pago con tarjeta', -70.68, 'EUR', 115.10, 'EUR', 'TAMOIL'],
            ]).to_excel(workbook, index=False, header=False)

            parsed_rows = parse_bbva_xlsx(workbook)
            self.assertEqual([row['disponible_cent'] for row in parsed_rows], [9903, 11510])

            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            old_rows = [
                {**row, 'categoria2': 'Ropa', 'disponible_cent': None}
                for row in parsed_rows
            ]
            self.assertEqual(insert_rows(conn, old_rows)['inserted'], 2)
            conn.close()

            preview = preview_import_files(input_dir, db_path)
            self.assertEqual(preview['count'], 2)
            self.assertTrue(all(row['update_snapshot'] for row in preview['rows']))

            result = import_files(input_dir, db_path)
            self.assertEqual(result['inserted'], 0)
            self.assertEqual(result['updated'], 2)

            with patch('AppGastos.DB_PATH', db_path):
                response = self.client.get('/api/dashboard?fuentes=BBVA')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json()['total_general'], 9903)

    def test_bankinter_parser_includes_running_balance(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            workbook = Path(tmpdir) / 'Movimientos.xlsx'
            pd.DataFrame([
                ['Fecha contable', 'Fecha valor', 'Descripción', 'Importe', 'Saldo', 'Divisa'],
                ['13/10/2026', '12/10/2026', 'GUEROIL', -6.15, 10346.72, 'EUR'],
            ]).to_excel(workbook, index=False, header=False)

            rows = parse_bankinter_xlsx(workbook)
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]['importe_cent'], -615)
            self.assertEqual(rows[0]['disponible_cent'], 1034672)

    def test_import_preview_endpoint(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            csv_path = input_dir / 'transactions_2026-01-01_2026-02-01.csv'
            csv_path.write_text(
                'date,type,name,amount,fee,tax,currency,description\n'
                '2026-01-10,BUY,Supermercado,10.00,0,0,EUR,Compra\n',
                encoding='utf-8',
            )

            with app.app_context():
                from importar_input import import_files
                import_files(input_dir=input_dir, db_path=Path(tmpdir) / 'gastos.db')

            response = self.client.get('/api/importar_input/preview')
            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertIn('rows', payload)
            self.assertGreaterEqual(len(payload['rows']), 1)

    def test_import_api_passes_selected_keys(self):
        from unittest.mock import patch

        with patch('AppGastos.import_files', return_value={'inserted': 1, 'skipped': 0}) as import_mock:
            response = self.client.post('/api/importar_input', json={'claves': ['selected-key']})

        self.assertEqual(response.status_code, 200)
        import_mock.assert_called_once_with(selected_keys={'selected-key'})

    def test_importer_imports_only_selected_keys(self):
        from importar_input import build_unique_key

        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            db_path = Path(tmpdir) / 'gastos.db'
            rows = [
                {
                    'fuente': 'BBVA', 'f_valor': '2026-10-01', 'fecha': '2026-10-01',
                    'concepto': 'Seleccionado', 'movimiento': 'Compra', 'importe_cent': -100,
                    'divisa': 'EUR', 'categoria2': 'PENDIENTE',
                },
                {
                    'fuente': 'BBVA', 'f_valor': '2026-10-02', 'fecha': '2026-10-02',
                    'concepto': 'No seleccionado', 'movimiento': 'Compra', 'importe_cent': -200,
                    'divisa': 'EUR', 'categoria2': 'PENDIENTE',
                },
            ]
            with patch('importar_input.collect_input_rows', return_value=(rows, 1)):
                result = import_files(input_dir, db_path, selected_keys={build_unique_key(rows[0])})

            self.assertEqual(result['inserted'], 1)
            conn = sqlite3.connect(db_path)
            saved = conn.execute('SELECT concepto FROM movimientos').fetchall()
            conn.close()
            self.assertEqual(saved, [('Seleccionado',)])

    def test_importer_supports_legacy_database_without_unique_key(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            db_path = Path(tmpdir) / 'gastos.db'
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            legacy_schema = schema_sql.read_text(encoding='utf-8').replace(
                'clave           TEXT NOT NULL UNIQUE',
                'clave           TEXT NOT NULL',
            )
            conn = sqlite3.connect(db_path)
            conn.executescript(legacy_schema)
            conn.close()
            row = {
                'fuente': 'PIBANK', 'f_valor': '2026-10-12', 'fecha': '2026-10-12',
                'concepto': 'Transferencia seleccionada', 'movimiento': 'Transferencia',
                'importe_cent': 1000, 'divisa': 'EUR', 'categoria2': 'PENDIENTE',
            }

            with patch('importar_input.collect_input_rows', return_value=([row], 1)):
                result = import_files(input_dir, db_path)

            self.assertEqual(result['inserted'], 1)
            conn = sqlite3.connect(db_path)
            saved = conn.execute('SELECT concepto FROM movimientos').fetchall()
            conn.close()
            self.assertEqual(saved, [('Transferencia seleccionada',)])

    def test_import_preview_is_valid_json_with_missing_values(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            rows = [{
                'fuente': 'BANCO',
                'f_valor': float('nan'),
                'fecha': float('nan'),
                'concepto': float('nan'),
                'movimiento': 'Compra',
                'importe_cent': 100,
                'divisa': 'EUR',
                'categoria2': 'PENDIENTE',
                'observaciones': float('nan'),
                'source_file': 'movimientos.xlsx',
            }]

            with patch('importar_input.collect_input_rows', return_value=(rows, 1)):
                result = preview_import_files(input_dir, Path(tmpdir) / 'gastos.db')

            json.dumps(result, allow_nan=False)
            self.assertIsNone(result['rows'][0]['f_valor'])
            self.assertIsNone(result['rows'][0]['concepto'])

    def test_import_skips_existing_legacy_movement(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, observaciones, categoria2, key_legacy, clave
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    'BANKINTER', '2026-10-07 00:00:00', '2026-10-07 00:00:00',
                    'RECIBO /O2 FIBRA', 'RECIBO', -4000, 'EUR',
                    'RECIBO /O2 FIBRA', 'Hogar', 'legacy-key', 'legacy-clave',
                ),
            )
            conn.commit()
            conn.close()

            rows = [{
                'fuente': 'BANKINTER',
                'f_valor': '07/10/2026',
                'fecha': '07/10/2026',
                'concepto': 'RECIBO /O2 FIBRA',
                'movimiento': 'Movimiento',
                'importe_cent': -4000,
                'divisa': 'EUR',
                'observaciones': '',
                'categoria2': 'PENDIENTE',
                'source_file': 'Movimientos.xlsx',
            }]
            rows.append({**rows[0], 'importe_cent': -5000})

            with patch('importar_input.collect_input_rows', return_value=(rows, 1)):
                preview = preview_import_files(input_dir, db_path)
            with patch('importar_input.collect_input_rows', return_value=(rows, 1)):
                result = import_files(input_dir, db_path)

            self.assertEqual(preview['count'], 1)
            self.assertEqual(preview['rows'][0]['importe_cent'], -5000)
            self.assertEqual(result['inserted'], 1)
            conn = sqlite3.connect(db_path)
            total = conn.execute('SELECT COUNT(*) FROM movimientos').fetchone()[0]
            conn.close()
            self.assertEqual(total, 2)

    def test_trade_republic_match_uses_description_as_legacy_concept(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            description = 'GIRAFFE SOUTHBANK, 117,84\u00a0\u00a3, exchange rate: 1,1670061'
            legacy_description = 'GIRAFFE SOUTHBANK, 117,84\u00c2\u00a0\u00c2\u00a3, exchange rate: 1,1670061'
            conn.execute(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, observaciones, categoria2, key_legacy, clave
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    'TRADE REPUBLIC', '2026-09-22 00:00:00', '2026-09-22 00:00:00',
                    legacy_description, 'CARD_TRANSACTION_INTERNATIONAL', -13752, 'EUR',
                    description, 'Ocio', 'legacy-key', 'legacy-clave',
                ),
            )
            conn.commit()
            conn.close()
            rows = [{
                'fuente': 'TRADE REPUBLIC',
                'f_valor': '2026-09-22',
                'fecha': '2026-09-22',
                'concepto': 'GIRAFFE SOUTHBANK',
                'movimiento': 'CARD_TRANSACTION_INTERNATIONAL',
                'importe_cent': -13752,
                'divisa': 'EUR',
                'observaciones': description,
                'categoria2': 'PENDIENTE',
                'source_file': 'transactions.csv',
            }]

            with patch('importar_input.collect_input_rows', return_value=(rows, 1)):
                preview = preview_import_files(input_dir, db_path)
            with patch('importar_input.collect_input_rows', return_value=(rows, 1)):
                result = import_files(input_dir, db_path)

            self.assertEqual(preview['count'], 0)
            self.assertEqual(result['inserted'], 0)

    def test_trade_republic_interest_matches_legacy_spanish_row(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, observaciones, categoria2, key_legacy, clave
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    'TRADE REPUBLIC', '2026-07-01 00:00:00', '2026-07-01 00:00:00',
                    'Intereses Trade Republic', 'Intereses', 3165, 'EUR',
                    'Bruto: 39,08 | Retención: -7,43', 'Ingreso', 'legacy-key', 'legacy-clave',
                ),
            )
            conn.commit()
            conn.close()
            row = {
                'fuente': 'TRADE REPUBLIC',
                'f_valor': '2026-07-01',
                'fecha': '2026-07-01',
                'concepto': 'Interest payment for payout collection 019f1b8c-9a82-7442-b25a-0f4893118b9c',
                'movimiento': 'INTEREST_PAYMENT',
                'importe_cent': 3165,
                'divisa': 'EUR',
                'observaciones': 'Interest payment for payout collection 019f1b8c-9a82-7442-b25a-0f4893118b9c',
                'categoria2': 'PENDIENTE',
                'source_file': 'transactions.csv',
            }

            with patch('importar_input.collect_input_rows', return_value=([row], 1)):
                preview = preview_import_files(input_dir, db_path)
            with patch('importar_input.collect_input_rows', return_value=([row], 1)):
                result = import_files(input_dir, db_path)

            self.assertEqual(preview['count'], 0)
            self.assertEqual(result['inserted'], 0)

    def test_trade_republic_blank_buy_amount_uses_shares_and_price(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            csv_path = input_dir / 'transactions_2026-10-02.csv'
            csv_path.write_text(
                'date,type,name,amount,fee,tax,currency,description,shares,price\n'
                '2026-10-02,BUY,Core MSCI World USD (Acc),,,,EUR,BUY IE00B4L5Y983,0.043987,130.265\n'
                '2026-10-02,BUY,Core MSCI World USD (Acc),,,,EUR,BUY IE00B4L5Y983,1.534330,130.350\n',
                encoding='utf-8',
            )
            parsed_rows = parse_trade_republic_csv(csv_path)
            self.assertEqual([row['importe_cent'] for row in parsed_rows], [-573, -20000])

            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            for index, amount in enumerate((-573, -20000)):
                conn.execute(
                    '''
                    INSERT INTO movimientos (
                        fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                        divisa, observaciones, categoria2, key_legacy, clave
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        'TRADE REPUBLIC', '2026-10-02 00:00:00', '2026-10-02 00:00:00',
                        'Core MSCI World USD (Acc)', 'Inversión', amount, 'EUR',
                        'BUY IE00B4L5Y983', 'Ahorro', f'legacy-{index}', f'legacy-clave-{index}',
                    ),
                )
            conn.commit()
            conn.close()

            preview = preview_import_files(input_dir, db_path)
            result = import_files(input_dir, db_path)
            self.assertEqual(preview['count'], 0)
            self.assertEqual(result['inserted'], 0)

    def test_revolut_amount_with_decimal_point_matches_existing_topup(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            csv_path = input_dir / 'account-statement_2026-09.csv'
            csv_path.write_text(
                'Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo\n'
                'Recargas,,2026-09-17 23:05:14,2026-09-17 23:05:15,Pago de MANUEL VALLEJO SÁNCHEZ,50.00,0.00,EUR,COMPLETED,53.01\n',
                encoding='utf-8',
            )
            parsed_row = parse_revolut_csv(csv_path)[0]
            self.assertEqual(parsed_row['importe_cent'], 5000)
            self.assertEqual(parsed_row['disponible_cent'], 5301)

            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, disponible_cent, observaciones, categoria2, key_legacy, clave
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    'REVOLUT', '2026-09-17 23:05:15', '2026-09-17 23:05:14',
                    'Pago de MANUEL VALLEJO SÃ\x81NCHEZ', 'Recargas', 5000, 'EUR',
                    5301, 'Pago de MANUEL VALLEJO SÃ\x81NCHEZ', 'Ingreso', 'legacy-key', 'legacy-clave',
                ),
            )
            conn.commit()
            conn.close()

            preview = preview_import_files(input_dir, db_path)
            result = import_files(input_dir, db_path)
            self.assertEqual(preview['count'], 0)
            self.assertEqual(result['inserted'], 0)

    def test_revolut_transfer_matches_either_stored_date(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            csv_path = input_dir / 'account-statement_2026-10.csv'
            csv_path.write_text(
                'Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo\n'
                'Transferir,Actual,2026-10-03 17:24:26,,To MANUEL VALLEJO SÁNCHEZ,-10.00,0.00,EUR,PENDIENTE,\n',
                encoding='utf-8',
            )
            parsed_row = parse_revolut_csv(csv_path)[0]
            self.assertEqual(parsed_row['f_valor'], '2026-10-03 17:24:26')
            self.assertEqual(parsed_row['fecha'], '2026-10-03 17:24:26')

            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, observaciones, categoria2, key_legacy, clave
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    'REVOLUT', '2026-10-03 18:09:06', '2026-10-03 17:24:26',
                    'To MANUEL VALLEJO SÃ\x81NCHEZ', 'Transferir', -1000, 'EUR',
                    'To MANUEL VALLEJO SÃ\x81NCHEZ', 'Interno', 'legacy-key', 'legacy-clave',
                ),
            )
            conn.commit()
            conn.close()

            preview = preview_import_files(input_dir, db_path)
            result = import_files(input_dir, db_path)
            self.assertEqual(preview['count'], 0)
            self.assertEqual(result['inserted'], 0)

    def test_revolut_skips_transactions_without_any_date(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            csv_path = Path(tmpdir) / 'account-statement_2026-10.csv'
            csv_path.write_text(
                'Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo\n'
                'Pago con tarjeta,,,,Sprinter,-34.99,0.00,EUR,COMPLETED,\n',
                encoding='utf-8',
            )

            self.assertEqual(parse_revolut_csv(csv_path), [])

    def test_detect_parser_accepts_xls_and_accented_names(self):
        from importar_input import detect_parser

        self.assertIsNotNone(detect_parser(Path('Movimientos_2026_10_12.xls')))
        self.assertIsNotNone(detect_parser(Path('2026Y-10M-12D-21_51_05-Últimos movimientos.xlsx')))
        self.assertIsNotNone(detect_parser(Path('Movimientos_ES4602353141190272875725_12-10-2026.xls')))

    def test_importer_detects_timestamped_cash_workbook(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir)
            pd.DataFrame([
                {
                    'Fecha': '23/10/2026',
                    'Hora': '20:18',
                    'Tipo': ' Interno ',
                    'Importe': -15.00,
                    'Descripción': 'Movimiento interno',
                    'Lugar': None,
                    'Disponible': 30.00,
                },
                {
                    'Fecha': '23/10/2026',
                    'Hora': '20:19',
                    'Tipo': 'Gasto',
                    'Importe': -34.99,
                    'Descripción': 'Compra en efectivo',
                    'Lugar': None,
                    'Disponible': 10.01,
                },
            ]).to_excel(input_dir / 'gastos_20261023_201841.xlsx', index=False)

            rows, processed_files = collect_input_rows(input_dir)

            self.assertEqual(processed_files, 1)
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]['fuente'], 'EFECTIVO')
            self.assertEqual(rows[0]['f_valor'], '23/10/2026')
            self.assertEqual(rows[0]['movimiento'], 'Gasto')
            self.assertEqual(rows[0]['importe_cent'], -3499)

    def test_money_to_cents_handles_bank_formats(self):
        from importar_input import money_to_cents

        self.assertEqual(money_to_cents('1.234,56'), 123456)
        self.assertEqual(money_to_cents('-1.234,56'), -123456)
        self.assertEqual(money_to_cents('€1,234.56'), 123456)
        self.assertEqual(money_to_cents('1,234.56'), 123456)


if __name__ == '__main__':
    unittest.main()
