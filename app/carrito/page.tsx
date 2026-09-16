'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import PublicHeader from '@/components/public/PublicHeader';
import CheckoutSteps from '@/components/ui/CheckoutSteps';
import PageHeader from '@/components/ui/PageHeader';
import { FiShoppingCart, FiTruck, FiShield } from 'react-icons/fi';
import Footer from '@/components/Footer';
import { toast } from 'react-hot-toast';
import { HiTrash } from 'react-icons/hi';
import { adminCard, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD, formatVES } from '@/lib/currency';

// Gift Card Designs - Same as gift-cards page
const GIFT_CARD_DESIGNS: Record<string, { gradient: string; accent: string; name: string }> = {
  'obsidian-gold': {
    name: 'Obsidian Gold',
    gradient: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 30%, #2d2d2d 70%, #1a1a1a 100%)',
    accent: '#fbbf24',
  },
  'aurora-neon': {
    name: 'Aurora Neon',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 70%, #1a1a2e 100%)',
    accent: '#00d4ff',
  },
  'cosmic-violet': {
    name: 'Cosmic Violet',
    gradient: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 30%, #4a1f6e 70%, #2d1b4e 100%)',
    accent: '#a855f7',
  },
  'matrix-green': {
    name: 'Matrix Green',
    gradient: 'linear-gradient(135deg, #0a1a0a 0%, #0d2d0d 30%, #1a4a1a 70%, #0d2d0d 100%)',
    accent: '#22c55e',
  },
};

interface CompanySettings {
  exchangeRateVES: number;
  companyName: string;
}

export default function CarritoPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, getTotalPrice } = useCart();
  const { confirm } = useConfirm();
  const [removing, setRemoving] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // Fetch exchange rate
  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        setSettings({
          exchangeRateVES: data.exchangeRateVES || 50,
          companyName: data.companyName || 'Electro Shop',
        });
      })
      .catch(err => console.error('Error fetching settings:', err));
  }, []);

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
                          const designKey = (item as any).design || 'obsidian-gold';
                          const design = GIFT_CARD_DESIGNS[designKey] || GIFT_CARD_DESIGNS['obsidian-gold'];

                          return (
                            <div
                              className="w-full h-full flex flex-col justify-between p-2.5 text-white"
                              style={{ background: design.gradient }}
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
                                  className="w-8 h-8 flex items-center justify-center bg-surface border border-line rounded-lg text-ink hover:bg-line transition-colors"
                                  aria-label="Disminuir cantidad"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center text-sm font-bold text-ink">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.stock}
                                  className="w-8 h-8 flex items-center justify-center bg-surface border border-line rounded-lg text-ink hover:bg-line transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  aria-label="Aumentar cantidad"
                                >
                                  +
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

              {/* Trust Badges */}
              <div className={`${adminCard} space-y-4`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Envíos asegurados</h3>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-warning/10 text-warning-strong border border-warning/20 rounded text-[11px] font-bold">ZOOM</span>
                    <span className="px-2 py-0.5 bg-deal-bg text-deal border border-deal/20 rounded text-[11px] font-bold">MRW</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-xs text-ink-soft">
                    <div className="w-7 h-7 bg-brand-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FiTruck className="w-3.5 h-3.5 text-brand-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink">Despacho nacional garantizado</p>
                      <p className="text-muted">Envíos rápidos y seguros a nivel nacional por ZOOM y MRW.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-xs text-ink-soft">
                    <div className="w-7 h-7 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FiShield className="w-3.5 h-3.5 text-success-strong" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink">Protección del comprador</p>
                      <p className="text-muted">Tu compra viaja 100% asegurada y embalada con materiales de alta resistencia.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
