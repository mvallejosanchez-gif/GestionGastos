import sqlite3

db_path = 'gastos.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Borrar todos los datos de las tablas manteniendo la estructura y las vistas
cursor.executescript("""
    DELETE FROM movimientos;
    DELETE FROM cuentas;
    DELETE FROM categorias;
    
    -- Opcional: Reiniciar los contadores autoincrementales de los IDs
    DELETE FROM sqlite_sequence WHERE name IN ('movimientos', 'cuentas', 'categorias');
""")

conn.commit()
print("¡Base de datos limpiada con éxito! Ya puedes volver a ejecutar tu script de carga desde el Excel.")
conn.close()