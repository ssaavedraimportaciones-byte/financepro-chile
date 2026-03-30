// Supabase admin client - ONLY use in server-side API routes
// Uses service_role key - bypasses RLS. Never expose to client.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey.includes("placeholder")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no configurado. Añade SUPABASE_SERVICE_ROLE_KEY en .env.local para habilitar el registro."
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
