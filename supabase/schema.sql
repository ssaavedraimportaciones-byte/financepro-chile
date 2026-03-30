-- =============================================================
-- FinancePro Chile - Schema de Base de Datos (Supabase / PostgreSQL)
-- Ejecutar en el SQL Editor de Supabase
-- =============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------
-- TABLA: empresas
-- ---------------------------------------------------------------
CREATE TABLE empresas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  rut           TEXT NOT NULL,
  giro          TEXT,
  regimen_tributario TEXT NOT NULL DEFAULT 'pro_pyme_general'
                CHECK (regimen_tributario IN ('pro_pyme_general','pro_pyme_transparente','general')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- TABLA: proyectos
-- ---------------------------------------------------------------
CREATE TABLE proyectos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  cliente       TEXT,
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE,
  estado        TEXT NOT NULL DEFAULT 'activo'
                CHECK (estado IN ('activo','pausado','terminado')),
  presupuesto   NUMERIC(14,2),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- TABLA: ingresos
-- ---------------------------------------------------------------
CREATE TABLE ingresos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  descripcion   TEXT NOT NULL,
  monto         NUMERIC(14,2) NOT NULL,   -- neto (sin IVA)
  monto_iva     NUMERIC(14,2) DEFAULT 0,  -- IVA incluido en la operación
  fecha         DATE NOT NULL,
  categoria     TEXT NOT NULL DEFAULT 'servicios'
                CHECK (categoria IN ('servicios','venta_producto','honorarios','arriendo','otro')),
  proyecto_id   UUID REFERENCES proyectos(id),
  cliente       TEXT,
  documento     TEXT,  -- número factura/boleta
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- TABLA: gastos
-- ---------------------------------------------------------------
CREATE TABLE gastos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  descripcion   TEXT NOT NULL,
  monto         NUMERIC(14,2) NOT NULL,
  monto_iva     NUMERIC(14,2) DEFAULT 0,
  fecha         DATE NOT NULL,
  categoria     TEXT NOT NULL
                CHECK (categoria IN ('formalizacion','tecnologia','operativo','capital_humano',
                                     'tributario','marketing','arriendo','otro')),
  subcategoria  TEXT,
  proyecto_id   UUID REFERENCES proyectos(id),
  proveedor     TEXT,
  imagen_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- TABLA: empleados
-- ---------------------------------------------------------------
CREATE TABLE empleados (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  rut             TEXT NOT NULL,
  cargo           TEXT,
  tipo            TEXT NOT NULL DEFAULT 'contrato'
                  CHECK (tipo IN ('contrato','honorarios')),
  sueldo_bruto    NUMERIC(14,2) NOT NULL,
  afp             TEXT DEFAULT 'Habitat',
  salud           TEXT DEFAULT 'fonasa' CHECK (salud IN ('fonasa','isapre')),
  monto_salud     NUMERIC(14,2) DEFAULT 0,
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- TABLA: costos_formalizacion
-- ---------------------------------------------------------------
CREATE TABLE costos_formalizacion (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id              UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  descripcion             TEXT NOT NULL,
  monto                   NUMERIC(14,2) NOT NULL,
  fecha                   DATE NOT NULL,
  tipo                    TEXT NOT NULL
                          CHECK (tipo IN ('constitucion','fea','notaria','marca_inapi',
                                          'patente_municipal','otro')),
  amortizacion_meses      INT NOT NULL DEFAULT 12,
  costo_mensual_amortizado NUMERIC(14,2) GENERATED ALWAYS AS (monto / amortizacion_meses) STORED,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- TABLA: costos_tecnologicos
-- ---------------------------------------------------------------
CREATE TABLE costos_tecnologicos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  descripcion       TEXT NOT NULL,
  proveedor         TEXT,
  costo             NUMERIC(14,2) NOT NULL,
  moneda            TEXT NOT NULL DEFAULT 'CLP' CHECK (moneda IN ('CLP','USD','EUR')),
  frecuencia        TEXT NOT NULL DEFAULT 'mensual'
                    CHECK (frecuencia IN ('mensual','anual','unico')),
  categoria         TEXT NOT NULL
                    CHECK (categoria IN ('hosting','dominio','base_datos','despliegue',
                                         'api_externa','licencia','pasarela_pago','otro')),
  proyecto_id       UUID REFERENCES proyectos(id),
  fecha_vencimiento DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- TABLA: registros_tributarios
-- ---------------------------------------------------------------
CREATE TABLE registros_tributarios (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id   UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  periodo      TEXT NOT NULL,            -- "2024-03"
  iva_debito   NUMERIC(14,2) DEFAULT 0,
  iva_credito  NUMERIC(14,2) DEFAULT 0,
  iva_pagar    NUMERIC(14,2) GENERATED ALWAYS AS
               (GREATEST(iva_debito - iva_credito, 0)) STORED,
  ppm          NUMERIC(14,2) DEFAULT 0,
  pagado       BOOLEAN DEFAULT FALSE,
  fecha_pago   DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, periodo)
);

-- ---------------------------------------------------------------
-- TABLA: fondo_emergencia
-- ---------------------------------------------------------------
CREATE TABLE fondo_emergencia (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  porcentaje_ahorro NUMERIC(5,2) DEFAULT 5,
  monto_acumulado   NUMERIC(14,2) DEFAULT 0,
  meta              NUMERIC(14,2) DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- TABLA: config_fundador
-- ---------------------------------------------------------------
CREATE TABLE config_fundador (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id           UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  nombre               TEXT NOT NULL,
  sueldo_reemplazo     NUMERIC(14,2) NOT NULL DEFAULT 2000000,
  horas_mensuales      INT NOT NULL DEFAULT 160,
  multiplicador_riesgo NUMERIC(4,2) NOT NULL DEFAULT 1.4,
  valor_hora           NUMERIC(14,2) GENERATED ALWAYS AS
                       (sueldo_reemplazo / horas_mensuales * multiplicador_riesgo) STORED,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuario solo ve los datos de sus empresas
-- =============================================================

ALTER TABLE empresas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados             ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos_formalizacion  ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos_tecnologicos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_tributarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE fondo_emergencia      ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_fundador       ENABLE ROW LEVEL SECURITY;

-- Políticas: usuario solo accede a sus propias empresas
CREATE POLICY "usuario ve sus empresas"
  ON empresas FOR ALL USING (user_id = auth.uid());

-- Políticas para tablas relacionadas (vía empresa)
CREATE POLICY "usuario ve sus proyectos"
  ON proyectos FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "usuario ve sus ingresos"
  ON ingresos FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "usuario ve sus gastos"
  ON gastos FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "usuario ve sus empleados"
  ON empleados FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "usuario ve costos formalizacion"
  ON costos_formalizacion FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "usuario ve costos tecnologicos"
  ON costos_tecnologicos FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "usuario ve registros tributarios"
  ON registros_tributarios FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "usuario ve fondo emergencia"
  ON fondo_emergencia FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "usuario ve config fundador"
  ON config_fundador FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

-- =============================================================
-- STORAGE BUCKET para imágenes de boletas/facturas
-- Ejecutar en Supabase Dashboard > Storage
-- =============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false);
-- CREATE POLICY "usuarios suben sus docs" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'documentos' AND auth.uid() IS NOT NULL);
-- CREATE POLICY "usuarios ven sus docs" ON storage.objects FOR SELECT
--   USING (bucket_id = 'documentos' AND auth.uid() IS NOT NULL);

-- =============================================================
-- DATOS DE EJEMPLO (opcional para desarrollo)
-- =============================================================
-- (Ejecutar solo en entorno de desarrollo)
-- Ver: supabase/seed.sql
