// C-204: los borradores de un proveedor, para terminarlos en lote (Andrés, 12/11):
// - la lista de control dice qué le falta a cada uno (lib/proveedores/lista-de-control.ts);
// - la búsqueda en la web de C-155 completa lo que está vacío, uno por uno. La IA propone y el equipo revisa: lo que trajo
//   queda marcado como "por revisar" y así no se publica;
// - "Publicar los listos" publica solo los completos, revisados aquí otra vez.
// Solo servidor.

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizar } from '@/lib/cotizaciones/busqueda';
import { buscarProductoEnLaWeb } from '@/lib/busqueda-web';
import { leerNombreMarca, resolverMarca } from '@/lib/marcas';
import { FICHA_WEB_KEY, INTERNAL_SPEC_KEYS, parseSpecsObject } from '@/lib/product-specs';
import { parseProductImages } from '@/lib/product-utils';
import { marcarPublicados } from '@/lib/productos/publicacion';
import {
  DESCRIPCION_MIN, leerFichaWeb, medidasCompletas, modeloDe, revisarBorrador, type FichaWeb, type RevisionBorrador,
} from './lista-de-control';

/** Hasta cuántos borradores muestra la lista de control de un proveedor */
export const BORRADORES_MAX = 500;
/** Cuántos se publican por pedido */
export const PUBLICAR_LOTE = 200;
export const DESCRIPCION_MAX = 5000;
/** Especificaciones que puede sumar la web a un borrador (las que ya tiene no se tocan) */
const ESPECIFICACIONES_MAX = 16;

const SELECT_BORRADOR = {
  id: true, name: true, sku: true, supplierSku: true, description: true, images: true, mainImage: true, priceUSD: true,
  stock: true, weightKg: true, dimensions: true, specs: true, barcode: true, brandId: true, updatedAt: true,
  brand: { select: { name: true } }, category: { select: { name: true } },
} satisfies Prisma.ProductSelect;
type BorradorDb = Prisma.ProductGetPayload<{ select: typeof SELECT_BORRADOR }>;

const fotosDe = (p: { mainImage: string | null; images: string }) =>
  [...new Set([p.mainImage, ...parseProductImages(p.images)].filter((x): x is string => Boolean(x)))];

function revision(p: BorradorDb, specs: Record<string, unknown>): RevisionBorrador {
  return revisarBorrador({
    name: p.name, description: p.description, fotos: fotosDe(p).length, priceUSD: Number(p.priceUSD),
    weightKg: p.weightKg === null ? null : Number(p.weightKg), dimensions: p.dimensions, marca: p.brand?.name ?? null, specs,
  });
}

export interface FilaBorrador {
  id: string;
  name: string;
  sku: string;
  codigo: string | null;
  foto: string | null;
  fotos: number;
  precio: number;
  existencia: number;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  /** Para revisar lo que trajo la web: el texto entero */
  descripcion: string;
  especificaciones: Array<[string, string]>;
  ficha: FichaWeb | null;
  revision: RevisionBorrador;
  updatedAt: string;
}

function filaDe(p: BorradorDb): FilaBorrador {
  const specs = parseSpecsObject(p.specs);
  const internas = new Set<string>(INTERNAL_SPEC_KEYS);
  const fotos = fotosDe(p);
  return {
    id: p.id, name: p.name, sku: p.sku, codigo: p.supplierSku, foto: fotos[0] ?? null, fotos: fotos.length,
    precio: Number(p.priceUSD), existencia: p.stock, categoria: p.category?.name ?? null, marca: p.brand?.name ?? null,
    modelo: modeloDe(specs), descripcion: (p.description ?? '').slice(0, DESCRIPCION_MAX),
    especificaciones: Object.entries(specs)
      .filter(([k, v]) => !internas.has(k) && (typeof v === 'string' || typeof v === 'number') && String(v).trim())
      .map(([k, v]) => [k, String(v)] as [string, string])
      .slice(0, 30),
    ficha: leerFichaWeb(specs), revision: revision(p, specs), updatedAt: p.updatedAt.toISOString(),
  };
}

