# Importar un nuevo banco

Guía para añadir en el futuro un banco con un formato de extracto propio. Describe el funcionamiento actual; antes de implementar cambios, comprobar que el código siga siendo igual.

## 1. Analizar el extracto

Con un ejemplo **sintético o anonimizado**, identificar:

- Formato y extensión: CSV o Excel, codificación, separador, hoja y posición de la cabecera.
- Nombre habitual del archivo y posibles coincidencias con los nombres de otros bancos.
- Columnas de fecha, fecha valor, concepto, tipo, importe, moneda, comisiones y saldo.
- Formato de fechas y números, signo de ingresos y gastos y tratamiento de filas vacías o sin datos obligatorios.
- Si el saldo representa realmente el disponible después del movimiento, para decidir si debe utilizarse como `disponible_cent`.

No incluir extractos ni datos financieros reales en pruebas, documentación o commits.

## 2. Añadir el parser

En [importar_input.py](./importar_input.py), crear una función similar a los parsers existentes que reciba la ruta del archivo y devuelva una lista de diccionarios normalizados. Como mínimo, definir:

| Campo | Contenido |
|---|---|
| `fuente` | Nombre estable del nuevo banco, coherente en todas sus importaciones. |
| `fecha`, `f_valor` | Fechas del movimiento; si solo existe una, valorar usarla en ambos campos. |
| `concepto`, `movimiento`, `observaciones` | Descripción y tipo, según los datos disponibles. |
| `importe_cent` | Importe con su signo, expresado en céntimos enteros. |
| `divisa` | Moneda del movimiento. |
| `disponible_cent` | Saldo en céntimos, solo si el extracto aporta un dato compatible; en otro caso, `None`. |
| `categoria2`, `categoria1`, `categoria0` | Categorías conocidas o `PENDIENTE`. |

Reutilizar los helpers existentes cuando correspondan, como `money_to_cents`, `_row_value` o `_read_excel_with_header`. Comprobar que aceptan el formato real del banco: por ejemplo, `money_to_cents` devuelve cero para valores que no puede interpretar, por lo que un importe inválido no debe confundirse silenciosamente con un movimiento de cero euros.

## 3. Registrar la detección y el banco

En el mismo archivo:

1. Añadir la asociación entre el nombre del archivo y el parser en `FILE_PARSERS` y, si el formato lo requiere, ajustar `detect_parser`.
2. Añadir el parser y el nombre del banco en `bank_by_parser`, dentro de `_collect_input_rows_with_cleanup`. Esta tabla se usa para agrupar los archivos y acceder a ella sin registrar el parser provocaría un error.
3. Comprobar conflictos con los patrones existentes: se usa la primera coincidencia. Actualmente un CSV sin patrón reconocido se asigna al parser de Trade Republic; algunos nombres de Excel también se asignan por palabras genéricas. Un archivo desconocido no está garantizado que se ignore.

**Precaución:** la previsualización y la importación eliminan los archivos más antiguos que se hayan procesado para un mismo banco, conservando el más reciente según la fecha del nombre o, si no se reconoce, la fecha de modificación. Una detección incorrecta puede agrupar extractos de bancos distintos y causar borrados. Además, actualmente las excepciones del parser se capturan y el archivo se omite; comprobar explícitamente los errores y los resultados en las pruebas.

## 4. Integración y configuración

- La previsualización y la confirmación utilizan los parsers a través de `preview_import_files` e `import_files`. Revisar selección, edición de categoría y comentarios, deduplicación y actualización de saldos existentes sin duplicar movimientos.
- `ensure_catalog` crea automáticamente la fuente en `cuentas` al insertar movimientos; no es necesario darla de alta previamente desde Configuración. Después, revisar sus opciones de inclusión en Resumen y Saldos, saldo por movimientos y ahorro no disponible.
- Para un formato que encaje en los campos actuales, normalmente no es necesario cambiar la API, la interfaz ni el esquema. Si hacen falta datos o reglas nuevas, revisar sus consumidores antes de modificar [AppGastos.py](./AppGastos.py), [static/app.js](./static/app.js) o [schema.sql](./schema.sql).
- No asumir que una nueva cuenta se incorpora automáticamente al total histórico de ahorro o a la previsión: si también debe participar ahí, revisar la configuración y las reglas de ahorro por separado.

## 5. Pruebas y documentación

Añadir pruebas dirigidas en [test_app.py](./test_app.py), con archivos sintéticos en un directorio temporal y una SQLite temporal:

- Detección del archivo correcto y ausencia de colisiones con bancos existentes.
- Fechas, signos, céntimos, comisiones, moneda, saldo ausente y datos inválidos según las reglas del nuevo formato.
- Previsualización, selección y edición; primera importación y repetición sin duplicados.
- Si el banco proporciona saldo, actualización de un snapshot ausente y comportamiento de Saldos.
- Varios extractos del mismo banco y extractos de distintos bancos: verificar qué archivos se conservan o eliminan, **solo en el directorio temporal**.

Ejecutar las pruebas específicas añadidas y las existentes directamente relacionadas. Antes de ejecutar la suite completa, revisar la advertencia del [README.md](./README.md): algunos tests pueden usar la base configurada por defecto. No usar la base real ni los directorios reales `input/` o `backup/` para pruebas. Actualizar la sección de importación del README con el formato y nombre reconocidos.
