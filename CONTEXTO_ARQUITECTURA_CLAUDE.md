# Contexto de arquitectura para analizar evoluciones

Este documento describe la arquitectura actual de **Gestión de gastos** y sirve como contexto para analizar una propuesta de evolución con Claude. Está basado en el código del repositorio; antes de diseñar cambios, contrasta estos puntos con la versión actual de los archivos.

## Instrucción para Claude

Al recibir una propuesta de evolución:

1. Primero localiza en el repositorio las rutas, funciones, vistas y tablas relacionadas. Trata este documento como orientación, no como sustituto del código.
2. Resume el comportamiento actual y los usuarios/flows afectados antes de proponer cambios.
3. Identifica impactos en frontend, API, persistencia, importación, exportación, cálculos, configuración y compatibilidad con datos existentes.
4. Señala ambigüedades de comportamiento y riesgos de pérdida o reinterpretación de datos. No presupongas que se puede recrear `gastos.db` a partir del esquema base.
5. Propón el cambio más pequeño que resuelva la necesidad. Mantén convenciones y patrones existentes; evita migraciones o dependencias nuevas si no son necesarias.
6. Define pruebas concretas para la regla de negocio y sus casos límite. Si el cambio se implementa, ejecuta las pruebas dirigidas y no modifiques datos personales ni archivos de entrada como parte de una prueba.
7. No alteres ni borres archivos de `input/`, `backup/`, el Excel histórico ni la base real. Usa una base SQLite temporal para pruebas de persistencia.
8. Distingue claramente hechos comprobados, hipótesis y preguntas que necesiten decisión del usuario.

## Resumen ejecutivo

Es una aplicación web local, monolítica y de una sola página:

```text
CSV / Excel en input/
        │
        ▼
importar_input.py ── parseo, normalización, deduplicación y escritura
        │
        ▼
     gastos.db (SQLite) ◄──── AppGastos.py ─── consultas y mutaciones
                                  ▲                    │
                                  │ JSON / HTTP        │ lógica de previsión
                                  │                    ▼
templates/index.html ◄── static/app.js       forecast_ahorro.py
        │
        └── static/styles.css
```

- **Servidor:** Flask sirve la página y concentra la API JSON, las consultas SQLite y gran parte de la lógica de negocio.
- **Cliente:** HTML, CSS y JavaScript nativo; no hay framework de frontend ni compilación del cliente.
- **Persistencia:** SQLite en `gastos.db`, ubicada junto a `AppGastos.py`.
- **Importación:** pandas y openpyxl leen extractos CSV/Excel desde `input/`.
- **Previsión de ahorro:** cálculos aislados en funciones Python en `forecast_ahorro.py`; configuración y snapshots se guardan en SQLite.
- **Ejecución:** `python AppGastos.py`, servidor Flask en el puerto 5000 y host `0.0.0.0` (todas las interfaces). Usar solo en una red de confianza; no exponer directamente a Internet.

## Estructura relevante

| Ruta | Responsabilidad |
|---|---|
| `AppGastos.py` | Aplicación Flask, API, consultas SQL, validaciones y lógica de las vistas principales. |
| `templates/index.html` | Shell de la interfaz, navegación por pestañas, tablas, formularios y modales. |
| `static/app.js` | Estado del cliente, eventos, llamadas a API, renderizado, filtros, formularios y gráficas. |
| `static/styles.css` | Estilos y diseño adaptable, incluidas tablas y modo oscuro. |
| `schema.sql` | Esquema base: tablas `categorias`, `cuentas`, `presupuestos_mensuales`, `movimientos`, índices y vista `v_movimientos`. |
| `importar_input.py` | Detecta formatos, parsea archivos bancarios, normaliza valores, genera claves, detecta duplicados y persiste movimientos. |
| `forecast_ahorro.py` | Normaliza parámetros y calcula escenarios, intereses y desviaciones de la previsión. |
| `test_app.py` | Pruebas `unittest` de la API, importación y cálculos; hay casos que usan la DB configurada por defecto. |
| `README.md` | Instalación, operación, funcionalidades, reglas de previsión e importación y advertencia sobre pruebas. |
| `generaDB.py`, `cargarDB.py` | Flujo histórico para reconstruir desde el Excel. No forman parte del flujo habitual de importación. |
| `DEPRECATED/`, `backup/` | Scripts antiguos y copias históricas; no asumir que sean parte de la aplicación activa. |

`gastos.db`, `input/`, `backup/` y las hojas Excel pueden contener datos financieros. No inspeccionar, mostrar, subir o incluir sus contenidos en documentación, commits o consultas externas. Para verificar la forma de la base, basta consultar su esquema sin extraer filas.

## Frontend y navegación

La plantilla `templates/index.html` presenta estas vistas:

- **Resumen:** totales por banco y categorías jerárquicas, filtros de fecha y movimientos asociados.
- **Movimientos:** búsqueda, fuente, categoría, fecha e importe; ordenación, carga incremental, CRUD, duplicación, cambio rápido de categoría y exportación Excel.
- **Saldos:** evolución diaria y comparación con estadísticas históricas.
- **Evolución ahorro:** registros, gráficas, previsiones, desviación frente a snapshots y exportación.
- **Presupuestos:** comparación mensual y acumulado anual.
- **Importar:** revisión, filtrado y selección de movimientos detectados.
- **Configuración:** cuentas, categorías, presupuestos, histórico de saldos, previsión y columnas de ahorro.

