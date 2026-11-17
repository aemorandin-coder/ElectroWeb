import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { anotarIa, CONFLICTO, esRespuesta, exigirPersonaDeIa } from '@/lib/ia/acceso';
import { guardarAjustes, leerAjustesIa } from '@/lib/ia/ajustes';
import { FRASE_MAX_LARGO, FRASE_MIN_LARGO, FRASES_MAX } from '@/lib/ia/reglas';

// C-288 · PUT /api/admin/ia/frases { frases, desde }: las frases que nunca van en lo que se publica (la tienda quita la oración
// entera que trae una). De 1 a 60, de 3 a 80 caracteres cada una, sin repetidas. Rige desde el próximo pedido.
export const dynamic = 'force-dynamic';

const cuerpo = z.object({
  frases: z.array(z.string().trim().min(FRASE_MIN_LARGO, 'Cada frase lleva al menos 3 caracteres').max(FRASE_MAX_LARGO, 'Cada frase llega a 80 caracteres')).min(1, 'Tiene que haber al menos una frase').max(FRASES_MAX, `Son ${FRASES_MAX} frases como máximo`),
  desde: z.string().datetime().nullable(),
});

export async function PUT(request: NextRequest) {
  const persona = await exigirPersonaDeIa('frases');
  if (esRespuesta(persona)) return persona;
  const datos = cuerpo.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: datos.error.issues[0]?.message ?? 'Las frases no son válidas' }, { status: 400 });
  const frases = datos.data.frases.map((f) => f.replace(/\s+/g, ' '));
  const llaves = frases.map((f) => f.toLowerCase());
  if (new Set(llaves).size !== llaves.length) return NextResponse.json({ error: 'Hay frases repetidas' }, { status: 400 });

  const antes = (await leerAjustesIa()).frases;
  const r = await guardarAjustes(datos.data.desde, persona.id, () => ({ frases }));
  if (!r.ok) return NextResponse.json(CONFLICTO, { status: 409 });
  const antesLlaves = new Set(antes.map((f) => f.toLowerCase()));
  await anotarIa(persona, request, 'Cambió las frases que nunca van en lo que se publica', {
    agregadas: frases.filter((f) => !antesLlaves.has(f.toLowerCase())).slice(0, 20),
    quitadas: antes.filter((f) => !llaves.includes(f.toLowerCase())).slice(0, 20),
    total: frases.length,
  });
  return NextResponse.json({ ok: true, frases, updatedAt: r.updatedAt.toISOString() });
}
