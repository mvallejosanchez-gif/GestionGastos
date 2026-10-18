import sqlite3
import pandas as pd

# 1. Rutas del archivo Excel y de la base de datos
file_path = 'Input Categorizacion Gastos.xlsx'
db_path = 'gastos.db'

print(f"Leyendo datos desde '{file_path}'...")
df = pd.read_excel(file_path, sheet_name='Input')

# 2. Conectar a la base de datos SQLite
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Vaciando tablas existentes antes de la recarga...")
cursor.executescript("""
    DELETE FROM movimientos;
    DELETE FROM cuentas;
    DELETE FROM categorias;
    DELETE FROM sqlite_sequence WHERE name IN ('movimientos', 'cuentas', 'categorias');
""")
conn.commit()

# 3. Poblar tabla 'categorias'
print("Insertando categorías...")
cats = df[['Categoría2', 'Categoría1', 'Categoria0']].drop_duplicates(subset=['Categoría2']).copy()
cats.columns = ['categoria2', 'categoria1', 'categoria0']
for _, row in cats.iterrows():
    cursor.execute("""
        INSERT OR IGNORE INTO categorias (categoria2, categoria1, categoria0)
        VALUES (?, ?, ?);
    """, (row['categoria2'], row['categoria1'], row['categoria0']))

# 4. Poblar tabla 'cuentas'
print("Insertando cuentas / fuentes...")
fuentes = df['Contabilidad'].dropna().unique()
for f in fuentes:
    cont2 = 'EFECTIVO' if str(f).upper() == 'EFECTIVO' else 'BANCO'
    cursor.execute("""
        INSERT OR IGNORE INTO cuentas (fuente, contabilidad2, disponible_cero, ahorro_no_disponible_cent)
        VALUES (?, ?, 0, 0);
    """, (f, cont2))

# 5. Poblar tabla 'movimientos' (manteniendo duplicados exactos)
print(f"Insertando {len(df)} movimientos...")
for idx, row in df.iterrows():
    f_valor = pd.to_datetime(row['F.Valor']).strftime('%Y-%m-%d %H:%M:%S')
    fecha = pd.to_datetime(row['Fecha']).strftime('%Y-%m-%d %H:%M:%S')
    concepto = row['Concepto'] if pd.notnull(row['Concepto']) else None
    movimiento = row['Movimiento'] if pd.notnull(row['Movimiento']) else None
    
    # Importes convertidos a enteros (céntimos)
    importe_cent = int(round(float(row['Importe']) * 100))
    divisa = row['Divisa'] if pd.notnull(row['Divisa']) else 'EUR'
    
    disponible_cent = int(round(float(row['Disponible']) * 100)) if pd.notnull(row['Disponible']) else None
    divisa2 = row['Divisa2'] if pd.notnull(row['Divisa2']) else None
    observaciones = row['Observaciones'] if pd.notnull(row['Observaciones']) else None
    categoria2 = row['Categoría2'] if pd.notnull(row['Categoría2']) else 'PENDIENTE'
    comentarios = row['Comentarios'] if pd.notnull(row['Comentarios']) else None
    comentarios2 = row['Comentarios2'] if pd.notnull(row['Comentarios2']) else None
    key_legacy = str(row['KEY']) if pd.notnull(row['KEY']) else None
    
    # Clave única por registro incluyendo el índice de fila para permitir duplicados exactos
    clave = f"{key_legacy}_{idx}"

    cursor.execute("""
        INSERT INTO movimientos (
            fuente, f_valor, fecha, concepto, movimiento, importe_cent, 
            divisa, disponible_cent, divisa2, observaciones, categoria2, 
            comentarios, comentarios2, key_legacy, clave
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        row['Contabilidad'], f_valor, fecha, concepto, movimiento, importe_cent,
        divisa, disponible_cent, divisa2, observaciones, categoria2,
        comentarios, comentarios2, key_legacy, clave
    ))

conn.commit()

# Verificación final
total_movs = cursor.execute("SELECT COUNT(*) FROM movimientos;").fetchone()[0]
total_view = cursor.execute("SELECT COUNT(*) FROM v_movimientos;").fetchone()[0]

print("\n¡Carga completada con éxito!")
print(f"Total de registros insertados en 'movimientos': {total_movs}")
print(f"Total de registros accesibles en la vista 'v_movimientos': {total_view}")

conn.close()