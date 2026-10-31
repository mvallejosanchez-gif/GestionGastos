-- Esquema SQLite para el sistema de gastos.
-- Se guardan solo los datos propios (columnas A:M de la hoja Input).
-- Las columnas calculadas N:Z de Excel son la vista v_movimientos.

CREATE TABLE IF NOT EXISTS categorias (
  categoria2 TEXT PRIMARY KEY COLLATE NOCASE,
  categoria1 TEXT NOT NULL,
  categoria0 TEXT NOT NULL
);

-- Reglas por fuente (columna Contabilidad / M). Una fuente que no esté aquí
-- se comporta como en Excel: contabilidad2 = 'EFECTIVO', disponible = saldo del banco.
CREATE TABLE IF NOT EXISTS cuentas (
  fuente                    TEXT PRIMARY KEY COLLATE NOCASE,
  contabilidad2             TEXT NOT NULL,            -- BANCO / EFECTIVO
  disponible_cero           INTEGER NOT NULL DEFAULT 0, -- 1 = el disponible calculado es siempre 0
  ahorro_no_disponible_cent INTEGER NOT NULL DEFAULT 0, -- se resta del disponible
  incluir_en_saldos         INTEGER NOT NULL DEFAULT 1, -- mostrar en la pestaña Saldos
  incluir_en_resumen        INTEGER NOT NULL DEFAULT 1, -- mostrar en la pestaña Resumen
  saldo_por_movimientos     INTEGER NOT NULL DEFAULT 0  -- acumular importes e ignorar snapshots
);

CREATE TABLE IF NOT EXISTS presupuestos_mensuales (
  anio          INTEGER NOT NULL,
  mes           INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  categoria2    TEXT NOT NULL COLLATE NOCASE,
  importe_cent  INTEGER,
  PRIMARY KEY (anio, mes, categoria2)
);

CREATE TABLE IF NOT EXISTS movimientos (
  id              INTEGER PRIMARY KEY,
  fuente          TEXT NOT NULL COLLATE NOCASE,
  f_valor         TEXT NOT NULL,                      -- ISO: 2026-10-05 [HH:MM:SS]
  fecha           TEXT NOT NULL,
  concepto        TEXT,
  movimiento      TEXT,
  importe_cent    INTEGER NOT NULL,
  divisa          TEXT,
  disponible_cent INTEGER,                            -- NULL si el banco no lo da
  divisa2         TEXT,
  observaciones   TEXT,
  categoria2      TEXT NOT NULL DEFAULT 'PENDIENTE' COLLATE NOCASE,
  comentarios     TEXT,
  comentarios2    TEXT,
  key_legacy      TEXT,                               -- KEY de Excel, solo informativa
  clave           TEXT NOT NULL UNIQUE                -- deduplicación del sistema nuevo
);
CREATE INDEX IF NOT EXISTS idx_mov_fuente_fvalor ON movimientos (fuente, f_valor);
CREATE INDEX IF NOT EXISTS idx_mov_categoria2 ON movimientos (categoria2);

-- Equivalente a las columnas N:Z de Input.
CREATE VIEW IF NOT EXISTS v_movimientos AS
SELECT
  m.id, m.fuente, m.f_valor, m.fecha, m.concepto, m.movimiento,
  m.importe_cent, m.divisa, m.disponible_cent, m.divisa2, m.observaciones,
  m.categoria2, m.comentarios, m.comentarios2, m.key_legacy, m.clave,
  c.categoria0,                                                   -- N
  c.categoria1,                                                   -- O
  COALESCE(cu.ahorro_no_disponible_cent, 0) AS ahorro_no_disponible_cent,  -- Q
  CASE WHEN COALESCE(cu.disponible_cero, 0) = 1 THEN 0
       ELSE MAX(COALESCE(m.disponible_cent, 0) - COALESCE(cu.ahorro_no_disponible_cent, 0), 0)
  END AS disponible_calculado_cent,                               -- R
  COALESCE(cu.contabilidad2, 'EFECTIVO') AS contabilidad2,        -- S
  CAST(strftime('%d', m.f_valor) AS INTEGER) AS dia_del_mes,      -- T
  date(m.f_valor) AS fecha_calculada,                             -- U
  strftime('%Y', m.f_valor) AS anio,                              -- V
  substr('enefebmarabrmayjunjulagosepoctnovdic',
         (CAST(strftime('%m', m.f_valor) AS INTEGER) - 1) * 3 + 1, 3) AS mes,  -- W
  date(m.f_valor, 'start of month') AS mes_calculado,             -- X
  CASE WHEN m.categoria2 = 'No computa' THEN 0 ELSE m.importe_cent END AS importe_final_cent,  -- Y
  ABS(m.importe_cent) AS importe_abs_cent                         -- Z
FROM movimientos m
LEFT JOIN categorias c ON c.categoria2 = m.categoria2
LEFT JOIN cuentas cu   ON cu.fuente = m.fuente;
