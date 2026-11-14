// C-218 · La lista completa de un proveedor, guardada (Andrés, 13/11, la idea F). La pantalla la lee del Excel y la manda
// por partes; aquí se revisa cada fila y se guarda por código. Lo que deja de venir en su lista queda fuera (enLista
// false), sin borrarse. Solo servidor.

import { prisma } from '@/lib/prisma';
import { palabrasClave } from '@/lib/ia/productos-mencionados';
import { CODIGO_MAX, LOTE_GUARDAR, MODELO_MAX, NOMBRE_MAX, limpiarCodigo, limpiarNombre } from './lista';

export interface ArticuloEntrada {
  codigo: string;
  nombre: string;
  departamento: string | null;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  existencia: number | null;
  precioLista: number | null;
}

const numeroONull = (v: unknown, max: number): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : null);
const textoONull = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? limpiarNombre(v).slice(0, max) || null : null);

/** Lo que llega de la pantalla, revisado. Una fila sin código o sin nombre no se guarda */
export function leerArticulosEntrada(valor: unknown): { filas: ArticuloEntrada[] } | { error: string } {
  if (!Array.isArray(valor) || valor.length === 0) return { error: 'No llegó ninguna fila' };
  if (valor.length > LOTE_GUARDAR) return { error: `Son ${LOTE_GUARDAR} filas por envío como máximo` };
  const filas: ArticuloEntrada[] = [];
  for (const bruto of valor) {
    const f = (bruto ?? {}) as Record<string, unknown>;
    const codigo = limpiarCodigo(f.codigo);
    const nombre = typeof f.nombre === 'string' ? limpiarNombre(f.nombre).slice(0, NOMBRE_MAX) : '';
    if (!codigo || codigo.length > CODIGO_MAX || !nombre) continue;
    filas.push({
      codigo, nombre,
      departamento: textoONull(f.departamento, 60),
      categoria: textoONull(f.categoria, 80),
      marca: textoONull(f.marca, 60),
      modelo: textoONull(f.modelo, MODELO_MAX),
      existencia: numeroONull(f.existencia, 1_000_000),
      precioLista: numeroONull(f.precioLista, 1_000_000),
    });
  }
  return { filas };
}

/** Guarda (o pone al día) las filas de una carga. Devuelve cuántas */
export async function guardarArticulos(supplierId: string, filas: ArticuloEntrada[]): Promise<number> {
  const ahora = new Date();
  await prisma.$transaction(filas.map((f) => {
    const datos = { ...f, enLista: true, vistoAt: ahora };
    return prisma.articuloProveedor.upsert({
      where: { supplierId_codigo: { supplierId, codigo: f.codigo } },
      create: { supplierId, ...datos },
      update: datos,
    });
  }));
  return filas.length;
}

/** Al terminar una carga: lo que no vino desde `desde` ya no está en su lista */
export async function cerrarCarga(supplierId: string, desde: Date): Promise<number> {
  const r = await prisma.articuloProveedor.updateMany({ where: { supplierId, enLista: true, vistoAt: { lt: desde } }, data: { enLista: false } });
  return r.count;
}

export interface PropuestaCatalogo {
  nombre: string;
  categoriaId: string | null;
  categoria: string | null;
  duda: string | null;
}

/** Lo que Claude ya propuso para estos códigos (si su nombre en la lista no cambió desde entonces) */
export async function propuestasGuardadas(supplierId: string, codigos: string[]): Promise<Record<string, PropuestaCatalogo>> {
  const articulos = await prisma.articuloProveedor.findMany({
    where: { supplierId, codigo: { in: codigos }, iaRevisadoAt: { not: null }, iaNombre: { not: null } },
    select: { codigo: true, nombre: true, iaNombre: true, iaCategoriaId: true, iaDuda: true, iaNombreDe: true },
  });
  const vigentes = articulos.filter((a) => a.iaNombreDe === a.nombre);
  const ids = [...new Set(vigentes.map((a) => a.iaCategoriaId).filter((x): x is string => Boolean(x)))];
  const categorias = new Map((ids.length ? await prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : []).map((c) => [c.id, c.name]));
  return Object.fromEntries(vigentes.map((a) => [a.codigo, {
    nombre: a.iaNombre!,
    categoriaId: a.iaCategoriaId && categorias.has(a.iaCategoriaId) ? a.iaCategoriaId : null,
    categoria: a.iaCategoriaId ? categorias.get(a.iaCategoriaId) ?? null : null,
    duda: a.iaDuda,
  }]));
}

export interface ArticuloMencionado {
  id: string;
  codigo: string;
  nombre: string;
  proveedor: string;
  existencia: number | null;
}

/**
 * C-218 (la parte de B que faltaba): los artículos de las listas de proveedores cuyo nombre aparece en un texto (lo que
 * pide un cliente). Como productosMencionados: dos palabras del nombre, o una que lo distingue. Busca en su nombre y en el
 * que propuso Claude, y solo en lo que sigue en su lista.
 */
export async function articulosMencionados(texto: string, maximo = 3): Promise<ArticuloMencionado[]> {
  const delTexto = new Set(palabrasClave(texto));
  if (delTexto.size === 0) return [];
  // Un primer filtro en la base (alguna palabra del texto en el nombre) y la cuenta fina aquí
  const largas = [...delTexto].filter((w) => w.length >= 4).slice(0, 12);
  if (largas.length === 0) return [];
  const articulos = await prisma.articuloProveedor.findMany({
    where: { enLista: true, OR: largas.flatMap((w) => [{ nombre: { contains: w, mode: 'insensitive' as const } }, { iaNombre: { contains: w, mode: 'insensitive' as const } }]) },
    select: { id: true, codigo: true, nombre: true, iaNombre: true, existencia: true, supplier: { select: { name: true } } },
    take: 500,
  });
  const puntuados = articulos.flatMap((a) => {
    const suyas = new Set([...palabrasClave(a.nombre), ...palabrasClave(a.iaNombre ?? '')]);
    const coincide = [...suyas].filter((w) => delTexto.has(w));
    const fuerte = coincide.some((w) => (/\d/.test(w) && /[a-z]/.test(w)) || (!/\d/.test(w) && w.length >= 6));
    if (coincide.length < 2 && !fuerte) return [];
    return [{
      puntos: coincide.length + (fuerte ? 1 : 0) + (a.existencia && Number(a.existencia) > 0 ? 0.5 : 0),
      a: { id: a.id, codigo: a.codigo, nombre: a.iaNombre || a.nombre, proveedor: a.supplier.name, existencia: a.existencia === null ? null : Number(a.existencia) },
    }];
  });
  return puntuados.sort((x, y) => y.puntos - x.puntos).slice(0, maximo).map((x) => x.a);
}
