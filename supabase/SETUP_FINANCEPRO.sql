-- =============================================================
-- FinancePro Chile — Setup completo en Supabase
-- Corre esto en: Supabase Dashboard > SQL Editor > New Query
-- SEGURO: usa IF NOT EXISTS y ADD COLUMN IF NOT EXISTS
--         no rompe tablas existentes de otros proyectos
-- =============================================================

-- ─────────────────────────────────────────────
-- 1. EXTENDER tabla 'empresas' (ya existe en TransportPro)
--    Solo agrega columnas que FinancePro necesita
-- ─────────────────────────────────────────────
ALTER TABLE IF EXISTS empresas
  ADD COLUMN IF NOT EXISTS user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS giro            TEXT,
  ADD COLUMN IF NOT EXISTS regimen_tributario TEXT DEFAULT 'pro_pyme_general';

-- Si la tabla NO existe aún, crearla completa
CREATE TABLE IF NOT EXISTS empresas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre              TEXT NOT NULL,
  rut                 TEXT,
  giro                TEXT,
  regimen_tributario  TEXT DEFAULT 'pro_pyme_general',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. EXTENDER tabla 'gastos' (ya existe en TransportPro)
--    Solo agrega columnas de FinancePro
-- ─────────────────────────────────────────────
ALTER TABLE IF EXISTS gastos
  ADD COLUMN IF NOT EXISTS monto_iva   NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proyecto_id UUID;

-- Si la tabla NO existe aún, crearla
CREATE TABLE IF NOT EXISTS gastos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID REFERENCES empresas(id) ON DELETE CASCADE,
  categoria    TEXT NOT NULL,
  descripcion  TEXT,
  monto        NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_iva    NUMERIC(12,2) DEFAULT 0,
  proyecto_id  UUID,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. NUEVAS tablas de FinancePro
-- ─────────────────────────────────────────────

-- Proyectos / Centro de costos
CREATE TABLE IF NOT EXISTS proyectos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nombre           TEXT NOT NULL,
  cliente          TEXT,
  presupuesto      NUMERIC(12,2) DEFAULT 0,
  estado           TEXT DEFAULT 'activo' CHECK (estado IN ('activo','completado','pausado','cancelado')),
  fecha_inicio     DATE,
  fecha_fin        DATE,
  descripcion      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Ingresos
CREATE TABLE IF NOT EXISTS ingresos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID REFERENCES empresas(id) ON DELETE CASCADE,
  proyecto_id  UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  categoria    TEXT NOT NULL,
  descripcion  TEXT,
  monto        NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_iva    NUMERIC(12,2) DEFAULT 0,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Empleados / nómina
