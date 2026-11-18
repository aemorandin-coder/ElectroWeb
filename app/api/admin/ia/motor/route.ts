import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { anotarIa, CONFLICTO, esRespuesta, exigirPersonaDeIa } from '@/lib/ia/acceso';
import { guardarAjustes, guardarProveedor, leerAjustesIa, motorDeProveedor, type AjustesIa } from '@/lib/ia/ajustes';
import { ESFUERZOS, MODELOS_IA, nombreDeEsfuerzo, type Esfuerzo } from '@/lib/ia/precios';
import { esProveedor, infoProveedor, nombreDelMotor, type IdProveedor } from '@/lib/ia/proveedores/catalogo';

// C-288 · PUT /api/admin/ia/motor { modelo, esfuerzo, desde }: el modelo y el esfuerzo de Claude para todo el panel. Rige desde el
// próximo pedido. `desde` es la versión que se estaba mirando: si otra persona guardó después, 409 y no se pisa.
// C-292: el motor de toda la tienda, de cualquier proveedor:
//   { proveedor, modelo, esfuerzo (solo Anthropic), respaldo (otro proveedor o null), desde }
// El proveedor elegido (y el de respaldo) tienen que tener su clave. Sin `proveedor`, Anthropic, como antes.
export const dynamic = 'force-dynamic';

const cuerpo = z.object({
  proveedor: z.string().optional(),
  modelo: z.string().trim().min(1).max(120),
  esfuerzo: z.enum(ESFUERZOS.map((e) => e.id) as [string, ...string[]]).optional(),
  respaldo: z.string().nullable().optional(),
  desde: z.string().datetime().nullable(),
});

const describir = (a: AjustesIa, proveedor: IdProveedor) => {
  const m = motorDeProveedor(a, proveedor);
  return `${nombreDelMotor(proveedor, m.modelo || 'sin modelo')}${proveedor === 'anthropic' ? `, esfuerzo ${nombreDeEsfuerzo(a.esfuerzo)}` : ''}`;
};

export async function PUT(request: NextRequest) {
  const persona = await exigirPersonaDeIa('motor');
  if (esRespuesta(persona)) return persona;
  const datos = cuerpo.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Elige un proveedor y un modelo de la lista.' }, { status: 400 });
  const d = datos.data;
  const proveedor: IdProveedor | null = d.proveedor === undefined ? 'anthropic' : esProveedor(d.proveedor) ? d.proveedor : null;
  const respaldo: IdProveedor | null | undefined = d.respaldo === undefined ? undefined : d.respaldo === null ? null : esProveedor(d.respaldo) ? d.respaldo : undefined;
  if (!proveedor || (d.respaldo !== undefined && d.respaldo !== null && respaldo === undefined)) {
    return NextResponse.json({ error: 'Proveedor desconocido.' }, { status: 400 });
  }
  if (respaldo && respaldo === proveedor) return NextResponse.json({ error: 'El respaldo tiene que ser otro proveedor.' }, { status: 400 });

  const antes = await leerAjustesIa();
  if (proveedor === 'anthropic') {
    if (!MODELOS_IA.some((m) => m.id === d.modelo) || !d.esfuerzo) return NextResponse.json({ error: 'Elige un modelo y un esfuerzo de la lista.' }, { status: 400 });
  } else if (!motorDeProveedor(antes, proveedor).clave) {
    return NextResponse.json({ error: `Primero conecta la clave de ${infoProveedor(proveedor).empresa}.` }, { status: 400 });
  }
  if (respaldo && !motorDeProveedor(antes, respaldo).clave) {
    return NextResponse.json({ error: `El respaldo necesita la clave de ${infoProveedor(respaldo).empresa}.` }, { status: 400 });
  }

  // Lo de la fila de ajustes va con versión: si otra persona guardó después, no se toca nada. Después, el modelo de un proveedor
  // que no es Anthropic, que va en su propia fila (antes de la versión, un cambio rechazado igual lo dejaba guardado)
  const r = await guardarAjustes(d.desde, persona.id, () => ({
    proveedor,
    ...(proveedor === 'anthropic' ? { modelo: d.modelo, esfuerzo: d.esfuerzo as Esfuerzo } : {}),
    ...(respaldo !== undefined ? { respaldo } : {}),
  }));
  if (!r.ok) return NextResponse.json(CONFLICTO, { status: 409 });
  if (proveedor !== 'anthropic') await guardarProveedor(proveedor, persona.id, { modelo: d.modelo });
  const despues = await leerAjustesIa();
  await anotarIa(persona, request, 'Cambió el motor de la IA', {
    antes: `${describir(antes, antes.proveedor)}${antes.respaldo ? ` · respaldo ${infoProveedor(antes.respaldo).motor}` : ''}`,
    despues: `${describir(despues, despues.proveedor)}${despues.respaldo ? ` · respaldo ${infoProveedor(despues.respaldo).motor}` : ''}`,
  });
  return NextResponse.json({ ok: true, updatedAt: r.updatedAt.toISOString() });
}
