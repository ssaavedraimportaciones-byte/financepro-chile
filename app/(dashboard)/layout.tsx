import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getOrCreateEmpresa, sql } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatWidget } from "@/components/ChatWidget";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const isDemoMode = !supabaseUrl || supabaseUrl.includes("placeholder");

  // Solo verificar auth si hay Supabase configurado de verdad
  if (!isDemoMode) {
    try {
      const supabase = createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) redirect("/login");

      // Auto-crear empresa en Neon si es el primer acceso del usuario
      let empresaId: string | null = null;
      try { empresaId = await getOrCreateEmpresa(user.id); } catch { /* no bloquear */ }

      // Verificar estado de la cuenta (bloqueada / vencida)
      // excepto si ya estamos en /mi-cuenta, para evitar bucle
      const pathname = headers().get("x-pathname") ?? "";
      if (empresaId && !pathname.includes("mi-cuenta")) {
        try {
          const rows = await sql`
            SELECT s.estado, e.bloqueado
            FROM fp_empresas e
            LEFT JOIN fp_subscripciones s ON s.empresa_id = e.id
            WHERE e.id = ${empresaId} LIMIT 1
          `;
          const row = rows[0] as { estado?: string; bloqueado?: boolean } | undefined;
          if (row?.bloqueado) {
            redirect("/mi-cuenta?blocked=1");
          }
          if (row?.estado === "vencida") {
            redirect("/mi-cuenta?expired=1");
          }
        } catch (subErr) {
          // Re-lanzar redirects de Next.js; ignorar errores de BD
          const err = subErr as { digest?: string };
          if (err?.digest?.startsWith("NEXT_REDIRECT")) throw subErr;
        }
      }
    } catch (e) {
      // Re-lanzar redirects de Next.js (redirect() lanza NEXT_REDIRECT internamente)
      const err = e as { digest?: string };
      if (err?.digest?.startsWith("NEXT_REDIRECT")) throw e;
      redirect("/login");
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar demoMode={isDemoMode} />
      <main className="flex-1 overflow-y-auto">
        {isDemoMode && (
          <div className="bg-amber-500 text-white text-xs text-center py-1.5 font-medium">
            🚧 Modo Demo — Configura tu Supabase en{" "}
            <code className="bg-amber-600 px-1 rounded">.env.local</code>{" "}
            para guardar datos reales
          </div>
        )}
        {children}
      </main>
      <ChatWidget />
    </div>
  );
}