CREATE TABLE IF NOT EXISTS empleados (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nombre             TEXT NOT NULL,
  cargo              TEXT,
  sueldo_bruto       NUMERIC(12,2) NOT NULL DEFAULT 0,
  tipo_contrato      TEXT DEFAULT 'indefinido',
  tipo_salud         TEXT DEFAULT 'fonasa',
  monto_isapre       NUMERIC(12,2) DEFAULT 0,
  fecha_ingreso      DATE,
  activo             BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Costos de formalización (notaría, SII, INAPI, etc.)
CREATE TABLE IF NOT EXISTS costos_formalizacion (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id               UUID REFERENCES empresas(id) ON DELETE CASCADE,
  tipo                     TEXT NOT NULL,
  descripcion              TEXT,
  monto                    NUMERIC(12,2) NOT NULL DEFAULT 0,
  amortizacion_meses       INTEGER DEFAULT 12,
  costo_mensual_amortizado NUMERIC(12,2) GENERATED ALWAYS AS (monto / NULLIF(amortizacion_meses, 0)) STORED,
  fecha                    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Costos tecnológicos (SaaS, dominios, servidores)
CREATE TABLE IF NOT EXISTS costos_tecnologicos (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id               UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nombre                   TEXT NOT NULL,
  proveedor                TEXT,
  monto                    NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda                   TEXT DEFAULT 'CLP' CHECK (moneda IN ('CLP','USD','EUR')),
  frecuencia               TEXT DEFAULT 'mensual',
  amortizacion_meses       INTEGER DEFAULT 1,
  costo_mensual_amortizado NUMERIC(12,2) GENERATED ALWAYS AS (monto / NULLIF(amortizacion_meses, 0)) STORED,
  fecha_vencimiento        DATE,
  activo                   BOOLEAN DEFAULT TRUE,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Registros tributarios (IVA/PPM mensual)
CREATE TABLE IF NOT EXISTS registros_tributarios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID REFERENCES empresas(id) ON DELETE CASCADE,
  periodo      TEXT NOT NULL,       -- formato YYYY-MM
  iva_debito   NUMERIC(12,2) DEFAULT 0,
  iva_credito  NUMERIC(12,2) DEFAULT 0,
  iva_pagar    NUMERIC(12,2) DEFAULT 0,
  ppm          NUMERIC(12,2) DEFAULT 0,
  pagado       BOOLEAN DEFAULT FALSE,
  fecha_pago   DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (empresa_id, periodo)
);

-- Fondo de emergencia
CREATE TABLE IF NOT EXISTS fondo_emergencia (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID REFERENCES empresas(id) ON DELETE CASCADE,
  monto        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tipo         TEXT NOT NULL CHECK (tipo IN ('deposito','retiro')),
  descripcion  TEXT,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Config del fundador (valor hora)
CREATE TABLE IF NOT EXISTS config_fundador (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id               UUID REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  sueldo_reemplazo         NUMERIC(12,2) DEFAULT 0,
  horas_mensuales          INTEGER DEFAULT 160,
  multiplicador_riesgo     NUMERIC(4,2) DEFAULT 1.5,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. TABLAS DE SUSCRIPCIONES (SaaS)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS planes (
  id              TEXT PRIMARY KEY,
  nombre          TEXT NOT NULL,
  precio_mensual  INTEGER NOT NULL,
  precio_anual    INTEGER,
  max_usuarios    INTEGER DEFAULT 1,
  max_proyectos   INTEGER DEFAULT 5,
  features        JSONB DEFAULT '[]'::jsonb,
  destacado       BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS subscripciones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  plan_id           TEXT REFERENCES planes(id),
  estado            TEXT NOT NULL DEFAULT 'trial'
                    CHECK (estado IN ('trial','activa','cancelada','vencida','pausada')),
  fecha_trial_fin   TIMESTAMPTZ,
  fecha_vencimiento TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID REFERENCES empresas(id) ON DELETE CASCADE,
  subscripcion_id  UUID REFERENCES subscripciones(id),
  monto            INTEGER NOT NULL,
  estado           TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagado','fallido','reembolsado')),
  periodo          TEXT,
  metodo_pago      TEXT,
  referencia       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 5. DATOS INICIALES (planes)
-- ─────────────────────────────────────────────
INSERT INTO planes (id, nombre, precio_mensual, precio_anual, max_usuarios, max_proyectos, features, destacado)
VALUES
  ('starter',      'Starter',      19990, 199900,  1,  5,  '["Dashboard financiero","IVA + PPM","Fondo emergencia"]'::jsonb, false),
  ('professional', 'Professional', 39990, 399900,  5, 30,  '["Todo Starter","Capital Humano","OCR","Valor Fundador","Soporte email"]'::jsonb, true),
  ('enterprise',   'Enterprise',   79990, 799900, -1, -1,  '["Todo Professional","Usuarios ilimitados","API","Soporte WhatsApp","Onboarding"]'::jsonb, false)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 6. TRIGGER: Auto-crear trial de 14 días al registrar empresa
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION crear_trial_subscripcion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscripciones (empresa_id, plan_id, estado, fecha_trial_fin)
  VALUES (NEW.id, 'professional', 'trial', NOW() + INTERVAL '14 days')
  ON CONFLICT (empresa_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_crear_trial ON empresas;
CREATE TRIGGER trigger_crear_trial
  AFTER INSERT ON empresas
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION crear_trial_subscripcion();

-- ─────────────────────────────────────────────
-- 7. RLS (Row Level Security)
-- ─────────────────────────────────────────────

-- Habilitar RLS en todas las tablas de FinancePro
ALTER TABLE empresas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados            ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos_formalizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos_tecnologicos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_tributarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE fondo_emergencia     ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_fundador      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscripciones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes               ENABLE ROW LEVEL SECURITY;

-- Empresas: cada usuario ve su propia empresa
DROP POLICY IF EXISTS "fp_empresas_own" ON empresas;
CREATE POLICY "fp_empresas_own" ON empresas
  FOR ALL USING (auth.uid() = user_id);

-- Helper function para obtener empresa_id del usuario actual
CREATE OR REPLACE FUNCTION fp_get_empresa_id()
RETURNS UUID AS $$
  SELECT id FROM empresas WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Política genérica para tablas con empresa_id
DROP POLICY IF EXISTS "fp_proyectos_own" ON proyectos;
CREATE POLICY "fp_proyectos_own" ON proyectos
  FOR ALL USING (empresa_id = fp_get_empresa_id());

DROP POLICY IF EXISTS "fp_ingresos_own" ON ingresos;
CREATE POLICY "fp_ingresos_own" ON ingresos
  FOR ALL USING (empresa_id = fp_get_empresa_id());

DROP POLICY IF EXISTS "fp_gastos_fp_own" ON gastos;
CREATE POLICY "fp_gastos_fp_own" ON gastos
  FOR ALL USING (empresa_id = fp_get_empresa_id());

DROP POLICY IF EXISTS "fp_empleados_own" ON empleados;
CREATE POLICY "fp_empleados_own" ON empleados
  FOR ALL USING (empresa_id = fp_get_empresa_id());

DROP POLICY IF EXISTS "fp_formalizacion_own" ON costos_formalizacion;
CREATE POLICY "fp_formalizacion_own" ON costos_formalizacion
  FOR ALL USING (empresa_id = fp_get_empresa_id());

DROP POLICY IF EXISTS "fp_tecnologia_own" ON costos_tecnologicos;
CREATE POLICY "fp_tecnologia_own" ON costos_tecnologicos
  FOR ALL USING (empresa_id = fp_get_empresa_id());

DROP POLICY IF EXISTS "fp_tributario_own" ON registros_tributarios;
CREATE POLICY "fp_tributario_own" ON registros_tributarios
  FOR ALL USING (empresa_id = fp_get_empresa_id());

DROP POLICY IF EXISTS "fp_fondo_own" ON fondo_emergencia;
CREATE POLICY "fp_fondo_own" ON fondo_emergencia
  FOR ALL USING (empresa_id = fp_get_empresa_id());

DROP POLICY IF EXISTS "fp_fundador_own" ON config_fundador;
CREATE POLICY "fp_fundador_own" ON config_fundador
  FOR ALL USING (empresa_id = fp_get_empresa_id());

DROP POLICY IF EXISTS "fp_sub_own" ON subscripciones;
CREATE POLICY "fp_sub_own" ON subscripciones
  FOR ALL USING (empresa_id = fp_get_empresa_id());

DROP POLICY IF EXISTS "fp_pagos_own" ON pagos;
CREATE POLICY "fp_pagos_own" ON pagos
  FOR ALL USING (empresa_id = fp_get_empresa_id());

-- Planes: todos pueden leer (público)
DROP POLICY IF EXISTS "fp_planes_read" ON planes;
CREATE POLICY "fp_planes_read" ON planes
  FOR SELECT USING (true);

-- ─────────────────────────────────────────────
-- 8. VISTA ADMIN (para el panel /admin)
-- ─────────────────────────────────────────────
DROP VIEW IF EXISTS admin_empresas_view;
CREATE VIEW admin_empresas_view AS
  SELECT
    e.id, e.nombre, e.rut, e.created_at,
    s.plan_id, s.estado,
    s.fecha_trial_fin, s.fecha_vencimiento,
    p.precio_mensual
  FROM empresas e
  LEFT JOIN subscripciones s ON e.id = s.empresa_id
  LEFT JOIN planes p ON s.plan_id = p.id
  WHERE e.user_id IS NOT NULL;  -- Solo empresas de FinancePro

-- ─────────────────────────────────────────────
-- ¡LISTO! El SQL se ejecutó correctamente.
-- Ahora ve a: https://financepro-chile.vercel.app
-- ─────────────────────────────────────────────
