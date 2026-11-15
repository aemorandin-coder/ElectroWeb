// C-235: la mesa de la contadora (docs/plan/CONTABILIDAD.md §13.1): lo del mes con las facturas de C-229, su firma y su
// sello, y las notas con el dueño. Solo servidor.

import sharp from 'sharp';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validarFirma } from '@/lib/legal-docs';
import { rangoMes } from '@/lib/relacion-ventas';
import { r2 } from './montos';
import { comprasSinFactura } from './servidor';

export const TITULOS = ['Contadora Pública', 'Contador Público'] as const;

export const firmaSchema = z
  .object({
    nombre: z.string().trim().min(3, 'Tu nombre, como quieres que salga (de 3 a 80 letras).').max(80, 'Tu nombre, como quieres que salga (de 3 a 80 letras).'),
    titulo: z.enum(TITULOS, { error: 'Elige el título.' }),
    cpc: z.string().trim().transform((v) => v.replace(/[\s.]/g, '')).pipe(z.string().regex(/^\d{3,7}$/, 'El número de C.P.C.: solo cifras (por ejemplo, 123456).')),
    /** El trazo nuevo (PNG del lienzo). Sin él se cambian solo los textos de una firma que ya existe */
    trazo: z.string().max(900_000).optional(),
  })
  .strict();

export const notaSchema = z
  .object({
    mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes no es válido.'),
    texto: z.string().trim().min(2, 'Escribe la nota (de 2 a 500 letras).').max(500, 'Escribe la nota (de 2 a 500 letras).'),
  })
  .strict();

export interface FirmaDTO {
  nombre: string;
  titulo: string;
  cpc: string;
  /** data:image/png;base64,… (solo la ven quienes llevan la contabilidad) */
  imagen: string;
  actualizada: string;
}

const firmaDTO = (f: { nombre: string; titulo: string; cpc: string; imagen: string; updatedAt: Date }): FirmaDTO => ({
  nombre: f.nombre,
  titulo: f.titulo,
  cpc: f.cpc,
  imagen: `data:image/png;base64,${f.imagen}`,
  actualizada: f.updatedAt.toISOString(),
});

export async function firmaDe(userId: string): Promise<FirmaDTO | null> {
  const f = await prisma.firmaContable.findUnique({ where: { userId } });
  return f ? firmaDTO(f) : null;
}

/**
 * La contadora con acceso (la que entró y no se suspendió) y su firma, para la mesa del dueño. Si hay dos (mientras se
 * cambia una por otra), la que ya tiene firma, la más reciente; si ninguna la tiene, la que entró al último.
 */
export async function contadoraConFirma(): Promise<{ nombre: string; firma: FirmaDTO | null } | null> {
  const activas = await prisma.user.findMany({
    where: { role: 'ACCOUNTANT', password: { not: null }, OR: [{ profile: null }, { profile: { accountStatus: { not: 'SUSPENDED' } } }] },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true },
    take: 5,
  });
  if (!activas.length) return null;
  const firma = await prisma.firmaContable.findFirst({ where: { userId: { in: activas.map((a) => a.id) } }, orderBy: { updatedAt: 'desc' } });
  const c = (firma && activas.find((a) => a.id === firma.userId)) || activas[0];
  return { nombre: c.name || c.email || 'La contadora', firma: firma && firma.userId === c.id ? firmaDTO(firma) : null };
}

export type ResultadoFirma = { ok: true; firma: FirmaDTO } | { ok: false; status: number; error: string; campo?: string };

/**
 * Guarda la firma de quien declara. El trazo se valida (un PNG real y con tinta, como la firma de los documentos, C-103),
 * se recorta al dibujo y se reduce: así pesa poco y entra en los respaldos de la base.
 */
