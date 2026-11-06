'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartSafe } from '@/contexts/CartContext';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { formatUSD } from '@/lib/currency';
import { getGiftCardDesign } from '@/lib/gift-card-designs';
import { IconoCarrito, IconoEliminar, IconoMas, IconoMenos, IconoPaquete } from '@/components/iconos';

export default function CartIcon() {
  const { items, totalItems, getTotalPrice, removeItem, updateQuantity, clearCart } = useCartSafe();
  const { confirm } = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalPrice = getTotalPrice();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleClearCart = async () => {
    const confirmed = await confirm({
      title: '¿Limpiar carrito?',
      message: '¿Estás seguro de que deseas eliminar todos los productos del carrito?',
      confirmText: 'Sí, limpiar',
      cancelText: 'Cancelar',
      type: 'warning',
    });

    if (confirmed) {
      clearCart();
    }
  };

  // Badge styles as a complete inline style object - immune to CSS overrides
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Cart Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-brand-50 rounded-lg transition-all duration-300"
        style={{ overflow: 'visible' }}
      >
        <IconoCarrito style={{ width: '20px', height: '20px', transition: 'transform 0.3s' }} />

        {/* Contador igual al de la barra inferior y la campana (revisión R12: tenía estilos en línea con hex y letra de 9 px, y cortaba en "9+") */}
        {totalItems > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-deal px-1 text-[11px] font-semibold leading-none text-white"
            aria-hidden="true"
          >
            {totalItems > 99 ? '99+' : totalItems}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div 
            className="fixed left-0 right-0 bottom-0 top-14 bg-black/40 z-[var(--z-header)] lg:hidden animate-fade-in" 
            aria-hidden="true" 
            onClick={() => setIsOpen(false)}
          />

          <div
            className="cart-dropdown bg-white z-[var(--z-dropdown)]
              fixed lg:absolute
              top-20 lg:top-full
              left-4 right-4 lg:left-auto lg:right-0
              lg:mt-2
              w-auto lg:w-[360px]
              max-h-[calc(100dvh-6rem-var(--bottom-nav-h)-env(safe-area-inset-bottom))] lg:max-h-[calc(100dvh-7.5rem)]
              rounded-2xl lg:rounded-xl
              shadow-2xl lg:shadow-lg
              border border-line
              overflow-hidden
              flex flex-col
              animate-mobileDropdownIn lg:animate-none"
          >
            {items.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <IconoCarrito className="w-16 h-16 text-line mx-auto mb-4" />
                <p className="text-muted text-sm mb-4">Tu carrito está vacío</p>
                <Link
                  href="/productos"
                  onClick={() => setIsOpen(false)}
                  className="inline-block px-5 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-all shadow-md"
                >
                  Explorar Productos
                </Link>
              </div>
          ) : (
            <>
              {/* Header with Clear Button */}
              <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">
                  Carrito de Compras ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                </h3>
                <button
                  onClick={handleClearCart}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-deal hover:text-deal/80 hover:bg-deal-bg rounded transition-colors"
                  title="Limpiar carrito"
                >
                  <IconoEliminar className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              </div>

              {/* Items */}
              <div className="min-h-0 flex-1 overflow-y-auto lg:max-h-96">
                {items.map((item) => (
                  <div key={item.id} className="p-4 border-b border-line hover:bg-surface transition-colors">
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="w-16 h-16 bg-surface border border-line rounded flex-shrink-0 relative overflow-hidden">
                        {(() => {
                          // Check if it's a Gift Card with design info
                          const isGiftCard = item.id.startsWith('gift-card-');

                          if (isGiftCard) {
                            // Diseño desde el id (gift-card-{diseño}-{fecha}) con el mapa compartido, que entiende los nombres viejos (revisión R12)
                            const design = getGiftCardDesign(item.id.replace(/^gift-card-/, '').replace(/-\d+$/, ''));

                            // Epic compact Gift Card thumbnail
                            return (
                              <div
                                className="absolute inset-0 overflow-hidden rounded"
                                style={{ background: design.background }}
                              >
                                {/* Shimmer */}
                                <div
                                  className="absolute inset-0"
                                  style={{
                                    background: `linear-gradient(105deg, transparent 40%, ${design.accent}30 50%, transparent 60%)`,
                                  }}
                                />

                                {/* Content */}
                                <div className="relative w-full h-full p-1.5 flex flex-col justify-between">
                                  {/* Chip */}
                                  <div
                                    className="w-5 h-3.5 rounded-sm"
                                    style={{
                                      background: `linear-gradient(145deg, ${design.accent}, ${design.accent}dd)`,
                                    }}
                                  />

                                  {/* GIFT text */}
                                  <div
                                    className="text-center rounded-sm py-0.5"
                                    style={{ background: `${design.accent}25` }}
                                  >
                                    <span
                                      className="text-[11px] font-bold tracking-wider"
                                      style={{ color: design.accent }}
                                    >
                                      GIFT
                                    </span>
                                  </div>
                                </div>

                                {/* Bottom bar */}
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-[3px]"
                                  style={{ background: design.accent }}
                                />
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
                            } catch {
                              // If parse fails, try simple cleanup if it looks like a stringified array
                              if (imageUrl && imageUrl.startsWith('["') && imageUrl.endsWith('"]')) {
                                imageUrl = imageUrl.slice(2, -2);
                              }
                            }
                          }

                          // Ensure relative paths start with /
                          if (imageUrl && typeof imageUrl === 'string' && !imageUrl.startsWith('http') && !imageUrl.startsWith('/') && !imageUrl.startsWith('gift-card-design:')) {
                            imageUrl = `/${imageUrl}`;
                          }

                          return imageUrl && !imageUrl.startsWith('gift-card-design:') ? (
                            <Image
                              src={imageUrl}
                              alt={item.name}
                              fill
                              sizes="64px"
                              unoptimized={!imageUrl.startsWith('/')}
                              className="object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <IconoPaquete className="w-8 h-8 text-subtle" />
                            </div>
                          );
                        })()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-ink line-clamp-1 mb-1">
                          {item.name}
                        </h4>
                        <p className="text-sm font-semibold text-brand-500 mb-2">
                          {formatUSD(item.price)}
                        </p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center border border-line rounded hover:bg-white transition-colors"
                          >
                            <IconoMenos className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-medium text-ink w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            className="w-6 h-6 flex items-center justify-center border border-line rounded hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <IconoMas className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="ml-auto text-deal hover:text-deal/80 transition-colors"
                          >
                            <IconoEliminar className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-line bg-surface">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-ink">Total:</span>
                  <span className="text-lg font-bold text-brand-500">{formatUSD(totalPrice)}</span>
                </div>
                <Link
                  href="/carrito"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-all shadow-md mb-2"
                >
                  <IconoCarrito className="w-4 h-4" />
                  Ver Carrito Completo
                </Link>
                <Link
                  href="/productos"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-brand-500 text-sm font-medium border border-line rounded-lg hover:bg-surface transition-all"
                >
                  Seguir Comprando
                </Link>
              </div>
            </>
          )}
        </div>
        </>
      )}
    </div>
  );
}
