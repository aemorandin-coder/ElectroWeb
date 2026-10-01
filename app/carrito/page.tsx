'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import PublicHeader from '@/components/public/PublicHeader';
import CheckoutSteps from '@/components/ui/CheckoutSteps';
import PageHeader from '@/components/ui/PageHeader';
import { FiAlertTriangle, FiMinus, FiPlus, FiShoppingCart, FiTruck } from 'react-icons/fi';
import { ConfianzaEnvio } from '@/components/envios/ConfianzaEnvio';
import Footer from '@/components/Footer';
import { toast } from 'react-hot-toast';
import { HiTrash } from 'react-icons/hi';
import { adminCard, adminNotice, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD, formatVES } from '@/lib/currency';
import { calculateOrder, ivaIncluido, orderAmountProblems, toPricingSettings, type ShippingBreakdown } from '@/lib/pricing';
import { resumenEmbalaje } from '@/lib/embalaje';
import { AvisosEmbalaje } from '@/components/envios/AvisosEmbalaje';
import IvaIncluido from '@/components/ui/IvaIncluido';
import { getGiftCardDesign } from '@/lib/gift-card-designs';
import { useSettings } from '@/contexts/SettingsContext';
import CouponBox from '@/components/cart/CouponBox';
import { parseCartItemId, toOrderItem } from '@/lib/cart-items';

// Diseño de una gift card del carrito: el id es "gift-card-<diseño>-<fecha>" (app/gift-cards).
// Antes se leía un campo `design` que el carrito no guarda y todas salían con el mismo diseño (revisión R11).
function disenoDeGiftCard(itemId: string) {
  return getGiftCardDesign(itemId.replace(/^gift-card-/, '').replace(/-\d+$/, ''));
}

