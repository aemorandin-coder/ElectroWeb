'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FiShoppingCart,
  FiTrash2,
  FiPackage,
  FiExternalLink,
  FiSearch,
  FiGrid,
  FiList,
  FiFilter,
  FiTrendingUp,
  FiDollarSign,
  FiPercent,
  FiX,
  FiSend,
  FiGift,
} from 'react-icons/fi';
import { PiListHeartBold, PiHeartBreakBold, PiSparkle } from 'react-icons/pi';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';
import { formatUSD } from '@/lib/currency';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  adminCard,
  adminPrimaryButton,
  adminBadge,
  adminLabel,
  adminModalOverlay,
  adminModalPanel,
} from '@/lib/admin-ui';

type SortOption = 'recent' | 'price-asc' | 'price-desc' | 'name';

interface WishlistProduct {
  id: string;
  name: string;
  priceUSD: number | string;
  stock: number;
  createdAt: string;
  mainImage?: string | null;
  images?: string | string[] | null;
  [key: string]: unknown;
}

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

  useBodyScrollLock(showDiscountModal);

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
        const items: WishlistItem[] = (data.products || []).map((product: WishlistProduct) => {
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
      toast.error('No se pudo cargar la lista de favoritos');
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
      toast.error('No se pudieron cargar las solicitudes de descuento');
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
      stock: 999,
      productType: 'PHYSICAL',
      weightKg: 0.1,
      isConsolidable: true,
      shippingCost: 0,
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
    } catch {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-brand-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin"></div>
          <PiListHeartBold className="absolute inset-0 m-auto w-6 h-6 text-brand-500" />
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
        return <span className={adminBadge('neutral')}>Expirado</span>;
      }
      return <span className={adminBadge('success')}>{hoursLeft}h restantes</span>;
    }
    switch (status) {
      case 'PENDING':
        return <span className={adminBadge('warning')}>Pendiente</span>;
      case 'REJECTED':
        return <span className={adminBadge('danger')}>Rechazado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className={`${adminCard} p-4 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0">
            <PiListHeartBold className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg lg:text-2xl font-bold text-ink tracking-tight">Favoritos</h1>
            <p className="text-xs lg:text-sm text-muted flex items-center gap-1">
              <PiSparkle className="w-3.5 h-3.5 text-brand-500" />
              {wishlist.length} producto{wishlist.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="flex flex-wrap gap-2">
          <div className="px-3 py-1.5 bg-surface rounded-lg border border-line flex items-center gap-1.5">
            <FiDollarSign className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-xs font-semibold text-ink">{formatUSD(totalValue)}</span>
          </div>
          <div className="px-3 py-1.5 bg-surface rounded-lg border border-line flex items-center gap-1.5">
            <FiTrendingUp className="w-3.5 h-3.5 text-success-strong" />
            <span className="text-xs font-semibold text-ink">{inStockCount} en stock</span>
          </div>
        </div>
      </div>

      {/* Info Tooltip - Discount Feature Explanation */}
      {showInfoBanner && (
        <div className="relative bg-surface rounded-xl border border-line p-3 lg:p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <FiPercent className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-ink text-xs lg:text-sm mb-0 flex items-center gap-1.5">
                <span className="truncate">¡Solicita descuentos exclusivos!</span>
                <span className="px-1.5 py-0.5 bg-brand-500 text-white text-[11px] font-bold rounded-full">NUEVO</span>
              </h3>
              <p className="text-xs text-muted truncate">
                Guarda productos y pide precio especial.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissInfoBanner}
              className="flex-shrink-0 p-1.5 text-muted hover:text-ink hover:bg-line/50 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {wishlist.length > 0 && (
        <div className={`${adminCard} p-4`}>
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full md:max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Buscar en tu lista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-line rounded-xl text-sm text-ink placeholder:text-subtle focus:border-brand-500 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-surface rounded-xl p-1 border border-line">
                <FiFilter className="w-4 h-4 text-muted ml-2" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-sm text-ink font-medium focus:outline-none pr-2 py-1.5"
                >
                  <option value="recent">Recientes</option>
                  <option value="price-asc">Menor precio</option>
                  <option value="price-desc">Mayor precio</option>
                  <option value="name">Nombre</option>
                </select>
              </div>

              <div className="flex items-center bg-surface rounded-xl p-1 border border-line">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-brand-500' : 'text-muted hover:text-ink'}`}
                  aria-label="Vista cuadrícula"
                >
                  <FiGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-brand-500' : 'text-muted hover:text-ink'}`}
                  aria-label="Vista lista"
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
                  className={`${adminCard} overflow-hidden group relative transition-all duration-300 hover:border-brand-500/40 ${
                    hasActiveDiscount ? 'border-success-strong/40' : ''
                  } ${removingId === item.id ? 'opacity-50' : ''}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Active discount badge */}
                  {hasActiveDiscount && (
                    <div className="absolute top-0 left-0 right-0 bg-success-strong text-white text-center py-0.5 text-xs font-bold z-10">
                      <FiGift className="inline w-2.5 h-2.5 mr-0.5" />
                      {discountStatus?.approvedDiscount}% OFF
                    </div>
                  )}

                  <div className={`relative aspect-square bg-surface ${hasActiveDiscount ? 'mt-4' : ''}`}>
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiPackage className="w-10 h-10 text-subtle" />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => removeFromWishlist(item.productId)}
                      disabled={removingId === item.productId}
                      className="absolute top-2 right-2 p-1.5 bg-white rounded-lg shadow text-deal hover:bg-deal-bg transition-all lg:opacity-0 lg:group-hover:opacity-100"
                      aria-label="Eliminar de favoritos"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>

                    {!item.inStock && (
                      <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
                        <span className="px-2 py-1 bg-deal text-white text-xs font-bold rounded-lg">Agotado</span>
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
                    <h3 className="text-xs font-bold text-ink mb-1.5 line-clamp-2 leading-tight">{item.productName}</h3>

                    <div className="flex items-center gap-1.5 mb-2">
                      {hasActiveDiscount ? (
                        <>
                          <span className="text-xs text-muted line-through">{formatUSD(item.price)}</span>
                          <span className="text-base font-bold text-success-strong">
                            {formatUSD(item.price * (1 - (discountStatus?.approvedDiscount || 0) / 100))}
                          </span>
                        </>
                      ) : (
                        <span className="text-base font-bold text-brand-500">{formatUSD(item.price)}</span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5 mb-1.5">
                      <Link
                        href={`/productos/${item.productId}`}
                        className="flex-1 px-2 py-1.5 bg-surface text-ink text-xs font-semibold rounded-lg hover:bg-line text-center flex items-center justify-center gap-1"
                      >
                        <FiExternalLink className="w-3 h-3" />
                        Ver
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        disabled={!item.inStock}
                        className={`flex-1 px-2 py-1.5 ${adminPrimaryButton} text-xs py-1.5 px-2 flex items-center justify-center gap-1`}
                      >
                        <FiShoppingCart className="w-3 h-3" />
                        Añadir
                      </button>
                    </div>

                    {/* Request discount button */}
                    {item.inStock && !discountStatus && (
                      <button
                        type="button"
                        onClick={() => openDiscountModal(item)}
                        className="w-full px-2 py-1.5 bg-brand-50 text-brand-600 border border-brand-200 text-xs font-semibold rounded-lg hover:bg-brand-100 transition-all flex items-center justify-center gap-1"
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
          /* List View */
          <div className={`${adminCard} overflow-hidden divide-y divide-line`}>
            {filteredAndSortedWishlist.map((item) => {
              const discountStatus = getDiscountStatus(item.productId);
              return (
                <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-surface transition-colors">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-surface flex-shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiPackage className="w-8 h-8 text-subtle" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink truncate text-sm lg:text-base">{item.productName}</h3>
                    <p className="text-lg lg:text-xl font-bold text-brand-500">{formatUSD(item.price)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {discountStatus && getStatusBadge(discountStatus.status, discountStatus.expiresAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.inStock && !discountStatus && (
                      <button
                        type="button"
                        onClick={() => openDiscountModal(item)}
                        className="p-2.5 bg-brand-50 text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-100 transition-all"
                        title="Solicitar descuento"
                      >
                        <FiPercent className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      disabled={!item.inStock}
                      className={`p-2.5 ${adminPrimaryButton}`}
                      aria-label="Añadir al carrito"
                    >
                      <FiShoppingCart className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromWishlist(item.id)}
                      className="p-2.5 bg-surface text-deal rounded-xl hover:bg-deal-bg transition-all"
                      aria-label="Eliminar"
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
        <div className={`${adminCard} p-12 text-center`}>
          <FiSearch className="w-16 h-16 text-subtle mx-auto mb-4" />
          <h3 className="text-lg font-bold text-ink mb-2">Sin resultados para &ldquo;{searchTerm}&rdquo;</h3>
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="px-4 py-2 text-brand-500 font-semibold hover:underline"
          >
            Limpiar busqueda
          </button>
        </div>
      ) : (
        <div className={`${adminCard} p-12 text-center relative overflow-hidden`}>
          <div className="relative">
            <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <PiHeartBreakBold className="w-10 h-10 text-brand-500" />
            </div>
            <h3 className="text-xl font-bold text-ink mb-2">Tu lista de deseos está vacía</h3>
            <p className="text-muted mb-6 text-sm">
              Guarda favoritos y pide descuentos exclusivos
            </p>
            <Link
              href="/"
              className={`${adminPrimaryButton} inline-flex items-center gap-2 px-6 py-3`}
            >
              <PiSparkle className="w-5 h-5" />
              Ver Ofertas de Hoy
            </Link>
          </div>
        </div>
      )}

      {/* Discount Request Modal - Using Portal to escape overflow:hidden */}
      {showDiscountModal && selectedItem && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowDiscountModal(false)}
          className={adminModalOverlay}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`${adminModalPanel} w-full max-w-[512px] max-h-[95dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden`}
          >
            {/* Modal Header */}
            <div className="bg-surface border-b border-line p-4 sm:p-5 flex-shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center">
                  <FiPercent className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-ink">Solicitar Descuento</h2>
                  <p className="text-xs sm:text-sm text-muted">Producto de tu lista de deseos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDiscountModal(false)}
                className="p-2 text-muted hover:bg-line/50 rounded-lg transition-all"
                aria-label="Cerrar modal"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 pb-6 sm:pb-0">
              {/* Product Info */}
              <div className="p-5 border-b border-line">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-surface rounded-xl overflow-hidden flex-shrink-0 border border-line">
                    {selectedItem.imageUrl ? (
                      <Image
                        src={selectedItem.imageUrl}
                        alt={selectedItem.productName}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiPackage className="w-8 h-8 text-subtle" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-ink line-clamp-2 text-sm lg:text-base">{selectedItem.productName}</h3>
                    <p className="text-xl font-bold text-brand-500 mt-1">{formatUSD(selectedItem.price)}</p>
                  </div>
                </div>
              </div>

              {/* Discount Selector */}
              <div className="p-5 space-y-5">
                <div>
                  <label className={adminLabel}>Descuento solicitado</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((percent) => (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => setDiscountPercent(percent)}
                        className={`flex-1 py-3 rounded-xl font-bold text-base transition-all ${
                          discountPercent === percent
                            ? adminPrimaryButton
                            : 'bg-surface text-ink hover:bg-line border border-line'
                        }`}
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Preview */}
                <div className="bg-surface rounded-xl border border-line p-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">Precio original:</span>
                    <span className="font-semibold text-ink">{formatUSD(selectedItem.price)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">Descuento ({discountPercent}%):</span>
                    <span className="font-semibold text-brand-600">-{formatUSD(selectedItem.price * discountPercent / 100)}</span>
                  </div>
                  <div className="border-t border-line pt-2 flex justify-between items-center">
                    <span className="font-bold text-ink">Precio final:</span>
                    <span className="text-xl font-bold text-success-strong">
                      {formatUSD(selectedItem.price * (1 - discountPercent / 100))}
                    </span>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className={adminLabel}>Mensaje (opcional)</label>
                  <textarea
                    value={discountMessage}
                    onChange={(e) => setDiscountMessage(e.target.value)}
                    placeholder="Ejemplo: Tengo $95 disponibles, sería posible un pequeño descuento?"
                    className="w-full px-3.5 py-2.5 bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all resize-none text-ink text-sm placeholder:text-subtle"
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleRequestDiscount}
                  disabled={requestingDiscount}
                  className={`${adminPrimaryButton} w-full py-3.5 flex items-center justify-center gap-2`}
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

                <p className="text-xs text-center text-muted">
                  El administrador revisará tu solicitud y te notificará cuando sea aprobada.
                  Los descuentos aprobados tienen tiempo limitado.
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
