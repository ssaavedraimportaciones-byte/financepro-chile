"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const redirectTo = `${window.location.origin}/actualizar-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      setError(error.message ?? "Error al enviar el correo. Intenta de nuevo.");
      setLoading(false);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 shadow-lg">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">FinancePro Chile</h1>
          <p className="text-slate-400 mt-1">Recuperar contraseña</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Correo enviado</h2>
              <p className="text-slate-500 text-sm">
                Revisa tu bandeja de entrada en <strong>{email}</strong>. El enlace de recuperación expira en 1 hora.
              </p>
              <Link href="/login" className="inline-flex items-center gap-2 text-emerald-600 hover:underline text-sm font-medium mt-2">
                <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">¿Olvidaste tu contraseña?</h2>
              <p className="text-slate-500 text-sm mb-6">
                Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg mb-4 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email de tu cuenta</Label>
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</>
                    : "Enviar enlace de recuperación"
                  }
                </Button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                <Link href="/login" className="text-emerald-600 hover:underline font-medium flex items-center justify-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
