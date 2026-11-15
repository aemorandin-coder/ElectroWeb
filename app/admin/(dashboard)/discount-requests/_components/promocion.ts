// C-102 y C-249b: lo que comparten la lista de ofertas y cupones y su asistente (Descuentos → Ofertas y cupones): la
// promoción como llega del servidor, el formulario, cómo se pasa de una al otro y cómo se dice cada campo en palabras.
import type { AdminTone } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';

export type Estado = 'ACTIVA' | 'PROGRAMADA' | 'VENCIDA' | 'PAUSADA' | 'AGOTADA';

export interface Promocion {
  id: string;
  name: string;
  label: string | null;
  kind: 'AUTOMATIC' | 'COUPON';
  code: string | null;
  isPublic: boolean;
  percentOff: number | null;
  amountOffUSD: number | null;
  scope: 'ALL' | 'CATEGORY' | 'PRODUCT';
  productIds: string[];
  categoryIds: string[];
  minSubtotalUSD: number | null;
  startsAt: string;
  endsAt: string | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  usesCount: number;
  isActive: boolean;
  status: Estado;
  savedUSD: number;
  /** C-167: es el código de un promotor (se cambia en Marketing → Promotores) */
  deUnPromotor?: boolean;
  /** C-170: la versión con que se abre el editor */
  updatedAt: string;
}
export interface ProductoRef { id: string; name: string; priceUSD: number }
/** La muestra de la vista previa: lo que necesita la tarjeta de la tienda (ProductCard), y su categoría */
export interface Ficha {
  id: string; name: string; slug: string; priceUSD: number; compareAtPriceUSD: number | null; stock: number;
  mainImage: string | null; images: string[]; productType: 'PHYSICAL'; categoryId: string;
  category: { name: string } | null; brand: { name: string } | null;
}
export interface Categoria { id: string; name: string }

export const ESTADO: Record<Estado, { label: string; tone: AdminTone }> = {
  ACTIVA: { label: 'Activa', tone: 'success' },
  PROGRAMADA: { label: 'Programada', tone: 'brand' },
  PAUSADA: { label: 'Pausada', tone: 'warning' },
  AGOTADA: { label: 'Agotada', tone: 'neutral' },
  VENCIDA: { label: 'Terminada', tone: 'neutral' },
};

export interface Formulario {
  kind: 'AUTOMATIC' | 'COUPON';
  name: string;
  label: string;
  code: string;
  isPublic: boolean;
  valueType: 'PERCENT' | 'AMOUNT';
  value: string;
  scope: 'ALL' | 'CATEGORY' | 'PRODUCT';
  categoryIds: string[];
  products: ProductoRef[];
  minSubtotalUSD: string;
  startsAt: string;
  endsAt: string;
  maxUses: string;
  maxUsesPerUser: string;
}

/** Fecha ISO → valor de <input type="datetime-local"> en la hora del navegador */
export function aLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const fechaCorta = (iso: string) => new Date(iso).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function vacio(kind: 'AUTOMATIC' | 'COUPON'): Formulario {
  return {
    kind, name: '', label: '', code: '', isPublic: true, valueType: 'PERCENT', value: '', scope: 'ALL',
    categoryIds: [], products: [], minSubtotalUSD: '', startsAt: '', endsAt: '', maxUses: '',
    maxUsesPerUser: kind === 'COUPON' ? '1' : '',
  };
}

