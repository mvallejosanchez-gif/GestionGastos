# Frontend para gastos.db

Este proyecto incluye un frontend mínimo para consultar y editar los registros de la base de datos SQLite `gastos.db`.

## Requisitos

- Python 3.13+
- Flask

## Ejecutar

```bash
pip install -r requirements.txt
python AppGastos.py
```

Abrir en el navegador:

```text
http://localhost:5000
```

## Funcionalidad

- Listado paginado de movimientos
- Filtro por texto, fuente y categoría
- Vista resumen de totales y principales categorías/fuentes
- Edición de campos de un movimiento desde un modal
