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
}

export interface Categoria {
  id: string;
  name: string;
}

export type FiltroEstado = 'todos' | 'publicados' | 'borradores' | 'archivados' | 'sin-stock';

export type CampoMasivo = 'status' | 'pricePercent' | 'price' | 'stock' | 'category';

export const ETIQUETA_ESTADO: Record<EstadoProducto, string> = {
  PUBLISHED: 'Activo',
  DRAFT: 'Borrador',
  ARCHIVED: 'Archivado',
};

export function sinStock(p: Pick<ProductoLista, 'productType' | 'stock'>): boolean {
  return p.productType !== 'DIGITAL' && p.stock <= 0;
}
