'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import PublicHeader from '@/components/public/PublicHeader';
import CheckoutSteps from '@/components/ui/CheckoutSteps';
import PageHeader from '@/components/ui/PageHeader';
import { FiMinus, FiPlus, FiShoppingCart, FiTruck } from 'react-icons/fi';
import { ConfianzaEnvio } from '@/components/envios/ConfianzaEnvio';
import Footer from '@/components/Footer';
import { toast } from 'react-hot-toast';
import { HiTrash } from 'react-icons/hi';
import { adminCard, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD, formatVES } from '@/lib/currency';
import { getGiftCardDesign } from '@/lib/gift-card-designs';
import { useSettings } from '@/contexts/SettingsContext';

// Diseño de una gift card del carrito: el id es "gift-card-<diseño>-<fecha>" (app/gift-cards).
// Antes se leía un campo `design` que el carrito no guarda y todas salían con el mismo diseño (revisión R11).
function disenoDeGiftCard(itemId: string) {
  return getGiftCardDesign(itemId.replace(/^gift-card-/, '').replace(/-\d+$/, ''));
}

export default function CarritoPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, getTotalPrice } = useCart();
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
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'No se pudo iniciar el checkout');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const total = getTotalPrice();
  const subtotal = total;
  const tax = 0; // Exento para saldos y códigos digitales
  // C-106: el total aún no lleva la entrega; se avisa aquí para que el embalaje del checkout no sorprenda
  const hasPhysical = items.some(item => item.productType !== 'DIGITAL');
  const envioGratis = items.some(item => item.freeShipping && item.productType !== 'DIGITAL');

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

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">Impuestos (Exento):</span>
                    <div className="text-right">
                      <span className="font-bold text-ink block">{formatUSD(tax)}</span>
                      {settings?.exchangeRateVES && (
                        <span className="text-xs text-brand-600 font-medium block">
                          {formatVES(tax * settings.exchangeRateVES)}
                        </span>
                      )}
                    </div>
                  </div>

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
                    {hasPhysical && (
                      <p className="mt-2 text-xs text-muted">
                        {envioGratis
                          ? 'Tu pedido tiene envío gratis: la tienda paga el embalaje y el flete.'
                          : 'Aún sin la entrega: la eliges en el pago. Por ZOOM o MRW pagas aquí solo el embalaje, y el flete se lo pagas a la empresa al retirar.'}
                      </p>
                    )}
                  </div>
                </div>

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
