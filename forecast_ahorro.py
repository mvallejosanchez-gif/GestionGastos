"""Previsión de ahorro: modelo de escenarios y desviación frente a una previsión congelada.

Las funciones son puras. Reciben entradas normalizadas con las claves
``date`` (datetime.date), ``rowid``, ``total`` y ``balances`` (saldo numérico por cuenta).
"""
from __future__ import annotations

import math
from datetime import date

SCENARIOS = ('peor', 'medio', 'mejor')

INVESTED_ACCOUNTS = ('Ahorro Trade Republic', 'Trade Wallet', 'UBS Acciones', 'PPI BBVA')

TRADE_REPUBLIC = 'Ahorro Trade Republic'  # recibe los intereses traspasados
CONTRIBUTION_ACCOUNT = 'Trade Wallet'  # recibe la aportación invertida mensual

DEFAULT_RATES_PCT = {
    'peor': {'Ahorro Trade Republic': 1.5, 'Trade Wallet': 0.0, 'UBS Acciones': 0.0, 'PPI BBVA': 0.0},
    'medio': {'Ahorro Trade Republic': 2.5, 'Trade Wallet': 4.0, 'UBS Acciones': 4.0, 'PPI BBVA': 4.0},
    'mejor': {'Ahorro Trade Republic': 3.5, 'Trade Wallet': 7.0, 'UBS Acciones': 7.0, 'PPI BBVA': 7.0},
}

DEFAULT_PARAMS = {
    'ahorro_base_mensual': 300.0,
    'pagas_extra': {'7': 2500.0, '12': 2500.0},
    'aportacion_invertida_mensual': 400.0,
    'cuentas_invertidas': list(INVESTED_ACCOUNTS),
    'intereses': {
        'activo': True,
        'bankinter': {
            'saldo': 10000.0,
            'tipo_inicial_pct': 5.0,
            'ultimo_mes_tipo_inicial': '2027-10',
            'tipo_posterior_pct': 2.0,
            'meses_pago': [4, 10],
        },
        'pibank': {'capital': 10000.0, 'tipo_pct': 3.0, 'vencimiento': '2027-10'},
    },
    'escenarios': {
        'peor': {
            'variable_enero': 0.0, 'gasto_extra_mensual': 400.0,
            'rentabilidades_pct': dict(DEFAULT_RATES_PCT['peor']),
        },
        'medio': {
            'variable_enero': 3000.0, 'gasto_extra_mensual': 201.25,
            'rentabilidades_pct': dict(DEFAULT_RATES_PCT['medio']),
        },
        'mejor': {
            'variable_enero': 6000.0, 'gasto_extra_mensual': 100.0,
            'rentabilidades_pct': dict(DEFAULT_RATES_PCT['mejor']),
        },
    },
}


def month_key(value: date) -> int:
    return value.year * 12 + value.month - 1


def month_label(key: int) -> str:
    return f'{key // 12}-{key % 12 + 1:02d}'


def label_to_key(label: str) -> int:
    year, month = str(label).split('-')
    return int(year) * 12 + int(month) - 1


def monthly_entries(entries: list[dict]) -> list[dict]:
    """Último registro de cada mes, ordenado. Los meses sin registro no se rellenan."""
    last_by_month = {}
    for entry in sorted(entries, key=lambda item: (item['date'], item['rowid'])):
        last_by_month[month_key(entry['date'])] = entry
    return [last_by_month[key] for key in sorted(last_by_month)]


def interest_income(key: int, interests: dict) -> tuple[float, float]:
    """Intereses cobrados en el mes `key` y capital de PIBANK que vence ese mes.

    Todo el cobro se traspasa a Trade: aumenta el total solo por el interés y
    el capital vencido solo cambia de cuenta.
    """
    if not interests.get('activo'):
        return 0.0, 0.0
    bankinter = interests['bankinter']
    income = 0.0
    if key % 12 + 1 in bankinter['meses_pago']:
        rate = (
            bankinter['tipo_inicial_pct']
            if key <= label_to_key(bankinter['ultimo_mes_tipo_inicial'])
            else bankinter['tipo_posterior_pct']
        )
        income += bankinter['saldo'] * rate / 100 / len(bankinter['meses_pago'])

    pibank = interests['pibank']
    maturity = label_to_key(pibank['vencimiento'])
    matured = 0.0
    if key <= maturity and (maturity - key) % 3 == 0:
        income += pibank['capital'] * pibank['tipo_pct'] / 100 / 4
        if key == maturity:
            matured = pibank['capital']
    return income, matured


def model_accounts(params: dict) -> list[str]:
    """Cuentas con rendimiento propio: las invertidas más las que reciben traspasos."""
    accounts = list(params['cuentas_invertidas'])
    for special in (TRADE_REPUBLIC, CONTRIBUTION_ACCOUNT):
        if special not in accounts:
            accounts.append(special)
    return accounts


