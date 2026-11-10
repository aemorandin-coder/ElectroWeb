// C-196: lo que la lista de un proveedor hace en la base: decir qué códigos ya están en la tienda, crear en borrador
// los nuevos y actualizar costo y existencia de los que ya están. Las reglas de cálculo están en ./lista (puras).

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizar } from '@/lib/cotizaciones/busqueda';
import { generateShortCode } from '@/lib/short-code';
import { resolverMarca, leerNombreMarca } from '@/lib/marcas';
import { montoDecimal } from '@/lib/pricing';
import { precioSugerido } from '@/lib/precio-sugerido';
import { parseProductImages } from '@/lib/product-utils';
import {
  CODIGO_MAX, DESCUENTO_MAX, MARGEN_MAX, MEDIDA_MAX, NOMBRE_MAX, PESO_MAX, RESERVA_MAX,
  costoDesdeLista, existenciaPublicable, limpiarCodigo, limpiarNombre, prefijoSku, skuDesdeCodigo,
} from './lista';

export const NOMBRE_PROVEEDOR_MAX = 80;

/** El nombre de un proveedor: de 2 a 80 caracteres, sin espacios dobles */
export function leerNombreProveedor(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const nombre = valor.replace(/\s+/g, ' ').trim();
  return nombre.length >= 2 && nombre.length <= NOMBRE_PROVEEDOR_MAX ? nombre : null;
}

/** Un porcentaje entre 0 y `max` (acepta "12,5"); null si no es válido */
export function leerPorcentaje(valor: unknown, max: number): number | null {
  const n = typeof valor === 'number' ? valor : typeof valor === 'string' ? Number(valor.replace(',', '.')) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 100) / 100 : null;
}

export interface EnTienda {
  id: string;
  name: string;
  sku: string;
  status: string;
  stock: number;
  priceUSD: number;
  costo: number | null;
  enPapelera: boolean;
  /** Cuántas fotos tiene (para el paso de fotos por código) */
  fotos: number;
}

/** Los productos de este proveedor con estos códigos (también los de la papelera, para avisarlo) */
export async function productosPorCodigo(supplierId: string, codigos: string[]): Promise<Map<string, EnTienda>> {
  const filas = await prisma.product.findMany({
    where: { supplierId, supplierSku: { in: codigos }, eliminadoAt: null },
    select: { id: true, name: true, sku: true, status: true, stock: true, priceUSD: true, costPerItem: true, deletedAt: true, supplierSku: true, images: true, mainImage: true },
  });
  return new Map(filas.map((p) => [p.supplierSku as string, {
    id: p.id, name: p.name, sku: p.sku, status: p.status, stock: p.stock, priceUSD: Number(p.priceUSD),
    costo: p.costPerItem === null ? null : Number(p.costPerItem), enPapelera: p.deletedAt !== null,
    fotos: new Set([p.mainImage, ...parseProductImages(p.images)].filter(Boolean)).size,
  }]));
}

/** Lo que llega de la pantalla para crear o actualizar, revisado aquí: la pantalla no decide nada */
export interface FilaEntrada {
  codigo: string;
  nombre: string;
  precioLista: number | null;
  existencia: number | null;
  categoria: string | null;
  marca: string | null;
  pesoKg: number | null;
  medidas: [number, number, number] | null;
}

const numeroONull = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;

export function leerFilasEntrada(valor: unknown, maximo: number): { filas: FilaEntrada[] } | { error: string } {
  if (!Array.isArray(valor) || valor.length === 0) return { error: 'No llegó ninguna fila' };
  if (valor.length > maximo) return { error: `Son ${maximo} filas por envío como máximo` };
  const filas: FilaEntrada[] = [];
  for (const [i, bruto] of valor.entries()) {
    const f = (bruto ?? {}) as Record<string, unknown>;
    const codigo = limpiarCodigo(f.codigo);
    if (!codigo || codigo.length > CODIGO_MAX) return { error: `Fila ${i + 1}: código inválido` };
    const medidas = Array.isArray(f.medidas) && f.medidas.length === 3 && f.medidas.every((x) => numeroONull(x, 0.1, MEDIDA_MAX) !== null)
      ? f.medidas as [number, number, number] : null;
    filas.push({
      codigo,
      nombre: typeof f.nombre === 'string' ? limpiarNombre(f.nombre).slice(0, NOMBRE_MAX) : '',
      precioLista: numeroONull(f.precioLista, 0, 1_000_000),
      existencia: numeroONull(f.existencia, 0, 1_000_000),
      categoria: typeof f.categoria === 'string' && f.categoria.trim() ? f.categoria.trim().slice(0, 80) : null,
      marca: typeof f.marca === 'string' && f.marca.trim() ? f.marca.trim().slice(0, 60) : null,
      pesoKg: numeroONull(f.pesoKg, 0.001, PESO_MAX),
      medidas,
    });
  }
  return { filas };
}

