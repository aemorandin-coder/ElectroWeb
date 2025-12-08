'use client';

import { useState, useEffect } from 'react';
import { FiShoppingCart, FiTrash2, FiPackage, FiExternalLink, FiSearch, FiGrid, FiList, FiFilter, FiTrendingUp, FiClock, FiDollarSign, FiPercent, FiX, FiCheck, FiSend, FiGift } from 'react-icons/fi';
import { PiListHeartBold, PiHeartBreakBold, PiSparkle } from 'react-icons/pi';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';

interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  imageUrl?: string;
  inStock: boolean;
  createdAt: string;
}

interface DiscountRequest {
  id: string;
  productId: string;
  productName: string;
  originalPrice: number;
  requestedDiscount: number;
  approvedDiscount?: number;
  status: string;
  expiresAt?: string;
  createdAt: string;
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [discountRequests, setDiscountRequests] = useState<DiscountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'price-asc' | 'price-desc' | 'name'>('recent');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { addItem } = useCart();

  // Discount request modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const [discountPercent, setDiscountPercent] = useState(3);
  const [discountMessage, setDiscountMessage] = useState('');
  const [requestingDiscount, setRequestingDiscount] = useState(false);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  useEffect(() => {
    const bannerDismissed = localStorage.getItem('wishlist-info-dismissed');
    if (bannerDismissed === 'true') {
      setShowInfoBanner(false);
    }
  }, []);

  const dismissInfoBanner = () => {
    setShowInfoBanner(false);
    localStorage.setItem('wishlist-info-dismissed', 'true');
  };

  useEffect(() => {
    fetchWishlist();
    fetchDiscountRequests();
  }, []);

