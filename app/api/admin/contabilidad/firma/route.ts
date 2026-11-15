import { NextRequest, NextResponse } from 'next/server';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { contadoraConFirma, firmaDe, firmaSchema, guardarFirma } from '@/lib/contabilidad/mesa';
import { errorDeEsquema, sesionCon } from '@/lib/contabilidad/ruta';

/** GET /api/admin/contabilidad/firma (C-235): mi firma, y la de la contadora (para el dueño). */
export async function GET() {
  const s = await sesionCon('VER_CONTABILIDAD');
  if (s instanceof NextResponse) return s;
  const [mia, contadora] = await Promise.all([firmaDe(s.usuarioId), contadoraConFirma()]);
  return NextResponse.json({ mia, contadora }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * PUT /api/admin/contabilidad/firma (C-235): quien declara dibuja (o cambia) su firma y su sello: nombre, título y C.P.C.
 * Solo la suya: el servidor la guarda con el usuario de la sesión, nunca con uno que venga del navegador.
 */
export async function PUT(request: NextRequest) {
  const s = await sesionCon('DECLARAR');
  if (s instanceof NextResponse) return s;
  const leido = firmaSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);
  const r = await guardarFirma(s.usuarioId, leido.data);
  if (!r.ok) return NextResponse.json({ error: r.error, campo: r.campo }, { status: r.status });
  await registrarAccionAdmin(s.session, 'FIRMA_CONTABLE_GUARDADA', { type: 'FIRMA_CONTABLE', id: s.usuarioId }, {
    nombre: r.firma.nombre,
    cpc: r.firma.cpc,
    trazoNuevo: Boolean(leido.data.trazo),
  }, request);
  return NextResponse.json({ firma: r.firma });
}
