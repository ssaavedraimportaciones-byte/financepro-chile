#!/bin/bash
cd "$(dirname "$0")"
# Cargar .env.local manualmente (override vars vacías del entorno)
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi
exec node node_modules/next/dist/bin/next dev