export default function CarritoPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, getTotalPrice, couponCode, setCouponCode } = useCart();
  const { status } = useSession();
  const { confirm } = useConfirm();
  const [removing, setRemoving] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  // La tasa viene de los settings que el layout ya leyó en el servidor. Antes se pedía otra vez a la API
  // y, si no llegaba, mostraba los bolívares con una tasa inventada de 50.
  const { settings } = useSettings();

  const handleRemoveItem = async (id: string) => {
    setRemoving(id);
    // Wait for animation to complete before removing
    setTimeout(() => {
      removeItem(id);
      setRemoving(null);
      toast.success('Producto eliminado', { duration: 1500 });
    }, 400);
  };

  const handleClearCart = async () => {
    const confirmed = await confirm({
      title: 'Vaciar carrito',
      message: '¿Estás seguro de que deseas vaciar el carrito? Esta acción no se puede deshacer.',
      confirmText: 'Sí, vaciar',
      cancelText: 'Cancelar',
      type: 'danger',
    });

    if (confirmed) {
      setIsClearing(true);
      setTimeout(() => {
        clearCart();
        setIsClearing(false);
        toast.success('Carrito vaciado', { duration: 2000 });
      }, 500);
    }
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      router.push('/checkout');
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : 'No se pudo iniciar el checkout');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // C-102: con sesión, el servidor cotiza los productos con ofertas y cupón (la entrega se elige en el pago).
  // Las gift cards se compran aparte y no pasan por aquí: con una en el carrito se muestra el cálculo local.
  // C-153: se cotiza como envío nacional (si la tienda lo ofrece) para traer el embalaje de este paquete; el total
  // del carrito sigue siendo solo el de los productos.
  const enviosNacionales = settings ? settings.deliveryEnabled !== false : false;
  const quoteBody = useMemo(
    () => items.some((item) => item.id.startsWith('gift-card-'))
      ? null
      : JSON.stringify({ items: items.map(toOrderItem), deliveryMethod: enviosNacionales ? 'SHIPPING' : 'PICKUP', couponCode }),
    [items, couponCode, enviosNacionales]
  );
  const [quote, setQuote] = useState<{ key: string; subtotalUSD: number; discountUSD: number; totalUSD: number; fisicosUSD: number; coupon: { applied: boolean; message: string } | null; errors: string[]; envio: ShippingBreakdown | null } | null>(null);
  useEffect(() => {
    if (status !== 'authenticated' || !quoteBody || items.length === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch('/api/orders/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: quoteBody, signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data?.calculation) return;
          const c = data.calculation;
          // Sin la entrega: el total de productos es subtotal menos descuentos
          setQuote({
            key: quoteBody, subtotalUSD: c.subtotalUSD, discountUSD: c.discountUSD, totalUSD: Math.round((c.subtotalUSD - c.discountUSD) * 100) / 100, coupon: data.coupon,
            // C-151: la parte de los productos físicos (sin la entrega), por si los digitales no llevan IVA
            fisicosUSD: c.physical ? Math.round((c.physical.subtotalUSD - c.physical.discountUSD) * 100) / 100 : 0,
            // Productos que ya no se pueden comprar (sin stock, sin publicar, monto digital que ya no existe): no suman al total
            errors: Array.isArray(data.errors) ? data.errors : [],
            envio: c.shipping ?? null,
          });
        })
        .catch(() => { });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [quoteBody, status, items.length]);
  const server = quote && quote.key === quoteBody ? quote : null;

  const localTotal = getTotalPrice();
  // "Ahorras": diferencia con el precio de antes de la oferta, solo para mostrar
  const localSavings = items.reduce((sum, item) => sum + (item.listPrice && item.listPrice > item.price ? (item.listPrice - item.price) * item.quantity : 0), 0);
  const subtotal = server ? server.subtotalUSD : localTotal;
  const discount = server ? server.discountUSD : 0;
  const total = server ? server.totalUSD : localTotal;
  // C-146: los precios ya llevan el IVA. Se dice cuánto del total es IVA; nunca se suma nada
  // C-151: si los digitales no llevan IVA, se calcula solo sobre los productos físicos
  const fisicos = server ? server.fisicosUSD : items.reduce((sum, item) => sum + (item.productType !== 'DIGITAL' ? item.price * item.quantity : 0), 0);
  const gravado = settings?.taxDigital ? total : Math.min(fisicos, total);
  const iva = settings?.taxEnabled ? ivaIncluido(gravado, Number(settings.taxPercent) || 0) : null;
  // C-106: el total aún no lleva la entrega; se avisa aquí para que el embalaje del checkout no sorprenda
  const hasPhysical = items.some(item => item.productType !== 'DIGITAL');
  // C-153: el embalaje de este paquete, antes de llegar al pago. Con sesión es el del servidor; sin sesión, el mismo
  // cálculo con los datos del carrito. Sale de las medidas de los productos y de los empaques de la tienda.
  const envioLocal = useMemo(
    () => calculateOrder(
      items.filter((item) => !item.id.startsWith('gift-card-')).map((item) => ({
        productId: parseCartItemId(item).productId,
        name: item.name,
        productType: item.productType === 'DIGITAL' ? 'DIGITAL' as const : 'PHYSICAL' as const,
        unitPriceUSD: item.price,
        quantity: item.quantity,
        weightKg: item.weightKg ?? null,
        dimensions: item.dimensions ?? null,
        isConsolidable: item.isConsolidable !== false,
        shippingCostUSD: 0,
        freeShipping: item.productType !== 'DIGITAL' && item.freeShipping === true,
        discountPercent: 0,
      })),
      toPricingSettings(settings),
      'SHIPPING'
    ).shipping,
    [items, settings]
  );
  const envio = server?.envio ?? envioLocal;
  const empaque = envio.packaging ? resumenEmbalaje(envio.packaging) : null;
  // C-115: lo que impide pagar se avisa aquí, no recién en el checkout: productos que el servidor rechaza y
  // mínimo o máximo de compra. Sin sesión se compara con el total local; con sesión, con el del servidor.
  // Aún no hay entrega elegida: para el máximo, el total de productos es lo mínimo que se cobrará.
  const cartProblems = [
    ...(server?.errors ?? []),
    ...orderAmountProblems({ productsUSD: total, totalUSD: total }, settings?.minOrderAmountUSD ?? null, settings?.maxOrderAmountUSD ?? null),
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <PublicHeader />

      <PageHeader
        breadcrumbs={[{ label: 'Carrito' }]}
        icon={<FiShoppingCart />}
        title="Tu carrito"
        description={items.length === 0 ? 'Todavía no agregaste productos.' : `${items.length} ${items.length === 1 ? 'producto listo' : 'productos listos'} para pagar.`}
        meta={items.length > 0 ? <CheckoutSteps current={0} /> : undefined}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {items.length === 0 ? (
          /* Empty Cart State */
          <div className={`${adminCard} text-center py-16 px-6 max-w-xl mx-auto my-8`}>
            <div className="w-20 h-20 mx-auto mb-6 bg-surface rounded-full flex items-center justify-center border border-line">
              <FiShoppingCart className="w-10 h-10 text-muted" />
            </div>
            <h2 className="text-2xl font-bold text-ink mb-2">
              Tu carrito está vacío
            </h2>
            <p className="text-sm text-muted mb-6">
              Explora nuestros productos y añade tus favoritos al carrito.
            </p>
            <Link
              href="/productos"
              className={adminPrimaryButton}
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                  <span className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center">
                    <FiShoppingCart className="w-4 h-4 text-brand-600" />
                  </span>
                  Productos ({items.length})
                </h2>
                <button
                  onClick={handleClearCart}
                  className="flex items-center gap-2 px-3 py-1.5 text-deal hover:bg-deal-bg rounded-xl transition-colors font-medium text-sm"
                >
                  <HiTrash className="w-4 h-4" />
                  <span className={isClearing ? 'animate-pulse' : ''}>Vaciar</span>
                </button>
              </div>

              {/* Items List */}
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`${adminCard} relative overflow-hidden transition-shadow hover:shadow-sm ${removing === item.id ? 'opacity-50 scale-95 transition-all duration-300' : ''}`}
                >
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-surface flex-shrink-0 border border-line">
                      {(() => {
                        const isGiftCard = item.id.startsWith('gift-card-') || item.name.toLowerCase().includes('gift card');

                        if (isGiftCard) {
                          const design = disenoDeGiftCard(item.id);

                          return (
                            <div
                              className="w-full h-full flex flex-col justify-between p-2.5"
                              style={{ background: design.background, color: design.text }}
                            >
                              <div className="flex justify-between items-start">
                                <span className="text-[11px] font-bold opacity-80 tracking-wider">GIFT CARD</span>
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: design.accent }} />
                              </div>
                              <div className="text-center my-auto">
                                <span className="text-sm font-bold tracking-tight">
                                  {formatUSD(item.price)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[11px] opacity-70">
                                <span>ElectroShop</span>
                                <span className="font-mono">••••</span>
                              </div>
                            </div>
                          );
                        }

                        let imageUrl: string | undefined = item.imageUrl;
                        if (imageUrl && typeof imageUrl === 'string') {
                          if (imageUrl.startsWith('[')) {
                            try {
                              const parsed = JSON.parse(imageUrl);
                              imageUrl = Array.isArray(parsed) ? parsed[0] : imageUrl;
                            } catch {
                              // keep imageUrl
                            }
                          }
                        }
                        if (imageUrl && typeof imageUrl === 'string' && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
                          imageUrl = `/${imageUrl}`;
                        }

                        return imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={item.name}
                            fill sizes="(min-width: 768px) 128px, 96px"
                            unoptimized={!imageUrl.startsWith('/')}
                            className="object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FiShoppingCart className="w-8 h-8 text-subtle" />
                          </div>
                        );
                      })()}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-ink mb-1.5 line-clamp-2 hover:text-brand-600 transition-colors">
                          {item.name}
                        </h3>
                        {item.conditionBadge && (
                          // C-119: que se vea que es usado también aquí, no solo en la ficha
                          <p className="mb-2 inline-flex rounded bg-ink px-1.5 py-0.5 text-xs font-semibold tracking-wide text-white">{item.conditionBadge.toUpperCase()}</p>
                        )}
                        {item.freeShipping && item.productType !== 'DIGITAL' && (
                          <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-success-strong">
                            <FiTruck className="h-3.5 w-3.5" aria-hidden="true" /> Envío gratis: todo tu pedido viaja sin costo
                          </p>
                        )}
                        {item.digitalUsername && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-line rounded-lg text-ink text-xs font-semibold mb-2">
                            <span>Recarga para: {item.digitalUsername}</span>
                          </div>
                        )}
                        {/* Price Display */}
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-bold text-ink">
                              {formatUSD(item.price)}
                            </span>
                            <span className="text-xs text-muted">c/u</span>
                            {item.listPrice && item.listPrice > item.price && (
                              <span className="text-xs text-muted line-through">{formatUSD(item.listPrice)}</span>
                            )}
                          </div>
                          {settings?.exchangeRateVES && (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-semibold text-brand-600">
                                {formatVES(item.price * settings.exchangeRateVES)}
                              </span>
                              <span className="text-xs text-muted">ref.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const isGiftCard = item.id.startsWith('gift-card-') || item.name.toLowerCase().includes('gift card');

                            if (isGiftCard) {
                              return (
                                <div className="flex items-center gap-2">
                                  <div className="px-3 py-1 bg-surface border border-line rounded-lg">
                                    <span className="text-sm font-bold text-ink">1</span>
                                  </div>
                                  <span className="text-xs text-brand-600 font-medium">Fija</span>
                                </div>
                              );
                            }

                            return (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="w-10 h-10 flex items-center justify-center bg-surface border border-line rounded-lg text-ink hover:bg-line transition-colors"
                                  aria-label="Disminuir cantidad"
                                >
                                  <FiMinus className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <span className="w-8 text-center text-sm font-bold text-ink">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.stock}
                                  className="w-10 h-10 flex items-center justify-center bg-surface border border-line rounded-lg text-ink hover:bg-line transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  aria-label="Aumentar cantidad"
                                >
                                  <FiPlus className="w-4 h-4" aria-hidden="true" />
                                </button>
                                {item.quantity >= item.stock && (
                                  <span className="text-xs text-warning-strong font-medium">Máx</span>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Subtotal + Remove */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-base font-bold text-ink block">
                              {formatUSD(item.price * item.quantity)}
                            </span>
                            {settings?.exchangeRateVES && (
                              <span className="text-xs text-brand-600 font-semibold block">
                                {formatVES(item.price * item.quantity * settings.exchangeRateVES)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-2 text-muted hover:text-deal hover:bg-deal-bg rounded-lg transition-colors"
                            title="Eliminar producto"
                            aria-label="Eliminar producto"
                          >
                            <HiTrash className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <div className={`${adminCard} space-y-6`}>
                <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                  <FiShoppingCart className="w-5 h-5 text-brand-600" />
                  Resumen del pedido
                </h2>

                {/* Subtotal / Impuestos / Total */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)} productos):</span>
                    <div className="text-right">
                      <span className="font-bold text-ink block">{formatUSD(subtotal)}</span>
                      {settings?.exchangeRateVES && (
                        <span className="text-xs text-brand-600 font-medium block">
                          {formatVES(subtotal * settings.exchangeRateVES)}
                        </span>
                      )}
                    </div>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted">Descuentos:</span>
                      <span className="font-bold text-success-strong">-{formatUSD(discount)}</span>
                    </div>
                  )}

                  <CouponBox
                    code={couponCode}
                    onApply={(code) => setCouponCode(code)}
                    onRemove={() => setCouponCode(null)}
                    status={server?.coupon ? { applied: server.coupon.applied, message: server.coupon.message } : null}
                    pendingText={status !== 'authenticated' ? 'Se verifica cuando inicies sesión para pagar.' : quoteBody ? 'Verificando…' : 'Se verifica al pagar.'}
                  />

                  <div className="pt-4 border-t border-line">
                    <div className="flex justify-between items-baseline">
                      <span className="text-base font-bold text-ink">Total:</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-ink block">{formatUSD(total)}</span>
                        {settings?.exchangeRateVES && (
                          <span className="text-sm font-bold text-brand-600 block mt-0.5">
                            {formatVES(total * settings.exchangeRateVES)}
                          </span>
                        )}
                      </div>
                    </div>
                    {iva && <IvaIncluido totalUSD={gravado} ivaUSD={iva.ivaUSD} soloFisicos={gravado < total - 0.005} className="mt-2 text-right" />}
                    {localSavings > 0.004 && (
                      <p className="mt-2 text-sm font-semibold text-success-strong">Ahorras {formatUSD(localSavings)} con las ofertas de hoy</p>
                    )}
                    {hasPhysical && (
                      <p className="mt-2 text-xs text-muted">
                        {!enviosNacionales
                          ? 'Aún sin la entrega: la eliges en el pago.'
                          : envio.isFreeShipping
                            ? 'Tu pedido tiene envío gratis: la tienda paga el embalaje y el flete.'
                            : envio.packagingFee > 0
                              ? `Aún sin la entrega: la eliges en el pago. Por ZOOM o MRW pagas aquí solo el embalaje (${formatUSD(envio.packagingFee)}${empaque ? `, ${empaque.toLowerCase()}` : ''}), y el flete se lo pagas a la empresa al retirar.`
                              : 'Aún sin la entrega: la eliges en el pago. Por ZOOM o MRW el embalaje es gratis en este pedido, y el flete se lo pagas a la empresa al retirar.'}
                      </p>
                    )}
                    {hasPhysical && enviosNacionales && (
                      <AvisosEmbalaje
                        envio={envio}
                        umbralEmbalaje={settings?.freePackagingThresholdUSD ?? null}
                        umbralEnvio={settings?.freeDeliveryThresholdUSD ?? null}
                        className="mt-3"
                      />
                    )}
                  </div>
                </div>

                {cartProblems.length > 0 && (
                  <div role="status" className={adminNotice('warning')}>
                    <p className="flex items-center gap-2 font-semibold">
                      <FiAlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Todavía no puedes pagar esta compra
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-6">
                      {cartProblems.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className={`w-full ${adminPrimaryButton} py-3 text-base font-bold justify-center disabled:opacity-70`}
                  >
                    {isCheckingOut ? 'Procesando...' : 'Proceder al pago'}
                  </button>

                  <Link
                    href="/productos"
                    className={`w-full ${adminSecondaryButton} py-2.5 text-sm font-semibold justify-center`}
                  >
                    Seguir comprando
                  </Link>
                  {/* C-148: empresas e instituciones piden un presupuesto formal con lo que tienen en el carrito */}
                  <Link href="/cotizacion" className="mt-3 block text-center text-sm font-semibold text-brand-600 hover:text-brand-700">
                    ¿Compras para una empresa? Pide una cotización
                  </Link>
                </div>
              </div>

              <ConfianzaEnvio />
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