`static/app.js` mantiene estado global de la vista, filtros, paginación, ordenación, selecciones de bancos/categorías y datos de gráficas. `setActiveView()` carga los datos de la pestaña activa. Las solicitudes se hacen con `fetchJson()`, que interpreta errores HTTP. Las tablas de movimientos y del resumen cargan páginas de 100 registros al desplazarse. Chart.js se carga desde CDN en la plantilla y se usa para las gráficas de ahorro; el gráfico de saldos se representa como SVG.

La preferencia de tema oscuro y el rango de fechas de ahorro se conservan en el navegador (localStorage). Si una evolución introduce preferencias adicionales, decidir explícitamente si son locales al navegador o compartidas/persistidas en SQLite.

## Backend y API

`AppGastos.py` crea la aplicación Flask, define `DB_PATH`, abre conexiones SQLite con filas accesibles por nombre y registra las rutas. Los endpoints sirven JSON salvo las rutas de exportación, que devuelven Excel. Las principales familias son:

| Familia | Rutas representativas | Uso |
|---|---|---|
| Página y opciones | `/`, `/api/options`, `/api/summary` | Entrega HTML, catálogos y resumen general. |
| Resumen y saldos | `/api/dashboard`, `/api/dashboard/movimientos`, `/api/dashboard/saldos` | Agregaciones, detalle paginado y serie de saldos. |
| Movimientos | `/api/movimientos`, `/api/movimientos/<id>`, `/api/movimientos/<id>/clone`, `/api/movimientos/export` | Consulta, alta, edición, borrado, duplicación y exportación. |
| Presupuestos | `/api/presupuestos`, `/api/presupuestos/movimientos`, `/api/config/presupuestos...` | Informes, detalle por categoría y mantenimiento de valores mensuales. |
| Configuración | `/api/config/categorias...`, `/api/config/cuentas...`, `/api/config/saldo-historico` | Catálogos, reglas de cuentas y parámetros. |
| Importación | `/api/importar_input/preview`, `/api/importar_input` | Previsualiza y confirma archivos seleccionados y sus ediciones. |
| Ahorro | `/api/ahorro`, `/api/ahorro/export` | Lista, crea/edita y exporta registros de ahorro. |
| Previsión | `/api/ahorro/prevision`, `/api/ahorro/prevision/parametros`, `/api/ahorro/prevision/congelar`, `/api/config/ahorro-proyeccion` | Calcula, configura y congela escenarios. |

La API recibe importes de movimientos en céntimos en sus campos `*_cent`. La interfaz convierte el importe introducido en euros a céntimos antes de enviar y formatea las cantidades al presentarlas. Mantener esta unidad coherente en SQL, API, filtros y exportaciones; las cifras de ahorros/previsión usan otra representación y deben revisarse según su implementación antes de extenderla.

## Persistencia y datos

### Esquema base

`schema.sql` declara:

- `movimientos`: transacciones y clave única `clave`; importes en `importe_cent`; fuente, fechas, conceptos, disponibilidad, categoría y comentarios.
- `categorias`: categoría de nivel 2 con su nivel superior y tipo.
- `cuentas`: reglas por fuente, tipo contable, inclusión en Resumen/Saldos, cálculo de disponible y opción de acumular saldo desde movimientos.
- `presupuestos_mensuales`: importe por año, mes y categoría.
- `v_movimientos`: vista derivada con datos de categoría/cuenta y campos calculados, entre ellos fecha/mes, disponible e importe final.

### Tablas y migraciones dinámicas

El esquema base **no contiene todo el esquema usado en runtime**. `AppGastos.py` crea/ajusta tablas o columnas según necesidad, incluidas `app_config` y `ahorro_previsiones_congeladas`; también espera una tabla `ahorro` con columnas heredadas. `presupuestos_mensuales` está tanto en el esquema base como en la inicialización de ajustes. La base local observada contiene `ahorro`, pero su estructura no se define completamente en `schema.sql`.

Por tanto:

- Antes de cambiar tablas/columnas, rastrear dónde se inicializan, migran y consumen.
- No afirmar que borrar `gastos.db` o ejecutar solo `schema.sql` reconstruye todos los datos o tablas necesarios.
- Diseñar una migración compatible con datos existentes y probarla contra una base temporal que represente los esquemas anterior y nuevo.
- No cambiar nombres o unidades de columnas sin rastrear consultas, API, JavaScript, importadores, reportes y exportaciones.

## Reglas y flujos de negocio relevantes

### Movimientos y dinero

