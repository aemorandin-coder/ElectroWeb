'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { FiMinus, FiPlus, FiShoppingCart } from 'react-icons/fi';
import Price from '@/components/ui/Price';
import { getStockLabel } from '@/components/ui/productCardData';
import { useCart } from '@/contexts/CartContext';
import type { PublicProduct } from '@/lib/dto/product';
import { formatUSD } from '@/lib/currency';

interface PurchasePanelProps {
  product: PublicProduct;
  exchangeRateVES?: number | null;
  lowStockThreshold: number;
}

interface Denomination {
  amount: number;
  salePrice: number;
}

const MAX_DIGITAL_QUANTITY = 10;

function denominationsOf(product: PublicProduct): Denomination[] {
  const raw = product.specs?.digitalPricing;
  if (product.productType !== 'DIGITAL' || !Array.isArray(raw)) return [];
  return raw
    .map((d) => ({ amount: Number((d as Denomination).amount), salePrice: Number((d as Denomination).salePrice) }))
    .filter((d) => Number.isFinite(d.amount) && d.amount > 0 && Number.isFinite(d.salePrice) && d.salePrice > 0);
}

/**
 * Precio, disponibilidad y compra del detalle (C-31).
 * - Físico: cantidad con tope de stock (contando lo que ya está en el carrito).
 * - Digital: monto a elegir y, en recargas manuales, el usuario de la cuenta.
 * - "Comprar ahora" exige sesión y solo va al checkout si se pudo agregar (antes iba aunque faltara el monto).
 * - En móvil, mientras los botones no están a la vista aparece una barra fija encima de la barra inferior.
 * El precio real lo vuelve a calcular el servidor al crear la orden (C-01).
 */