def project_scenario(
    total0: float,
    balances0: dict,
    last_key: int,
    params: dict,
    scenario: dict,
    months: int,
) -> list[float]:
    """Total(t) para t = 1..months, empezando el mes siguiente a last_key.

    Cada cuenta invertida rinde con su rentabilidad del escenario. La aportación
    invertida va a Trade Wallet y los intereses cobrados a Trade Republic; ambos
    son traspasos y solo el rendimiento y los intereses aumentan el total.
    """
    accounts = model_accounts(params)
    monthly_rates = {
        account: (1 + scenario['rentabilidades_pct'].get(account, 0) / 100) ** (1 / 12) - 1
        for account in accounts
    }
    balances = {account: balances0.get(account, 0.0) for account in accounts}
    interests = params.get('intereses', {})
    total = total0
    values = []
    for step in range(1, months + 1):
        key = last_key + step
        calendar_month = key % 12 + 1
        recurring = params['ahorro_base_mensual'] + params['pagas_extra'].get(str(calendar_month), 0)
        variable = scenario['variable_enero'] if calendar_month == 1 else 0
        yields = {account: balances[account] * monthly_rates[account] for account in accounts}
        income, matured = interest_income(key, interests)
        for account in accounts:
            balances[account] += yields[account]
        balances[CONTRIBUTION_ACCOUNT] += params['aportacion_invertida_mensual']
        balances[TRADE_REPUBLIC] += income + matured
        total += (
            recurring + variable - scenario['gasto_extra_mensual']
            + sum(yields.values()) + income
        )
        values.append(total)
    return values


def build_forecast(entries: list[dict], params: dict, months: int) -> dict | None:
    monthly = monthly_entries(entries)
    if not monthly:
        return None
    last = monthly[-1]
    last_key = month_key(last['date'])
    balances = last['balances']
    return {
        'base': {
            'month': month_label(last_key),
            'date': last['date'].isoformat(),
            'total': round(last['total'], 2),
            'invested': round(sum(balances.get(a, 0) for a in params['cuentas_invertidas']), 2),
        },
        'months': [month_label(last_key + step) for step in range(1, months + 1)],
        'scenarios': {
            name: [
                round(value, 2)
                for value in project_scenario(
                    last['total'], balances, last_key,
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
        legacy_general = scenario.get('rentabilidad_anual_pct')
        rates = scenario.get('rentabilidades_pct') or {}
        if not isinstance(rates, dict):
            raise ValueError(f'«rentabilidades_pct» del escenario {name} debe ser un objeto')
        normalized_rates = {}
        for account in model_accounts(params):
            if account in rates:
                value = rates[account]
            elif account == TRADE_REPUBLIC and 'rentabilidad_trade_pct' in scenario:
                value = scenario['rentabilidad_trade_pct']
            elif legacy_general is not None and account != TRADE_REPUBLIC:
                value = legacy_general
            else:
                value = DEFAULT_RATES_PCT[name].get(account, 0.0)
            rate = _number(value, f'rentabilidad {account} ({name})')
            if rate <= -100:
                raise ValueError(f'La rentabilidad de {account} ({name}) debe ser mayor que -100 %')
            normalized_rates[account] = rate
        params['escenarios'][name] = {
            'variable_enero': _number(scenario['variable_enero'], f'variable_enero {name}'),
            'gasto_extra_mensual': _number(scenario['gasto_extra_mensual'], f'gasto_extra_mensual {name}'),
            'rentabilidades_pct': normalized_rates,
        }
    params['intereses'] = _normalize_interests(raw.get('intereses', DEFAULT_PARAMS['intereses']))
    return params


def _month_label(value, label: str) -> str:
    try:
        return month_label(label_to_key(value))
    except (TypeError, ValueError):
        raise ValueError(f'«{label}» debe tener el formato AAAA-MM') from None


def _normalize_interests(raw: dict) -> dict:
    if not isinstance(raw, dict):
        raise ValueError('«intereses» debe ser un objeto')
    bankinter = raw['bankinter']
    payment_months = bankinter['meses_pago']
    if (
        not isinstance(payment_months, list)
        or not payment_months
        or any(not isinstance(m, int) or not 1 <= m <= 12 for m in payment_months)
    ):
        raise ValueError('Los meses de pago de Bankinter deben estar entre 1 y 12')
    pibank = raw['pibank']
    return {
        'activo': bool(raw.get('activo', True)),
        'bankinter': {
            'saldo': _number(bankinter['saldo'], 'saldo Bankinter', 0),
            'tipo_inicial_pct': _number(bankinter['tipo_inicial_pct'], 'tipo inicial Bankinter', 0),
            'ultimo_mes_tipo_inicial': _month_label(
                bankinter['ultimo_mes_tipo_inicial'], 'último mes del tipo inicial'
            ),
            'tipo_posterior_pct': _number(bankinter['tipo_posterior_pct'], 'tipo posterior Bankinter', 0),
            'meses_pago': sorted(set(payment_months)),
        },
        'pibank': {
            'capital': _number(pibank['capital'], 'capital PIBANK', 0),
            'tipo_pct': _number(pibank['tipo_pct'], 'tipo PIBANK', 0),
            'vencimiento': _month_label(pibank['vencimiento'], 'vencimiento PIBANK'),
        },
    }
