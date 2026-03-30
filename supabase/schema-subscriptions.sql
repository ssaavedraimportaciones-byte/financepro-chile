-- =============================================================
-- FinancePro Chile — Schema de Suscripciones y Planes
-- Ejecutar DESPUÉS del schema.sql principal
-- =============================================================

-- ---------------------------------------------------------------
-- TABLA: planes (catálogo fijo de planes)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planes (
  id              TEXT PRIMARY KEY,         -- 'starter' | 'professional' | 'enterprise'
  nombre          TEXT NOT NULL,
  precio_mensual  INTEGER NOT NULL,         -- CLP
  precio_anual    INTEGER,                  -- CLP (con descuento)
  max_usuarios    INTEGER DEFAULT 1,        -- usuarios por empresa
  max_proyectos   INTEGER DEFAULT 5,
  features        JSONB DEFAULT '[]',       -- lista de features incluidas
  destacado       BOOLEAN DEFAULT FALSE,    -- plan recomendado
  activo          BOOLEAN DEFAULT TRUE,
  orden           INTEGER DEFAULT 0
);

-- Insertar planes base
INSERT INTO planes (id, nombre, precio_mensual, precio_anual, max_usuarios, max_proyectos, features, destacado, orden)
VALUES
  ('starter', 'Starter', 19990, 199990, 1, 5,
    '["Dashboard financiero","Ingresos y Gastos","Módulo Tributario (IVA + PPM)","Fondo de emergencia","1 usuario","Hasta 5 proyectos"]',
    false, 1),
  ('professional', 'Professional', 39990, 399990, 5, 30,
    '["Todo lo del Starter","Capital Humano y nómina","Centro de costos por proyecto","OCR de boletas","Valor hora fundador","Costos tecnológicos","5 usuarios","Hasta 30 proyectos","Soporte por email"]',
    true, 2),
  ('enterprise', 'Enterprise', 79990, 799990, -1, -1,
    '["Todo lo del Professional","Usuarios ilimitados","Proyectos ilimitados","API access","Soporte prioritario WhatsApp","Onboarding personalizado","Exportación de reportes"]',
    false, 3)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- TABLA: subscripciones
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscripciones (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  plan_id             TEXT NOT NULL REFERENCES planes(id),
  estado              TEXT NOT NULL DEFAULT 'trial'
                      CHECK (estado IN ('trial','activa','cancelada','vencida','pausada')),
  fecha_inicio        DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_trial_fin     DATE,                  -- cuando termina el trial (14 días)
  fecha_vencimiento   DATE,                  -- próximo cobro / vencimiento
  ciclo               TEXT DEFAULT 'mensual' CHECK (ciclo IN ('mensual','anual')),
  metodo_pago         TEXT,                  -- 'transbank' | 'transferencia' | null
  notas               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- TABLA: pagos (historial de cobros)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  subscripcion_id UUID REFERENCES subscripciones(id),
  monto           INTEGER NOT NULL,          -- CLP
  estado          TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','pagado','rechazado','reembolsado')),
  metodo          TEXT,
  referencia      TEXT,                      -- código de transacción
  periodo         TEXT,                      -- "2026-03"
  fecha_pago      DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- RLS para nuevas tablas
-- ---------------------------------------------------------------
ALTER TABLE subscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos           ENABLE ROW LEVEL SECURITY;

-- Usuarios ven su propia suscripción
CREATE POLICY "usuario ve su subscripcion"
  ON subscripciones FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "usuario ve sus pagos"
  ON pagos FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------
-- Tabla admin_users: usuarios con rol admin
-- (separado de auth.users para seguridad)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id),
  email     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- VISTA: resumen para admin (requiere service_role)
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW admin_empresas_view AS
SELECT
  e.id,
  e.nombre,
  e.rut,
  e.giro,
  e.regimen_tributario,
  e.created_at,
  s.plan_id,
  s.estado AS suscripcion_estado,
  s.fecha_trial_fin,
  s.fecha_vencimiento,
  s.ciclo,
  p.precio_mensual,
  p.nombre AS plan_nombre,
  (SELECT COUNT(*) FROM ingresos i WHERE i.empresa_id = e.id) AS total_ingresos,
  (SELECT COUNT(*) FROM gastos g WHERE g.empresa_id = e.id) AS total_gastos
FROM empresas e
LEFT JOIN subscripciones s ON s.empresa_id = e.id
LEFT JOIN planes p ON p.id = s.plan_id;

-- ---------------------------------------------------------------
-- Función: crear suscripción trial al registrar empresa
-- Se llama automáticamente con un trigger
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION crear_trial_subscripcion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscripciones (empresa_id, plan_id, estado, fecha_inicio, fecha_trial_fin, fecha_vencimiento)
  VALUES (
    NEW.id,
    'professional',          -- trial empieza en plan Professional
    'trial',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days',
    CURRENT_DATE + INTERVAL '14 days'
  )
  ON CONFLICT (empresa_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: al crear empresa → crear trial automáticamente
CREATE TRIGGER trigger_crear_trial
  AFTER INSERT ON empresas
  FOR EACH ROW EXECUTE FUNCTION crear_trial_subscripcion();

-- ---------------------------------------------------------------
-- Función utilitaria: días restantes de trial
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION dias_trial_restantes(p_empresa_id UUID)
RETURNS INTEGER AS $$
  SELECT GREATEST(0, (fecha_trial_fin - CURRENT_DATE)::INTEGER)
  FROM subscripciones
  WHERE empresa_id = p_empresa_id AND estado = 'trial';
$$ LANGUAGE sql STABLE;