const WHERE_BORRADOR = (supplierId: string): Prisma.ProductWhereInput => ({
  supplierId, status: 'DRAFT', productType: 'PHYSICAL', deletedAt: null, eliminadoAt: null,
});

/** Los borradores del proveedor, lo más nuevo primero, con su lista de control */
export async function listarBorradores(supplierId: string): Promise<{ filas: FilaBorrador[]; total: number }> {
  const [filas, total] = await Promise.all([
    prisma.product.findMany({ where: WHERE_BORRADOR(supplierId), select: SELECT_BORRADOR, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: BORRADORES_MAX }),
    prisma.product.count({ where: WHERE_BORRADOR(supplierId) }),
  ]);
  return { filas: filas.map(filaDe), total };
}

export type ResultadoCompletar =
  | { estado: 'ok'; llenado: string[]; encontrado: boolean; avisos: string[]; fila: FilaBorrador }
  | { estado: 'no-esta' | 'cambiado' };

/**
 * Busca el borrador en la web (C-155) y llena solo lo que está vacío: la descripción, las especificaciones que no tiene,
 * la marca, el código de barras, el peso y las medidas. Lo estimado no entra (decide el flete: se pone a conciencia).
 * Si trajo algo, queda "por revisar". Si otra persona lo cambió mientras se buscaba, no se guarda nada.
 */
export async function completarConLaWeb(supplierId: string, id: string): Promise<ResultadoCompletar> {
  const p = await prisma.product.findFirst({ where: { id, ...WHERE_BORRADOR(supplierId) }, select: SELECT_BORRADOR });
  if (!p) return { estado: 'no-esta' };
  const specs = parseSpecsObject(p.specs);
  const resultado = await buscarProductoEnLaWeb({ nombre: p.name, modelo: modeloDe(specs) ?? undefined, categoria: p.category?.name });

  const llenado: string[] = [];
  const data: Prisma.ProductUncheckedUpdateManyInput = {};
  if ((p.description ?? '').trim().length < DESCRIPCION_MIN && resultado.descripcion.trim()) {
    data.description = resultado.descripcion.trim().slice(0, DESCRIPCION_MAX);
    llenado.push('descripción');
  }
  const tiene = new Set(Object.keys(specs).map((k) => normalizar(k)));
  let sumadas = 0;
  for (const e of resultado.especificaciones) {
    if (Object.keys(specs).length >= ESPECIFICACIONES_MAX + INTERNAL_SPEC_KEYS.length) break;
    const clave = normalizar(e.nombre);
    if (!e.nombre.trim() || !e.valor.trim() || tiene.has(clave)) continue;
    specs[e.nombre.trim().slice(0, 60)] = e.valor.trim().slice(0, 200);
    tiene.add(clave);
    sumadas++;
  }
  if (sumadas > 0) llenado.push(sumadas === 1 ? '1 especificación' : `${sumadas} especificaciones`);
  if (!p.barcode && resultado.codigoBarras && !resultado.codigoBarras.estimado) {
    data.barcode = resultado.codigoBarras.valor;
    llenado.push('código de barras');
  }
  if (!(Number(p.weightKg) > 0) && resultado.peso && !resultado.peso.estimado) {
    data.weightKg = resultado.peso.valor;
    llenado.push('peso');
  }
  if (!medidasCompletas(p.dimensions) && resultado.medidas && !resultado.medidas.estimado) {
    const m = resultado.medidas.valor;
    data.dimensions = JSON.stringify({ length: m.largo, width: m.ancho, height: m.alto });
    llenado.push('medidas de la caja');
  }
  const marca = !p.brandId && resultado.marca && !resultado.marca.estimado ? leerNombreMarca(resultado.marca.valor) : null;
  const nombreMarca = marca && 'nombre' in marca && marca.nombre ? marca.nombre : null;
  if (nombreMarca) llenado.push('marca');

  // Una búsqueda anterior sin revisar sigue sin revisar, aunque esta no traiga nada nuevo
  const previa = leerFichaWeb(specs);
  specs[FICHA_WEB_KEY] = {
    fecha: new Date().toISOString(),
    revisada: llenado.length === 0 && (previa?.revisada ?? true),
    llenado: [...new Set([...(previa && !previa.revisada ? previa.llenado : []), ...llenado])],
    fuentes: resultado.fuentes.slice(0, 6).map((f) => ({ dominio: f.dominio, url: f.url, titulo: f.titulo.slice(0, 120) })),
    redaccion: resultado.redaccion,
    modeloIA: resultado.modeloIA,
    avisos: resultado.avisos.slice(0, 5),
  } satisfies FichaWeb;
  data.specs = JSON.stringify(specs);

  const guardado = await prisma.$transaction(async (tx) => {
    if (nombreMarca) data.brandId = await resolverMarca(tx, nombreMarca);
    return tx.product.updateMany({ where: { id: p.id, updatedAt: p.updatedAt, status: 'DRAFT' }, data });
  });
  if (guardado.count === 0) return { estado: 'cambiado' };
  const fila = await prisma.product.findUnique({ where: { id: p.id }, select: SELECT_BORRADOR });
  return fila ? { estado: 'ok', llenado, encontrado: resultado.encontrado, avisos: resultado.avisos.slice(0, 5), fila: filaDe(fila) } : { estado: 'no-esta' };
}

