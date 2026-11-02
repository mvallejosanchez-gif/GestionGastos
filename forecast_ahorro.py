"""Previsión de ahorro: modelo de escenarios y desviación frente a una previsión congelada.

Las funciones son puras. Reciben entradas normalizadas con las claves
``date`` (datetime.date), ``rowid``, ``total`` e ``invested`` (ya numéricos).
"""
from __future__ import annotations

import math
from datetime import date

SCENARIOS = ('peor', 'medio', 'mejor')

INVESTED_ACCOUNTS = ('Ahorro Trade Republic', 'Trade Wallet', 'UBS Acciones', 'PPI BBVA')

DEFAULT_PARAMS = {
    'ahorro_base_mensual': 300.0,
    'pagas_extra': {'7': 2500.0, '12': 2500.0},
    'aportacion_invertida_mensual': 400.0,
    'cuentas_invertidas': list(INVESTED_ACCOUNTS),
    'escenarios': {
        'peor': {'variable_enero': 0.0, 'gasto_extra_mensual': 400.0, 'rentabilidad_anual_pct': 0.0},
        'medio': {'variable_enero': 3000.0, 'gasto_extra_mensual': 201.25, 'rentabilidad_anual_pct': 4.0},
        'mejor': {'variable_enero': 6000.0, 'gasto_extra_mensual': 100.0, 'rentabilidad_anual_pct': 7.0},
    },
}


def month_key(value: date) -> int:
    return value.year * 12 + value.month - 1


def month_label(key: int) -> str:
    return f'{key // 12}-{key % 12 + 1:02d}'


def monthly_entries(entries: list[dict]) -> list[dict]:
    """Último registro de cada mes, ordenado. Los meses sin registro no se rellenan."""
    last_by_month = {}
    for entry in sorted(entries, key=lambda item: (item['date'], item['rowid'])):
        last_by_month[month_key(entry['date'])] = entry
    return [last_by_month[key] for key in sorted(last_by_month)]


def project_scenario(
    total0: float,
    invested0: float,
    last_key: int,
    params: dict,
    scenario: dict,
    months: int,
) -> list[float]:
    """Total(t) para t = 1..months, empezando el mes siguiente a last_key."""
    monthly_rate = (1 + scenario['rentabilidad_anual_pct'] / 100) ** (1 / 12) - 1
    total = total0
    invested = invested0
    values = []
    for step in range(1, months + 1):
        calendar_month = (last_key + step) % 12 + 1
        recurring = params['ahorro_base_mensual'] + params['pagas_extra'].get(str(calendar_month), 0)
        variable = scenario['variable_enero'] if calendar_month == 1 else 0
        yield_amount = invested * monthly_rate
        invested += yield_amount + params['aportacion_invertida_mensual']
        total += recurring + variable - scenario['gasto_extra_mensual'] + yield_amount
        values.append(total)
    return values


def build_forecast(entries: list[dict], params: dict, months: int) -> dict | None:
    monthly = monthly_entries(entries)
    if not monthly:
        return None
    last = monthly[-1]
    last_key = month_key(last['date'])
    return {
        'base': {
            'month': month_label(last_key),
            'date': last['date'].isoformat(),
            'total': round(last['total'], 2),
            'invested': round(last['invested'], 2),
        },
        'months': [month_label(last_key + step) for step in range(1, months + 1)],
        'scenarios': {
            name: [
                round(value, 2)
                for value in project_scenario(
                    last['total'], last['invested'], last_key,
                    params, params['escenarios'][name], months,
                )
            ]
            for name in SCENARIOS
        },
    }


