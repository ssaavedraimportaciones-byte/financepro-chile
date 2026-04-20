"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function ActualizarPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message ?? "Error al actualizar la contraseña. El enlace puede haber expirado.");
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2500);
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
          <p className="text-slate-400 mt-1">Nueva contraseña</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Contraseña actualizada</h2>
              <p className="text-slate-500 text-sm">Redirigiendo al dashboard...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Crea una nueva contraseña</h2>
              <p className="text-slate-500 text-sm mb-6">Elige una contraseña segura de al menos 8 caracteres.</p>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg mb-4 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm">Confirmar contraseña</Label>
                  <Input
                    id="confirm"
                    type={show ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Actualizando...</>
                    : "Guardar nueva contraseña"
                  }
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