/**
 * Lo que trajo la web ya se miró: queda revisado. Con `descripcion`, también la corrige (la pantalla deja editarla al
 * revisar). Si otra persona lo cambió desde que se cargó la lista (`desde`), no se toca.
 */
export async function marcarRevisado(
  supplierId: string, id: string, desde: string, descripcion: string | null,
): Promise<{ estado: 'ok'; fila: FilaBorrador } | { estado: 'no-esta' | 'cambiado' }> {
  const p = await prisma.product.findFirst({ where: { id, ...WHERE_BORRADOR(supplierId) }, select: SELECT_BORRADOR });
  if (!p) return { estado: 'no-esta' };
  if (p.updatedAt.toISOString() !== desde) return { estado: 'cambiado' };
  const specs = parseSpecsObject(p.specs);
  const ficha = leerFichaWeb(specs);
  if (ficha) specs[FICHA_WEB_KEY] = { ...(specs[FICHA_WEB_KEY] as object), revisada: true };
  const data: Prisma.ProductUncheckedUpdateManyInput = { specs: JSON.stringify(specs) };
  if (descripcion !== null) data.description = descripcion;
  const guardado = await prisma.product.updateMany({ where: { id: p.id, updatedAt: p.updatedAt }, data });
  if (guardado.count === 0) return { estado: 'cambiado' };
  const fila = await prisma.product.findUnique({ where: { id: p.id }, select: SELECT_BORRADOR });
  return fila ? { estado: 'ok', fila: filaDe(fila) } : { estado: 'no-esta' };
}

/** Publica los que están listos de estos ids (de este proveedor y en borrador); los demás se devuelven con lo que les falta */
export async function publicarListos(supplierId: string, ids: string[]) {
  const productos = await prisma.product.findMany({ where: { id: { in: ids }, ...WHERE_BORRADOR(supplierId) }, select: SELECT_BORRADOR });
  const listos: Array<{ id: string; name: string }> = [];
  const noListos: Array<{ id: string; name: string; faltan: string[] }> = [];
  for (const p of productos) {
    const r = revision(p, parseSpecsObject(p.specs));
    if (r.listo) listos.push({ id: p.id, name: p.name });
    else noListos.push({ id: p.id, name: p.name, faltan: r.faltan });
  }
  const hecho = listos.length > 0
    ? await prisma.product.updateMany({ where: { id: { in: listos.map((p) => p.id) }, status: 'DRAFT' }, data: { status: 'PUBLISHED' } })
    : { count: 0 };
  // C-210: su fecha de publicación, para que suban en "Recién llegados"
  await marcarPublicados(listos.map((p) => p.id));
  return { publicados: hecho.count, nombres: listos.slice(0, 30).map((p) => p.name), noListos, noEstan: ids.length - productos.length };
}
