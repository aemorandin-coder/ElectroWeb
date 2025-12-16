'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import PublicHeader from '@/components/public/PublicHeader';
import { toast } from 'react-hot-toast';

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


export default function CarritoPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, getTotalPrice } = useCart();
  const { confirm } = useConfirm();
  const [removing, setRemoving] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  const handleRemoveItem = async (id: string) => {
    setRemoving(id);
    setTimeout(() => {
      removeItem(id);
      setRemoving(null);
    }, 300);
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
      clearCart();
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

  const total = getTotalPrice(); // El precio ya incluye IVA
  const subtotal = total / 1.16; // Base sin IVA (desglozado)
  const tax = total - subtotal; // IVA desglozado (16% del total)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-white to-[#f8f9fa]">
      <PublicHeader />

      {/* Hero Section - Compact */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-5 left-5 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-5 right-5 w-48 h-48 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Epic Breadcrumb with Glassmorphism */}
          <nav className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
            {/* Home */}
            <Link
              href="/"
              className="group flex items-center gap-1.5 px-3 py-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 hover:bg-white/20 transition-all hover:scale-105 shadow-lg flex-shrink-0"
            >
              <svg className="w-4 h-4 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-sm font-semibold text-white">Inicio</span>
            </Link>

            {/* Separator */}
            <svg className="w-4 h-4 text-white/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            {/* Current Page - Carrito */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 backdrop-blur-md rounded-lg border border-white/30 shadow-xl flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm font-bold text-white">Carrito de Compras</span>
              {items.length > 0 && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white font-medium">
                  {items.length}
                </span>
              )}
            </div>
          </nav>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {items.length === 0 ? (
          /* Empty Cart State */
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 p-16 text-center shadow-2xl"
            style={{
              animation: 'fadeInUp 0.6s ease-out both',
            }}
          >
            <div className="max-w-3xl mx-auto">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#212529] mb-3">
                Tu carrito está vacío
              </h2>
              <p className="text-[#6a6c6b] mb-8">
                Explora nuestros productos y añade tus favoritos al carrito
              </p>
              <Link
                href="/productos"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:shadow-2xl transition-all hover:scale-105 shadow-xl"
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
              {/* Clear Cart Button */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#212529]">
                  Productos ({items.length})
                </h2>
                <button
                  onClick={handleClearCart}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Vaciar Carrito
                </button>
              </div>

              {/* Cart Items List */}
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`relative bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all duration-300 ${removing === item.id ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    }`}
                  style={{
                    perspective: '1000px',
                    animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                  }}
                >
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2a63cd]/10 via-purple-500/10 to-pink-500/10 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"></div>

                  <div className="p-6">
                    <div className="flex gap-6">
                      {/* Product Image */}
                      <div className="relative w-32 h-32 flex-shrink-0 bg-gradient-to-br from-[#f8f9fa] to-gray-100 rounded-xl overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-10"></div>
                        {(() => {
                          // Check if it's a Gift Card
                          const isGiftCard = item.id.startsWith('gift-card-') || item.name.toLowerCase().includes('gift card');
                          // Check if it's a Wallet Recharge
                          const isWalletRecharge = item.id.startsWith('wallet-recharge-') || item.name.toLowerCase().includes('recarga de saldo');

                          if (isGiftCard) {
                            // Extract design ID from item ID (format: gift-card-{designId}-{timestamp})
                            const idParts = item.id.split('-');
                            const designId = idParts.length >= 3 ? idParts.slice(2, -1).join('-') : 'aurora-neon';
                            const design = GIFT_CARD_DESIGNS[designId] || GIFT_CARD_DESIGNS['aurora-neon'];

                            // Epic Gift Card Mini Card Design
                            return (
                              <div
                                className="absolute inset-0 overflow-hidden rounded-xl"
                                style={{ background: design.gradient }}
                              >
                                {/* Holographic shimmer effect */}
                                <div
                                  className="absolute inset-0"
                                  style={{
                                    background: `linear-gradient(105deg, transparent 40%, ${design.accent}25 45%, ${design.accent}40 50%, ${design.accent}25 55%, transparent 60%)`,
                                    animation: 'shimmer 2s ease-in-out infinite',
                                  }}
                                />

                                {/* Content layout */}
                                <div className="relative w-full h-full p-2 flex flex-col justify-between">
                                  {/* Top row - Logo */}
                                  <div className="flex items-center gap-1">
                                    <div
                                      className="w-5 h-5 rounded flex items-center justify-center"
                                      style={{ background: `${design.accent}30` }}
                                    >
                                      <span className="text-[8px] font-black text-white">ES</span>
                                    </div>
                                    <span className="text-[7px] font-bold text-white/80 tracking-tight">ELECTRO</span>
                                  </div>

                                  {/* Center - Chip */}
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-8 h-6 rounded"
                                      style={{
                                        background: `linear-gradient(145deg, ${design.accent} 0%, ${design.accent}cc 50%, ${design.accent} 100%)`,
                                        boxShadow: `0 2px 4px ${design.accent}50`
                                      }}
                                    >
                                      <div className="w-full h-full grid grid-cols-3 gap-[1px] p-[3px]">
                                        {[...Array(6)].map((_, i) => (
                                          <div key={i} className="bg-black/20 rounded-[1px]" />
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Bottom - GIFT CARD text */}
                                  <div
                                    className="text-center py-1 rounded"
                                    style={{ background: `${design.accent}20` }}
                                  >
                                    <span
                                      className="text-[10px] font-black tracking-widest"
                                      style={{
                                        color: design.accent,
                                        textShadow: `0 0 10px ${design.accent}80`
                                      }}
                                    >
                                      GIFT CARD
                                    </span>
                                  </div>
                                </div>

                                {/* Premium accent bar */}
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-1"
                                  style={{
                                    background: `linear-gradient(90deg, ${design.accent}, ${design.accent}cc, ${design.accent})`,
                                  }}
                                />
                              </div>
                            );
                          }

                          if (isWalletRecharge) {
                            // Show wallet recharge design
                            return (
                              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                                <div className="text-center text-white">
                                  <svg className="w-12 h-12 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                  </svg>
                                  <span className="text-xs font-bold">RECARGA</span>
                                </div>
                              </div>
                            );
                          }

                          let imageUrl: string | undefined = item.imageUrl;

                          // Handle JSON string arrays
                          if (typeof imageUrl === 'string' && (imageUrl.startsWith('[') || imageUrl.includes('","'))) {
                            try {
                              const parsed = JSON.parse(imageUrl);
                              if (Array.isArray(parsed) && parsed.length > 0) {
                                imageUrl = parsed[0];
                              }
                            } catch (e) {
                              if (imageUrl && imageUrl.startsWith('["') && imageUrl.endsWith('"]')) {
                                imageUrl = imageUrl.slice(2, -2);
                              }
                            }
                          }

                          // Ensure relative paths start with /
                          if (imageUrl && typeof imageUrl === 'string' && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
                            imageUrl = `/${imageUrl}`;
                          }

                          return imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 flex flex-col">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-[#212529] mb-2 line-clamp-2">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs font-bold text-[#212529] opacity-60">USD</span>
                              <span className="text-2xl font-black text-[#212529]">
                                {Number(item.price).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                            <span className="text-sm text-[#6a6c6b]">
                              c/u
                            </span>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <label className="text-sm font-semibold text-[#212529]">Cantidad:</label>
                            {(() => {
                              // Check if it's a Gift Card
                              const isGiftCard = item.id.startsWith('gift-card-') || item.name.toLowerCase().includes('gift card');

                              if (isGiftCard) {
                                // Gift Cards are locked to quantity 1
                                return (
                                  <div className="flex items-center gap-3">
                                    <button
                                      disabled
                                      className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-300 rounded-xl cursor-not-allowed"
                                      title="Las Gift Cards solo permiten cantidad 1"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                                      </svg>
                                    </button>
                                    <div className="w-16 text-center">
                                      <span className="text-xl font-bold text-[#212529]">1</span>
                                    </div>
                                    <button
                                      disabled
                                      className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-300 rounded-xl cursor-not-allowed"
                                      title="Las Gift Cards solo permiten cantidad 1"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                      </svg>
                                    </button>
                                    <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                      </svg>
                                      Cantidad fija
                                    </span>
                                  </div>
                                );
                              }

                              // Normal products - regular quantity controls
                              return (
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl hover:from-[#2a63cd] hover:to-[#1e4ba3] hover:text-white transition-all shadow-md hover:shadow-lg hover:scale-105"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                                    </svg>
                                  </button>
                                  <span className="w-16 text-center text-xl font-bold text-[#212529]">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    disabled={item.quantity >= item.stock}
                                    className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl hover:from-[#2a63cd] hover:to-[#1e4ba3] hover:text-white transition-all shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                    </svg>
                                  </button>
                                  {item.quantity >= item.stock && (
                                    <span className="text-xs text-orange-600 font-semibold">
                                      Stock máximo
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-semibold"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Eliminar
                          </button>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[#6a6c6b]">Subtotal:</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs font-bold text-[#212529] opacity-60">USD</span>
                              <span className="text-xl font-black text-[#212529]">
                                {Number(item.price * item.quantity).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
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
              <div className="sticky top-24 space-y-6">
                {/* Summary Card */}
                <div
                  className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 p-8 shadow-2xl"
                  style={{
                    animation: 'fadeInUp 0.6s ease-out 0.2s both',
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#212529] mb-6">
                    Resumen del Pedido
                  </h2>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[#6a6c6b]">Subtotal:</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-[#212529] opacity-60">USD</span>
                        <span className="text-lg font-bold text-[#212529]">
                          {Number(subtotal).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#6a6c6b]">IVA (16%):</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-[#212529] opacity-60">USD</span>
                        <span className="text-lg font-bold text-[#212529]">
                          {Number(tax).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-[#212529]">Total:</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-[#212529] opacity-60">USD</span>
                          <span className="text-3xl font-black text-[#212529]">
                            {Number(total).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-lg font-bold rounded-2xl hover:shadow-2xl transition-all hover:scale-[1.02] shadow-xl mb-4 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isCheckingOut ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Proceder al Pago
                      </>
                    )}
                  </button>

                  <Link
                    href="/productos"
                    className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-[#2a63cd] font-bold border-2 border-[#2a63cd] rounded-2xl hover:bg-[#f8f9fa] transition-all shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Seguir Comprando
                  </Link>
                </div>

                {/* Trust Badges */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-[#212529] mb-4">Compra Segura</h3>
                  <div className="space-y-3">
                    {[
                      { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>, text: 'Pago Seguro SSL' },
                      { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>, text: 'Garantía Oficial' },
                      { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, text: 'Envío Rápido' },
                    ].map((badge, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm text-[#6a6c6b]">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                          {badge.icon}
                        </div>
                        <span>{badge.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
        }
      </main >

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div >
  );
}
