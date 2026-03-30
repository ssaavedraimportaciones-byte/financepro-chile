-- =============================================================
-- FinancePro Chile - Migration: Fix auth & empresas schema
-- Run in Supabase SQL Editor
-- =============================================================

-- 1. Ensure uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create empresas table if not exists (full schema)
CREATE TABLE IF NOT EXISTS empresas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre              TEXT NOT NULL,
  rut                 TEXT NOT NULL,
  giro                TEXT,
  regimen_tributario  TEXT NOT NULL DEFAULT 'pro_pyme_general'
                      CHECK (regimen_tributario IN ('pro_pyme_general','pro_pyme_transparente','general')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add missing columns to existing empresas (if table existed with different schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empresas') THEN
    ALTER TABLE empresas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE empresas ADD COLUMN IF NOT EXISTS nombre TEXT;
    ALTER TABLE empresas ADD COLUMN IF NOT EXISTS rut TEXT;
    ALTER TABLE empresas ADD COLUMN IF NOT EXISTS giro TEXT;
    ALTER TABLE empresas ADD COLUMN IF NOT EXISTS regimen_tributario TEXT DEFAULT 'pro_pyme_general';
    ALTER TABLE empresas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 4. RLS: explicit INSERT policy for empresas (allows new user to create their empresa)
-- Drop existing policy if it exists (names may vary)
DROP POLICY IF EXISTS "fp_empresas_own" ON empresas;
DROP POLICY IF EXISTS "usuario ve sus empresas" ON empresas;

-- Allow SELECT, UPDATE, DELETE for own rows
CREATE POLICY "empresas_select_own" ON empresas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "empresas_insert_own" ON empresas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "empresas_update_own" ON empresas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "empresas_delete_own" ON empresas
  FOR DELETE USING (auth.uid() = user_id);

