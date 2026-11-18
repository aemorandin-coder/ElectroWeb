import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { anotarIa, esRespuesta, exigirPersonaDeIa } from '@/lib/ia/acceso';
import { guardarAjustes, guardarProveedor, leerAjustesIa } from '@/lib/ia/ajustes';
import { cifrarClave, enmascarar, formatoDeClaveValido } from '@/lib/ia/clave';
import { probarConexion, probarProveedor } from '@/lib/ia/conexion';
import { esProveedor, infoProveedor, type IdProveedor } from '@/lib/ia/proveedores/catalogo';
import { exigirCodigoReciente } from '@/lib/dispositivos-confianza';

// C-288 · La clave de la API de Anthropic. La clave nunca sale del servidor: ni en una respuesta, ni en el registro, ni en la
// bitácora (a la pantalla solo llega "sk-ant-…" y los últimos 4 caracteres).
//   PUT    { clave } → se PRUEBA antes de guardarla (un pedido mínimo, 20 s como mucho); si responde, se cifra y se guarda; si no,
//                      400 con el motivo (no es válida, sin crédito, no responde) y no se guarda nada
//   DELETE           → vuelve a la clave del servidor (ANTHROPIC_API_KEY)
// C-292: lo mismo para cada proveedor ({ proveedor, clave }, DELETE ?proveedor=). Sin proveedor, Anthropic, como antes. Los que
// no son Anthropic se prueban pidiéndole su lista de modelos (no gasta tokens), que vuelve con la respuesta; su clave va
// cifrada en ia_proveedores. Borrarla deja ese proveedor sin clave (Groq vuelve a GROQ_API_KEY, si está).
export const dynamic = 'force-dynamic';

const cuerpo = z.object({ clave: z.string().trim().min(20).max(400), proveedor: z.string().optional() });
const proveedorDe = (valor: unknown): IdProveedor | null => (valor === undefined || valor === null || valor === '' ? 'anthropic' : esProveedor(valor) ? valor : null);

export async function PUT(request: NextRequest) {
  // Cinco por minuto: cada intento le pregunta a Anthropic
  const persona = await exigirPersonaDeIa('clave', { maxRequests: 5, windowSeconds: 60 });
  if (esRespuesta(persona)) return persona;
  // C-291: si la sesión entró por un dispositivo de confianza, esto pide el número de la app otra vez
  const codigoReciente = await exigirCodigoReciente();
  if (codigoReciente) return codigoReciente;
  const datos = cuerpo.safeParse(await request.json().catch(() => null));
  const proveedor = proveedorDe(datos.success ? datos.data.proveedor : undefined);
  if (!proveedor) return NextResponse.json({ error: 'Proveedor desconocido.' }, { status: 400 });
  if (proveedor !== 'anthropic') {
    const info = infoProveedor(proveedor);
    if (!datos.success || !info.formaClave.test(datos.data.clave)) {
      return NextResponse.json({ error: `La clave de ${info.empresa} no lleva espacios. Cópiala otra vez de su consola.` }, { status: 400 });
    }
    const otra = datos.data.clave;
    const prueba = await probarProveedor(proveedor, otra, (await leerAjustesIa()).otros[proveedor].modelo, persona.id);
    if (!prueba.ok) return NextResponse.json({ error: prueba.mensaje, motivo: prueba.motivo }, { status: 400 });
    try {
      const at = await guardarProveedor(proveedor, persona.id, { claveCifrada: cifrarClave(otra), claveCambiadaAt: new Date() });
      await anotarIa(persona, request, `Conectó la clave de ${info.empresa} (se probó antes de guardarla)`);
      return NextResponse.json({ ok: true, proveedor, enmascarada: enmascarar(otra), ms: prueba.ms, modelos: prueba.modelos ?? [], updatedAt: at.toISOString() });
    } catch (error) {
      console.error('[ia] no se pudo guardar la clave:', error instanceof Error ? error.name : 'desconocido');
      return NextResponse.json({ error: 'No se pudo guardar la clave en el servidor.' }, { status: 500 });
    }
  }
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
  const proveedor = proveedorDe(new URL(request.url).searchParams.get('proveedor'));
  if (!proveedor) return NextResponse.json({ error: 'Proveedor desconocido.' }, { status: 400 });
  if (proveedor !== 'anthropic') {
    const info = infoProveedor(proveedor);
    const at = await guardarProveedor(proveedor, persona.id, { claveCifrada: null, claveCambiadaAt: new Date() });
    await anotarIa(persona, request, `Quitó la clave de ${info.empresa}`);
    const ahora = (await leerAjustesIa()).otros[proveedor];
    return NextResponse.json({ ok: true, proveedor, hay: ahora.clave !== null, enmascarada: ahora.clave ? enmascarar(ahora.clave) : null, fuente: ahora.fuenteClave, updatedAt: at.toISOString() });
  }
  const r = await guardarAjustes(undefined, persona.id, () => ({ claveCifrada: null, claveCambiadaAt: new Date() }));
  if (!r.ok) return NextResponse.json({ error: 'No se pudo volver a la clave del servidor. Prueba otra vez.' }, { status: 409 });
  await anotarIa(persona, request, 'Volvió a la clave de Claude del servidor');
  const ahora = await leerAjustesIa();
  return NextResponse.json({ ok: true, hay: ahora.clave !== null, enmascarada: ahora.clave ? enmascarar(ahora.clave) : null, fuente: ahora.fuenteClave, updatedAt: r.updatedAt.toISOString() });
}
