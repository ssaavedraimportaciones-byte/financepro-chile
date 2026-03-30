// =============================================================
// API: /api/tributario — Calculadora tributaria
// =============================================================
import { NextRequest, NextResponse } from "next/server";
import { calcularIVA, calcularPPM, estimarImpuestoRenta } from "@/lib/calculations";

/**
 * POST /api/tributario
 * Body: { ventasNetas, comprasNetas, regimen, periodoAnual? }
 * Calcula IVA, PPM e impuesto a la renta estimado
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    ventasNetas = 0,
    comprasNetas = 0,
    regimen = "pro_pyme_general",
    utilidadAnual = 0,
  } = body;

  const iva = calcularIVA(ventasNetas, comprasNetas);
  const ppm = calcularPPM(ventasNetas, regimen);
  const renta = estimarImpuestoRenta(utilidadAnual, regimen);

  return NextResponse.json({
    iva_debito: iva.iva_debito,
    iva_credito: iva.iva_credito,
    iva_neto: iva.iva_neto,
    ppm: ppm.ppm_calculado,
    tasa_ppm: ppm.tasa_ppm,
    impuesto_renta_estimado: renta,
    total_obligaciones: iva.iva_neto + ppm.ppm_calculado,
    periodo: iva.periodo,
    regimen,
  });
}

/**
 * GET /api/tributario?ventasNetas=5000000&comprasNetas=2000000&regimen=pro_pyme_general
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const ventasNetas = parseFloat(params.get("ventasNetas") ?? "0");
  const comprasNetas = parseFloat(params.get("comprasNetas") ?? "0");
  const regimen = (params.get("regimen") ?? "pro_pyme_general") as "pro_pyme_general" | "pro_pyme_transparente" | "general";

  const iva = calcularIVA(ventasNetas, comprasNetas);
  const ppm = calcularPPM(ventasNetas, regimen);

  return NextResponse.json({
    iva_debito: iva.iva_debito,
    iva_credito: iva.iva_credito,
    iva_neto: iva.iva_neto,
    ppm: ppm.ppm_calculado,
    total_obligaciones: iva.iva_neto + ppm.ppm_calculado,
  });
}