/** La promoción como la edita el formulario (la usan abrir el editor y combinar con lo que otra persona guardó) */
export function aFormulario(p: Promocion, productos: Map<string, ProductoRef>): Formulario {
  return {
    kind: p.kind, name: p.name, label: p.label ?? '', code: p.code ?? '', isPublic: p.isPublic,
    valueType: p.percentOff ? 'PERCENT' : 'AMOUNT', value: String(p.percentOff ?? p.amountOffUSD ?? ''),
    scope: p.scope, categoryIds: p.categoryIds,
    products: p.productIds.map((id) => productos.get(id) ?? { id, name: 'Producto', priceUSD: 0 }),
    minSubtotalUSD: p.minSubtotalUSD ? String(p.minSubtotalUSD) : '', startsAt: aLocal(p.startsAt), endsAt: aLocal(p.endsAt),
    maxUses: p.maxUses ? String(p.maxUses) : '', maxUsesPerUser: p.maxUsesPerUser ? String(p.maxUsesPerUser) : '',
  };
}

export function valorTexto(p: Pick<Promocion, 'percentOff' | 'amountOffUSD' | 'kind'>): string {
  if (p.percentOff) return `-${p.percentOff}%`;
  if (p.amountOffUSD) return `-${formatUSD(p.amountOffUSD)}${p.kind === 'AUTOMATIC' ? ' c/u' : ''}`;
  return '';
}

/** Cómo se llama cada campo: en el cuadro de los cambios de dos personas (C-170) y en "Lo que cambia" (C-249b) */
export const ETIQUETAS: Record<keyof Formulario, string> = {
  kind: 'Tipo', name: 'Nombre', label: 'Etiqueta', code: 'Código', isPublic: 'Público', valueType: 'Tipo de descuento', value: 'Valor del descuento',
  scope: 'Alcance', categoryIds: 'Categorías', products: 'Productos', minSubtotalUSD: 'Compra mínima', startsAt: 'Inicio', endsAt: 'Fin',
  maxUses: 'Usos máximos', maxUsesPerUser: 'Usos por cliente',
};

/** Un campo en palabras. `generico` es el de los demás campos (valorEnTexto del cuadro de conflictos) */
export function campoEnTexto(campo: string, valor: unknown, categorias: Categoria[], generico: (v: unknown) => string): string {
  if (campo === 'products') return (valor as ProductoRef[]).map((p) => p.name).join(', ') || '(ninguno)';
  if (campo === 'categoryIds') return (valor as string[]).map((id) => categorias.find((c) => c.id === id)?.name ?? id).join(', ') || '(ninguna)';
  if (campo === 'valueType') return valor === 'PERCENT' ? 'Porcentaje' : 'Monto fijo';
  if (campo === 'scope') return valor === 'ALL' ? 'Toda la tienda' : valor === 'CATEGORY' ? 'Categorías' : 'Productos';
  if (campo === 'startsAt' || campo === 'endsAt') return valor ? new Date(String(valor)).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '(sin fecha)';
  return generico(valor);
}

/** Un producto como llega del panel (la lista, la búsqueda o uno solo) a su ficha; null si es digital o no se entiende */
export function fichaDe(p: Record<string, unknown> | null | undefined): Ficha | null {
  if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || p.productType === 'DIGITAL') return null;
  const lista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  let images = lista(p.images);
  if (typeof p.images === 'string') {
    try { images = lista(JSON.parse(p.images)); } catch { images = []; }
  }
  const nombre = (v: unknown) => (v && typeof v === 'object' && typeof (v as { name?: unknown }).name === 'string' ? { name: (v as { name: string }).name } : null);
  const precio = Number(p.priceUSD);
  const antes = p.compareAtPriceUSD === null || p.compareAtPriceUSD === undefined ? null : Number(p.compareAtPriceUSD);
  return {
    id: p.id, name: p.name, slug: typeof p.slug === 'string' ? p.slug : p.id,
    priceUSD: Number.isFinite(precio) ? precio : 0,
    compareAtPriceUSD: antes !== null && Number.isFinite(antes) ? antes : null,
    stock: Number(p.stock) || 0,
    mainImage: typeof p.mainImage === 'string' ? p.mainImage : null,
    images, productType: 'PHYSICAL',
    categoryId: typeof p.categoryId === 'string' ? p.categoryId : '',
    category: nombre(p.category), brand: nombre(p.brand),
  };
}
