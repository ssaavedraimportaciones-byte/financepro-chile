# FinancePro Chile 🇨🇱

**Dashboard financiero y tributario para startups y Pymes chilenas.**

Registra, analiza y proyecta todos los costos de tu empresa. Calcula IVA, PPM, impuesto a la renta, rentabilidad por proyecto y detecta fugas de dinero.

---

## Stack Tecnológico

- **Frontend:** Next.js 14 (App Router), React, TailwindCSS, Recharts
- **UI:** Componentes estilo Shadcn/UI (Radix primitives)
- **Backend:** API Routes de Next.js
- **Base de datos:** Supabase (PostgreSQL + Auth + Storage)
- **OCR:** Tesseract.js (cliente, español)
- **Deploy:** Vercel / Netlify

---

## Módulos

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/dashboard` | KPIs, gráficos, alertas tributarias |
| Formalización | `/formalizacion` | Costos legales con amortización |
| Tributario | `/tributario` | IVA, PPM, impuesto a la renta |
| Tecnología | `/tecnologia` | Hosting, APIs, licencias |
| Operativo | `/operativo` | Gastos hormiga, transporte, insumos |
| Capital Humano | `/capital-humano` | Nómina, liquidaciones, Previred |
| Valor Fundador | `/fundador` | Costo real del tiempo del fundador |
| Proyectos | `/proyectos` | Rentabilidad por proyecto/cliente |
| OCR | `/ocr` | Escaneo de boletas y facturas |
| Fondo Emergencia | `/fondo-emergencia` | Ahorro automático y runway |

---

## Instalación local

### 1. Clonar / descargar el proyecto

```bash
cd ~/Downloads
# El proyecto ya está en financepro-chile/
cd financepro-chile
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto gratuito
2. Ve a **SQL Editor** y ejecuta `supabase/schema.sql`
3. (Opcional para dev) Ejecuta `supabase/seed.sql` con tu user_id
4. Ve a **Settings > API** y copia las claves

### 4. Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://XXXXXXXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (solo para admin)
```

### 5. Ejecutar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Deploy en Vercel

```bash
# 1. Instalar CLI de Vercel
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel deploy

# 4. Configurar variables de entorno en vercel.com > Settings > Environment Variables
```

## Deploy en Netlify

```bash
# 1. Instalar CLI
npm i -g netlify-cli

# 2. Login
netlify login

# 3. Build y deploy
npm run build
netlify deploy --prod --dir=.next
```

---

## API Endpoints

### Gastos
```
GET    /api/gastos?periodo=2026-03&categoria=tecnologia
POST   /api/gastos
DELETE /api/gastos?id=UUID
```

### Ingresos
```
GET  /api/ingresos?periodo=2026-03
POST /api/ingresos
```

### Tributario
```
GET  /api/tributario?ventasNetas=5000000&comprasNetas=2000000
POST /api/tributario  { ventasNetas, comprasNetas, regimen, utilidadAnual }
```

### Proyectos
```
GET  /api/proyectos  (incluye rentabilidad calculada)
POST /api/proyectos
```

### Fundador
```
GET  /api/fundador    (config guardada del usuario)
POST /api/fundador    { sueldo_reemplazo, horas_mensuales, multiplicador_riesgo }
```

---

## Ejemplo de consultas SQL

```sql
-- Utilidad del mes actual
SELECT
  SUM(i.monto) AS ingresos,
  SUM(g.monto) AS gastos,
  SUM(i.monto) - SUM(g.monto) AS utilidad
FROM ingresos i, gastos g
WHERE i.empresa_id = 'tu-empresa-id'
  AND g.empresa_id = 'tu-empresa-id'
  AND i.fecha >= date_trunc('month', NOW())
  AND g.fecha >= date_trunc('month', NOW());

-- Rentabilidad por proyecto
SELECT
  p.nombre,
  COALESCE(SUM(i.monto), 0) AS ingresos,
  COALESCE(SUM(g.monto), 0) AS costos,
  COALESCE(SUM(i.monto), 0) - COALESCE(SUM(g.monto), 0) AS utilidad