- Los importes de movimientos se almacenan como enteros en céntimos para evitar aritmética monetaria con coma flotante.
- La vista `v_movimientos` calcula campos derivados desde movimiento, categoría y cuenta.
- Categoría `No computa` tiene tratamiento especial en `importe_final_cent`.
- Los presupuestos se guardan por categoría, año y mes; el endpoint puede inicializar datos heredados desde `app_config`.
- La pantalla anual excluye el mes en curso si todavía no está completo (ver `README.md` y pruebas).
- Una cuenta puede configurarse para acumular su saldo a partir de movimientos y no de snapshots; revisar las reglas especiales antes de modificar Resumen/Saldos.

### Importación de extractos

1. El parser se determina a partir del nombre/extensión y contenido esperado del CSV/Excel.
2. Se normalizan fechas, moneda, textos, categorías y disponible; los importes pasan a céntimos.
3. Se genera una clave de importación y se comparan claves/campos de movimientos ya guardados para detectar duplicados.
4. La interfaz permite revisar/seleccionar filas y editar categoría/comentarios.
5. La confirmación inserta los seleccionados y puede actualizar un snapshot de disponible que faltaba.

**Efecto lateral importante:** al recolectar archivos, `_collect_input_rows_with_cleanup()` conserva solo el archivo más reciente por parser/banco y elimina los anteriores de `input/`. La fecha del nombre se usa cuando se reconoce; de lo contrario, se usa modificación. No ejecutar el flujo de previsualización/importación contra archivos de usuario como si fuese una lectura inocua. Para pruebas de importador, crear archivos sintéticos en un directorio temporal.

### Ahorro y previsión

- Los registros históricos se leen de la tabla `ahorro`; el backend calcula `Ahorro Total` a partir de las columnas de saldos definidas en `AHORRO_TOTAL_COLUMNS`.
- `forecast_ahorro.py` es el módulo apropiado para cambios al cálculo: utiliza entradas normalizadas, conserva el último registro disponible por mes y ofrece escenarios `peor`, `medio`, `mejor`.
- La previsión actual parte del último total/saldos reales. Incluye ahorro base, pagas extra, variable de enero, gasto extra, rentabilidades por cuenta e intereses configurables. Algunas aportaciones y vencimientos son traspasos: no deben contarse como aumento del total.
- La previsión congelada guarda fecha, parámetros y valores serializados en `ahorro_previsiones_congeladas`; las desviaciones comparan registros posteriores con la fotografía.
- Parámetros/configuración se guardan como valores en `app_config`; ciertas preferencias de gráficas y rangos se guardan en el navegador.
- Antes de alterar fórmulas, documentar las invariantes financieras y crear casos de prueba para meses límite, registros ausentes y traspasos.

## Pruebas y ejecución segura

Dependencias indicadas en `requirements.txt`: Flask, pandas y openpyxl. La prueba documentada es:

```powershell
python -m unittest test_app.py
```

Advertencia: `README.md` indica que algunos tests de endpoints leen o modifican la base configurada. Antes de ejecutar la suite, inspeccionar los tests afectados y confirmar si usan DB temporal o la real. Preferir agregar o ejecutar tests aislados que creen una SQLite temporal y parcheen `AppGastos.DB_PATH`.

Para comprobar sintaxis Python sin iniciar el servidor, usar el intérprete instalado. No ejecutar el servidor solo para probar cambios de lógica. Si es necesario iniciarlo, recordar que escucha en `0.0.0.0`; detenerlo al terminar y no dejarlo expuesto.

## Convenciones para proponer una evolución

- Mantener cambios acotados, siguiendo el patrón existente de endpoints, validación y renderizado.
- Validar datos de entrada en servidor; la validación del navegador no es suficiente.
- Usar parámetros SQL para valores. Si se generan fragmentos de consulta dinámicamente, limitar columnas/orden a una lista permitida.
- Cerrar conexiones y mantener commits/rollback coherentes con el patrón del endpoint.
- Manejar errores de API sin respuestas que aparenten éxito; presentar errores al usuario mediante los mecanismos existentes.
- Para una nueva preferencia, elegir y documentar su propietario: `app_config`/SQLite para persistencia compartida del proyecto, o localStorage para preferencia puramente visual del navegador.
- Si cambia una respuesta de API, comprobar todos sus consumidores del frontend y los tests.
- Si cambia un importe, comprobar conversiones euros/céntimos en formularios, filtros, base de datos, JSON, reportes y Excel.
- Si cambia la importación, comprobar idempotencia, duplicados, edición previa y efectos sobre el directorio de entrada.
- Si cambia una regla de saldo o categoría, comprobar tanto Resumen como Saldos, Movimientos, presupuestos y la vista calculada.
- Actualizar `README.md` cuando cambien instalación, operación, importación o reglas visibles del negocio.
- No incorporar datos reales de `gastos.db`, extractos, Excel ni backups a ejemplos, tests, capturas o documentación.

## Referencias iniciales

- `README.md`: uso, funcionalidad detallada, instalación, reglas del modelo de ahorro y advertencias.
- `AppGastos.py`: rutas Flask y lógica de API.
- `schema.sql`: esquema SQLite base y vista calculada.
- `importar_input.py`: parsers y flujo con efectos laterales.
- `forecast_ahorro.py`: modelo de previsión de ahorro.
- `templates/index.html`, `static/app.js`, `static/styles.css`: interfaz.
- `test_app.py`: pruebas existentes.