  const fetchWishlist = async () => {
    try {
      const response = await fetch('/api/customer/wishlist');
      if (response.ok) {
        const data = await response.json();
        // Map products to WishlistItem format
        const items: WishlistItem[] = (data.products || []).map((product: any) => {
          // Parse images if it's a JSON string
          let images: string[] = [];
          if (product.images) {
            if (typeof product.images === 'string') {
              try {
                images = JSON.parse(product.images);
              } catch {
                images = [];
              }
            } else if (Array.isArray(product.images)) {
              images = product.images;
            }
          }

          const imageUrl = product.mainImage || (images.length > 0 ? images[0] : undefined);

          return {
            id: product.id,
            productId: product.id,
            productName: product.name,
            price: Number(product.priceUSD),
            imageUrl: imageUrl,
            inStock: product.stock > 0,
            createdAt: product.createdAt,
          };
        });
        setWishlist(items);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscountRequests = async () => {
    try {
      const response = await fetch('/api/customer/discount-requests');
      if (response.ok) {
        const data = await response.json();
        setDiscountRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching discount requests:', error);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    setRemovingId(productId);
    try {
      const response = await fetch('/api/customer/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, action: 'remove' }),
      });
      if (response.ok) {
        setWishlist(wishlist.filter(item => item.productId !== productId));
        toast.success('Producto eliminado de favoritos');
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Error al eliminar');
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = (item: WishlistItem) => {
    if (!item.inStock) return;
    addItem({
      id: item.productId,
      name: item.productName,
      price: item.price,
      imageUrl: item.imageUrl || '',
      stock: 999, // Default max stock since we only know it's in stock
    }, 1);
    toast.success('Agregado al carrito');
  };

  const openDiscountModal = (item: WishlistItem) => {
    setSelectedItem(item);
    setDiscountPercent(3);
    setDiscountMessage('');
    setShowDiscountModal(true);
  };

  const getDiscountStatus = (productId: string) => {
    const request = discountRequests.find(r => r.productId === productId);
    if (!request) return null;

    if (request.status === 'APPROVED' && request.expiresAt) {
      const isExpired = new Date(request.expiresAt) < new Date();
      if (isExpired) return { ...request, status: 'EXPIRED' };
    }
    return request;
  };

  const handleRequestDiscount = async () => {
    if (!selectedItem) return;

    setRequestingDiscount(true);
    try {
      const response = await fetch('/api/customer/discount-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedItem.productId,
          productName: selectedItem.productName,
          originalPrice: selectedItem.price,
          requestedDiscount: discountPercent,
          customerMessage: discountMessage || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Solicitud enviada exitosamente');
        setShowDiscountModal(false);
        fetchDiscountRequests();
      } else {
        toast.error(data.error || 'Error al enviar solicitud');
      }
    } catch (error) {
      toast.error('Error de conexion');
    } finally {
      setRequestingDiscount(false);
    }
  };

  // Filter and sort logic
  const filteredAndSortedWishlist = wishlist
    .filter(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name':
          return a.productName.localeCompare(b.productName);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const totalValue = wishlist.reduce((sum, item) => sum + item.price, 0);
  const inStockCount = wishlist.filter(item => item.inStock).length;
  const pendingDiscounts = discountRequests.filter(r => r.status === 'PENDING').length;
  const approvedDiscounts = discountRequests.filter(r => r.status === 'APPROVED' && r.expiresAt && new Date(r.expiresAt) > new Date()).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#2a63cd]/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#2a63cd] animate-spin"></div>
          <PiListHeartBold className="absolute inset-0 m-auto w-6 h-6 text-[#2a63cd]" />
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string, expiresAt?: string) => {
    const now = new Date();
    if (status === 'APPROVED' && expiresAt) {
      const expires = new Date(expiresAt);
      const hoursLeft = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60)));
      if (hoursLeft <= 0) {
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full">Expirado</span>;
      }
      return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full animate-pulse">{hoursLeft}h restantes</span>;
    }
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">Pendiente</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">Rechazado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#2a63cd] rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
              <PiListHeartBold className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Lista de Deseos</h1>
              <p className="text-blue-100 flex items-center gap-2 mt-1">
                <PiSparkle className="w-4 h-4" />
                {wishlist.length} {wishlist.length === 1 ? 'producto guardado' : 'productos guardados'}
              </p>
            </div>
          </div>

          {/* Stats Pills */}
          <div className="flex flex-wrap gap-2">
            <div className="px-3 py-1.5 bg-white/15 backdrop-blur-md rounded-lg border border-white/20 flex items-center gap-2">
              <FiDollarSign className="w-3.5 h-3.5 text-blue-200" />
              <span className="text-xs font-semibold">${totalValue.toFixed(2)}</span>
            </div>
            <div className="px-3 py-1.5 bg-white/15 backdrop-blur-md rounded-lg border border-white/20 flex items-center gap-2">
              <FiTrendingUp className="w-3.5 h-3.5 text-blue-200" />
              <span className="text-xs font-semibold">{inStockCount} disponibles</span>
            </div>
            {approvedDiscounts > 0 && (
              <div className="px-3 py-1.5 bg-green-500/30 backdrop-blur-md rounded-lg border border-green-400/30 flex items-center gap-2">
                <FiGift className="w-3.5 h-3.5 text-green-200" />
                <span className="text-xs font-semibold">{approvedDiscounts} descuento{approvedDiscounts > 1 ? 's' : ''} activo{approvedDiscounts > 1 ? 's' : ''}</span>
              </div>
            )}
            {pendingDiscounts > 0 && (
              <div className="px-3 py-1.5 bg-blue-500/30 backdrop-blur-md rounded-lg border border-blue-400/30 flex items-center gap-2">
                <FiClock className="w-3.5 h-3.5 text-blue-200" />
                <span className="text-xs font-semibold">{pendingDiscounts} pendiente{pendingDiscounts > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Tooltip - Discount Feature Explanation */}
      {showInfoBanner && (
        <div className="relative bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 rounded-xl border border-blue-200/60 p-4 shadow-sm overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <FiPercent className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                <span>¡Solicita descuentos exclusivos!</span>
                <span className="px-2 py-0.5 bg-[#2a63cd] text-white text-[10px] font-bold rounded-full">NUEVO</span>
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Guarda productos aquí y solicita un descuento especial. Nuestro equipo revisará tu solicitud.
              </p>
            </div>
            <button
              onClick={dismissInfoBanner}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cerrar"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {wishlist.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e9ecef] shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full md:max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6c6b]" />
              <input
                type="text"
                placeholder="Buscar en tu lista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#f8f9fa] border border-[#e9ecef] rounded-xl text-sm focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#f8f9fa] rounded-xl p-1 border border-[#e9ecef]">
                <FiFilter className="w-4 h-4 text-[#6a6c6b] ml-2" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-sm text-[#212529] font-medium focus:outline-none pr-2 py-1.5"
                >
                  <option value="recent">Recientes</option>
                  <option value="price-asc">Menor precio</option>
                  <option value="price-desc">Mayor precio</option>
                  <option value="name">Nombre</option>
                </select>
              </div>

              <div className="flex items-center bg-[#f8f9fa] rounded-xl p-1 border border-[#e9ecef]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-[#2a63cd]' : 'text-[#6a6c6b] hover:text-[#212529]'}`}
                >
                  <FiGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-[#2a63cd]' : 'text-[#6a6c6b] hover:text-[#212529]'}`}
                >
                  <FiList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wishlist Content */}
      {filteredAndSortedWishlist.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredAndSortedWishlist.map((item, index) => {
              const discountStatus = getDiscountStatus(item.productId);
              const hasActiveDiscount = discountStatus?.status === 'APPROVED' && discountStatus.expiresAt && new Date(discountStatus.expiresAt) > new Date();

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group relative
                    ${hasActiveDiscount ? 'border-green-300 ring-1 ring-green-100' : 'border-[#e9ecef]'}
                    ${removingId === item.id ? 'animate-pulse opacity-50' : ''}
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Active discount badge */}
                  {hasActiveDiscount && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-green-600 text-white text-center py-0.5 text-[10px] font-bold z-10">
                      <FiGift className="inline w-2.5 h-2.5 mr-0.5" />
                      {discountStatus?.approvedDiscount}% OFF
                    </div>
                  )}

                  <div className={`relative aspect-square bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] ${hasActiveDiscount ? 'mt-4' : ''}`}>
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiPackage className="w-10 h-10 text-[#adb5bd]" />
                      </div>
                    )}

                    <button
                      onClick={() => removeFromWishlist(item.productId)}
                      disabled={removingId === item.productId}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>

                    {!item.inStock && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">Agotado</span>
                      </div>
                    )}

                    {/* Discount status badge */}
                    {discountStatus && discountStatus.status !== 'APPROVED' && (
                      <div className="absolute bottom-2 left-2">
                        {getStatusBadge(discountStatus.status)}
                      </div>
                    )}
                  </div>

                  <div className="p-2.5">
                    <h3 className="text-xs font-bold text-[#212529] mb-1.5 line-clamp-2 leading-tight">{item.productName}</h3>

                    <div className="flex items-center gap-1.5 mb-2">
                      {hasActiveDiscount ? (
                        <>
                          <span className="text-[10px] text-[#6a6c6b] line-through">${item.price.toFixed(2)}</span>
                          <span className="text-base font-black text-green-600">
                            ${(item.price * (1 - (discountStatus?.approvedDiscount || 0) / 100)).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-base font-black text-[#2a63cd]">${item.price.toFixed(2)}</span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5 mb-1.5">
                      <Link
                        href={`/productos/${item.productId}`}
                        className="flex-1 px-2 py-1.5 bg-[#f8f9fa] text-[#212529] text-[10px] font-semibold rounded-lg hover:bg-[#e9ecef] text-center flex items-center justify-center gap-1"
                      >
                        <FiExternalLink className="w-3 h-3" />
                        Ver
                      </Link>
                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={!item.inStock}
                        className="flex-1 px-2 py-1.5 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-[10px] font-semibold rounded-lg hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <FiShoppingCart className="w-3 h-3" />
                        Añadir
                      </button>
                    </div>

                    {/* Request discount button */}
                    {item.inStock && !discountStatus && (
                      <button
                        onClick={() => openDiscountModal(item)}
                        className="w-full px-2 py-1.5 bg-[#2a63cd]/10 text-[#2a63cd] border border-[#2a63cd]/20 text-[10px] font-semibold rounded-lg hover:bg-[#2a63cd]/20 transition-all flex items-center justify-center gap-1"
                      >
                        <FiPercent className="w-3 h-3" />
                        Pedir Descuento
                      </button>
                    )}

                    {/* Show discount status */}
                    {discountStatus && (
                      <div className="mt-1 text-center">
                        {getStatusBadge(discountStatus.status, discountStatus.expiresAt)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View - simplified */
          <div className="bg-white rounded-xl border border-[#e9ecef] overflow-hidden divide-y divide-[#e9ecef]">
            {filteredAndSortedWishlist.map((item) => {
              const discountStatus = getDiscountStatus(item.productId);
              return (
                <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-[#f8f9fa] transition-colors">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#f8f9fa] flex-shrink-0">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiPackage className="w-8 h-8 text-[#adb5bd]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#212529] truncate">{item.productName}</h3>
                    <p className="text-xl font-black text-[#2a63cd]">${item.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {discountStatus && getStatusBadge(discountStatus.status, discountStatus.expiresAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.inStock && !discountStatus && (
                      <button
                        onClick={() => openDiscountModal(item)}
                        className="p-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all"
                        title="Solicitar descuento"
                      >
                        <FiPercent className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={!item.inStock}
                      className="p-2.5 bg-[#2a63cd] text-white rounded-xl hover:bg-[#1e4ba3] disabled:opacity-50 transition-all"
                    >
                      <FiShoppingCart className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="p-2.5 bg-[#f8f9fa] text-[#6a6c6b] rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : searchTerm ? (
        <div className="bg-white rounded-xl border border-[#e9ecef] p-12 text-center">
          <FiSearch className="w-16 h-16 text-[#adb5bd] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#212529] mb-2">Sin resultados para "{searchTerm}"</h3>
          <button onClick={() => setSearchTerm('')} className="px-4 py-2 text-[#2a63cd] font-semibold hover:underline">
            Limpiar busqueda
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-white to-[#f8f9fa] rounded-2xl border border-[#e9ecef] p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#2a63cd]/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#2a63cd]/5 rounded-full blur-3xl"></div>

          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-[#2a63cd]/20 to-[#2a63cd]/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <PiHeartBreakBold className="w-12 h-12 text-[#2a63cd]" />
            </div>
            <h3 className="text-xl font-black text-[#212529] mb-3">Tu lista de deseos está vacía</h3>
            <p className="text-[#6a6c6b] mb-8 font-medium">
              Guarda favoritos y pide descuentos exclusivos
            </p>
            <Link
              href="/productos"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:shadow-xl transition-all"
            >
              <PiSparkle className="w-5 h-5" />
              Explorar Productos
            </Link>
          </div>
        </div>
      )}

      {/* Discount Request Modal */}
      {showDiscountModal && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDiscountModal(false)}>
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-slideInUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <FiPercent className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Solicitar Descuento</h2>
                    <p className="text-sm text-amber-100">Producto de tu lista de deseos</p>
                  </div>
                </div>
                <button onClick={() => setShowDiscountModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Product Info */}
            <div className="p-5 border-b border-[#e9ecef]">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-[#f8f9fa] rounded-xl overflow-hidden flex-shrink-0">
                  {selectedItem.imageUrl ? (
                    <Image src={selectedItem.imageUrl} alt={selectedItem.productName} width={80} height={80} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FiPackage className="w-8 h-8 text-[#adb5bd]" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-[#212529] line-clamp-2">{selectedItem.productName}</h3>
                  <p className="text-2xl font-black text-[#2a63cd] mt-1">${selectedItem.price.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Discount Selector */}
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-bold text-[#212529] mb-3">Descuento solicitado</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((percent) => (
                    <button
                      key={percent}
                      onClick={() => setDiscountPercent(percent)}
                      className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${discountPercent === percent
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                        : 'bg-[#f8f9fa] text-[#212529] hover:bg-[#e9ecef]'
                        }`}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Preview */}
              <div className="bg-gradient-to-r from-[#f8f9fa] to-[#e9ecef] rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6a6c6b]">Precio original:</span>
                  <span className="font-semibold">${selectedItem.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-[#6a6c6b]">Descuento ({discountPercent}%):</span>
                  <span className="font-semibold text-amber-600">-${(selectedItem.price * discountPercent / 100).toFixed(2)}</span>
                </div>
                <div className="border-t border-[#e9ecef] mt-3 pt-3 flex justify-between items-center">
                  <span className="font-bold text-[#212529]">Precio final:</span>
                  <span className="text-2xl font-black text-emerald-600">${(selectedItem.price * (1 - discountPercent / 100)).toFixed(2)}</span>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-bold text-[#212529] mb-2">Mensaje (opcional)</label>
                <textarea
                  value={discountMessage}
                  onChange={(e) => setDiscountMessage(e.target.value)}
                  placeholder="Ejemplo: Tengo $95 disponibles, seria posible un pequeno descuento?"
                  className="w-full px-4 py-3 border border-[#e9ecef] rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleRequestDiscount}
                disabled={requestingDiscount}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {requestingDiscount ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <FiSend className="w-5 h-5" />
                    Enviar Solicitud
                  </>
                )}
              </button>

              <p className="text-xs text-center text-[#6a6c6b]">
                El administrador revisara tu solicitud y te notificara cuando sea aprobada.
                Los descuentos aprobados tienen tiempo limitado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideInUp {
          animation: slideInUp 0.3s ease-out;
        }
        .grid > div {
          animation: slideInUp 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
