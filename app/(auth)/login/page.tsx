"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg =
          error.message?.toLowerCase().includes("invalid login")
            ? "Credenciales incorrectas. Verifica tu email y contraseña."
            : error.message ?? "Error al iniciar sesión. Intenta de nuevo.";
        setError(msg);
        setLoading(false);
        return;
      }
      if (!data.session) {
        setError("No se pudo establecer la sesión. Intenta de nuevo.");
        setLoading(false);
        return;
      }
      router.refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 shadow-lg">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">FinancePro Chile</h1>
          <p className="text-slate-400 mt-1">Control financiero para Pymes chilenas</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Iniciar sesión</h2>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@empresa.cl"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Ingresando...</> : "Ingresar"}
            </Button>
          </form>

          <div className="text-center mt-4">
            <Link href="/recuperar-password" className="text-sm text-slate-400 hover:text-emerald-600 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <p className="text-center text-sm text-slate-500 mt-4">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-emerald-600 hover:underline font-medium">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