FROM proyectos p
LEFT JOIN ingresos i ON i.proyecto_id = p.id
LEFT JOIN gastos g ON g.proyecto_id = p.id
WHERE p.empresa_id = 'tu-empresa-id'
GROUP BY p.id, p.nombre;

-- IVA del mes
SELECT
  SUM(CASE WHEN monto_iva > 0 THEN monto_iva ELSE 0 END) AS iva_debito,
  periodo
FROM ingresos
WHERE empresa_id = 'tu-empresa-id'
GROUP BY periodo;

-- Distribución de costos
SELECT categoria, SUM(monto) AS total
FROM gastos
WHERE empresa_id = 'tu-empresa-id'
  AND fecha >= date_trunc('month', NOW())
GROUP BY categoria
ORDER BY total DESC;

-- Gastos tecnológicos en USD convertido a CLP
SELECT
  descripcion, costo, moneda,
  CASE
    WHEN moneda = 'USD' THEN costo * 950
    WHEN moneda = 'EUR' THEN costo * 1030
    ELSE costo
  END AS costo_clp
FROM costos_tecnologicos
WHERE empresa_id = 'tu-empresa-id';
```

---

## Cálculos Tributarios Implementados

| Concepto | Fórmula | Tasa |
|----------|---------|------|
| IVA Débito | Ventas con factura × 0.19 | 19% |
| IVA Crédito | Compras con factura × 0.19 | 19% |
| IVA a Pagar | Débito - Crédito | - |
| PPM Pro Pyme | Ventas netas × 0.01 | 1% |
| PPM General | Ventas netas × 0.015 | 1.5% |
| Renta Pro Pyme General | Utilidad × 0.25 | 25% |
| Renta Régimen General | Utilidad × 0.27 | 27% |
| AFP (sin comisión) | Sueldo bruto × 0.10 | 10% |
| Salud Fonasa | Sueldo bruto × 0.07 | 7% |
| Seguro Cesantía (trabajador) | Sueldo bruto × 0.006 | 0.6% |
| Mutual (empleador) | Sueldo bruto × 0.0093 | 0.93% |
| SIS (empleador) | Sueldo bruto × 0.0149 | 1.49% |
| Retención Honorarios | Monto bruto × 0.1375 | 13.75% |

---

## Estructura del Proyecto

```
financepro-chile/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── formalizacion/page.tsx
│   │   ├── tributario/page.tsx
│   │   ├── tecnologia/page.tsx
│   │   ├── operativo/page.tsx
│   │   ├── capital-humano/page.tsx
│   │   ├── fundador/page.tsx
│   │   ├── proyectos/page.tsx
│   │   ├── ocr/page.tsx
│   │   └── fondo-emergencia/page.tsx
│   ├── api/
│   │   ├── gastos/route.ts
│   │   ├── ingresos/route.ts
│   │   ├── proyectos/route.ts
│   │   ├── tributario/route.ts
│   │   └── fundador/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/          (button, card, input, select, dialog, tabs, badge)
│   ├── layout/      (sidebar, header)
│   ├── charts/      (ingresos-gastos, distribucion)
│   └── dashboard/   (kpi-card)
├── lib/
│   ├── supabase.ts         (cliente browser)
│   ├── supabase-server.ts  (cliente servidor)
│   ├── calculations.ts     (lógica financiera/tributaria)
│   ├── formatters.ts       (CLP, fechas, porcentajes)
│   └── utils.ts            (cn helper)
├── types/index.ts
├── supabase/
│   ├── schema.sql
│   └── seed.sql
├── middleware.ts
├── .env.example
└── package.json
```

---

## Roadmap Sugerido

- [ ] Notificaciones por email antes del vencimiento de IVA/PPM
- [ ] Importar CSV de transacciones bancarias (ABM Santander, BCI)
- [ ] Integración con SII para obtener F29 histórico
- [ ] Módulo de cotizaciones y facturación (DTE con Haulmer/Facturación)
- [ ] App móvil (React Native / Expo)
- [ ] Multi-empresa (un usuario gestiona varias empresas)
- [ ] Exportar reportes PDF para el contador

---

## Licencia

MIT — Libre uso, modificación y distribución.
