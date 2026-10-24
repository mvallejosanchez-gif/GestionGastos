# Gestión de gastos

Aplicación web local para consultar y gestionar movimientos financieros almacenados en SQLite. Está desarrollada con Flask y ofrece importación de movimientos desde extractos bancarios en CSV y Excel.

## Funcionalidades

- **Resumen:** consulta de gastos por fuente y por niveles de categoría, con filtros por fecha.
- **Saldos:** visualización del histórico de saldos y ajuste del periodo histórico y de los parámetros de cada cuenta.
- **Movimientos:** listado paginado con búsqueda y filtros por fuente, categoría y fechas. Permite crear, editar, duplicar y eliminar movimientos, cambiar categorías y exportar los resultados a Excel.
- **Evolución ahorro:** pestaña integrada en la aplicación para consultar la gráfica de ahorro total, ahorro hipotético y extrapolación; permite añadir y editar registros de la tabla `ahorro` desde un modal.
- **Importación:** previsualización de movimientos nuevos encontrados en `input/`, selección de registros e importación a la base de datos. Se omiten duplicados ya importados.
- **Presupuestos:** consulta de presupuestos mensuales por categoría.
- **Configuración:** ajustes de cuentas, del histórico de saldos y del horizonte de extrapolación del ahorro.

## Extrapolación del ahorro

La gráfica **Evolución ahorro** presenta dos series históricas y dos forecasts:

- **Ahorro Total:** suma de los saldos de `Ahorro BBVA`, `Ahorro Bankinter`, `Ahorro N26`, `Ahorro Trade Republic`, `Ahorro Revolut`, `Ahorro PIBANK`, `Trade Wallet`, `Kraken Wallet`, `Ahorro Acciones`, `UBS Acciones` y `PPI BBVA` para cada registro.
- **Ahorro Hipotético:** comienza en el ahorro total del primer registro ordenado por mes. Al pasar al primer registro de cada mes posterior, suma su `Ahorro Mensual Previsto`. Si hay varios registros en el mismo mes, la previsión se suma una sola vez.
- **Forecast Ahorro Hipotético:** parte del último `Ahorro Hipotético` y añade en cada mes futuro la media de `Ahorro Mensual Previsto` en los últimos **N meses**.
- **Forecast Ahorro Total:** parte del último `Ahorro Total` y añade en cada mes futuro el incremento mensual medio del `Ahorro Total` observado en los últimos **N meses**. El incremento de cada intervalo se calcula entre valores mensuales consecutivos y se ajusta por el número de meses transcurridos.

La ventana **N** se define en **Configuración → Extrapolación del ahorro** como **Meses de histórico para el forecast**. Se guarda en `app_config` como `meses_media_forecast_ahorro`; por defecto es de 12 meses y admite de 1 a 120. Si hay varios registros en un mes, se usa el último registro de ese mes para ambos cálculos; los valores vacíos se excluyen de la media del ahorro previsto y los ceros sí se incluyen. Para el forecast de ahorro total se promedian las variaciones mensuales entre esos valores mensuales.

El horizonte de la gráfica se configura por separado en **Años de proyección**, se guarda como `anios_proyeccion_ahorro` y admite de 1 a 50 años (5 por defecto). Cada forecast se extiende hasta `12 × años` meses. Son proyecciones lineales: no incluyen rendimientos, inflación ni cambios futuros en aportaciones.

Los registros se pueden añadir o editar desde **Evolución ahorro**. Al añadir uno nuevo, el formulario propone la fecha actual y copia los saldos del último registro para que solo haya que cambiar los que varíen. El formulario incluye las columnas de la tabla `ahorro`; el ahorro total y el hipotético se calculan y no se editan directamente.

## Requisitos

- Python 3.13 o superior
- Dependencias de `requirements.txt` (Flask, pandas y openpyxl)

## Instalación y ejecución

Desde la carpeta raíz del proyecto:

```bash
python -m venv .venv
```

Activa el entorno virtual y luego instala las dependencias:

```bash
# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# Windows (cmd)
.\.venv\Scripts\activate.bat

python -m pip install -r requirements.txt
```

La aplicación utiliza `gastos.db` en la raíz del proyecto. Si aún no existe, crea la estructura inicial ejecutando:

```bash
python -c "import sqlite3; c=sqlite3.connect('gastos.db'); c.executescript(open('schema.sql', encoding='utf-8').read()); c.close()"
```

Inicia el servidor:

```bash
python AppGastos.py
```

Abre <http://localhost:5000> en el navegador. Para detener el servidor, pulsa `Ctrl+C` en la terminal.

> El servidor de desarrollo de Flask escucha en todas las interfaces de red. Úsalo en una red de confianza y no lo expongas directamente a Internet.

## Importar movimientos

1. Coloca los extractos en la carpeta `input/` (se procesa su contenido, no sus subcarpetas).
2. Abre la sección **Importar** en la aplicación.
3. Revisa los movimientos detectados, selecciona los que quieras añadir y confirma la importación.

El importador reconoce, según el nombre y el contenido del archivo:

- CSV de Trade Republic (`transactions_...`)
- CSV de Revolut (`account-statement_...`)
- Excel de Pibank, BBVA y Bankinter
- Excel de movimientos en efectivo (`gastos_...`)

Los archivos que no coincidan con los formatos esperados se ignoran. En los extractos de Revolut, si falta la fecha de finalización se usa la fecha de inicio, y se omiten los movimientos que no tengan ninguna fecha. Las nuevas categorías y fuentes se incorporan durante la importación; los movimientos sin categoría quedan como `PENDIENTE`. Los importes se almacenan en céntimos.

También se puede ejecutar el importador desde la raíz del proyecto:

```bash
python importar_input.py
```

## Estructura principal

- `AppGastos.py`: servidor Flask y API de la aplicación.
- `templates/index.html`: interfaz web.
- `static/`: estilos, JavaScript e icono.
- `schema.sql`: definición de tablas, índices y vista calculada de movimientos.
- `importar_input.py`: lectura, normalización y deduplicación de extractos.
- `gastos.db`: base de datos SQLite local (no incluida en el control de versiones).
- `input/`: carpeta local para los archivos que se van a importar.
- `test_app.py`: pruebas de la API y del importador.

Los scripts `generaDB.py` y `cargarDB.py` corresponden a la carga desde el Excel histórico `Input Categorizacion Gastos.xlsx`; no son necesarios para el flujo de importación habitual.

## Pruebas

Con las dependencias instaladas y una base de datos inicializada:

```bash
python -m unittest test_app.py
```

Las pruebas de algunos endpoints leen o modifican `gastos.db`; haz una copia de seguridad antes de ejecutarlas sobre datos que quieras conservar.
