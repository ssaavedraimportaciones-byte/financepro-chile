-- =============================================================
-- Seed de datos de ejemplo para desarrollo
-- Ejecutar DESPUÉS del schema.sql
-- Reemplaza 'tu-user-id' con el UUID real de tu usuario en auth.users
-- =============================================================

-- 1. Empresa de ejemplo
INSERT INTO empresas (id, user_id, nombre, rut, giro, regimen_tributario) VALUES
  ('11111111-1111-1111-1111-111111111111', 'tu-user-id', 'TechStart SpA', '76.123.456-7', 'Desarrollo de software', 'pro_pyme_general');

-- 2. Proyectos
INSERT INTO proyectos (id, empresa_id, nombre, cliente, fecha_inicio, estado, presupuesto) VALUES
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'App e-commerce RetailX', 'RetailX Chile', '2026-01-15', 'activo', 8000000),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Dashboard Analytics MiPyme', 'MiPyme Tools', '2026-02-01', 'activo', 4500000),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Web Corporativa Inmobiliaria', 'Inmobiliaria Sur', '2025-11-01', 'terminado', 2500000);

-- 3. Ingresos
INSERT INTO ingresos (empresa_id, descripcion, monto, monto_iva, fecha, categoria, proyecto_id, cliente) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Adelanto proyecto RetailX', 4000000, 760000, '2026-03-05', 'servicios', '22222222-2222-2222-2222-222222222221', 'RetailX Chile'),
  ('11111111-1111-1111-1111-111111111111', 'Pago mensual Analytics MiPyme', 1500000, 285000, '2026-03-01', 'servicios', '22222222-2222-2222-2222-222222222222', 'MiPyme Tools'),
  ('11111111-1111-1111-1111-111111111111', 'Saldo final Inmobiliaria', 1250000, 237500, '2026-02-15', 'servicios', '22222222-2222-2222-2222-222222222223', 'Inmobiliaria Sur'),
  ('11111111-1111-1111-1111-111111111111', 'Consultoría SEO', 500000, 0, '2026-03-10', 'honorarios', NULL, 'Cliente particular');

-- 4. Gastos
INSERT INTO gastos (empresa_id, descripcion, monto, monto_iva, fecha, categoria, subcategoria) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Arriendio oficina virtual', 150000, 0, '2026-03-01', 'arriendo', NULL),
  ('11111111-1111-1111-1111-111111111111', 'Supabase Pro', 30000, 5700, '2026-03-01', 'tecnologia', 'base_datos'),
  ('11111111-1111-1111-1111-111111111111', 'Vercel Pro', 22000, 4180, '2026-03-01', 'tecnologia', 'despliegue'),
  ('11111111-1111-1111-1111-111111111111', 'Dominio techstart.cl', 12000, 2280, '2026-03-01', 'tecnologia', 'dominio'),
  ('11111111-1111-1111-1111-111111111111', 'Bencina visita cliente', 45000, 0, '2026-03-07', 'operativo', 'Bencina'),
  ('11111111-1111-1111-1111-111111111111', 'Internet fibra', 32990, 6268, '2026-03-05', 'operativo', 'Internet'),
  ('11111111-1111-1111-1111-111111111111', 'Contador honorarios', 300000, 0, '2026-03-10', 'tributario', NULL),
  ('11111111-1111-1111-1111-111111111111', 'IVA Marzo 2026', 420000, 0, '2026-03-12', 'tributario', NULL),
  ('11111111-1111-1111-1111-111111111111', 'Café trabajo remoto', 8500, 0, '2026-03-08', 'operativo', 'Gasto menor'),
  ('11111111-1111-1111-1111-111111111111', 'Licencia Figma', 15000, 2850, '2026-03-01', 'tecnologia', 'licencia');

-- 5. Costos de formalización
INSERT INTO costos_formalizacion (empresa_id, descripcion, monto, fecha, tipo, amortizacion_meses) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Constitución SpA en Notaría', 250000, '2025-06-01', 'constitucion', 60),
  ('11111111-1111-1111-1111-111111111111', 'Firma Electrónica Avanzada E-CERTCHILE', 89000, '2025-06-15', 'fea', 36),
  ('11111111-1111-1111-1111-111111111111', 'Patente Municipal Valparaíso', 55000, '2026-01-15', 'patente_municipal', 12);

-- 6. Costos tecnológicos
INSERT INTO costos_tecnologicos (empresa_id, descripcion, proveedor, costo, moneda, frecuencia, categoria) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Supabase Pro', 'Supabase', 25, 'USD', 'mensual', 'base_datos'),
  ('11111111-1111-1111-1111-111111111111', 'Vercel Pro', 'Vercel', 20, 'USD', 'mensual', 'despliegue'),
  ('11111111-1111-1111-1111-111111111111', 'GitHub Copilot', 'GitHub', 10, 'USD', 'mensual', 'licencia'),
  ('11111111-1111-1111-1111-111111111111', 'Dominio .cl', 'NIC Chile', 12000, 'CLP', 'anual', 'dominio'),
  ('11111111-1111-1111-1111-111111111111', 'Resend (email transaccional)', 'Resend', 20, 'USD', 'mensual', 'api_externa');

-- 7. Empleados
INSERT INTO empleados (empresa_id, nombre, rut, cargo, tipo, sueldo_bruto, afp, salud) VALUES
  ('11111111-1111-1111-1111-111111111111', 'María González', '18.234.567-8', 'Diseñadora UX', 'contrato', 1200000, 'Habitat', 'fonasa');

-- 8. Config fundador
INSERT INTO config_fundador (empresa_id, nombre, sueldo_reemplazo, horas_mensuales, multiplicador_riesgo) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Carlos Riquelme', 3500000, 180, 1.4);

-- 9. Registro tributario
INSERT INTO registros_tributarios (empresa_id, periodo, iva_debito, iva_credito, ppm, pagado) VALUES
  ('11111111-1111-1111-1111-111111111111', '2026-02', 385000, 78000, 18000, true),
  ('11111111-1111-1111-1111-111111111111', '2026-01', 320000, 65000, 15000, true),
  ('11111111-1111-1111-1111-111111111111', '2025-12', 410000, 90000, 20000, true);

-- 10. Fondo de emergencia
INSERT INTO fondo_emergencia (empresa_id, porcentaje_ahorro, monto_acumulado, meta) VALUES
  ('11111111-1111-1111-1111-111111111111', 5, 1850000, 6000000);
