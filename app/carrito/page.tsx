'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import PublicHeader from '@/components/public/PublicHeader';
import { toast } from 'react-hot-toast';
import { HiShieldCheck, HiLightningBolt, HiBadgeCheck, HiTrash } from 'react-icons/hi';
import { FiTruck, FiShield, FiZap } from 'react-icons/fi';

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

  const formatPriceUSD = (price: number) => {
    return Number(price).toFixed(2).replace('.', ',');
  };

  const formatPriceVES = (priceUSD: number) => {
    if (!settings?.exchangeRateVES) return null;
    const priceVES = priceUSD * settings.exchangeRateVES;
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(priceVES);
  };

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
      // Animate all items out before clearing
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
      const response = await fetch('/api/cart/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.id, quantity: i.quantity }))
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al reservar stock');
      }

      toast.success('Stock reservado por 15 minutos');
      router.push('/checkout');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'No se pudo iniciar el checkout');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const total = getTotalPrice();
  const subtotal = total / 1.16;
  const tax = total - subtotal;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <PublicHeader />

      {/* Hero Section - Premium Compact */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-5 left-5 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-5 right-10 w-56 h-56 bg-blue-300/10 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-cyan-300/10 rounded-full blur-2xl animate-pulse" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-4 animate-fadeIn">
            <Link
              href="/"
              className="group flex items-center gap-1.5 px-3 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-lg"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-sm font-semibold text-white">Inicio</span>
            </Link>

            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-xl">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm font-bold text-white">Carrito de Compras</span>
              {items.length > 0 && (
                <span className="px-2.5 py-1 bg-white text-[#2a63cd] rounded-full text-xs font-black animate-bounce-subtle">
                  {items.length}
                </span>
              )}
            </div>
          </nav>

          {/* Title */}
          <div className="animate-slideUp">
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
              Tu Carrito
            </h1>
            <p className="text-blue-100 text-sm">
              {items.length === 0 ? 'Está vacío' : `${items.length} producto${items.length > 1 ? 's' : ''} listo${items.length > 1 ? 's' : ''} para checkout`}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {items.length === 0 ? (
          /* Empty Cart State - Epic */
          <div
            className="relative bg-white rounded-3xl border border-slate-200 p-12 md:p-16 text-center shadow-xl animate-fadeIn"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 rounded-3xl" />
            <div className="relative px-6 md:px-12">
              <div className="w-28 h-28 md:w-32 md:h-32 mx-auto mb-6 md:mb-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center shadow-inner animate-pulse-slow">
                <svg className="w-14 h-14 md:w-16 md:h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
                Tu carrito está vacío
              </h2>
              <p className="text-base md:text-lg text-slate-500 mb-8">
                Explora nuestros productos y añade tus favoritos al carrito
              </p>
              <Link
                href="/productos"
                className="inline-flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Ver Productos
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Header */}
              <div className="flex justify-between items-center mb-6 animate-fadeIn">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-8 h-8 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </span>
                  Productos ({items.length})
                </h2>
                <button
                  onClick={handleClearCart}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 font-medium text-sm group hover:scale-105 active:scale-95"
                >
                  <HiTrash className={`w-4 h-4 transition-transform ${isClearing ? 'animate-shake' : 'group-hover:rotate-12'}`} />
                  <span className={isClearing ? 'animate-pulse' : ''}>Vaciar</span>
                </button>
              </div>

              {/* Items List */}
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`group relative bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-500 hover:shadow-xl hover:border-[#2a63cd]/30 ${removing === item.id
                    ? 'animate-removeItem'
                    : isClearing
                      ? 'animate-clearItem'
                      : ''
                    }`}
                  style={
                    removing !== item.id && !isClearing
                      ? {
                        animationName: 'slideInLeft',
                        animationDuration: '0.5s',
                        animationTimingFunction: 'ease-out',
                        animationDelay: `${index * 0.1}s`,
                        animationFillMode: 'both',
                      }
                      : isClearing
                        ? { animationDelay: `${index * 0.05}s` }
                        : undefined
                  }
                >
                  {/* Hover Glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#2a63cd]/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative p-5">
                    <div className="flex gap-5">
                      {/* Product Image */}
                      <div className="relative w-28 h-28 flex-shrink-0 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl overflow-hidden group/img">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover/img:translate-x-full transition-transform duration-1000 z-10" />
                        {(() => {
                          const isGiftCard = item.id.startsWith('gift-card-') || item.name.toLowerCase().includes('gift card');
                          const isWalletRecharge = item.id.startsWith('wallet-recharge-') || item.name.toLowerCase().includes('recarga de saldo');

                          if (isGiftCard) {
                            const idParts = item.id.split('-');
                            const designId = idParts.length >= 3 ? idParts.slice(2, -1).join('-') : 'aurora-neon';
                            const design = GIFT_CARD_DESIGNS[designId] || GIFT_CARD_DESIGNS['aurora-neon'];

                            return (
                              <div className="absolute inset-0 overflow-hidden rounded-xl" style={{ background: design.gradient }}>
                                <div className="absolute inset-0" style={{
                                  background: `linear-gradient(105deg, transparent 40%, ${design.accent}25 45%, ${design.accent}40 50%, ${design.accent}25 55%, transparent 60%)`,
                                  animation: 'shimmer 2s ease-in-out infinite',
                                }} />
                                <div className="relative w-full h-full p-2 flex flex-col justify-between">
                                  <div className="flex items-center gap-1">
                                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `${design.accent}30` }}>
                                      <span className="text-[8px] font-black text-white">ES</span>
                                    </div>
                                  </div>
                                  <div className="text-center py-1 rounded" style={{ background: `${design.accent}20` }}>
                                    <span className="text-[10px] font-black tracking-widest" style={{ color: design.accent, textShadow: `0 0 10px ${design.accent}80` }}>
                                      GIFT CARD
                                    </span>
                                  </div>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${design.accent}, ${design.accent}cc, ${design.accent})` }} />
                              </div>
                            );
                          }

                          if (isWalletRecharge) {
                            return (
                              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                <div className="text-center text-white">
                                  <svg className="w-10 h-10 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                  </svg>
                                  <span className="text-xs font-bold">RECARGA</span>
                                </div>
                              </div>
                            );
                          }

                          let imageUrl: string | undefined = item.imageUrl;
                          if (typeof imageUrl === 'string' && (imageUrl.startsWith('[') || imageUrl.includes('","'))) {
                            try {
                              const parsed = JSON.parse(imageUrl);
                              if (Array.isArray(parsed) && parsed.length > 0) imageUrl = parsed[0];
                            } catch (e) {
                              if (imageUrl?.startsWith('["') && imageUrl.endsWith('"]')) imageUrl = imageUrl.slice(2, -2);
                            }
                          }
                          if (imageUrl && typeof imageUrl === 'string' && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) imageUrl = `/${imageUrl}`;

                          return imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700"
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/no-image.png'; }}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-[#2a63cd] transition-colors">
                            {item.name}
                          </h3>
                          {/* Price Display - USD + Bs. */}
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-bold text-slate-400">USD</span>
                              <span className="text-2xl font-black text-slate-800">
                                {formatPriceUSD(item.price)}
                              </span>
                              <span className="text-xs text-slate-400">c/u</span>
                            </div>
                            {settings?.exchangeRateVES && (
                              <div className="flex items-baseline gap-1.5 animate-fadeIn">
                                <span className="text-[10px] font-bold text-[#2a63cd]">Bs.</span>
                                <span className="text-sm font-bold text-[#2a63cd]">
                                  {formatPriceVES(item.price)}
                                </span>
                                <span className="text-[10px] text-slate-400">ref.</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const isGiftCard = item.id.startsWith('gift-card-') || item.name.toLowerCase().includes('gift card');

                              if (isGiftCard) {
                                return (
                                  <div className="flex items-center gap-2">
                                    <div className="px-4 py-2 bg-slate-100 rounded-xl">
                                      <span className="text-lg font-bold text-slate-800">1</span>
                                    </div>
                                    <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                      </svg>
                                      Fija
                                    </span>
                                  </div>
                                );
                              }

                              return (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-xl hover:bg-[#2a63cd] hover:text-white transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                                    </svg>
                                  </button>
                                  <span className="w-12 text-center text-lg font-bold text-slate-800">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    disabled={item.quantity >= item.stock}
                                    className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-xl hover:bg-[#2a63cd] hover:text-white transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100 disabled:hover:text-slate-800"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                    </svg>
                                  </button>
                                  {item.quantity >= item.stock && (
                                    <span className="text-[10px] text-amber-600 font-medium">Máx</span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Subtotal + Remove */}
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="flex items-baseline gap-1 justify-end">
                                <span className="text-xs font-bold text-slate-400">USD</span>
                                <span className="text-lg font-black text-slate-800">
                                  {formatPriceUSD(item.price * item.quantity)}
                                </span>
                              </div>
                              {settings?.exchangeRateVES && (
                                <div className="flex items-baseline gap-1 justify-end">
                                  <span className="text-[10px] font-bold text-[#2a63cd]">Bs.</span>
                                  <span className="text-xs font-bold text-[#2a63cd]">
                                    {formatPriceVES(item.price * item.quantity)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-300 hover:scale-110"
                              title="Eliminar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary - Sticky */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-5">
                {/* Summary Card */}
                <div className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl animate-slideUp">
                  {/* Premium Header */}
                  <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] px-6 py-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Resumen
                    </h2>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">Subtotal:</span>
                      <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-xs text-slate-400">USD</span>
                          <span className="text-base font-bold text-slate-700">{formatPriceUSD(subtotal)}</span>
                        </div>
                        {settings?.exchangeRateVES && (
                          <div className="text-xs text-[#2a63cd] font-medium">
                            Bs. {formatPriceVES(subtotal)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tax */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">IVA (16%):</span>
                      <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-xs text-slate-400">USD</span>
                          <span className="text-base font-bold text-slate-700">{formatPriceUSD(tax)}</span>
                        </div>
                        {settings?.exchangeRateVES && (
                          <div className="text-xs text-[#2a63cd] font-medium">
                            Bs. {formatPriceVES(tax)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total */}
                    <div className="pt-4 border-t-2 border-dashed border-slate-200">
                      <div className="flex justify-between items-start">
                        <span className="text-lg font-bold text-slate-800">Total:</span>
                        <div className="text-right">
                          <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-sm font-bold text-slate-400">USD</span>
                            <span className="text-3xl font-black text-slate-800">{formatPriceUSD(total)}</span>
                          </div>
                          {settings?.exchangeRateVES && (
                            <div className="mt-1 px-3 py-1 bg-[#2a63cd]/10 rounded-lg inline-block">
                              <span className="text-sm font-bold text-[#2a63cd]">
                                Bs. {formatPriceVES(total)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Exchange Rate Note */}
                    {settings?.exchangeRateVES && (
                      <div className="text-[10px] text-slate-400 text-center pt-2">
                        Tasa de cambio: 1 USD = Bs. {settings.exchangeRateVES.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Checkout Button */}
                  <div className="px-6 pb-6 space-y-3">
                    <button
                      onClick={handleCheckout}
                      disabled={isCheckingOut}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-base font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 group"
                    >
                      {isCheckingOut ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Procesando...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Proceder al Pago
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>

                    <Link
                      href="/productos"
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all duration-300 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Seguir Comprando
                    </Link>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-lg animate-slideUp" style={{ animationDelay: '0.1s' }}>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Compra Segura</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-600 group hover:text-[#2a63cd] transition-colors">
                      <div className="w-8 h-8 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FiShield className="w-4 h-4 text-[#2a63cd]" />
                      </div>
                      <span className="font-medium">Pago Seguro SSL</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 group hover:text-[#2a63cd] transition-colors">
                      <div className="w-8 h-8 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <HiBadgeCheck className="w-4 h-4 text-[#2a63cd]" />
                      </div>
                      <span className="font-medium">Garantía Oficial</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 group hover:text-[#2a63cd] transition-colors">
                      <div className="w-8 h-8 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FiTruck className="w-4 h-4 text-[#2a63cd]" />
                      </div>
                      <span className="font-medium">Envío Rápido</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} {settings?.companyName || 'Electro Shop Morandin C.A.'} - Todos los derechos reservados
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-5deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          10% { transform: translateX(-2px) rotate(-5deg); }
          20% { transform: translateX(2px) rotate(5deg); }
          30% { transform: translateX(-2px) rotate(-5deg); }
          40% { transform: translateX(2px) rotate(5deg); }
          50% { transform: translateX(-1px) rotate(-3deg); }
          60% { transform: translateX(1px) rotate(3deg); }
          70% { transform: translateX(-1px) rotate(-1deg); }
          80% { transform: translateX(1px) rotate(1deg); }
          90% { transform: translateX(0) rotate(0); }
        }
        @keyframes removeItem {
          0% { opacity: 1; transform: translateX(0) scale(1); }
          50% { opacity: 0.5; transform: translateX(-20px) scale(0.98); }
          100% { opacity: 0; transform: translateX(-100px) scale(0.9); }
        }
        @keyframes clearItem {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-30px) scale(0.8); }
        }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.6s ease-out forwards; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-removeItem { animation: removeItem 0.4s ease-out forwards; }
        .animate-clearItem { animation: clearItem 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}