export default function PurchasePanel({ product, exchangeRateVES, lowStockThreshold }: PurchasePanelProps) {
  const { addItem, items } = useCart();
  const { data: session } = useSession();
  const router = useRouter();
  const usernameId = useId();
  const denominations = denominationsOf(product);
  const isDigital = product.productType === 'DIGITAL';
  const isManual = isDigital && product.deliveryMethod === 'MANUAL';

  const [selected, setSelected] = useState<Denomination | null>(denominations[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [showSticky, setShowSticky] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const inCart = isDigital ? 0 : items.find((item) => item.id === product.id)?.quantity ?? 0;
  const soldOut = !isDigital && product.stock <= 0;
  const maxQuantity = isDigital ? MAX_DIGITAL_QUANTITY : Math.max(1, product.stock - inCart);
  const unitPrice = selected ? selected.salePrice : product.priceUSD;
  const stockLabel = getStockLabel(product, lowStockThreshold);

  // Barra fija en móvil: visible mientras los botones principales no se ven (arriba, ya pasados, o abajo,
  // todavía sin llegar: en el teléfono la galería los empuja fuera del primer pantallazo).
  // Se mide en cada scroll (un cuadro por vez): IntersectionObserver no avisa si un deslizamiento
  // rápido salta de un lado al otro sin cruzar la pantalla.
  useEffect(() => {
    const target = actionsRef.current;
    if (!target || soldOut) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      // Borde útil de abajo: encima de la barra inferior de la tienda y de esta misma barra (~4 rem)
      const navTop = document.getElementById('mobile-bottom-nav')?.getBoundingClientRect().top ?? window.innerHeight;
      setShowSticky(rect.bottom < 0 || rect.top > navTop - 64);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [soldOut]);

  const addToCart = (): boolean => {
    if (denominations.length > 0 && !selected) {
      toast.error('Elige un monto');
      return false;
    }
    if (isManual && !username.trim()) {
      setUsernameError('Escribe el usuario o la cuenta donde recargamos el saldo');
      actionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById(usernameId)?.focus({ preventScroll: true });
      return false;
    }
    if (!isDigital && inCart + quantity > product.stock) {
      toast.error(inCart > 0 ? `Solo hay ${product.stock} disponibles y ya tienes ${inCart} en el carrito` : `Solo hay ${product.stock} disponibles`);
      return false;
    }

    const cleanUser = username.trim();
    // Formato que entiende el checkout: "productoId-monto" o "productoId-monto-usuario" (0 = sin montos)
    const cartId = isDigital
      ? [product.id, selected ? selected.amount : 0, ...(isManual ? [cleanUser.toLowerCase()] : [])].join('-')
      : product.id;
    addItem(
      {
        id: isDigital && !selected && !isManual ? product.id : cartId,
        name: selected ? `${product.name} ($${selected.amount})` : product.name,
        price: unitPrice,
        imageUrl: product.mainImage || product.images[0] || undefined,
        stock: isDigital ? 999 : product.stock,
        productType: isDigital ? 'DIGITAL' : 'PHYSICAL',
        weightKg: product.weightKg ?? undefined,
        dimensions: product.dimensions ?? undefined,
        isConsolidable: product.isConsolidable !== false,
        shippingCost: product.shippingCost ?? undefined,
        digitalUsername: isManual ? cleanUser : undefined,
      },
      quantity
    );
    toast.success(selected ? `Agregado: ${product.name} ($${selected.amount})` : 'Agregado al carrito');
    setQuantity(1);
    return true;
  };

  const buyNow = () => {
    if (!session) {
      toast.error('Inicia sesión para continuar con la compra');
      router.push(`/login?callbackUrl=${encodeURIComponent(`/productos/${product.slug}`)}&action=buy`);
      return;
    }
    if (addToCart()) router.push('/checkout');
  };

  const stepperButton =
    'flex h-11 w-11 items-center justify-center text-ink-soft hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 disabled:opacity-40';

  return (
    <div className="space-y-5">
      <div>
        <Price priceUSD={unitPrice} compareAtPriceUSD={selected ? null : product.compareAtPriceUSD} exchangeRateVES={exchangeRateVES} size="lg" />
        {stockLabel ? (
          <p className={`mt-2 text-sm font-medium ${stockLabel.className}`}>{stockLabel.text}</p>
        ) : (
          <p className="mt-2 text-sm font-semibold text-deal">● Agotado</p>
        )}
      </div>

      {denominations.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Elige el monto</legend>
          <div role="radiogroup" aria-label="Monto de la recarga" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {denominations.map((d) => {
              const checked = selected?.amount === d.amount;
              return (
                <button
                  key={d.amount}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setSelected(d)}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-lg border-2 px-2 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                    checked ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink hover:border-brand-200'
                  }`}
                >
                  <span className="text-base font-bold">${d.amount}</span>
                  <span className={`text-xs ${checked ? 'text-brand-700' : 'text-muted'}`}>{formatUSD(d.salePrice)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {isManual && (
        <div>
          <label htmlFor={usernameId} className="mb-1.5 block text-sm font-semibold text-ink">
            Usuario o cuenta a recargar <span className="text-deal" aria-hidden="true">*</span>
          </label>
          <input
            id={usernameId}
            type="text"
            value={username}
            maxLength={100}
            autoComplete="off"
            onChange={(event) => {
              setUsername(event.target.value);
              if (event.target.value.trim()) setUsernameError('');
            }}
            aria-invalid={Boolean(usernameError)}
            aria-describedby={`${usernameId}-hint`}
            placeholder="Ej: JugadorPro#1234 o micuenta@gmail.com"
            className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${usernameError ? 'border-deal' : 'border-line focus:border-brand-500'}`}
          />
          <p id={`${usernameId}-hint`} className={`mt-1 text-xs ${usernameError ? 'font-semibold text-deal' : 'text-muted'}`}>
            {usernameError || 'Recargamos el saldo directo a esta cuenta. Revisa que esté bien escrita.'}
          </p>
        </div>
      )}

      <div ref={actionsRef} className="space-y-3">
        {soldOut ? (
          <button type="button" disabled className="h-12 w-full cursor-not-allowed rounded-lg bg-gray-100 text-sm font-semibold text-ink-soft">
            Agotado
          </button>
        ) : (
          <>
            <div className="flex items-stretch gap-3">
              <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-line bg-white" role="group" aria-label="Cantidad">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Quitar una unidad" className={stepperButton}>
                  <FiMinus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="w-9 text-center text-sm font-semibold text-ink" aria-live="polite">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))} disabled={quantity >= maxQuantity} aria-label="Agregar una unidad" className={stepperButton}>
                  <FiPlus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <button
                type="button"
                onClick={addToCart}
                aria-label="Agregar al carrito"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                <FiShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
                {/* Junto al selector de cantidad, a 360px el texto largo partía en dos líneas */}
                <span className="sm:hidden">Agregar</span>
                <span className="hidden sm:inline">Agregar al carrito</span>
              </button>
            </div>
            <button
              type="button"
              onClick={buyNow}
              className="h-11 w-full rounded-lg border-2 border-brand-500 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Comprar ahora
            </button>
          </>
        )}
      </div>

      {/* Barra fija en móvil, encima de la barra inferior de la tienda */}
      {!soldOut && (
        <div
          id="product-sticky-bar"
          data-visible={showSticky}
          aria-hidden={!showSticky}
          inert={!showSticky || undefined}
          className={`fixed inset-x-0 z-[var(--z-sticky)] border-t border-line bg-white px-4 py-2 shadow-lg transition-transform duration-200 lg:hidden bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] ${
            showSticky ? 'translate-y-0' : 'invisible translate-y-full opacity-0'
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted">{product.name}</p>
              <p className="text-lg font-bold text-ink">{formatUSD(unitPrice)}</p>
            </div>
            <button
              type="button"
              onClick={addToCart}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              <FiShoppingCart className="h-4 w-4" aria-hidden="true" />
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
