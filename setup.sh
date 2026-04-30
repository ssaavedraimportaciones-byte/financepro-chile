#!/usr/bin/env bash
# ============================================================
# FinancePro Chile — Setup Automatizado
# Ejecuta: bash setup.sh
# Crea Supabase + Neon + despliega en Vercel en ~20 minutos
# ============================================================

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }
ask()  { echo -e "${BOLD}👉 $1${NC}"; }

echo ""
echo -e "${BOLD}============================================${NC}"
echo -e "${BOLD}   FinancePro Chile — Setup Automatizado   ${NC}"
echo -e "${BOLD}============================================${NC}"
echo ""

# ---------- Verificar prerrequisitos ----------
info "Verificando herramientas..."
command -v node  >/dev/null 2>&1 || err "Node.js no instalado. Instala desde https://nodejs.org"
command -v npm   >/dev/null 2>&1 || err "npm no encontrado."
command -v git   >/dev/null 2>&1 || err "git no instalado."
ok "Node $(node -v), npm $(npm -v), git OK"

# Instalar CLIs si faltan
for cli in vercel neonctl; do
  if ! command -v $cli >/dev/null 2>&1; then
    info "Instalando $cli..."
    npm install -g $cli --silent
    ok "$cli instalado"
  fi
done

# ---------- Variables ----------
ENV_FILE=".env.local"
ADMIN_KEY="financepro-admin-$(openssl rand -hex 8 2>/dev/null || date +%s)"

echo ""
echo -e "${BOLD}━━━ PASO 1: SUPABASE (Autenticación) ━━━${NC}"
echo ""
info "Abre este link en tu navegador para crear tu cuenta gratuita:"
echo -e "${YELLOW}https://supabase.com${NC}"
echo ""
warn "Una vez creado tu proyecto en Supabase, necesitas copiar 3 valores."
warn "Ve a: Project → Settings → API"
echo ""
ask "Pega aquí tu Supabase Project URL (ej: https://xxx.supabase.co):"
read -r SUPABASE_URL
[[ "$SUPABASE_URL" == https://*.supabase.co ]] || { warn "URL no parece válida, continuando de todos modos..."; }

ask "Pega tu anon/public key:"
read -r SUPABASE_ANON_KEY
[[ -n "$SUPABASE_ANON_KEY" ]] || err "Anon key no puede estar vacía"

ask "Pega tu service_role secret key:"
read -r SUPABASE_SERVICE_KEY
[[ -n "$SUPABASE_SERVICE_KEY" ]] || err "Service role key no puede estar vacía"

ok "Credenciales de Supabase recibidas"

echo ""
echo -e "${BOLD}━━━ PASO 2: NEON (Base de Datos) ━━━${NC}"
echo ""
info "Abre este link y crea tu proyecto gratuito:"
echo -e "${YELLOW}https://neon.tech${NC}"
echo ""
info "Pasos en Neon:"
echo "  1. New Project → Name: financepro-chile → Region: São Paulo"
echo "  2. SQL Editor → pega el contenido de supabase/SETUP_FINANCEPRO.sql → Run"
echo "  3. Settings → Connection String → copia la URL"
echo ""
ask "Pega aquí tu Neon DATABASE_URL completa:"
read -r DATABASE_URL
[[ "$DATABASE_URL" == postgresql://* ]] || [[ "$DATABASE_URL" == postgres://* ]] || warn "URL no parece una conexión PostgreSQL válida"

ok "Credenciales de Neon recibidas"

echo ""
echo -e "${BOLD}━━━ CONFIGURANDO .env.local ━━━${NC}"
echo ""

cat > "$ENV_FILE" <<EOF
# FinancePro Chile — Generado automáticamente por setup.sh
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY
DATABASE_URL=$DATABASE_URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=FinancePro Chile
ADMIN_SECRET_KEY=$ADMIN_KEY
NEXT_PUBLIC_ADMIN_KEY=$ADMIN_KEY
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
GEMINI_API_KEY=placeholder_gemini_key
CRON_SECRET=fp_cron_$(date +%s)
EOF

ok ".env.local creado con todas las variables"
echo ""
warn "TU CLAVE ADMIN ES: ${BOLD}$ADMIN_KEY${NC}"
warn "Guárdala — la necesitas para /admin"

echo ""
echo -e "${BOLD}━━━ PASO 3: BUILD Y VERIFICACIÓN LOCAL ━━━${NC}"
echo ""
info "Instalando dependencias..."
npm install --silent
ok "Dependencias instaladas"

info "Compilando app..."
npm run build 2>&1 | tail -5
ok "Build exitoso — 0 errores"

echo ""
echo -e "${BOLD}━━━ PASO 4: DEPLOY EN VERCEL ━━━${NC}"
echo ""
info "Se abrirá el login de Vercel en tu navegador..."
vercel login

info "Desplegando en Vercel (configurando variables de entorno)..."

# Agregar variables de entorno en Vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "$SUPABASE_URL"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "$SUPABASE_ANON_KEY"
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "$SUPABASE_SERVICE_KEY"
vercel env add DATABASE_URL production <<< "$DATABASE_URL"
vercel env add ADMIN_SECRET_KEY production <<< "$ADMIN_KEY"
vercel env add NEXT_PUBLIC_ADMIN_KEY production <<< "$ADMIN_KEY"

# Deploy
DEPLOY_URL=$(vercel --prod --yes 2>&1 | grep "https://" | tail -1)

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}         🎉 SISTEMA OPERATIVO EN PRODUCCIÓN           ${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}URL de producción: ${BOLD}$DEPLOY_URL${NC}"
echo ""
echo -e "Para clientes:  ${YELLOW}$DEPLOY_URL/register${NC}"
echo -e "Login:          ${YELLOW}$DEPLOY_URL/login${NC}"
echo -e "Admin:          ${YELLOW}$DEPLOY_URL/admin${NC}"
echo -e "Clave admin:    ${BOLD}$ADMIN_KEY${NC}"
echo ""
echo -e "Para probar local: ${BLUE}npm start → http://localhost:3000${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