export interface OpcionesLista {
  descuento: number;
  margen: number;
  reserva: number;
  ivaPercent: number;
  /** C-196b: su lista ya trae el IVA (se le quita para el costo) */
  ivaIncluido: boolean;
}

export function leerOpciones(body: Record<string, unknown>, ivaPercent: number): OpcionesLista | { error: string } {
  const descuento = leerPorcentaje(body.descuento ?? 0, DESCUENTO_MAX);
  const margen = leerPorcentaje(body.margen ?? 30, MARGEN_MAX);
  const reserva = typeof body.reserva === 'number' && Number.isInteger(body.reserva) && body.reserva >= 0 && body.reserva <= RESERVA_MAX ? body.reserva : null;
  if (descuento === null) return { error: `El descuento va de 0 a ${DESCUENTO_MAX} %` };
  if (margen === null) return { error: `El margen va de 0 a ${MARGEN_MAX} %` };
  if (reserva === null) return { error: `La reserva va de 0 a ${RESERVA_MAX} unidades` };
  if (body.ivaIncluido !== undefined && typeof body.ivaIncluido !== 'boolean') return { error: 'IVA incluido: sí o no' };
  return { descuento, margen, reserva, ivaPercent, ivaIncluido: body.ivaIncluido === true };
}

/** El IVA que trae la lista del proveedor, para quitarlo del costo: el de la tienda o, si está apagado, el general (16 %) */
export function ivaDeLaLista(opciones: OpcionesLista): number {
  return opciones.ivaIncluido ? (opciones.ivaPercent > 0 ? opciones.ivaPercent : 16) : 0;
}

function slugDe(nombre: string): string {
  return normalizar(nombre).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 150) || 'producto';
}