export async function guardarFirma(userId: string, datos: z.infer<typeof firmaSchema>): Promise<ResultadoFirma> {
  const actual = await prisma.firmaContable.findUnique({ where: { userId }, select: { imagen: true } });
  let imagen = actual?.imagen ?? null;
  if (datos.trazo) {
    const valida = await validarFirma(datos.trazo);
    if ('error' in valida) return { ok: false, status: 400, error: valida.error, campo: 'trazo' };
    const png = await sharp(valida.png).trim({ threshold: 1 }).resize({ width: 640, height: 220, fit: 'inside', withoutEnlargement: true })
      .png({ palette: true, compressionLevel: 9 }).toBuffer();
    imagen = png.toString('base64');
  }
  if (!imagen) return { ok: false, status: 400, error: 'Dibuja tu firma en el recuadro.', campo: 'trazo' };
  const f = await prisma.firmaContable.upsert({
    where: { userId },
    create: { userId, nombre: datos.nombre, titulo: datos.titulo, cpc: datos.cpc, imagen },
    update: { nombre: datos.nombre, titulo: datos.titulo, cpc: datos.cpc, imagen },
  });
  return { ok: true, firma: firmaDTO(f) };
}

export interface ResumenMes {
  periodo: string;
  emitidas: number;
  anuladas: number;
  baseBs: number;
  ivaBs: number;
  exentoBs: number;
  totalBs: number;
  /** Compras cobradas en el mes que todavía no tienen factura */
  sinFactura: number;
  ultimas: Array<{ id: string; etiqueta: string; fecha: string; cliente: string; totalBs: number; estado: 'EMITIDA' | 'ANULADA' }>;
}

export async function resumenDelMes(periodo: string): Promise<ResumenMes> {
  const [docs, compras] = await Promise.all([
    prisma.documentoFiscal.findMany({
      where: { periodo },
      select: { id: true, serie: true, numero: true, estado: true, emitidaEl: true, compradorNombre: true, origen: true, baseBs: true, ivaBs: true, exentoBs: true, totalBs: true },
      orderBy: [{ emitidaEl: 'desc' }, { numero: 'desc' }],
    }),
    rangoMes(periodo) ? comprasSinFactura(periodo) : Promise.resolve([]),
  ]);
  const emitidas = docs.filter((d) => d.estado === 'EMITIDA');
  const suma = (campo: 'baseBs' | 'ivaBs' | 'exentoBs' | 'totalBs') => r2(emitidas.reduce((s, d) => s + Number(d[campo]), 0));
  return {
    periodo,
    emitidas: emitidas.length,
    anuladas: docs.length - emitidas.length,
    baseBs: suma('baseBs'),
    ivaBs: suma('ivaBs'),
    exentoBs: suma('exentoBs'),
    totalBs: suma('totalBs'),
    sinFactura: compras.length,
    ultimas: docs.slice(0, 6).map((d) => ({
      id: d.id,
      etiqueta: `${d.serie ? `${d.serie}-` : ''}${String(d.numero).padStart(4, '0')}`,
      fecha: d.emitidaEl.toISOString(),
      cliente: d.origen === 'EN_BLANCO' ? 'Papel anulado sin usar' : (d.compradorNombre ?? ''),
      totalBs: Number(d.totalBs),
      estado: d.estado === 'ANULADA' ? 'ANULADA' : 'EMITIDA',
    })),
  };
}

export interface NotaDTO { id: string; texto: string; autor: string; esContadora: boolean; mia: boolean; fecha: string }

export async function notasDelMes(periodo: string, yoId: string): Promise<NotaDTO[]> {
  const notas = await prisma.notaContable.findMany({ where: { periodo }, orderBy: { createdAt: 'asc' }, take: 200 });
  const autores = await prisma.user.findMany({ where: { id: { in: [...new Set(notas.map((n) => n.autorId))] } }, select: { id: true, name: true, email: true, role: true } });
  const de = new Map(autores.map((a) => [a.id, a]));
  return notas.map((n) => {
    const a = de.get(n.autorId);
    return {
      id: n.id,
      texto: n.texto,
      autor: a?.name || a?.email || 'Alguien del equipo',
      esContadora: a?.role === 'ACCOUNTANT',
      mia: n.autorId === yoId,
      fecha: n.createdAt.toISOString(),
    };
  });
}

export async function agregarNota(periodo: string, autorId: string, texto: string): Promise<void> {
  await prisma.notaContable.create({ data: { periodo, autorId, texto } });
}
