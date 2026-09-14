# components/ui — Componentes base de la tienda (C-12)

Reglas: solo tokens de `PLAN.md` §1 (sin hex), breakpoint único `lg`, nada que dependa del hover y texto seleccionable.
Precios siempre con `lib/currency.ts`. Página de muestra en desarrollo: **`/dev/ui`** (en producción responde 404).

## Container
Ancho máximo de la tienda y márgenes laterales.
```tsx
import Container from '@/components/ui/Container';

<Container as="section" className="py-8">…</Container>
```

## SectionHeader
Título de sección con enlace opcional "Ver todo".
```tsx
import SectionHeader from '@/components/ui/SectionHeader';

<SectionHeader title="Ofertas" subtitle="Precios con descuento" href="/productos?sort=deals" />
```

## Price
USD, precio anterior tachado con "Ahorra $X" y equivalente en Bs. (si se pasa la tasa).
```tsx
import Price from '@/components/ui/Price';

<Price priceUSD={1099} compareAtPriceUSD={1299} exchangeRateVES={36.5} />   // $1.099,00 · $1.299,00 Ahorra $200,00 · Bs. 40.113,50
<Price priceUSD={1099} size="lg" />
```

## ProductBadge
Badges de oferta, nuevo, digital, agotado y etiqueta amarilla. `getProductBadges(product)` calcula cuáles corresponden.
```tsx
import ProductBadge, { getProductBadges } from '@/components/ui/ProductBadge';

<ProductBadge variant="tag">OFERTA DEL DÍA</ProductBadge>
{getProductBadges(product).map((b) => <ProductBadge key={b.variant} variant={b.variant}>{b.label}</ProductBadge>)}
```

## ProductCard (v2)
Server Component con *stretched link*: el nombre es el enlace y cubre la tarjeta; carrito y compartir van encima (`z-10`).
Acepta `PublicProduct` (`lib/dto/product.ts`) o cualquier objeto con la forma de `ProductCardData`.
```tsx
import ProductCard from '@/components/ui/ProductCard';

<ProductCard product={toPublicProduct(p)} exchangeRateVES={settings.exchangeRateVES} priority />
```
> `LegacyProductCard` es la tarjeta anterior. La siguen usando `/productos`, categorías y el carrusel del home hasta C-22/C-30/C-32; después se borra.

## ProductShelf
Fila horizontal con `scroll-snap` (CSS). En móvil se desliza (se asoma la siguiente tarjeta); las flechas solo existen desde `lg`.
```tsx
import ProductShelf from '@/components/ui/ProductShelf';

<ProductShelf label="Ofertas">
  {deals.map((p) => <ProductCard key={p.id} product={p} exchangeRateVES={rate} />)}
</ProductShelf>
<ProductShelf label="Destacados" variant="featured">…</ProductShelf>   // tarjetas a 78vw en móvil
```

## AddToCartButton
Cliente. Agrega al carrito con tope de stock; productos agotados → deshabilitado; digitales con denominaciones o recarga manual → "Elegir monto" (va a su página).
```tsx
import AddToCartButton from '@/components/ui/AddToCartButton';

<AddToCartButton product={product} />
```

## ShareButton
Cliente. Menú nativo de compartir del teléfono; si no existe, copia el enlace.
```tsx
import ShareButton from '@/components/ui/ShareButton';

<ShareButton path={`/p/${product.shortCode}`} title={product.name} />
```

## useBodyScrollLock (`lib/hooks/useBodyScrollLock.ts`)
Bloquea el scroll del body mientras `locked` sea `true`. Usa un contador global: con varios modales abiertos, el scroll vuelve solo al cerrar el último. **No toques `document.body.style.overflow` a mano.**
```tsx
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

useBodyScrollLock(isOpen);
```

## Formato de precios (`lib/currency.ts`)
```ts
import { formatUSD, formatVES } from '@/lib/currency';

formatUSD(1099);      // "$1.099,00"
formatVES(40113.5);   // "Bs. 40.113,50"
```
