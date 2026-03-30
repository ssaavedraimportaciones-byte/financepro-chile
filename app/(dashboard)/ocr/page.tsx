"use client";
import { useState, useRef, useCallback } from "react";
import { createClient, isDemoMode } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCLP } from "@/lib/formatters";
import { ScanLine, Upload, Loader2, CheckCircle2, FileImage, Camera } from "lucide-react";

interface OCRResult {
  fecha: string;
  monto: number;
  comercio: string;
  texto_completo: string;
}

interface GastoDetectado {
  descripcion: string;
  monto: number;
  fecha: string;
  subcategoria: string;
}

export default function OCRPage() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [gastoForm, setGastoForm] = useState<GastoDetectado | null>(null);
  const [saved, setSaved] = useState(false);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Cargar empresa_id al montar
  useState(() => {
    if (isDemoMode) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("fp_empresas").select("id").eq("user_id", user.id).single().then(({ data: emp }) => {
        if (emp) setEmpresaId(emp.id);
      });
    });
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    setOcrResult(null);
    setSaved(false);
  }

  async function handleOCR() {
    if (!image) return;
    setLoading(true);
    setProgress(0);

    try {
      // Cargar Tesseract dinámicamente para evitar problemas con SSR
      const Tesseract = (await import("tesseract.js")).default;

      const result = await Tesseract.recognize(image, "spa", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
        },
      });

      const texto = result.data.text;
      const parsed = parseDocumento(texto);
      setOcrResult(parsed);
      setGastoForm({
        descripcion: parsed.comercio || "Gasto detectado por OCR",
        monto: parsed.monto,
        fecha: parsed.fecha || new Date().toISOString().slice(0, 10),
        subcategoria: "Gasto menor",
      });
    } catch (err) {
      console.error("OCR error:", err);
      // Fallback: ingreso manual
      setOcrResult({
        fecha: new Date().toISOString().slice(0, 10),
        monto: 0,
        comercio: "No detectado",
        texto_completo: "Error al procesar imagen. Ingresa los datos manualmente.",
      });
      setGastoForm({ descripcion: "Gasto", monto: 0, fecha: new Date().toISOString().slice(0, 10), subcategoria: "Gasto menor" });
    } finally {
      setLoading(false);
    }
  }

  /** Parsea el texto del OCR para extraer datos relevantes */
  function parseDocumento(texto: string): OCRResult {
    const lineas = texto.split("\n").map(l => l.trim()).filter(Boolean);

    // Detectar montos (patrones: $12.345, $12.345,67, 12345)
    const montoRegex = /\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g;
    const montos: number[] = [];
    let match;
    while ((match = montoRegex.exec(texto)) !== null) {
      const num = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
      if (!isNaN(num) && num > 100 && num < 100000000) montos.push(num);
    }
    const monto = montos.length > 0 ? Math.max(...montos) : 0;

    // Detectar fecha
    const fechaRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
    const fechaMatch = texto.match(fechaRegex);
    let fecha = new Date().toISOString().slice(0, 10);
    if (fechaMatch) {
      const [, d, m, y] = fechaMatch;
      const year = y.length === 2 ? `20${y}` : y;
      fecha = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // Intentar detectar comercio (primera línea con letras)
    const comercioLinea = lineas.find(l => /[A-Za-záéíóúñ]{3,}/.test(l) && !/TOTAL|SUBTOTAL|IVA|NETO/i.test(l));
    const comercio = comercioLinea?.slice(0, 50) ?? "Comercio no detectado";

    return { fecha, monto, comercio, texto_completo: texto };
  }

  async function handleGuardarGasto() {
    if (!gastoForm || !empresaId) return;
    const { error } = await supabase.from("fp_gastos").insert({
      empresa_id: empresaId,
      descripcion: gastoForm.descripcion,
      monto: gastoForm.monto,
      fecha: gastoForm.fecha,
      categoria: "operativo",
      subcategoria: gastoForm.subcategoria,
    });
    if (!error) {
      setSaved(true);
      setImage(null);
      setOcrResult(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="OCR para Rendiciones" subtitle="Sube una foto de boleta o factura y extrae los datos automáticamente" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="w-5 h-5" /> Subir documento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="Documento" className="max-h-48 mx-auto object-contain rounded" />
                ) : (
                  <div>
                    <FileImage className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Haz clic o arrastra aquí</p>
                    <p className="text-slate-400 text-xs mt-1">Foto de boleta, ticket o factura (JPG, PNG, WEBP)</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              {image && !loading && !ocrResult && (
                <Button onClick={handleOCR} className="w-full gap-2">
                  <ScanLine className="w-4 h-4" /> Analizar documento con OCR
                </Button>
              )}

              {loading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analizando con OCR... {progress}%
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resultado OCR */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-5 h-5" /> Datos extraídos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {saved ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                  <p className="font-semibold text-slate-700">¡Gasto guardado exitosamente!</p>
                  <Button className="mt-4" variant="outline" onClick={() => setSaved(false)}>
                    Procesar otro documento
                  </Button>
                </div>
              ) : ocrResult && gastoForm ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 max-h-32 overflow-y-auto">
                    <strong>Texto detectado:</strong><br />
                    {ocrResult.texto_completo.slice(0, 300)}...
                  </div>

                  <h3 className="font-semibold text-slate-700 text-sm">Revisa y ajusta los datos:</h3>

                  <div className="space-y-3">
                    <div>
                      <Label>Descripción / Comercio</Label>
                      <Input value={gastoForm.descripcion} onChange={e => setGastoForm({...gastoForm, descripcion: e.target.value})} className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Monto (CLP)</Label>
                        <Input type="number" value={gastoForm.monto} onChange={e => setGastoForm({...gastoForm, monto: parseFloat(e.target.value)})} className="mt-1" />
                      </div>
                      <div>
                        <Label>Fecha</Label>
                        <Input type="date" value={gastoForm.fecha} onChange={e => setGastoForm({...gastoForm, fecha: e.target.value})} className="mt-1" />
                      </div>
                    </div>
                    <div>
                      <Label>Categoría</Label>
                      <select value={gastoForm.subcategoria} onChange={e => setGastoForm({...gastoForm, subcategoria: e.target.value})} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        {["Transporte","Bencina","Alimentación","Insumos","Tecnología","Limpieza","Gasto menor","Otro"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-lg font-bold text-emerald-600">{formatCLP(gastoForm.monto)}</span>
                    <Button onClick={handleGuardarGasto} className="gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Guardar como gasto
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <ScanLine className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sube una imagen y presiona &quot;Analizar&quot; para extraer los datos.</p>
                  <p className="text-xs mt-2">Funciona con boletas, tickets, facturas y recibos.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong>💡 Consejos para mejor precisión:</strong>
          <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
            <li>Toma la foto en lugar bien iluminado, sin sombras</li>
            <li>Asegúrate que el texto esté en foco y sea legible</li>
            <li>El OCR funciona en español por defecto</li>
            <li>Siempre revisa los datos extraídos antes de guardar</li>
            <li>Para boletas electrónicas, mejor usar el XML/PDF directamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
