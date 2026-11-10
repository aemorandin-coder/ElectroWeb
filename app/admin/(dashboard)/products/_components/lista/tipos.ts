// Lista de productos del admin (C-51)

export type EstadoProducto = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

export interface ProductoLista {
  id: string;
  name: string;
  sku: string;
  slug: string;
  priceUSD: number;
  compareAtPriceUSD: number | null;
  stock: number;
  status: EstadoProducto;
  productType: 'PHYSICAL' | 'DIGITAL';
  isFeatured: boolean;
  images: string[];
  mainImage: string | null;
  description: string;
  category: { id: string; name: string } | null;
  /** Montos digitales: el precio del producto es el "desde" y se edita en el producto (C-60) */
  hasVariants: boolean;
  /** C-187: para "Por revisar" (las mismas reglas que el Dashboard) y para buscar por código de barras */
  brandId: string | null;
  weightKg: number | null;
  dimensions: string | null;
  barcode: string | null;
  /** C-196: costo, proveedor y su código. null para quien no administra productos (Marketing) */
  costPerItem: number | null;
  supplier: { id: string; name: string } | null;
  supplierSku: string | null;
  /** Cuándo la lista del proveedor le cambió el costo o la existencia (ISO) */
  supplierSyncedAt: string | null;
}

export interface Categoria {
  id: string;
  name: string;
}

export type FiltroEstado = 'todos' | 'publicados' | 'borradores' | 'archivados' | 'sin-stock' | FiltroRevisar;
/** C-187: lo publicado a lo que le falta algo que Google, Meta o el envío piden (los avisos del Dashboard) */
export type FiltroRevisar = 'sin-foto' | 'sin-marca' | 'sin-medidas';

export type CampoMasivo = 'status' | 'pricePercent' | 'price' | 'stock' | 'category';

/** C-196: el orden de la lista (lo resuelve el servidor, lib/admin/productos-lista.ts) */
export type OrdenLista = 'recientes' | 'nombre' | 'precio-asc' | 'precio-desc' | 'stock' | 'actualizados';
export const ORDENES: Array<{ value: OrdenLista; label: string }> = [
  { value: 'recientes', label: 'Más nuevos primero' },
  { value: 'actualizados', label: 'Cambiados hace poco' },
  { value: 'nombre', label: 'Nombre (A a Z)' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'stock', label: 'Menos existencia primero' },
];

export const ETIQUETA_ESTADO: Record<EstadoProducto, string> = {
  PUBLISHED: 'Activo',
  DRAFT: 'Borrador',
  ARCHIVED: 'Archivado',
};

/**
 * C-187: lo que avisa el Dashboard, a un toque. C-196: las reglas las aplica el servidor (WHERE_FILTRO de
 * lib/admin/productos-lista.ts, las mismas del Dashboard); aquí quedan el nombre y la ayuda de cada filtro.
 */
export const REVISAR: Record<FiltroRevisar, { label: string; ayuda: string }> = {
  'sin-foto': { label: 'Sin foto', ayuda: 'Publicados sin ninguna foto' },
  'sin-marca': { label: 'Sin marca', ayuda: 'Físicos publicados sin marca: Google y el catálogo de Meta la piden' },
  'sin-medidas': { label: 'Sin peso o medidas', ayuda: 'Físicos publicados sin peso o sin medidas: el empaque y el envío se estiman' },
};

export const FILTROS_REVISAR = Object.keys(REVISAR) as FiltroRevisar[];

export function esFiltroRevisar(valor: string): valor is FiltroRevisar {
  return (FILTROS_REVISAR as string[]).includes(valor);
}
