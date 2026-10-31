import sqlite3
import tempfile
import unittest
import json
import os
from datetime import date
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

import pandas as pd

from AppGastos import AHORRO_AMOUNT_COLUMNS, app, DB_PATH
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

    def test_budget_category_movements_are_limited_to_selected_month_and_expenses(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                "INSERT INTO categorias (categoria2, categoria1, categoria0) VALUES (?, ?, 'Gasto')",
                ('Supermercado', 'Alimentación'),
            )
            conn.execute(
                "INSERT INTO categorias (categoria2, categoria1, categoria0) VALUES (?, ?, 'Ingreso')",
                ('Ingreso', 'Ingresos'),
            )
            conn.executemany(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, categoria2, clave
                ) VALUES (?, ?, ?, ?, ?, ?, 'EUR', ?, ?)
                ''',
                [
                    ('BBVA', '2026-10-10', '2026-10-10', 'Compra octubre', 'Tarjeta', -2500, 'Supermercado', 'budget-oct'),
                    ('BBVA', '2026-09-10', '2026-09-10', 'Compra septiembre', 'Tarjeta', -1000, 'Supermercado', 'budget-sep'),
                    ('BBVA', '2026-10-11', '2026-10-11', 'Ingreso octubre', 'Transferencia', 5000, 'Ingreso', 'budget-income'),
                ],
            )
            conn.commit()
            conn.close()

            with patch('AppGastos.DB_PATH', db_path):
                response = self.client.get(
                    '/api/presupuestos/movimientos?month=2026-10&categoria2=Supermercado'
                )

            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertEqual(payload['month'], '2026-10')
            self.assertEqual(payload['categoria2'], 'Supermercado')
            self.assertEqual([item['concepto'] for item in payload['items']], ['Compra octubre'])

    def test_budget_amounts_are_editable_and_empty_categories_are_hidden(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.executemany(
                "INSERT INTO categorias (categoria2, categoria1, categoria0) VALUES (?, ?, 'Gasto')",
                [
                    ('Supermercado', 'Alimentación'),
                    ('Sin presupuesto', 'Otros'),
                ],
            )
            conn.execute(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, categoria2, clave
                ) VALUES (?, ?, ?, ?, ?, ?, 'EUR', ?, ?)
                ''',
                (
                    'BBVA', '2026-10-10', '2026-10-10', 'Compra de prueba',
                    'Tarjeta', -2500, 'Supermercado', 'budget-config-test',
                ),
            )
            conn.commit()
            conn.close()

            with patch('AppGastos.DB_PATH', db_path):
                config_response = self.client.get('/api/config/presupuestos')
                update_response = self.client.put(
                    '/api/config/presupuestos/Supermercado',
                    json={'presupuesto_cent': 65000},
                )
                report_response = self.client.get('/api/presupuestos?month=2026-10')
                clear_response = self.client.put(
                    '/api/config/presupuestos/Supermercado',
                    json={'presupuesto_cent': None},
                )
                report_without_budget_response = self.client.get('/api/presupuestos?month=2026-10')

            self.assertEqual(config_response.status_code, 200)
            config_categories = {
                item['categoria2']: item['presupuesto_cent']
                for item in config_response.get_json()['categorias']
            }
            self.assertEqual(config_categories['Supermercado'], 50000)
            self.assertIsNone(config_categories['Sin presupuesto'])
            self.assertEqual(update_response.status_code, 200)
            self.assertEqual(update_response.get_json()['presupuesto_cent'], 65000)

            report = report_response.get_json()
            self.assertEqual(report['groups'][0]['children'][0]['budget_cent'], 65000)
            self.assertEqual(
                [group['categoria1'] for group in report['groups']],
                ['Alimentación'],
            )
            self.assertEqual(clear_response.status_code, 200)
            cleared_report = report_without_budget_response.get_json()
            self.assertEqual(
                [group['children'][0]['categoria2'] for group in cleared_report['groups']],
                ['Supermercado'],
            )
            self.assertIsNone(cleared_report['groups'][0]['children'][0]['budget_cent'])

    def test_movimientos_can_return_all_filtered_rows_without_pagination(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                'INSERT INTO cuentas (fuente, contabilidad2) VALUES (?, ?)',
                ('BBVA', 'BANCO'),
            )
            conn.executemany(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, categoria2, clave
                ) VALUES (?, ?, ?, ?, ?, ?, 'EUR', 'PENDIENTE', ?)
                ''',
                [
                    (
                        'BBVA', '2026-10-10', '2026-10-10', f'Movimiento {index}',
                        'Pago', -100, f'movement-all-{index}',
                    )
                    for index in range(55)
                ],
            )
            conn.commit()
            conn.close()

            with patch('AppGastos.DB_PATH', db_path):
                paged_response = self.client.get('/api/movimientos?limit=50')
                chunk_response = self.client.get('/api/movimientos?page=2&limit=20')
                all_response = self.client.get('/api/movimientos?all=1')

            self.assertEqual(paged_response.status_code, 200)
            self.assertEqual(len(paged_response.get_json()['items']), 50)
            self.assertEqual(chunk_response.status_code, 200)
            self.assertEqual(chunk_response.get_json()['page'], 2)
            self.assertEqual(len(chunk_response.get_json()['items']), 20)
            self.assertEqual(all_response.status_code, 200)
            self.assertEqual(all_response.get_json()['total'], 55)
            self.assertEqual(len(all_response.get_json()['items']), 55)

    def test_movimientos_filter_by_exact_amount_or_inclusive_range(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.executemany(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, categoria2, clave
                ) VALUES (?, ?, ?, ?, ?, ?, 'EUR', 'PENDIENTE', ?)
                ''',
                [
                    ('BBVA', '2026-10-10', '2026-10-10', 'A', 'Pago', -1000, 'amount-a'),
                    ('BBVA', '2026-10-11', '2026-10-11', 'B', 'Pago', -500, 'amount-b'),
                    ('BBVA', '2026-10-12', '2026-10-12', 'C', 'Pago', 500, 'amount-c'),
                    ('BBVA', '2026-10-13', '2026-10-13', 'D', 'Pago', 1000, 'amount-d'),
                ],
            )
            conn.commit()
            conn.close()

            with patch('AppGastos.DB_PATH', db_path):
                exact_response = self.client.get(
                    '/api/movimientos?all=1&importe_min_cent=-500'
                )
                range_response = self.client.get(
                    '/api/movimientos?all=1&importe_min_cent=-500&importe_max_cent=500'
                )
                upper_response = self.client.get(
                    '/api/movimientos?all=1&importe_max_cent=-500'
                )
                invalid_range_response = self.client.get(
                    '/api/movimientos?importe_min_cent=500&importe_max_cent=-500'
                )

            self.assertEqual(exact_response.status_code, 200)
            self.assertEqual(
                [row['importe_cent'] for row in exact_response.get_json()['items']],
                [-500],
            )
            self.assertEqual(range_response.status_code, 200)
            self.assertEqual(
                {row['importe_cent'] for row in range_response.get_json()['items']},
                {-500, 500},
            )
            self.assertEqual(upper_response.status_code, 200)
            self.assertEqual(
                {row['importe_cent'] for row in upper_response.get_json()['items']},
                {-1000, -500},
            )
            self.assertEqual(invalid_range_response.status_code, 400)

    def test_movimientos_searches_all_fields_and_sorts_before_pagination(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.executemany(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, disponible_cent, divisa2, observaciones, categoria2,
                    comentarios, comentarios2, key_legacy, clave
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                [
                    ('BBVA', '2026-10-10', '2026-10-10', 'Primero', 'Pago', 1000, 'EUR', 1000, '', '', 'PENDIENTE', '', '', '', 'global-a'),
                    ('BBVA', '2026-10-11', '2026-10-11', 'Segundo', 'Pago', -100, 'EUR', 2000, 'USD', '', 'PENDIENTE', '', '', '', 'global-b'),
                    ('BBVA', '2026-10-12', '2026-10-12', 'Tercero', 'Pago', 500, 'EUR', 3000, '', '', 'PENDIENTE', '', '', '', 'global-c'),
                ],
            )
            conn.commit()
            conn.close()

            with patch('AppGastos.DB_PATH', db_path):
                search_response = self.client.get('/api/movimientos?all=1&q=USD')
                date_search_response = self.client.get('/api/movimientos?all=1&q=2026-10-12')
                first_page = self.client.get(
                    '/api/movimientos?sort_by=importe_cent&sort_dir=asc&page=1&limit=2'
                )
                second_page = self.client.get(
                    '/api/movimientos?sort_by=importe_cent&sort_dir=asc&page=2&limit=2'
                )
                available_sort = self.client.get(
                    '/api/movimientos?all=1&sort_by=disponible_calculado_cent&sort_dir=asc'
                )
                export_response = self.client.get(
                    '/api/movimientos/export?sort_by=importe_cent&sort_dir=asc'
                )
                invalid_sort = self.client.get('/api/movimientos?sort_by=not_a_column')

            self.assertEqual(search_response.status_code, 200)
            self.assertEqual(
                [item['clave'] for item in search_response.get_json()['items']],
                ['global-b'],
            )
            self.assertEqual(date_search_response.status_code, 200)
            self.assertEqual(
                [item['clave'] for item in date_search_response.get_json()['items']],
                ['global-c'],
            )
            self.assertEqual(first_page.status_code, 200)
            self.assertEqual(
                [item['importe_cent'] for item in first_page.get_json()['items']],
                [-100, 500],
            )
            self.assertEqual(second_page.status_code, 200)
            self.assertEqual(
                [item['importe_cent'] for item in second_page.get_json()['items']],
                [1000],
            )
            self.assertEqual(available_sort.status_code, 200)
            self.assertEqual(
                [item['clave'] for item in available_sort.get_json()['items']],
                ['global-a', 'global-b', 'global-c'],
            )
            self.assertEqual(export_response.status_code, 200)
            exported = pd.read_excel(BytesIO(export_response.data))
            self.assertEqual(exported['importe_cent'].tolist(), [-100, 500, 1000])
            self.assertEqual(invalid_sort.status_code, 400)

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
        self.assertIn('totales_por_fuente', payload)
        self.assertIn('total_general', payload)
        self.assertIn('fuentes', payload)
        self.assertIn('fuentes_seleccionadas', payload)
        self.assertIsInstance(payload['totales_por_categoria1'], list)

    def test_dashboard_returns_balance_total_by_source(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.executemany(
                '''
                INSERT INTO cuentas (
                    fuente, contabilidad2, ahorro_no_disponible_cent
                ) VALUES (?, 'BANCO', ?)
                ''',
                [('BBVA', 1200), ('Bankinter', 0)],
            )
            conn.executemany(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, importe_cent, divisa,
                    disponible_cent, categoria2, clave
                ) VALUES (?, '2026-10-20', '2026-10-20', 0, 'EUR', ?, 'PENDIENTE', ?)
                ''',
                [('BBVA', 10000, 'bbva-balance'), ('Bankinter', 24500, 'bankinter-balance')],
            )
            conn.commit()
            conn.close()

            with patch('AppGastos.DB_PATH', db_path):
                response = self.client.get('/api/dashboard?date_end=2026-10-20')
                selected_response = self.client.get(
                    '/api/dashboard?fuentes=BBVA&date_end=2026-10-20'
                )

            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertEqual(payload['total_general'], 33300)
            self.assertEqual(payload['total_general_con_excluido'], 34500)
            self.assertEqual(
                payload['totales_por_fuente'],
                [
                    {
                        'fuente': 'Bankinter',
                        'total_cent': 24500,
                        'total_con_excluido_cent': 24500,
                    },
                    {
                        'fuente': 'BBVA',
                        'total_cent': 8800,
                        'total_con_excluido_cent': 10000,
                    },
                ],
            )
            self.assertEqual(
                sum(item['total_cent'] for item in payload['totales_por_fuente']),
                payload['total_general'],
            )
            self.assertEqual(selected_response.get_json()['totales_por_fuente'], [
                {
                    'fuente': 'BBVA',
                    'total_cent': 8800,
                    'total_con_excluido_cent': 10000,
                },
            ])

    def test_account_balance_can_be_calculated_from_movements(self):
        class FixedDate(date):
            @classmethod
            def today(cls):
                return cls(2026, 7, 13)

        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                '''
                INSERT INTO cuentas (fuente, contabilidad2, saldo_por_movimientos)
                VALUES (?, ?, ?)
                ''',
                ('AMAZON', 'BANCO', 1),
            )
            conn.executemany(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, importe_cent, divisa,
                    disponible_cent, categoria2, clave
                ) VALUES ('AMAZON', ?, ?, ?, ?, 'EUR', ?, 'PENDIENTE', ?)
                ''',
                [
                    ('2026-03-19', '2026-03-19', 'Recarga Amazon', 3300, 3300, 'amazon-credit'),
                    ('2026-03-23', '2026-03-23', 'Compra Amazon', -3300, 0, 'amazon-purchase'),
                    ('2026-07-11', '2026-07-13', 'Saldo Amazon Seguro Coche', 20000, 28331, 'amazon-july-credit'),
                    ('2026-07-11', '2026-07-13', 'Bizum', -20000, 28331, 'amazon-july-debit'),
                ],
            )
            conn.commit()
            conn.close()

            with patch('AppGastos.DB_PATH', db_path), patch('AppGastos.date', FixedDate):
                march_balance = self.client.get(
                    '/api/dashboard?fuentes=AMAZON&date_end=2026-03-20'
                )
                after_purchase_balance = self.client.get(
                    '/api/dashboard?fuentes=AMAZON&date_end=2026-03-24'
                )
                latest_balance = self.client.get(
                    '/api/dashboard?fuentes=AMAZON&date_end=2026-07-11'
                )
                balances = self.client.get(
                    '/api/dashboard/saldos?fuentes=AMAZON&month=2026-07'
                )

            self.assertEqual(march_balance.status_code, 200)
            self.assertEqual(march_balance.get_json()['total_general'], 3300)
            self.assertEqual(after_purchase_balance.get_json()['total_general'], 0)
            self.assertEqual(latest_balance.get_json()['total_general'], 0)
            self.assertEqual(balances.status_code, 200)
            self.assertEqual(balances.get_json()['actual'][10], 0)

    def test_dashboard_date_range_filter(self):
        response = self.client.get('/api/dashboard?date_start=2024-01-01&date_end=2024-12-31')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIn('date_start', payload)
        self.assertIn('date_end', payload)
        self.assertIn('total_general', payload)

    def test_savings_column_config_and_hidden_modal_values(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            conn.execute(
                'CREATE TABLE ahorro ("Mes" TEXT, '
                + ', '.join(f'"{column}" REAL' for column in AHORRO_AMOUNT_COLUMNS)
                + ', "Considerado en grafica?" TEXT, "Comentarios" TEXT)'
            )
            conn.close()

            with patch('AppGastos.DB_PATH', db_path):
                initial_config = self.client.get('/api/config/ahorro-proyeccion')
                update_config = self.client.put(
                    '/api/config/ahorro-proyeccion',
                    json={
                        'columnas_grafica_ahorro': ['Trade Wallet', 'Ahorro BBVA'],
                        'columnas_modal_ahorro': ['Ahorro BBVA'],
                        'fecha_inicio_evolucion_ahorro': '2026-03-01',
                        'fecha_fin_evolucion_ahorro': '2026-10-25',
                    },
                )
                invalid_config = self.client.put(
                    '/api/config/ahorro-proyeccion',
                    json={'columnas_modal_ahorro': ['Columna desconocida']},
                )
                invalid_date_range = self.client.put(
                    '/api/config/ahorro-proyeccion',
                    json={'fecha_inicio_evolucion_ahorro': '2026-11-01'},
                )
                invalid_date = self.client.put(
                    '/api/config/ahorro-proyeccion',
                    json={'fecha_fin_evolucion_ahorro': 'fecha-invalida'},
                )
                persisted_config = self.client.get('/api/config/ahorro-proyeccion')
                save_response = self.client.post(
                    '/api/ahorro',
                    json={
                        'Mes': '2026-10-25',
                        'Ahorro BBVA': 125.5,
                        'Trade Wallet': 999,
                    },
                )
                conn = sqlite3.connect(db_path)
                conn.row_factory = sqlite3.Row
                saved_row = conn.execute('SELECT * FROM ahorro').fetchone()
                conn.close()

            self.assertEqual(initial_config.status_code, 200)
            self.assertEqual(
                initial_config.get_json()['columnas_modal_ahorro'],
                list(AHORRO_AMOUNT_COLUMNS[:11]),
            )
            self.assertEqual(update_config.status_code, 200)
            self.assertEqual(
                update_config.get_json()['columnas_grafica_ahorro'],
                ['Ahorro BBVA', 'Trade Wallet'],
            )
            self.assertEqual(invalid_config.status_code, 400)
            self.assertEqual(invalid_date_range.status_code, 400)
            self.assertEqual(invalid_date.status_code, 400)
            self.assertEqual(
                update_config.get_json()['fecha_inicio_evolucion_ahorro'],
                '2026-03-01',
            )
            self.assertEqual(
                persisted_config.get_json()['fecha_inicio_evolucion_ahorro'],
                '2026-03-01',
            )
            self.assertEqual(
                persisted_config.get_json()['fecha_fin_evolucion_ahorro'],
                '2026-10-25',
            )
            self.assertEqual(save_response.status_code, 200)
            self.assertEqual(saved_row['Ahorro BBVA'], 125.5)
            self.assertEqual(saved_row['Trade Wallet'], 0)
            self.assertEqual(saved_row['Ahorro Bankinter'], 0)

    def test_account_visibility_flags_are_independent_between_dashboard_and_balances(self):
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
                account = config_response.get_json()['cuentas'][0]
                self.assertEqual(account['incluir_en_saldos'], 1)
                self.assertEqual(account['incluir_en_resumen'], 1)
                self.assertEqual(account['saldo_por_movimientos'], 0)

                balance_flag_response = self.client.put(
                    '/api/config/cuentas/AMAZON',
                    json={'incluir_en_saldos': False},
                )
                dashboard_response = self.client.get('/api/dashboard?fuentes=AMAZON')
                balances_response = self.client.get('/api/dashboard/saldos?fuentes=AMAZON')

                summary_flag_response = self.client.put(
                    '/api/config/cuentas/AMAZON',
                    json={'incluir_en_resumen': False},
                )
                excluded_dashboard_response = self.client.get('/api/dashboard?fuentes=AMAZON')
                balances_after_summary_change = self.client.get(
                    '/api/dashboard/saldos?fuentes=AMAZON'
                )
                movement_method_response = self.client.put(
                    '/api/config/cuentas/AMAZON',
                    json={'saldo_por_movimientos': True},
                )

            self.assertEqual(balance_flag_response.status_code, 200)
            self.assertEqual(balance_flag_response.get_json()['incluir_en_saldos'], 0)
            self.assertEqual(balance_flag_response.get_json()['incluir_en_resumen'], 1)
            self.assertEqual(dashboard_response.get_json()['total_general'], 28331)
            self.assertTrue(all(value is None for value in balances_response.get_json()['actual']))

            self.assertEqual(summary_flag_response.status_code, 200)
            self.assertEqual(summary_flag_response.get_json()['incluir_en_saldos'], 0)
            self.assertEqual(summary_flag_response.get_json()['incluir_en_resumen'], 0)
            self.assertEqual(excluded_dashboard_response.get_json()['total_general'], 0)
            self.assertEqual(
                balances_after_summary_change.get_json()['actual'],
                balances_response.get_json()['actual'],
            )
            self.assertEqual(movement_method_response.status_code, 200)
            self.assertEqual(movement_method_response.get_json()['saldo_por_movimientos'], 1)

    def test_account_config_migration_preserves_visibility_and_sets_amazon_movement_mode(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                'INSERT INTO cuentas (fuente, contabilidad2, incluir_en_saldos) VALUES (?, ?, ?)',
                ('AMAZON', 'BANCO', 0),
            )
            conn.execute('ALTER TABLE cuentas DROP COLUMN incluir_en_resumen')
            conn.execute('ALTER TABLE cuentas DROP COLUMN saldo_por_movimientos')
            conn.commit()
            conn.close()

            with patch('AppGastos.DB_PATH', db_path):
                response = self.client.get('/api/config/cuentas')

            self.assertEqual(response.status_code, 200)
            account = response.get_json()['cuentas'][0]
            self.assertEqual(account['incluir_en_saldos'], 0)
            self.assertEqual(account['incluir_en_resumen'], 0)
            self.assertEqual(account['saldo_por_movimientos'], 1)

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
            self.assertEqual(payload['fuentes_consideradas'], ['BBVA'])
            self.assertEqual(payload['available_months'], ['2026-03', '2026-02', '2026-01'])
            self.assertEqual(payload['actual'][9], 15000)
            self.assertEqual(payload['average'][9], 10000)
            self.assertEqual(invalid_response.status_code, 400)

    def test_dashboard_saldos_reconstructs_cash_from_movements_and_zero_opening_balance(self):
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
                ('EFECTIVO', 'EFECTIVO'),
            )
            conn.execute(
                'CREATE TABLE app_config (clave TEXT PRIMARY KEY, valor TEXT NOT NULL)'
            )
            conn.execute(
                'INSERT INTO app_config (clave, valor) VALUES (?, ?)',
                ('meses_saldo_historico', '2'),
            )
            conn.executemany(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, disponible_cent, categoria2, clave
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                [
                    ('EFECTIVO', '2025-10-31', '2025-10-31', 'Ingreso', 'Efectivo', 100, 'EUR', 1020274, 'PENDIENTE', 'cash-oct'),
                    ('EFECTIVO', '2025-11-21', '2025-11-21', 'Ingreso', 'Efectivo', 100, 'EUR', 1034214, 'PENDIENTE', 'cash-nov'),
                    ('EFECTIVO', '2026-01-01', '2026-01-01', 'Ingreso', 'Efectivo', 1000, 'EUR', 1020274, 'PENDIENTE', 'cash-jan-1'),
                    ('EFECTIVO', '2026-01-02', '2026-01-02', 'Gasto', 'Efectivo', -710, 'EUR', 1034214, 'PENDIENTE', 'cash-jan-2'),
                ],
            )
            conn.commit()
            conn.close()

            with patch('AppGastos.DB_PATH', db_path), patch('AppGastos.date', FixedDate):
                response = self.client.get('/api/dashboard/saldos')

            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertEqual(payload['actual'][0], 490)
            self.assertEqual(payload['maximum'][0], 1200)
            self.assertEqual(payload['maximum'][1], 490)
            self.assertLessEqual(max(value for value in payload['maximum'] if value is not None), 1200)

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

    def test_dashboard_movements_can_return_all_filtered_rows_without_pagination(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                'INSERT INTO cuentas (fuente, contabilidad2) VALUES (?, ?)',
                ('BBVA', 'BANCO'),
            )
            conn.executemany(
                '''
                INSERT INTO movimientos (
                    fuente, f_valor, fecha, concepto, movimiento, importe_cent,
                    divisa, categoria2, clave
                ) VALUES (?, ?, ?, ?, ?, ?, 'EUR', 'PENDIENTE', ?)
                ''',
                [
                    (
                        'BBVA', '2026-10-10', '2026-10-10', f'Movimiento {index}',
                        'Pago', -100, f'all-{index}',
                    )
                    for index in range(55)
                ],
            )
            conn.commit()
            conn.close()

            with patch('AppGastos.DB_PATH', db_path):
                paged_response = self.client.get(
                    '/api/dashboard/movimientos?date_start=2026-10-01&date_end=2026-10-31'
                )
                chunk_response = self.client.get(
                    '/api/dashboard/movimientos?date_start=2026-10-01&date_end=2026-10-31'
                    '&page=2&limit=20'
                )
                all_response = self.client.get(
                    '/api/dashboard/movimientos?date_start=2026-10-01&date_end=2026-10-31&all=1'
                )

            self.assertEqual(paged_response.status_code, 200)
            self.assertEqual(len(paged_response.get_json()['items']), 50)
            self.assertEqual(chunk_response.status_code, 200)
            self.assertEqual(chunk_response.get_json()['page'], 2)
            self.assertEqual(len(chunk_response.get_json()['items']), 20)
            self.assertEqual(all_response.status_code, 200)
            self.assertEqual(all_response.get_json()['total'], 55)
            self.assertEqual(len(all_response.get_json()['items']), 55)

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

    def test_input_importer_keeps_latest_same_bank_file_and_deletes_older_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            older_file = input_dir / 'transactions_2026-01-01_2026-01-31.csv'
            latest_file = input_dir / 'transactions_2026-02-01_2026-02-28.csv'
            older_file.write_text(
                'date,type,name,amount,fee,tax,currency,description\n'
                '2026-01-10,BUY,Movimiento antiguo,10.00,0,0,EUR,Antiguo\n',
                encoding='utf-8',
            )
            latest_file.write_text(
                'date,type,name,amount,fee,tax,currency,description\n'
                '2026-02-10,BUY,Movimiento reciente,20.00,0,0,EUR,Reciente\n',
                encoding='utf-8',
            )
            latest_modified = latest_file.stat().st_mtime
            os.utime(older_file, (latest_modified + 60, latest_modified + 60))

            rows, processed_files = collect_input_rows(input_dir)

            self.assertEqual(processed_files, 1)
            self.assertEqual([row['concepto'] for row in rows], ['Movimiento reciente'])
            self.assertEqual(rows[0]['source_file'], latest_file.name)
            self.assertFalse(older_file.exists())
            self.assertTrue(latest_file.exists())

    def test_import_preview_reports_removed_older_bank_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            older_file = input_dir / 'transactions_2026-01-01.csv'
            latest_file = input_dir / 'transactions_2026-02-01.csv'
            older_file.write_text(
                'date,type,name,amount,fee,tax,currency,description\n'
                '2026-01-10,BUY,Movimiento antiguo,10.00,0,0,EUR,Antiguo\n',
                encoding='utf-8',
            )
            latest_file.write_text(
                'date,type,name,amount,fee,tax,currency,description\n'
                '2026-02-10,BUY,Movimiento reciente,20.00,0,0,EUR,Reciente\n',
                encoding='utf-8',
            )

            preview = preview_import_files(input_dir, Path(tmpdir) / 'gastos.db')

            self.assertEqual(preview['deleted_files'], [older_file.name])
            self.assertEqual([row['source_file'] for row in preview['rows']], [latest_file.name])
            self.assertFalse(older_file.exists())

    def test_input_importer_uses_file_modification_time_when_name_has_no_date(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            older_file = input_dir / 'transactions_old.csv'
            latest_file = input_dir / 'transactions_latest.csv'
            for file_path, concept in (
                (older_file, 'Movimiento antiguo'),
                (latest_file, 'Movimiento reciente'),
            ):
                file_path.write_text(
                    'date,type,name,amount,fee,tax,currency,description\n'
                    f'2026-02-10,BUY,{concept},20.00,0,0,EUR,Movimiento\n',
                    encoding='utf-8',
                )
            base_time = latest_file.stat().st_mtime
            os.utime(older_file, (base_time - 60, base_time - 60))
            os.utime(latest_file, (base_time, base_time))

            rows, processed_files = collect_input_rows(input_dir)

            self.assertEqual(processed_files, 1)
            self.assertEqual([row['concepto'] for row in rows], ['Movimiento reciente'])
            self.assertFalse(older_file.exists())
            self.assertTrue(latest_file.exists())

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

            test_db_path = Path(tmpdir) / 'gastos.db'
            with patch(
                'AppGastos.preview_import_files',
                side_effect=lambda: preview_import_files(input_dir, test_db_path),
            ):
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

    def test_import_api_passes_category_and_comment_edits(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / 'gastos.db'
            conn = sqlite3.connect(db_path)
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                'INSERT INTO categorias (categoria2, categoria1, categoria0) VALUES (?, ?, ?)',
                ('Supermercado', 'Alimentación', 'Gasto'),
            )
            conn.commit()
            conn.close()
            with patch('AppGastos.DB_PATH', db_path), patch(
                'AppGastos.import_files',
                return_value={'inserted': 1, 'skipped': 0},
            ) as import_mock:
                response = self.client.post(
                    '/api/importar_input',
                    json={
                        'claves': ['selected-key'],
                        'ediciones': {
                            'selected-key': {
                                'categoria2': 'Supermercado',
                                'comentarios': 'Compra habitual',
                            },
                        },
                    },
                )

        self.assertEqual(response.status_code, 200)
        import_mock.assert_called_once_with(
            selected_keys={'selected-key'},
            row_overrides={
                'selected-key': {
                    'categoria2': 'Supermercado',
                    'comentarios': 'Compra habitual',
                },
            },
        )

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

    def test_importer_applies_category_and_comment_overrides(self):
        from importar_input import build_unique_key

        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / 'input'
            input_dir.mkdir()
            db_path = Path(tmpdir) / 'gastos.db'
            schema_sql = Path(__file__).resolve().parent / 'schema.sql'
            conn = sqlite3.connect(db_path)
            conn.executescript(schema_sql.read_text(encoding='utf-8'))
            conn.execute(
                'INSERT INTO categorias (categoria2, categoria1, categoria0) VALUES (?, ?, ?)',
                ('Supermercado', 'Alimentación', 'Gasto'),
            )
            conn.commit()
            conn.close()
            row = {
                'fuente': 'BBVA',
                'f_valor': '2026-10-01',
                'fecha': '2026-10-01',
                'concepto': 'Compra',
                'movimiento': 'Tarjeta',
                'importe_cent': -1000,
                'divisa': 'EUR',
                'categoria2': 'PENDIENTE',
            }
            row_key = build_unique_key(row)
            with patch('importar_input.collect_input_rows', return_value=([row], 1)):
                result = import_files(
                    input_dir,
                    db_path,
                    selected_keys={row_key},
                    row_overrides={
                        row_key: {
                            'categoria2': 'Supermercado',
                            'comentarios': 'Compra semanal',
                        },
                    },
                )

            self.assertEqual(result['inserted'], 1)
            conn = sqlite3.connect(db_path)
            saved = conn.execute(
                'SELECT categoria2, comentarios FROM movimientos'
            ).fetchone()
            conn.close()
            self.assertEqual(saved, ('Supermercado', 'Compra semanal'))

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