async function libre(campo: 'sku' | 'slug', base: string): Promise<string> {
  for (let n = 1; n <= 30; n++) {
    const candidato = n === 1 ? base : `${base}-${n}`;
    const existe = await prisma.product.findFirst({ where: { [campo]: candidato }, select: { id: true } });
    if (!existe) return candidato;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export interface ResultadoCrear {
  creados: Array<{ codigo: string; id: string; sku: string }>;
  errores: Array<{ codigo: string; error: string }>;
}

/**
 * Crea en borrador los códigos que todavía no están: costo = lista − descuento; precio = costo + margen + IVA (la regla de
 * Andrés, lib/precio-sugerido.ts); existencia = la suya menos la reserva. Sin foto, descripción, peso y medidas el
 * asistente no deja publicarlos: quedan para completarlos uno por uno.
 */
export async function crearDesdeLista(
  proveedor: { id: string; name: string },
  filas: FilaEntrada[],
  opciones: OpcionesLista,
  categoriaPorDefecto: string | null,
): Promise<ResultadoCrear> {
  const resultado: ResultadoCrear = { creados: [], errores: [] };
  const categorias = await prisma.category.findMany({ select: { id: true, name: true } });
  const porNombre = new Map(categorias.map((c) => [normalizar(c.name), c.id]));
  const existentes = await productosPorCodigo(proveedor.id, filas.map((f) => f.codigo));
  const prefijo = prefijoSku(proveedor.name);
  const ahora = new Date();

  for (const f of filas) {
    if (existentes.has(f.codigo)) { resultado.errores.push({ codigo: f.codigo, error: 'Ya está en la tienda' }); continue; }
    if (!f.nombre) { resultado.errores.push({ codigo: f.codigo, error: 'Sin nombre' }); continue; }
    const costo = costoDesdeLista(f.precioLista, opciones.descuento, ivaDeLaLista(opciones));
    const precio = costo === null ? null : precioSugerido(costo, opciones.ivaPercent, opciones.margen);
    if (costo === null || precio === null) { resultado.errores.push({ codigo: f.codigo, error: 'Sin precio en la lista' }); continue; }
    const categoryId = (f.categoria ? porNombre.get(normalizar(f.categoria)) : undefined) ?? categoriaPorDefecto;
    if (!categoryId) { resultado.errores.push({ codigo: f.codigo, error: f.categoria ? `No existe la categoría "${f.categoria}"` : 'Falta la categoría' }); continue; }
    const marca = f.marca ? leerNombreMarca(f.marca) : { nombre: '' };
    try {
      const sku = await libre('sku', skuDesdeCodigo(prefijo, f.codigo));
      const slug = await libre('slug', slugDe(f.nombre));
      const shortCode = await generateShortCode(prisma);
      const creado = await prisma.$transaction(async (tx) => {
        const brandId = 'nombre' in marca && marca.nombre ? await resolverMarca(tx, marca.nombre) : null;
        const data: Prisma.ProductUncheckedCreateInput = {
          name: f.nombre, sku, slug, shortCode, description: '', images: '[]', status: 'DRAFT', productType: 'PHYSICAL',
          priceUSD: montoDecimal(precio), costPerItem: montoDecimal(costo),
          stock: existenciaPublicable(f.existencia, opciones.reserva) ?? 0,
          categoryId, brandId,
          weightKg: f.pesoKg ?? 0,
          dimensions: f.medidas ? JSON.stringify({ length: f.medidas[0], width: f.medidas[1], height: f.medidas[2] }) : null,
          supplierId: proveedor.id, supplierSku: f.codigo, supplierSyncedAt: ahora,
        };
        return tx.product.create({ data, select: { id: true, sku: true } });
      });
      resultado.creados.push({ codigo: f.codigo, id: creado.id, sku: creado.sku });
    } catch (error) {
      console.error('Lista del proveedor, crear', f.codigo, error);
      resultado.errores.push({ codigo: f.codigo, error: 'No se pudo crear' });
    }
  }
  return resultado;
}

export interface ResultadoActualizar {
  actualizados: number;
  sinCambios: number;
  noEstan: number;
  /** Para la bitácora: los cambios de precio, con antes y después */
  precios: Array<{ id: string; producto: string; antes: number; despues: number }>;
  /** Hubo cambios en algo que la tienda muestra (para revalidarla) */
  tocaTienda: boolean;
}

/**
 * Actualiza los que ya están, por su código: el costo (de su lista con el descuento), la existencia (la suya menos la
 * reserva) y, si se pide, el precio de venta con el margen. Lo de la papelera y los digitales no se tocan.
 */
export async function actualizarDesdeLista(
  proveedorId: string,
  filas: FilaEntrada[],
  opciones: OpcionesLista,
  que: { costo: boolean; existencia: boolean; precio: boolean },
): Promise<ResultadoActualizar> {
  const r: ResultadoActualizar = { actualizados: 0, sinCambios: 0, noEstan: 0, precios: [], tocaTienda: false };
  const productos = await prisma.product.findMany({
    where: { supplierId: proveedorId, supplierSku: { in: filas.map((f) => f.codigo) }, deletedAt: null, productType: 'PHYSICAL' },
    select: { id: true, name: true, status: true, stock: true, priceUSD: true, costPerItem: true, supplierSku: true },
  });
  const porCodigo = new Map(productos.map((p) => [p.supplierSku as string, p]));
  const ahora = new Date();
  const cambios: Array<{ id: string; data: Prisma.ProductUpdateInput }> = [];
  for (const f of filas) {
    const p = porCodigo.get(f.codigo);
    if (!p) { r.noEstan++; continue; }
    const data: Prisma.ProductUpdateInput = {};
    const costo = costoDesdeLista(f.precioLista, opciones.descuento, ivaDeLaLista(opciones));
    if (que.costo && costo !== null && (p.costPerItem === null || Number(p.costPerItem) !== costo)) data.costPerItem = montoDecimal(costo);
    const stock = existenciaPublicable(f.existencia, opciones.reserva);
    if (que.existencia && stock !== null && stock !== p.stock) data.stock = stock;
    if (que.precio && costo !== null) {
      const precio = precioSugerido(costo, opciones.ivaPercent, opciones.margen);
      if (precio !== null && Math.abs(precio - Number(p.priceUSD)) >= 0.005) {
        data.priceUSD = montoDecimal(precio);
        r.precios.push({ id: p.id, producto: p.name, antes: Number(p.priceUSD), despues: precio });
      }
    }
    if (Object.keys(data).length === 0) { r.sinCambios++; continue; }
    data.supplierSyncedAt = ahora;
    if (p.status === 'PUBLISHED' && (data.stock !== undefined || data.priceUSD !== undefined)) r.tocaTienda = true;
    cambios.push({ id: p.id, data });
  }
  if (cambios.length > 0) await prisma.$transaction(cambios.map(({ id, data }) => prisma.product.update({ where: { id }, data })));
  r.actualizados = cambios.length;
  return r;
}

/**
 * Los productos de este proveedor que ya no salen en su lista de existencia y todavía tienen existencia en la tienda:
 * se agotaron allá. Con `aplicar`, quedan en 0 (la próxima lista los repone si vuelven).
 */
export async function agotadosFueraDeLista(proveedorId: string, codigosEnLista: string[], aplicar: boolean) {
  const where: Prisma.ProductWhereInput = {
    supplierId: proveedorId, supplierSku: { notIn: codigosEnLista }, deletedAt: null, productType: 'PHYSICAL', stock: { gt: 0 },
  };
  const productos = await prisma.product.findMany({ where, select: { id: true, name: true, status: true }, orderBy: { name: 'asc' } });
  if (aplicar && productos.length > 0) {
    await prisma.product.updateMany({ where: { id: { in: productos.map((p) => p.id) } }, data: { stock: 0, supplierSyncedAt: new Date() } });
  }
  return { cantidad: productos.length, nombres: productos.slice(0, 20).map((p) => p.name), tocaTienda: productos.some((p) => p.status === 'PUBLISHED') };
}

/**
 * El proveedor y su código que manda el asistente al crear o editar un producto. `undefined` = no vino (no se toca).
 * El código es único por proveedor: si lo tiene otro producto, se dice cuál.
 */
export async function leerProveedorDeProducto(
  body: Record<string, unknown>,
  productoId: string | null,
): Promise<{ supplierId?: string | null; supplierSku?: string | null } | { error: string }> {
  const out: { supplierId?: string | null; supplierSku?: string | null } = {};
  if (body.supplierId !== undefined) {
    if (body.supplierId === null || body.supplierId === '') out.supplierId = null;
    else if (typeof body.supplierId === 'string' && (await prisma.supplier.findUnique({ where: { id: body.supplierId }, select: { id: true } }))) out.supplierId = body.supplierId;
    else return { error: 'Proveedor no encontrado' };
  }
  if (body.supplierSku !== undefined) {
    if (body.supplierSku === null || body.supplierSku === '') out.supplierSku = null;
    else {
      const codigo = limpiarCodigo(body.supplierSku);
      if (!codigo) return { error: `El código del proveedor lleva hasta ${CODIGO_MAX} caracteres` };
      out.supplierSku = codigo;
    }
  }
  // Sin proveedor no hay código del proveedor
  if (out.supplierId === null) out.supplierSku = null;
  const proveedor = out.supplierId !== undefined ? out.supplierId
    : productoId ? (await prisma.product.findUnique({ where: { id: productoId }, select: { supplierId: true } }))?.supplierId ?? null : null;
  const codigo = out.supplierSku !== undefined ? out.supplierSku
    : productoId ? (await prisma.product.findUnique({ where: { id: productoId }, select: { supplierSku: true } }))?.supplierSku ?? null : null;
  if (proveedor && codigo) {
    const otro = await prisma.product.findFirst({ where: { supplierId: proveedor, supplierSku: codigo, ...(productoId ? { NOT: { id: productoId } } : {}) }, select: { name: true } });
    if (otro) return { error: `El código ${codigo} de ese proveedor ya lo tiene "${otro.name}"` };
  }
  return out;
}
