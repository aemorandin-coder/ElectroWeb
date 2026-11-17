import { NextResponse } from 'next/server';
import { esRespuesta, exigirPersonaDeIa } from '@/lib/ia/acceso';
import { leerAjustesIa } from '@/lib/ia/ajustes';
import { probarConexion } from '@/lib/ia/conexion';

// C-288 · POST /api/admin/ia/probar: "Probar la conexión" con la clave y el modelo de ahora (un pedido mínimo, 20 s como mucho).
// Devuelve cuánto tardó y qué modelo respondió; si no, por qué, en palabras para el equipo. Cuesta una fracción de centavo.
export const dynamic = 'force-dynamic';

export async function POST() {
  const persona = await exigirPersonaDeIa('probar', { maxRequests: 6, windowSeconds: 60 });
  if (esRespuesta(persona)) return persona;
  const ajustes = await leerAjustesIa();
  if (!ajustes.clave) return NextResponse.json({ ok: false, motivo: 'clave', error: 'No hay clave: pega una o pon ANTHROPIC_API_KEY en el servidor.' });
  const r = await probarConexion(ajustes.clave, ajustes.modelo, persona.id);
  return NextResponse.json(r.ok ? { ok: true, ms: r.ms, modelo: r.modelo } : { ok: false, motivo: r.motivo, error: r.mensaje });
}
