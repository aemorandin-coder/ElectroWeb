import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { anotarIa, esRespuesta, exigirPersonaDeIa } from '@/lib/ia/acceso';
import { guardarAjustes, leerAjustesIa } from '@/lib/ia/ajustes';
import { cifrarClave, enmascarar, formatoDeClaveValido } from '@/lib/ia/clave';
import { probarConexion } from '@/lib/ia/conexion';
import { exigirCodigoReciente } from '@/lib/dispositivos-confianza';

// C-288 · La clave de la API de Anthropic. La clave nunca sale del servidor: ni en una respuesta, ni en el registro, ni en la
// bitácora (a la pantalla solo llega "sk-ant-…" y los últimos 4 caracteres).
//   PUT    { clave } → se PRUEBA antes de guardarla (un pedido mínimo, 20 s como mucho); si responde, se cifra y se guarda; si no,
//                      400 con el motivo (no es válida, sin crédito, no responde) y no se guarda nada
//   DELETE           → vuelve a la clave del servidor (ANTHROPIC_API_KEY)
export const dynamic = 'force-dynamic';

const cuerpo = z.object({ clave: z.string().trim().min(20).max(400) });

export async function PUT(request: NextRequest) {
  // Cinco por minuto: cada intento le pregunta a Anthropic
  const persona = await exigirPersonaDeIa('clave', { maxRequests: 5, windowSeconds: 60 });
  if (esRespuesta(persona)) return persona;
  // C-291: si la sesión entró por un dispositivo de confianza, esto pide el número de la app otra vez
  const codigoReciente = await exigirCodigoReciente();
  if (codigoReciente) return codigoReciente;
  const datos = cuerpo.safeParse(await request.json().catch(() => null));
  if (!datos.success || !formatoDeClaveValido(datos.data.clave)) {
    return NextResponse.json({ error: 'La clave de Anthropic empieza con "sk-ant-" y no lleva espacios. Cópiala otra vez de console.anthropic.com.' }, { status: 400 });
  }
  const clave = datos.data.clave;
  const ajustes = await leerAjustesIa();
  const prueba = await probarConexion(clave, ajustes.modelo, persona.id);
  if (!prueba.ok) return NextResponse.json({ error: prueba.mensaje, motivo: prueba.motivo }, { status: 400 });
  try {
    const r = await guardarAjustes(undefined, persona.id, () => ({ claveCifrada: cifrarClave(clave), claveCambiadaAt: new Date() }));
    if (!r.ok) return NextResponse.json({ error: 'No se pudo guardar la clave. Prueba otra vez.' }, { status: 409 });
    await anotarIa(persona, request, 'Cambió la clave de la API de Claude (se probó antes de guardarla)');
    return NextResponse.json({ ok: true, enmascarada: enmascarar(clave), ms: prueba.ms, modelo: prueba.modelo, updatedAt: r.updatedAt.toISOString() });
  } catch (error) {
    // Sin NEXTAUTH_SECRET no se puede cifrar: no se guarda en claro nunca
    console.error('[ia] no se pudo guardar la clave:', error instanceof Error ? error.name : 'desconocido');
    return NextResponse.json({ error: 'No se pudo guardar la clave en el servidor.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const persona = await exigirPersonaDeIa('clave', { maxRequests: 5, windowSeconds: 60 });
  if (esRespuesta(persona)) return persona;
  // C-291: si la sesión entró por un dispositivo de confianza, esto pide el número de la app otra vez
  const codigoReciente = await exigirCodigoReciente();
  if (codigoReciente) return codigoReciente;
  const r = await guardarAjustes(undefined, persona.id, () => ({ claveCifrada: null, claveCambiadaAt: new Date() }));
  if (!r.ok) return NextResponse.json({ error: 'No se pudo volver a la clave del servidor. Prueba otra vez.' }, { status: 409 });
  await anotarIa(persona, request, 'Volvió a la clave de Claude del servidor');
  const ahora = await leerAjustesIa();
  return NextResponse.json({ ok: true, hay: ahora.clave !== null, enmascarada: ahora.clave ? enmascarar(ahora.clave) : null, fuente: ahora.fuenteClave, updatedAt: r.updatedAt.toISOString() });
}
