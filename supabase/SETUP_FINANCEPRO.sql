-- =============================================================
-- FinancePro Chile — Setup completo en Neon/PostgreSQL
-- Corre esto en: Neon Dashboard > SQL Editor
-- SEGURO: usa CREATE TABLE IF NOT EXISTS y prefijo fp_ en todas
--         las tablas para no interferir con otras aplicaciones
-- =============================================================

-- ─────────────────────────────────────────────
-- 1. Empresa (separada de otras apps con prefijo fp_)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_empresas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE,
  nombre              TEXT NOT NULL,
  rut                 TEXT,
  giro                TEXT,
  regimen_tributario  TEXT DEFAULT 'pro_pyme_general',
  bloqueado           BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
-- Un usuario = una empresa, garantizado a nivel DB
CREATE UNIQUE INDEX IF NOT EXISTS fp_empresas_user_id_key ON fp_empresas (user_id);

-- ─────────────────────────────────────────────
-- 2. Gastos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_gastos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID REFERENCES fp_empresas(id) ON DELETE CASCADE,
  categoria    TEXT NOT NULL,
  subcategoria TEXT,
  descripcion  TEXT,
  monto        NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_iva    NUMERIC(12,2) DEFAULT 0,
  proveedor    TEXT,
  proyecto_id  UUID,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. Proyectos / Centro de costos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_proyectos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID REFERENCES fp_empresas(id) ON DELETE CASCADE,
  nombre           TEXT NOT NULL,
  cliente          TEXT,
  presupuesto      NUMERIC(12,2) DEFAULT 0,
  estado           TEXT DEFAULT 'activo' CHECK (estado IN ('activo','completado','pausado','cancelado')),
  fecha_inicio     DATE,
  fecha_fin        DATE,
  descripcion      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. Ingresos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_ingresos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID REFERENCES fp_empresas(id) ON DELETE CASCADE,
  proyecto_id  UUID REFERENCES fp_proyectos(id) ON DELETE SET NULL,
  categoria    TEXT NOT NULL,
  descripcion  TEXT,
  cliente      TEXT,
  documento    TEXT,
  monto        NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_iva    NUMERIC(12,2) DEFAULT 0,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 5. Empleados / nómina
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_empleados (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID REFERENCES fp_empresas(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL,
  rut          TEXT,
  cargo        TEXT,
  tipo         TEXT DEFAULT 'contrato',
  sueldo_bruto NUMERIC(12,2) NOT NULL DEFAULT 0,
  afp          TEXT DEFAULT 'Habitat',
  salud        TEXT DEFAULT 'fonasa',
  monto_salud  NUMERIC(12,2) DEFAULT 0,
  fecha_ingreso DATE,
  activo       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 6. Costos de formalización
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_costos_formalizacion (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id               UUID REFERENCES fp_empresas(id) ON DELETE CASCADE,
  tipo                     TEXT NOT NULL,
  descripcion              TEXT,
  monto                    NUMERIC(12,2) NOT NULL DEFAULT 0,
  amortizacion_meses       INTEGER DEFAULT 12,
  costo_mensual_amortizado NUMERIC(12,2) GENERATED ALWAYS AS (monto / NULLIF(amortizacion_meses, 0)) STORED,
  fecha                    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 7. Costos tecnológicos (SaaS, dominios, servidores)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_costos_tecnologicos (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id               UUID REFERENCES fp_empresas(id) ON DELETE CASCADE,
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

-- ─────────────────────────────────────────────
-- 8. Registros tributarios (IVA/PPM mensual)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_registros_tributarios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID REFERENCES fp_empresas(id) ON DELETE CASCADE,
  periodo      TEXT NOT NULL,
  iva_debito   NUMERIC(12,2) DEFAULT 0,
  iva_credito  NUMERIC(12,2) DEFAULT 0,
  iva_pagar    NUMERIC(12,2) DEFAULT 0,
  ppm          NUMERIC(12,2) DEFAULT 0,
  pagado       BOOLEAN DEFAULT FALSE,
  fecha_pago   DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (empresa_id, periodo)
);

-- ─────────────────────────────────────────────
-- 9. Fondo de emergencia
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_fondo_emergencia (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID REFERENCES fp_empresas(id) ON DELETE CASCADE UNIQUE,
  porcentaje_ahorro   NUMERIC(5,2) DEFAULT 10,
  meta                NUMERIC(12,2) DEFAULT 0,
  monto_acumulado     NUMERIC(12,2) DEFAULT 0,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 10. Config del fundador (valor hora)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_config_fundador (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id               UUID REFERENCES fp_empresas(id) ON DELETE CASCADE UNIQUE,
  sueldo_reemplazo         NUMERIC(12,2) DEFAULT 0,
  horas_mensuales          INTEGER DEFAULT 160,
  multiplicador_riesgo     NUMERIC(4,2) DEFAULT 1.5,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 11. Planes y suscripciones
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_planes (
  id              TEXT PRIMARY KEY,
  nombre          TEXT NOT NULL,
  precio_mensual  INTEGER NOT NULL,
  precio_anual    INTEGER,
  max_usuarios    INTEGER DEFAULT 1,
  max_proyectos   INTEGER DEFAULT 5,
  features        JSONB DEFAULT '[]'::jsonb,
  destacado       BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS fp_subscripciones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID REFERENCES fp_empresas(id) ON DELETE CASCADE UNIQUE,
  plan_id           TEXT REFERENCES fp_planes(id),
  plan              TEXT DEFAULT 'trial',
  estado            TEXT NOT NULL DEFAULT 'trial'
                    CHECK (estado IN ('trial','activa','cancelada','vencida','pausada')),
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  fecha_trial_fin   TIMESTAMPTZ,
  fecha_vencimiento TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 12. Datos iniciales (planes)
-- ─────────────────────────────────────────────
INSERT INTO fp_planes (id, nombre, precio_mensual, precio_anual, max_usuarios, max_proyectos, features, destacado)
VALUES
  ('starter',      'Starter',      19990, 199900,  1,  5,  '["Dashboard financiero","IVA + PPM","Fondo emergencia"]'::jsonb, false),
  ('professional', 'Professional', 39990, 399900,  5, 30,  '["Todo Starter","Capital Humano","OCR","Valor Fundador","Soporte email"]'::jsonb, true),
  ('enterprise',   'Enterprise',   79990, 799900, -1, -1,  '["Todo Professional","Usuarios ilimitados","API","Soporte WhatsApp","Onboarding"]'::jsonb, false)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 13. Índices para performance
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fp_gastos_empresa_fecha     ON fp_gastos(empresa_id, fecha);
CREATE INDEX IF NOT EXISTS idx_fp_ingresos_empresa_fecha   ON fp_ingresos(empresa_id, fecha);
CREATE INDEX IF NOT EXISTS idx_fp_proyectos_empresa        ON fp_proyectos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fp_empleados_empresa        ON fp_empleados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fp_empresas_user_id         ON fp_empresas(user_id);

-- ─────────────────────────────────────────────
-- ¡LISTO! Tablas creadas con prefijo fp_
-- Completamente aisladas de TransportPro u otras apps
-- Ahora ve a configurar tus variables de entorno y lanzar la app
-- ─────────────────────────────────────────────
