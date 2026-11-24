import { NextResponse } from 'next/server';
import { probarConexionImprenta } from '@/lib/contabilidad/emisores/imprenta-digital';
import { obtenerConfigContable } from '@/lib/contabilidad/hub';
import { sesionCon } from '@/lib/contabilidad/ruta';

/** POST /api/admin/contabilidad/config/probar (G-76): prueba conexión Sandbox o Producción de Imprenta Digital (solo Dueño). */
export async function POST() {
  const s = await sesionCon('CONFIG_CONTABLE');
  if (s instanceof NextResponse) return s;
  const cfg = await obtenerConfigContable();
  const resultado = await probarConexionImprenta({
    imprentaProveedor: cfg.imprentaProveedor,
    imprentaAmbiente: cfg.imprentaAmbiente,
    imprentaApiUrl: cfg.imprentaApiUrl,
  });
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 502 });
}
