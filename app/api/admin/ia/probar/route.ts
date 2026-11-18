import { NextRequest, NextResponse } from 'next/server';
import { esRespuesta, exigirPersonaDeIa } from '@/lib/ia/acceso';
import { leerAjustesIa, motorDeProveedor } from '@/lib/ia/ajustes';
import { probarProveedor } from '@/lib/ia/conexion';
import { esProveedor, infoProveedor } from '@/lib/ia/proveedores/catalogo';

// C-288 · POST /api/admin/ia/probar: "Probar la conexión" con la clave y el modelo de ahora (un pedido mínimo, 20 s como mucho).
// Devuelve cuánto tardó y qué modelo respondió; si no, por qué, en palabras para el equipo. Cuesta una fracción de centavo.
export const dynamic = 'force-dynamic';

// C-292: con { proveedor }, el de ese proveedor (sin cuerpo, Anthropic, como antes). Los demás devuelven también su lista de modelos.
export async function POST(request: NextRequest) {
  const persona = await exigirPersonaDeIa('probar', { maxRequests: 6, windowSeconds: 60 });
  if (esRespuesta(persona)) return persona;
  const cuerpo = (await request.json().catch(() => null)) as { proveedor?: unknown } | null;
  const proveedor = cuerpo?.proveedor === undefined ? 'anthropic' : esProveedor(cuerpo.proveedor) ? cuerpo.proveedor : null;
  if (!proveedor) return NextResponse.json({ ok: false, motivo: 'otro', error: 'Proveedor desconocido.' }, { status: 400 });
  const motor = motorDeProveedor(await leerAjustesIa(), proveedor);
  if (!motor.clave) return NextResponse.json({ ok: false, motivo: 'clave', error: `No hay clave de ${infoProveedor(proveedor).empresa}: pégala en su tarjeta.` });
  const r = await probarProveedor(proveedor, motor.clave, motor.modelo || null, persona.id);
  return NextResponse.json(r.ok ? { ok: true, ms: r.ms, modelo: r.modelo, modelos: r.modelos } : { ok: false, motivo: r.motivo, error: r.mensaje });
}
