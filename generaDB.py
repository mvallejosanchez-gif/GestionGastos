import sqlite3
import pandas as pd

# 1. Cargar el archivo Excel
file_path = 'Input Categorizacion Gastos.xlsx'
df = pd.read_excel(file_path, sheet_name='Input')

# 2. Conectar a la base de datos SQLite
db_path = 'gastos.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 3. Esquema adaptado (quitando el UNIQUE estricto en 'clave' para permitir duplicados exactos)
schema_sql = """
DROP VIEW IF EXISTS v_movimientos;
DROP TABLE IF EXISTS movimientos;
DROP TABLE IF EXISTS cuentas;
DROP TABLE IF EXISTS categorias;

CREATE TABLE categorias (
  categoria2 TEXT PRIMARY KEY COLLATE NOCASE,
  categoria1 TEXT NOT NULL,
  categoria0 TEXT NOT NULL
);

CREATE TABLE cuentas (
  fuente                     TEXT PRIMARY KEY COLLATE NOCASE,
  contabilidad2              TEXT NOT NULL,            -- BANCO / EFECTIVO
  disponible_cero            INTEGER NOT NULL DEFAULT 0, -- 1 = el disponible calculado es siempre 0
  ahorro_no_disponible_cent INTEGER NOT NULL DEFAULT 0  -- se resta del disponible
);

-- Quitamos UNIQUE de clave y dejamos id como autoincremental puro para duplicados
CREATE TABLE movimientos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  fuente            TEXT NOT NULL COLLATE NOCASE,
  f_valor           TEXT NOT NULL,                    -- ISO: 2026-10-05 [HH:MM:SS]
  fecha             TEXT NOT NULL,
  concepto          TEXT,
  movimiento        TEXT,
  importe_cent      INTEGER NOT NULL,
  divisa            TEXT,
  disponible_cent   INTEGER,                          -- NULL si el banco no lo da
  divisa2           TEXT,
  observaciones     TEXT,
  categoria2        TEXT NOT NULL DEFAULT 'PENDIENTE' COLLATE NOCASE,
  comentarios       TEXT,
  comentarios2      TEXT,
  key_legacy        TEXT,                             -- KEY de Excel, solo informativa
  clave             TEXT NOT NULL                     -- Clave descriptiva sin restricción UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_mov_fuente_fvalor ON movimientos (fuente, f_valor);
CREATE INDEX IF NOT EXISTS idx_mov_categoria2 ON movimientos (categoria2);

CREATE VIEW v_movimientos AS
SELECT
  m.id, m.fuente, m.f_valor, m.fecha, m.concepto, m.movimiento,
  m.importe_cent, m.divisa, m.disponible_cent, m.divisa2, m.observaciones,
  m.categoria2, m.comentarios, m.comentarios2, m.key_legacy, m.clave,
  c.categoria0,                                               -- N
  c.categoria1,                                               -- O
  COALESCE(cu.ahorro_no_disponible_cent, 0) AS ahorro_no_disponible_cent,  -- Q
  CASE WHEN COALESCE(cu.disponible_cero, 0) = 1 THEN 0
       ELSE MAX(COALESCE(m.disponible_cent, 0) - COALESCE(cu.ahorro_no_disponible_cent, 0), 0)
  END AS disponible_calculado_cent,                           -- R
  COALESCE(cu.contabilidad2, 'EFECTIVO') AS contabilidad2,        -- S
  CAST(strftime('%d', m.f_valor) AS INTEGER) AS dia_del_mes,      -- T
  date(m.f_valor) AS fecha_calculada,                         -- U
  strftime('%Y', m.f_valor) AS anio,                          -- V
  substr('enefebmarabrmayjunjulagosepoctnovdic',
         (CAST(strftime('%m', m.f_valor) AS INTEGER) - 1) * 3 + 1, 3) AS mes,  -- W
  date(m.f_valor, 'start of month') AS mes_calculado,             -- X
  CASE WHEN m.categoria2 = 'No computa' THEN 0 ELSE m.importe_cent END AS importe_final_cent,  -- Y
  ABS(m.importe_cent) AS importe_abs_cent                         -- Z
FROM movimientos m
LEFT JOIN categorias c ON c.categoria2 = m.categoria2
LEFT JOIN cuentas cu   ON cu.fuente = m.fuente;
"""
cursor.executescript(schema_sql)

# 4. Poblar tabla 'categorias'
cats = df[['Categoría2', 'Categoría1', 'Categoria0']].drop_duplicates(subset=['Categoría2']).copy()
cats.columns = ['categoria2', 'categoria1', 'categoria0']
for _, row in cats.iterrows():
    cursor.execute("""
        INSERT OR IGNORE INTO categorias (categoria2, categoria1, categoria0)
        VALUES (?, ?, ?);
    """, (row['categoria2'], row['categoria1'], row['categoria0']))

# 5. Poblar tabla 'cuentas'
fuentes = df['Contabilidad'].dropna().unique()
for f in fuentes:
    cont2 = 'EFECTIVO' if str(f).upper() == 'EFECTIVO' else 'BANCO'
    cursor.execute("""
        INSERT OR IGNORE INTO cuentas (fuente, contabilidad2, disponible_cero, ahorro_no_disponible_cent)
        VALUES (?, ?, 0, 0);
    """, (f, cont2))

# 6. Poblar tabla 'movimientos' insertando cada fila del Excel (incluyendo duplicados exactos)
for idx, row in df.iterrows():
    f_valor = pd.to_datetime(row['F.Valor']).strftime('%Y-%m-%d %H:%M:%S')
    fecha = pd.to_datetime(row['Fecha']).strftime('%Y-%m-%d %H:%M:%S')
    concepto = row['Concepto'] if pd.notnull(row['Concepto']) else None
    movimiento = row['Movimiento'] if pd.notnull(row['Movimiento']) else None
    
    importe_cent = int(round(float(row['Importe']) * 100))
    divisa = row['Divisa'] if pd.notnull(row['Divisa']) else 'EUR'
    
    disponible_cent = int(round(float(row['Disponible']) * 100)) if pd.notnull(row['Disponible']) else None
    divisa2 = row['Divisa2'] if pd.notnull(row['Divisa2']) else None
    observaciones = row['Observaciones'] if pd.notnull(row['Observaciones']) else None
    categoria2 = row['Categoría2'] if pd.notnull(row['Categoría2']) else 'PENDIENTE'
    comentarios = row['Comentarios'] if pd.notnull(row['Comentarios']) else None
    comentarios2 = row['Comentarios2'] if pd.notnull(row['Comentarios2']) else None
    key_legacy = str(row['KEY']) if pd.notnull(row['KEY']) else None
    
    # Añadimos el índice de fila al identificador 'clave' para asegurarnos de que sea único a nivel técnico de registro, 
    # permitiendo almacenar duplicados exactos de contenido provenientes del Excel.
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

# Verificación de que el número de filas coincide exactamente con el Excel
total_excel = len(df)
total_movs = cursor.execute("SELECT COUNT(*) FROM movimientos;").fetchone()[0]
total_view = cursor.execute("SELECT COUNT(*) FROM v_movimientos;").fetchone()[0]

print(f"Filas en Excel original: {total_excel}")
print(f"Registros guardados en 'movimientos': {total_movs}")
print(f"Registros en vista 'v_movimientos': {total_view}")

conn.close()