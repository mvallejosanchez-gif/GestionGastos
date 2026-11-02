# IMPORTANTE: Detalles cálculo previsión

Documento de referencia (para el usuario y para futuros asistentes). Recoge **cómo se calcula el modelo de previsión de ahorro** y **toda la información de contexto facilitada por el usuario**, para no tener que repetirla en nuevos modelos u otras apps.

Implementación actual: [forecast_ahorro.py](./forecast_ahorro.py) (modelo, desviación, normalización), endpoints en [AppGastos.py](./AppGastos.py), UI en `templates/index.html` + `static/app.js`, tests en `test_app.py` (`ForecastModelTests`, `ForecastApiTests`).

---

## 1. Datos de partida

- Cada registro de ahorro tiene una fecha (`dd/mm/aaaa`) y un saldo por cuenta: BBVA, Bankinter, N26, Trade Republic, Revolut, PIBANK, Trade Wallet, Kraken Wallet, Ahorro Acciones, UBS Acciones, PPI BBVA.
- **Ahorro Total** = suma de esos saldos.
- Puede haber varios registros en el mismo mes. Algunos importes vienen como texto en formato español (`"1.800,00"`): se convierten a número.
- Columnas opcionales/históricas **Ahorro Hipotético** y **Ahorro Mensual Previsto**: ya no se usan en el forecast ni en la gráfica, pero **sus datos no se borran** (siguen en tabla/modal/export).
- Columna opcional **Variable trabajo** (importe del variable cobrado en enero): solo informativa, no se rellena automáticamente en el histórico.

### Normalización mensual
- Saldos: **último registro de cada mes**.
- Meses sin registro: no se inventan valores; se omiten en las comparaciones.

---

## 2. Parámetros (Configuración → Previsión de ahorro)

Todos editables desde la UI. Se guardan en `app_config` (clave `prevision_ahorro_params`); el horizonte en `anios_proyeccion_ahorro` (1–50 años).

### Comunes
| Parámetro | Valor por defecto |
|---|---|
| `ahorro_base_mensual` | 300 € |
| `pagas_extra` (mes → importe) | {7: 2500, 12: 2500} |
| `aportacion_invertida_mensual` | 400 € (van a **Trade Wallet**, que ahora solo contiene un ETF, ya no hay cripto) |
| `cuentas_invertidas` | Trade Republic, Trade Wallet, UBS Acciones, PPI BBVA |
| `horizonte_años` | editable |

### Por escenario
| | Peor | Medio | Mejor |
|---|---|---|---|
| `variable_enero` | 0 | 3000 | 6000 |
| `gasto_extra_mensual` | 400 | 201,25 | 100 |
| Rentabilidad anual Trade Republic | 1,5 % | 2,5 % | 3,5 % |
| Rentabilidad anual Trade Wallet / UBS Acciones / PPI BBVA | 0 % | 4 % | 7 % |

La rentabilidad es **configurable por cuenta y por escenario** (`rentabilidades_pct`: cuenta → %). Las columnas de la tabla salen de las cuentas invertidas marcadas (guardar para actualizarlas). Se leen también parámetros antiguos (`rentabilidad_anual_pct`, `rentabilidad_trade_pct`).

### Intereses (casilla «Incluir intereses», configurable)
- **Bankinter**: genera intereses cada 6 meses (cobro en **abril y octubre**) pero solo computa un saldo máximo de **10.000 €** (saldo fijo editable). Tipo **5 %** hasta oct-2027 y **2 %** después. Los intereses cobrados **se llevan a Trade** (cuenta remunerada, ~2,5 % actualmente).
- **PIBANK**: depósito a plazo, **3 %** sobre **10.000 €**, vence **oct-2027**, intereses **cada 3 meses**; no se deja lo generado en PIBANK (para no bloquearlo otros 12 meses): se traspasa a Trade. Al vencer, el **capital pasa a Trade** (solo cambia de cuenta; no altera el total).
- Trade es **una sola cuenta**: su saldo actual, los intereses traspasados y el capital de PIBANK vencido rinden con la rentabilidad de Trade Republic del escenario.
- El ahorro base se mantiene en 300 € (los intereses no lo sustituyen).

---

## 3. Modelo (mes futuro `t = 1..N`, empezando el mes siguiente al último registro)

Estado inicial (último registro real): `Total(0)` = último Ahorro Total; `Saldo_c(0)` = saldo de cada cuenta.

