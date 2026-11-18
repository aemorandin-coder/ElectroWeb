import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { anotarIa, CONFLICTO, esRespuesta, exigirPersonaDeIa } from '@/lib/ia/acceso';
import { guardarAjustes, instruccionesValidas, type InstruccionGuardada } from '@/lib/ia/ajustes';
import { INSTRUCCIONES_DE_FABRICA } from '@/lib/ia/fabrica';
import { INSTRUCCIONES_MAX, INSTRUCCIONES_MIN, infoDeUso, USOS_IA } from '@/lib/ia/reglas';

// C-288 · PUT /api/admin/ia/instrucciones { uso, texto | null, desde }: las instrucciones que escribió el equipo para un uso de
// Claude. `texto: null` (o igual a las de fábrica) vuelve a las de fábrica. De 50 a 12.000 caracteres. Guarda quién y cuándo.
// Las reglas fijas del uso siguen yendo al final, escriba lo que escriba el equipo. Rige desde el próximo pedido.
export const dynamic = 'force-dynamic';

const cuerpo = z.object({
  uso: z.enum(USOS_IA.map((u) => u.id) as [string, ...string[]]),
  texto: z.string().trim().min(INSTRUCCIONES_MIN, 'Las instrucciones llevan al menos 50 caracteres').max(INSTRUCCIONES_MAX, 'Las instrucciones llegan a 12.000 caracteres').nullable(),
  desde: z.string().datetime().nullable(),
});

export async function PUT(request: NextRequest) {
  const persona = await exigirPersonaDeIa('instrucciones');
  if (esRespuesta(persona)) return persona;
  const datos = cuerpo.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: datos.error.issues[0]?.message ?? 'Datos no válidos' }, { status: 400 });
  const uso = datos.data.uso as keyof typeof INSTRUCCIONES_DE_FABRICA;
  const texto = datos.data.texto && datos.data.texto.trim() !== INSTRUCCIONES_DE_FABRICA[uso].trim() ? datos.data.texto : null;
  const nombre = infoDeUso(uso)?.nombre ?? uso;

  const r = await guardarAjustes(datos.data.desde, persona.id, (actual) => {
    const mapa: Partial<Record<string, InstruccionGuardada>> = { ...instruccionesValidas(actual?.instrucciones) };
    if (texto === null) delete mapa[uso];
    else mapa[uso] = { texto, porId: persona.id, porNombre: persona.nombre, at: new Date().toISOString() };
    return { instrucciones: Object.keys(mapa).length > 0 ? (mapa as unknown as Prisma.InputJsonObject) : Prisma.DbNull };
  });
  if (!r.ok) return NextResponse.json(CONFLICTO, { status: 409 });
  await anotarIa(persona, request, texto === null ? `Devolvió a las de fábrica las instrucciones de «${nombre}»` : `Cambió las instrucciones de «${nombre}»`, {
    uso, caracteres: texto?.length ?? 0,
  });
  return NextResponse.json({ ok: true, uso, delEquipo: texto !== null, updatedAt: r.updatedAt.toISOString() });
}
