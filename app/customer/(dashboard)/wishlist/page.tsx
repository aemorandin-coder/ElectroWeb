'use client';

import { useState, useEffect } from 'react';
import { FiHeart, FiShoppingCart, FiTrash2, FiPackage } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  imageUrl?: string;
  inStock: boolean;
  createdAt: string;
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const response = await fetch('/api/customer/wishlist');
      if (response.ok) {
        const data = await response.json();
        setWishlist(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (id: string) => {
    try {
      const response = await fetch(`/api/customer/wishlist?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setWishlist(wishlist.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2a63cd]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <FiHeart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Lista de Deseos</h1>
            <p className="text-sm text-blue-100">{wishlist.length} productos guardados</p>
          </div>
        </div>
      </div>

      {/* Wishlist Grid */}
      {wishlist.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-[#e9ecef] shadow-sm hover:shadow-md transition-all overflow-hidden group"
            >
              <div className="relative aspect-square bg-[#f8f9fa]">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FiPackage className="w-12 h-12 text-[#6a6c6b]" />
                  </div>
                )}
                <button
                  onClick={() => removeFromWishlist(item.id)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-md hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
                {!item.inStock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-lg">
                      Agotado
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[#212529] mb-2 line-clamp-2">
                  {item.productName}
                </h3>
                <p className="text-xl font-bold text-[#2a63cd] mb-3">
                  ${item.price.toFixed(2)}
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/product/${item.productId}`}
                    className="flex-1 px-3 py-2 bg-[#f8f9fa] text-[#212529] text-sm font-semibold rounded-lg hover:bg-[#e9ecef] transition-all text-center"
                  >
                    Ver
                  </Link>
                  <button
                    disabled={!item.inStock}
                    className="flex-1 px-3 py-2 bg-[#2a63cd] text-white text-sm font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FiShoppingCart className="w-4 h-4" />
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e9ecef] shadow-sm p-12 text-center">
          <FiHeart className="w-16 h-16 text-[#6a6c6b] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#212529] mb-2">
            Tu lista de deseos está vacía
          </h3>
          <p className="text-[#6a6c6b] mb-6">
            Guarda tus productos favoritos para encontrarlos fácilmente
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2a63cd] text-white font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-md"
          >
            Explorar Productos
          </Link>
        </div>
      )}
    </div>
  );
}