Para cada mes `t`:
- `Recurrente(t) = ahorro_base_mensual + pagas_extra[mes(t)]` (0 si no hay paga).
- `Variable(t) = variable_enero` si `mes(t) = 1`, si no 0.
- Tasa mensual de la cuenta `c`: `(1 + rentabilidad_anual_c)^(1/12) − 1`.
- `Rendimiento_c(t) = Saldo_c(t−1) × tasa_mensual_c`.
- Intereses del mes (Bankinter/PIBANK) según calendario; capital PIBANK vencido en su mes.
- `Saldo_c(t) = Saldo_c(t−1) + Rendimiento_c(t)`; además:
  - `Saldo_TradeWallet(t) += aportacion_invertida_mensual` (**traspaso**: no aumenta el total por sí solo).
  - `Saldo_TradeRepublic(t) += intereses + capital_vencido`.
- `Total(t) = Total(t−1) + Recurrente(t) + Variable(t) − gasto_extra_mensual + Σ Rendimiento_c(t) + intereses(t)`.

No suman al total: la aportación invertida ni el capital vencido de PIBANK (solo cambian de cuenta).

### No modelado (pendiente de decisión)
- Estacionalidad de gastos (p. ej. más gasto en noviembre/diciembre por regalos de Navidad). Opción ofrecida: gasto extra por mes.

---

## 4. Congelar previsión

- Botón «Congelar previsión»: guarda una foto con id, fecha de congelación (hoy), parámetros usados (JSON) y, por escenario y mes futuro, el valor del Total.
- Tabla SQLite `ahorro_previsiones_congeladas` en `gastos.db` (`id`, `fecha_congelacion`, `parametros`, `valores`).
- La foto **no se recalcula** al añadir registros. Se pueden ver/elegir fotos anteriores (activa por defecto: la última).
- Recordatorio «Recuerda volver a congelar la previsión en enero.» visible **solo en enero**, bajo el botón.

## 5. Desviación

Para cada mes con registro real **posterior a la fecha de congelación** y presente en la foto:
- `desviacion_eur = Total real − Total congelado medio`
- `desviacion_pct = desviacion_eur / Total congelado medio`
- Estado: «dentro de la banda» (entre peor y mejor), «por debajo del peor», «por encima del mejor».
- Media móvil de 3 meses de la desviación y desviación acumulada (suma de desviaciones mensuales) desde la congelación.
- Se muestra en una tarjeta (último mes y estado) y en una tabla histórica.

## 6. Gráfica (pestaña Evolución ahorro, Chart.js)

- Línea sólida: Ahorro Total real.
- Tres líneas discontinuas con patrones distintos (peor, medio, mejor) desde la fecha de congelación, con el área entre peor y mejor sombreada.
- Opción desactivada por defecto «Mostrar forecast recalculado»: forecast desde el último dato con los parámetros actuales (líneas finas, sin sombreado).
- Tooltip en formato es-ES (€), ordenado de mayor a menor (mejor arriba, peor abajo).
- Respeta el rango de fechas Desde/Hasta de la gráfica.
- Controles (botón congelar, selector de foto, casilla de recalculado) en la fila de fechas, a la derecha.

---

## 7. Pruebas de aceptación

Datos hasta 02/11/2026 (Ahorro Total = 45.418,91; Invertido(0) = 25.418,91), parámetros por defecto del modelo original (**una única rentabilidad 0/4/7 % para todas las cuentas invertidas e intereses desactivados**), tolerancia ±1 €:

| Horizonte | Peor | Medio | Mejor |
|---|---|---|---|
| 36 meses | 56.819 | 77.004 | 92.860 |
| 96 meses | 75.819 | 134.901 | 183.282 |

Comprobaciones adicionales:
- Peor a 36 meses = 45.418,91 + 36·300 + 6·2500 − 36·400 (rentabilidad 0 %).
- El variable se suma solo en enero.
- Meses con varios registros usan el último saldo del mes.
- Congelar y añadir un registro nuevo no cambia los valores congelados.

Con intereses y rentabilidades por cuenta actuales, a 36 meses sale ≈ 58.966 / 76.406 / 91.560 (Peor / Medio / Mejor).

---

## 8. Preferencias y convenciones del usuario

- Responder en español, conciso.
- Cambios mínimos y coherentes con el estilo existente; reutilizar librería de gráficos (Chart.js) y convenciones de configuración.
- No eliminar datos históricos ni columnas existentes.
- Si algo es ambiguo, preguntar antes de asumir.
- Quitar parámetros/código que ya no se usen (se eliminó `meses_media_forecast_ahorro`; su valor en BD queda intacto).
- Stack: Flask + SQLite (`gastos.db`), `templates/index.html`, `static/app.js`, `static/styles.css`. Tests: `python -m unittest test_app`.
