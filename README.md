# Gestión de gastos

Aplicación web local para consultar y gestionar movimientos financieros almacenados en SQLite. Está desarrollada con Flask y ofrece importación de movimientos desde extractos bancarios en CSV y Excel.

## Funcionalidades

- **Resumen:** consulta de gastos por fuente y por niveles de categoría, con filtros por fecha.
- **Saldos:** visualización del histórico de saldos y ajuste del periodo histórico y de los parámetros de cada cuenta. EFECTIVO se reconstruye desde un saldo inicial de 0,00 € anterior a su primer movimiento, ignorando los snapshots guardados. AMAZON también se configura para acumular los importes de sus movimientos e ignorar snapshots, de modo que su saldo cambia según la fecha seleccionada.
- **Movimientos:** listado con scroll y cabecera fija, búsqueda global en todos los campos y registros, filtros por fuente, categoría, fechas e importe (un único importe mínimo busca ese importe exacto; con ambos extremos se filtra por rango). La ordenación de las columnas se aplica a todos los resultados antes de paginar y también se conserva al exportar. Permite crear, editar, duplicar y eliminar movimientos, cambiar categorías y exportar los resultados a Excel.
- **Evolución ahorro:** pestaña integrada en la aplicación para consultar las gráficas de ahorro total, ahorro hipotético y extrapolación, además de la evolución mensual apilada de cada columna de saldo seleccionada. Un único rango de fechas filtra las dos gráficas y se conserva entre sesiones. Permite añadir y editar registros de la tabla `ahorro` desde un modal.
- **Importación:** previsualización de movimientos nuevos encontrados en `input/`, selección de registros e importación a la base de datos. Antes de importar se puede asignar categoría y comentarios a cada fila. Si hay varios archivos compatibles del mismo banco, se conserva el más reciente (fecha del nombre o, si no hay, fecha de modificación) y se eliminan los anteriores al revisar la importación. Se omiten duplicados ya importados.
- **Presupuestos:** consulta mensual por categoría, con despliegue de los movimientos que forman el gasto, y tabla de seguimiento anual acumulado hasta el último mes completo. En Configuración se pueden guardar importes independientes por categoría y mes, navegar entre años y conservar cada presupuesto en SQLite. El botón de copia transfiere los doce meses al año siguiente y reemplaza los valores ya existentes.
- **Configuración:** ajustes de cuentas, gestión de categorías, presupuestos mensuales por categoría, del histórico de saldos y del horizonte de extrapolación del ahorro. Renombrar una categoría conserva sus movimientos y presupuestos; solo se eliminan categorías sin datos asociados.
- La aplicación permite activar el modo oscuro desde el botón de tema; la preferencia se guarda en el navegador.
- Los presupuestos de Configuración se almacenan por categoría, año y mes en `presupuestos_mensuales`; la migración conserva los importes mensuales anteriores como valores iniciales.
- **Tablas:** cabeceras fijas y scroll interno en las tablas de todas las pestañas, sin controles de paginación. Los movimientos se cargan por bloques al desplazarse para agilizar la apertura y los filtros.

## Extrapolación del ahorro

La gráfica **Evolución ahorro** presenta dos series históricas y dos forecasts:

- **Ahorro Total:** suma de los saldos de `Ahorro BBVA`, `Ahorro Bankinter`, `Ahorro N26`, `Ahorro Trade Republic`, `Ahorro Revolut`, `Ahorro PIBANK`, `Trade Wallet`, `Kraken Wallet`, `Ahorro Acciones`, `UBS Acciones` y `PPI BBVA` para cada registro.
- **Ahorro Hipotético:** comienza en el ahorro total del primer registro ordenado por mes. Al pasar al primer registro de cada mes posterior, suma su `Ahorro Mensual Previsto`. Si hay varios registros en el mismo mes, la previsión se suma una sola vez.
- **Forecast Ahorro Hipotético:** parte del último `Ahorro Hipotético` y añade en cada mes futuro la media de `Ahorro Mensual Previsto` en los últimos **N meses**.
- **Forecast Ahorro Total:** parte del último `Ahorro Total` y añade en cada mes futuro el incremento mensual medio del `Ahorro Total` observado en los últimos **N meses**. El incremento de cada intervalo se calcula entre valores mensuales consecutivos y se ajusta por el número de meses transcurridos.

La ventana **N** se define en **Configuración → Extrapolación del ahorro** como **Meses de histórico para el forecast**. Se guarda en `app_config` como `meses_media_forecast_ahorro`; por defecto es de 12 meses y admite de 1 a 120. Si hay varios registros en un mes, se usa el último registro de ese mes para ambos cálculos; los valores vacíos se excluyen de la media del ahorro previsto y los ceros sí se incluyen. Para el forecast de ahorro total se promedian las variaciones mensuales entre esos valores mensuales.

El horizonte de la gráfica se configura por separado en **Años de proyección**, se guarda como `anios_proyeccion_ahorro` y admite de 1 a 50 años (5 por defecto). Cada forecast se extiende hasta `12 × años` meses. Son proyecciones lineales: no incluyen rendimientos, inflación ni cambios futuros en aportaciones.

Los registros se pueden añadir o editar desde **Evolución ahorro**. Al añadir uno nuevo, el formulario propone la fecha actual y copia los saldos del último registro para que solo haya que cambiar los que varíen. En **Configuración → Columnas de ahorro** se seleccionan los saldos de la gráfica y los que aparecen en el modal. Si una columna de saldo se oculta del modal, se guarda como 0 en la base de datos. El ahorro total y el hipotético se calculan y no se editan directamente.

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

1. Coloca los extractos en la carpeta `input/` (se procesa su contenido, no sus subcarpetas). Si hay varios archivos compatibles del mismo banco, al abrir la vista previa se conserva el más reciente por fecha del nombre; si el nombre no incluye una fecha reconocible, se usa la fecha de modificación. Los anteriores se eliminan de `input/` en ese momento.
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
