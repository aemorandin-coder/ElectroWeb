import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { anotarIa, CONFLICTO, esRespuesta, exigirPersonaDeIa } from '@/lib/ia/acceso';
import { guardarAjustes, leerAjustesIa, motorDeProveedor, porUsoValido } from '@/lib/ia/ajustes';
import { MODELOS_IA } from '@/lib/ia/precios';
import { esProveedor, infoProveedor, nombreDelMotor, type IdProveedor } from '@/lib/ia/proveedores/catalogo';
import { esUsoIa, USOS_IA } from '@/lib/ia/reglas';

// C-292 · PUT /api/admin/ia/uso-motor { uso, proveedor, modelo, desde }: el motor propio de un uso (lo que era C-288b: "Sonnet
// solo para Buscar en la web"). Con `proveedor: null`, el uso vuelve al principal. "Buscar en la web" busca por su cuenta con la
// herramienta de Anthropic: por ahora solo admite modelos de Claude.
export const dynamic = 'force-dynamic';

const cuerpo = z.object({
  uso: z.string(),
  proveedor: z.string().nullable(),
  modelo: z.string().trim().max(120).nullable(),
  desde: z.string().datetime().nullable(),
});

export async function PUT(request: NextRequest) {
  const persona = await exigirPersonaDeIa('motor');
  if (esRespuesta(persona)) return persona;
  const datos = cuerpo.safeParse(await request.json().catch(() => null));
  if (!datos.success || !esUsoIa(datos.data.uso)) return NextResponse.json({ error: 'Elige un uso y un motor de la lista.' }, { status: 400 });
  const { uso, proveedor, modelo, desde } = datos.data;
  const nombreUso = USOS_IA.find((u) => u.id === uso)?.nombre ?? uso;
  const ajustes = await leerAjustesIa();

  if (proveedor !== null) {
    if (!esProveedor(proveedor) || !modelo) return NextResponse.json({ error: 'Elige un proveedor y un modelo.' }, { status: 400 });
    if (uso === 'busqueda' && proveedor !== 'anthropic') {
      return NextResponse.json({ error: 'Buscar en la web, por ahora, solo con Claude: es el que busca por su cuenta.' }, { status: 400 });
    }
    if (proveedor === 'anthropic' && !MODELOS_IA.some((m) => m.id === modelo)) return NextResponse.json({ error: 'Elige un modelo de Claude de la lista.' }, { status: 400 });
    if (!motorDeProveedor(ajustes, proveedor).clave) return NextResponse.json({ error: `Primero conecta la clave de ${infoProveedor(proveedor).empresa}.` }, { status: 400 });
  }

  const r = await guardarAjustes(desde, persona.id, (actual) => {
    const porUso = porUsoValido(actual?.porUso);
    if (proveedor === null) delete porUso[uso];
    else porUso[uso] = { proveedor: proveedor as IdProveedor, modelo: modelo as string };
    return { porUso: Object.keys(porUso).length > 0 ? (porUso as Prisma.InputJsonValue) : Prisma.DbNull };
  });
  if (!r.ok) return NextResponse.json(CONFLICTO, { status: 409 });
  await anotarIa(persona, request, `Cambió el motor de ${nombreUso}`, {
    despues: proveedor === null ? 'El principal' : nombreDelMotor(proveedor as IdProveedor, modelo as string),
  });
  return NextResponse.json({ ok: true, updatedAt: r.updatedAt.toISOString() });
}
