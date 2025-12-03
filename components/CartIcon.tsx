'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { useConfirm } from '@/contexts/ConfirmDialogContext';

export default function CartIcon() {
  const { items, getTotalItems, getTotalPrice, removeItem, updateQuantity, clearCart } = useCart();
  const { confirm } = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalItems = getTotalItems();
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Cart Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#6a6c6b] hover:text-[#2a63cd] transition-all duration-300 group hover:scale-110"
      >
        <svg className="w-6 h-6 transition-transform duration-300 group-hover:rotate-[-5deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg shadow-[#2a63cd]/30 animate-pulse">
            {totalItems}
          </span>
        )}
        <span className="absolute inset-0 rounded-lg bg-[#2a63cd]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-[#e9ecef] z-50">
          {items.length === 0 ? (
            <div className="p-6 text-center">
              <svg className="w-16 h-16 text-[#e9ecef] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-[#6a6c6b] text-sm mb-3">Tu carrito está vacío</p>
              <Link
                href="/productos"
                onClick={() => setIsOpen(false)}
                className="inline-block px-4 py-2 bg-[#2a63cd] text-white text-sm font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all"
              >
                Ver Productos
              </Link>
            </div>
          ) : (
            <>
              {/* Header with Clear Button */}
              <div className="px-4 py-3 border-b border-[#e9ecef] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#212529]">
                  Carrito de Compras ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                </h3>
                <button
                  onClick={handleClearCart}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                  title="Limpiar carrito"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Limpiar</span>
                </button>
              </div>

              {/* Items */}
              <div className="max-h-96 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="p-4 border-b border-[#e9ecef] hover:bg-[#f8f9fa] transition-colors">
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded flex-shrink-0 relative overflow-hidden">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-[#212529] line-clamp-1 mb-1">
                          {item.name}
                        </h4>
                        <p className="text-sm font-semibold text-[#2a63cd] mb-2">
                          {formatPrice(item.price)}
                        </p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center border border-[#e9ecef] rounded hover:bg-white transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="text-xs font-medium text-[#212529] w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            className="w-6 h-6 flex items-center justify-center border border-[#e9ecef] rounded hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="ml-auto text-red-600 hover:text-red-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#e9ecef] bg-[#f8f9fa]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[#212529]">Total:</span>
                  <span className="text-lg font-bold text-[#2a63cd]">{formatPrice(totalPrice)}</span>
                </div>
                <Link
                  href="/carrito"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2a63cd] text-white text-sm font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-md mb-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Ver Carrito Completo
                </Link>
                <Link
                  href="/productos"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-[#2a63cd] text-sm font-medium border border-[#e9ecef] rounded-lg hover:bg-[#f8f9fa] transition-all"
                >
                  Seguir Comprando
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
