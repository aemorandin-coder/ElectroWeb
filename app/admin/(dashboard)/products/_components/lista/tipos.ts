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
}

export interface Categoria {
  id: string;
  name: string;
}

export type FiltroEstado = 'todos' | 'publicados' | 'borradores' | 'archivados' | 'sin-stock' | FiltroRevisar;
/** C-187: lo publicado a lo que le falta algo que Google, Meta o el envío piden (los avisos del Dashboard) */
export type FiltroRevisar = 'sin-foto' | 'sin-marca' | 'sin-medidas';

export type CampoMasivo = 'status' | 'pricePercent' | 'price' | 'stock' | 'category';

export const ETIQUETA_ESTADO: Record<EstadoProducto, string> = {
  PUBLISHED: 'Activo',
  DRAFT: 'Borrador',
  ARCHIVED: 'Archivado',
};

/** C-187: lo archivado queda fuera de "Todos" y de "Sin stock": tiene su propio filtro */
export function enCatalogo(p: Pick<ProductoLista, 'status'>): boolean {
  return p.status !== 'ARCHIVED';
}

export function sinStock(p: Pick<ProductoLista, 'productType' | 'stock' | 'status'>): boolean {
  return enCatalogo(p) && p.productType !== 'DIGITAL' && p.stock <= 0;
}

/** C-187: las mismas reglas que los avisos del Dashboard (lib/queries/dashboard.ts), para que los números coincidan */
export const REVISAR: Record<FiltroRevisar, { label: string; ayuda: string; falta: (p: ProductoLista) => boolean }> = {
  'sin-foto': {
    label: 'Sin foto',
    ayuda: 'Publicados sin ninguna foto',
    falta: (p) => p.status === 'PUBLISHED' && !p.mainImage && p.images.length === 0,
  },
  'sin-marca': {
    label: 'Sin marca',
    ayuda: 'Físicos publicados sin marca: Google y el catálogo de Meta la piden',
    falta: (p) => p.status === 'PUBLISHED' && p.productType === 'PHYSICAL' && !p.brandId,
  },
  'sin-medidas': {
    label: 'Sin peso o medidas',
    ayuda: 'Físicos publicados sin peso o sin medidas: el empaque y el envío se estiman',
    falta: (p) => p.status === 'PUBLISHED' && p.productType === 'PHYSICAL' && (p.weightKg === null || p.weightKg <= 0 || !p.dimensions),
  },
};

export const FILTROS_REVISAR = Object.keys(REVISAR) as FiltroRevisar[];

export function esFiltroRevisar(valor: string): valor is FiltroRevisar {
  return (FILTROS_REVISAR as string[]).includes(valor);
}