def compute_deviation(entries: list[dict], snapshot: dict) -> dict:
    """Desviación del Total real frente al escenario medio congelado.

    Solo se comparan los meses con registro real posterior a la congelación que
    tienen valor congelado. La media móvil usa hasta los 3 últimos meses
    disponibles y la desviación acumulada es la suma de las desviaciones
    mensuales desde la congelación.
    """
    freeze_date = date.fromisoformat(snapshot['fecha_congelacion'])
    frozen_index = {label: index for index, label in enumerate(snapshot['valores']['months'])}
    scenarios = snapshot['valores']['scenarios']

    rows = []
    running_sum = 0.0
    for entry in monthly_entries(entries):
        label = month_label(month_key(entry['date']))
        if entry['date'] <= freeze_date or label not in frozen_index:
            continue
        index = frozen_index[label]
        worst, medium, best = (scenarios[name][index] for name in SCENARIOS)
        deviation = entry['total'] - medium
        running_sum += deviation
        if entry['total'] < worst:
            status = 'por debajo del peor'
        elif entry['total'] > best:
            status = 'por encima del mejor'
        else:
            status = 'dentro de la banda'
        rows.append({
            'mes': label,
            'fecha': entry['date'].isoformat(),
            'total_real': round(entry['total'], 2),
            'total_congelado_peor': worst,
            'total_congelado_medio': medium,
            'total_congelado_mejor': best,
            'desviacion_eur': round(deviation, 2),
            'desviacion_pct': deviation / medium if medium else None,
            'estado': status,
            'media_movil_3m': None,
            'desviacion_acumulada': round(running_sum, 2),
        })
    for index, row in enumerate(rows):
        window = [item['desviacion_eur'] for item in rows[max(0, index - 2): index + 1]]
        row['media_movil_3m'] = round(sum(window) / len(window), 2)
    return {'rows': rows, 'latest': rows[-1] if rows else None}


def _number(value, label: str, minimum: float | None = None) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError(f'«{label}» debe ser numérico') from None
    if not math.isfinite(number):
        raise ValueError(f'«{label}» debe ser un número finito')
    if minimum is not None and number < minimum:
        raise ValueError(f'«{label}» debe ser mayor o igual que {minimum:g}')
    return number


def normalize_params(raw: dict, balance_columns: tuple[str, ...]) -> dict:
    """Valida los parámetros recibidos y devuelve una copia completa."""
    if not isinstance(raw, dict):
        raise ValueError('Los parámetros de previsión deben ser un objeto JSON')
    params = {
        'ahorro_base_mensual': _number(raw['ahorro_base_mensual'], 'ahorro_base_mensual'),
        'aportacion_invertida_mensual': _number(
            raw['aportacion_invertida_mensual'], 'aportacion_invertida_mensual', 0
        ),
    }

    paid = raw['pagas_extra']
    if not isinstance(paid, dict):
        raise ValueError('«pagas_extra» debe ser un objeto mes → importe')
    params['pagas_extra'] = {}
    for month, amount in paid.items():
        if not str(month).isdigit() or not 1 <= int(month) <= 12:
            raise ValueError('Los meses de «pagas_extra» deben estar entre 1 y 12')
        params['pagas_extra'][str(int(month))] = _number(amount, f'paga extra mes {month}')

    accounts = raw['cuentas_invertidas']
    if (
        not isinstance(accounts, list)
        or any(account not in balance_columns for account in accounts)
    ):
        raise ValueError('«cuentas_invertidas» contiene cuentas no válidas')
    params['cuentas_invertidas'] = [column for column in balance_columns if column in accounts]

    scenarios = raw['escenarios']
    if not isinstance(scenarios, dict):
        raise ValueError('«escenarios» debe ser un objeto')
    params['escenarios'] = {}
    for name in SCENARIOS:
        scenario = scenarios[name]
        rate = _number(scenario['rentabilidad_anual_pct'], f'rentabilidad {name}')
        if rate <= -100:
            raise ValueError(f'La rentabilidad del escenario {name} debe ser mayor que -100 %')
        params['escenarios'][name] = {
            'variable_enero': _number(scenario['variable_enero'], f'variable_enero {name}'),
            'gasto_extra_mensual': _number(scenario['gasto_extra_mensual'], f'gasto_extra_mensual {name}'),
            'rentabilidad_anual_pct': rate,
        }
    return params
