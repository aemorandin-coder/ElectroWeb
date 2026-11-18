import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { anotarIa, CONFLICTO, esRespuesta, exigirPersonaDeIa } from '@/lib/ia/acceso';
import { guardarAjustes, leerAjustesIa } from '@/lib/ia/ajustes';
import { ESFUERZOS, MODELOS_IA, nombreDeEsfuerzo, nombreDeModelo } from '@/lib/ia/precios';

// C-288 · PUT /api/admin/ia/motor { modelo, esfuerzo, desde }: el modelo y el esfuerzo de Claude para todo el panel. Rige desde el
// próximo pedido. `desde` es la versión que se estaba mirando: si otra persona guardó después, 409 y no se pisa.
export const dynamic = 'force-dynamic';

const cuerpo = z.object({
  modelo: z.enum(MODELOS_IA.map((m) => m.id) as [string, ...string[]]),
  esfuerzo: z.enum(ESFUERZOS.map((e) => e.id) as [string, ...string[]]),
  desde: z.string().datetime().nullable(),
});

export async function PUT(request: NextRequest) {
  const persona = await exigirPersonaDeIa('motor');
  if (esRespuesta(persona)) return persona;
  const datos = cuerpo.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Elige un modelo y un esfuerzo de la lista.' }, { status: 400 });
  const antes = await leerAjustesIa();
  const r = await guardarAjustes(datos.data.desde, persona.id, () => ({ modelo: datos.data.modelo, esfuerzo: datos.data.esfuerzo }));
  if (!r.ok) return NextResponse.json(CONFLICTO, { status: 409 });
  await anotarIa(persona, request, 'Cambió el motor de Claude', {
    antes: `${nombreDeModelo(antes.modelo)}, esfuerzo ${nombreDeEsfuerzo(antes.esfuerzo)}`,
    despues: `${nombreDeModelo(datos.data.modelo)}, esfuerzo ${nombreDeEsfuerzo(datos.data.esfuerzo as typeof antes.esfuerzo)}`,
  });
  return NextResponse.json({ ok: true, updatedAt: r.updatedAt.toISOString() });
}
