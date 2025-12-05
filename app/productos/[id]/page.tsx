'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import PublicHeader from '@/components/public/PublicHeader';
import { FaShoppingBasket } from 'react-icons/fa';
import { HiShoppingBag } from "react-icons/hi2";
import ReviewStats from '@/components/reviews/ReviewStats';
import ReviewList from '@/components/reviews/ReviewList';
import ReviewForm from '@/components/reviews/ReviewForm';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceUSD: number;
  category: Category;
  stock: number;
  images: string[];
  mainImage?: string | null;
  isFeatured: boolean;
  isNew: boolean;
  hasDiscount: boolean;
  discountPercent?: number;
  brand?: string;
  specifications?: Record<string, any>;
  features?: string[];
  createdAt: string;
}

interface CartItem {
  id: string;
  quantity: number;
  // Add other properties if they are part of your CartItem structure
  // e.g., name: string; price: number; imageUrl: string; stock: number;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem, items } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchProduct();
      fetchRelatedProducts();
      fetchReviews();
    }
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/slug/${params.id}`);
      if (response.ok) {
        const data = await response.json();

        // Parse images if they come as string from DB
        if (data.images && typeof data.images === 'string') {
          try {
            data.images = JSON.parse(data.images);
          } catch (e) {
            console.error('Error parsing images:', e);
            data.images = [];
          }
        }

        // Parse specs if they come as string from DB
        if (data.specs && typeof data.specs === 'string') {
          try {
            data.specs = JSON.parse(data.specs);
          } catch (e) {
            console.error('Error parsing specs:', e);
            data.specs = null;
          }
        }

        setProduct(data);
      } else {
        router.push('/productos');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      router.push('/productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedProducts = async () => {
    try {
      const response = await fetch('/api/products/public');
      if (response.ok) {
        const data = await response.json();

        // First, get the current product to know its category
        const currentProductResponse = await fetch(`/api/products/slug/${params.id}`);
        if (currentProductResponse.ok) {
          const currentProduct = await currentProductResponse.json();

          // Filter by same category, excluding current product
          let sameCategoryProducts = data.filter(
            (p: Product) => p.id !== currentProduct.id && p.category.id === currentProduct.category.id
          );

          // If we have enough products in same category, use them
          if (sameCategoryProducts.length >= 4) {
            const shuffled = sameCategoryProducts.sort(() => 0.5 - Math.random());
            setRelatedProducts(shuffled.slice(0, 4));
          } else {
            // Otherwise, fill with other products
            const otherProducts = data.filter(
              (p: Product) => p.id !== currentProduct.id && p.category.id !== currentProduct.category.id
            );
            const combined = [...sameCategoryProducts, ...otherProducts];
            const shuffled = combined.sort(() => 0.5 - Math.random());
            setRelatedProducts(shuffled.slice(0, 4));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?productId=${params.id}&publishedOnly=true`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setReviewStats(data.stats || { averageRating: 0, totalReviews: 0 });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const getCleanImageUrl = (img: any) => {
    if (!img) return '';
    let url = img;
    if (typeof img === 'string') {
      // Handle JSON array string
      if (img.startsWith('[')) {
        try {
          const parsed = JSON.parse(img);
          if (Array.isArray(parsed) && parsed.length > 0) {
            url = parsed[0];
          }
        } catch {
          url = img.replace(/[\[\]"]/g, '');
        }
      }
    }
    // Ensure relative paths start with /
    if (url && typeof url === 'string' && !url.startsWith('http') && !url.startsWith('/')) {
      return `/${url}`;
    }
    return url;
  };

  const handleAddToCart = () => {
    if (!product) return;

    // Check if adding this quantity would exceed stock
    const currentCartItem = items.find((item: CartItem) => item.id === product.id);
    const currentCartQuantity = currentCartItem ? currentCartItem.quantity : 0;
    const totalQuantity = currentCartQuantity + quantity;

    if (totalQuantity > product.stock) {
      alert(`Solo hay ${product.stock} unidades disponibles. Ya tienes ${currentCartQuantity} en el carrito.`);
      return;
    }

    setAddingToCart(true);

    const cleanImage = getCleanImageUrl(product.mainImage || (product.images && product.images[0]));

    addItem({
      id: product.id,
      name: product.name,
      price: product.priceUSD,
      imageUrl: cleanImage,
      stock: product.stock
    }, quantity);

    setTimeout(() => {
      setAddingToCart(false);
      setQuantity(1);
    }, 500);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-white to-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-full animate-ping opacity-20"></div>
            <div className="relative w-24 h-24 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-full flex items-center justify-center">
              <svg className="animate-spin w-12 h-12 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          </div>
          <p className="text-lg font-semibold text-[#212529]">Cargando producto premium...</p>
          <p className="text-sm text-[#6a6c6b] mt-2">Preparando la mejor experiencia</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  // Parse images - they come as JSON string from API
  let parsedImages: string[] = [];
  try {
    if (typeof product.images === 'string' && product.images) {
      parsedImages = JSON.parse(product.images);
    } else if (Array.isArray(product.images)) {
      parsedImages = product.images;
    }
  } catch (e) {
    parsedImages = [];
  }

  const displayImages = parsedImages.length > 0 ? parsedImages : (product.mainImage ? [product.mainImage] : []);
  const currentImage = displayImages[selectedImageIndex] || product.mainImage || displayImages[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-white to-[#f8f9fa]">
      <PublicHeader />

      {/* Compact Hero Breadcrumb */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-5 left-5 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-5 right-5 w-48 h-48 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Epic Breadcrumb with Glassmorphism */}
          <nav className="flex items-center gap-2 mb-0 overflow-x-auto pb-2 no-scrollbar">
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

            {/* Productos */}
            <Link
              href="/productos"
              className="group flex items-center gap-1.5 px-3 py-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 hover:bg-white/20 transition-all hover:scale-105 shadow-lg flex-shrink-0"
            >
              <svg className="w-4 h-4 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm font-semibold text-white">Productos</span>
            </Link>

            {/* Category if available */}
            {product.category && (
              <>
                <svg className="w-4 h-4 text-white/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <Link
                  href={`/productos?category=${product.category.slug}`}
                  className="group flex items-center gap-1.5 px-3 py-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 hover:bg-white/20 transition-all hover:scale-105 shadow-lg flex-shrink-0"
                >
                  <span className="text-sm font-semibold text-white">{product.category.name}</span>
                </Link>
              </>
            )}

            {/* Separator */}
            <svg className="w-4 h-4 text-white/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            {/* Current Product */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 backdrop-blur-md rounded-lg border border-white/30 shadow-xl flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse"></div>
              <span className="text-sm font-bold text-white whitespace-nowrap">{product.name}</span>
            </div>
          </nav>
        </div>
      </section>

      {/* Main Content - 50% More Compact */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          {/* Left Column - Images */}
          <div className="space-y-6">
            <div
              className="relative" style={{ perspective: '1500px' }}>
              {/* Main Image with 3D Effects */}
              <div
                className="relative bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 mb-4 group"
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#2a63cd]/5 via-purple-500/5 to-pink-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"></div>

                <div className="relative aspect-square bg-white">
                  {currentImage ? (
                    <div className="relative w-full h-full">
                      {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2a63cd]"></div>
                        </div>
                      )}
                      <Image
                        src={currentImage}
                        alt={product.name}
                        fill
                        className="object-contain p-8 group-hover:scale-105 transition-transform duration-700"
                        onLoadingComplete={() => setImageLoading(false)}
                        priority
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-32 h-32 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Discount Badge */}
                  {product.hasDiscount && product.discountPercent && (
                    <div className="absolute top-6 right-6 px-3 py-1.5 bg-red-600 text-white rounded-full shadow-lg font-bold text-sm">
                      -{product.discountPercent}%
                    </div>
                  )}
                </div>
              </div>

              {/* Thumbnail Gallery */}
              {displayImages.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {displayImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedImageIndex(index);
                        setImageLoading(true);
                      }}
                      className={`relative aspect-square bg-white rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedImageIndex === index
                        ? 'border-[#2a63cd] ring-2 ring-[#2a63cd]/10'
                        : 'border-gray-100 hover:border-gray-300'
                        }`}
                    >
                      <Image
                        src={img}
                        alt={`${product.name} - Imagen ${index + 1}`}
                        fill
                        className="object-contain p-2"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-8">
            {/* Header Section */}
            <div className="space-y-4">
              {product.brand && (
                <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-500">
                  <span className="uppercase tracking-wider">{product.brand}</span>
                  {product.category && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className="text-[#2a63cd]">{product.category.name}</span>
                    </>
                  )}
                </div>
              )}

              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-5 h-5 ${i < Math.round(reviewStats.averageRating) ? 'fill-current' : 'text-gray-200'}`} viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-500">
                  ({reviewStats.totalReviews} reseñas)
                </span>
              </div>
            </div>

            {/* Price Section */}
            <div className="relative group py-2">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="relative flex items-baseline gap-4">
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2a63cd] via-[#1e4ba3] to-[#2a63cd] bg-[length:200%_auto] hover:bg-right transition-all duration-500 tracking-tighter drop-shadow-sm">
                  ${Number(product.priceUSD).toFixed(2)}
                </span>
                {product.hasDiscount && product.discountPercent && (
                  <div className="flex flex-col items-start animate-in fade-in slide-in-from-left-4 duration-700">
                    <span className="text-lg text-gray-400 line-through font-medium decoration-red-400/50">
                      ${formatPrice(product.priceUSD / (1 - product.discountPercent / 100))}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">
                      -{product.discountPercent}% OFF
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-sm text-gray-600 mt-6 min-h-[60px]">
              {product.description ? (
                <>
                  <p className={`leading-relaxed ${!isDescriptionExpanded ? 'line-clamp-3' : ''}`}>
                    {product.description}
                  </p>
                  {product.description.length > 200 && (
                    <button
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="inline-flex items-center gap-1 text-[#2a63cd] font-bold text-xs uppercase tracking-wider hover:underline mt-2 group"
                    >
                      {isDescriptionExpanded ? 'Leer menos' : 'Leer más'}
                      <svg
                        className={`w-3 h-3 transition-transform duration-300 ${isDescriptionExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-2 opacity-60">
                  <p className="text-sm italic text-gray-400">Descripción por definir</p>
                </div>
              )}
            </div>

            {/* Actions Section */}
            <div className="space-y-4 pt-6 border-t border-gray-100">
              {/* Stock Status */}
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2.5 h-2.5 rounded-full ${isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                <span className={`font-medium ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-600'}`}>
                  {isOutOfStock ? 'Agotado' : isLowStock ? `¡Solo quedan ${product.stock}!` : 'Disponible en stock'}
                </span>
              </div>

              {!isOutOfStock && (
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Quantity & Add to Cart */}
                  <div className="flex items-center gap-3 w-full sm:w-[58%]">
                    <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#2a63cd] transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={product.stock}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.min(product.stock, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-12 text-center bg-transparent font-bold text-gray-900 focus:outline-none"
                      />
                      <button
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#2a63cd] transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={handleAddToCart}
                      disabled={addingToCart}
                      className="flex-1 h-10 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                      {addingToCart ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Añadir al carrito</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Buy Now */}
                  <button
                    onClick={() => {
                      handleAddToCart();
                      router.push('/checkout');
                    }}
                    disabled={addingToCart}
                    className="w-full sm:w-[42%] h-10 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                  >
                    <HiShoppingBag className="w-5 h-5" />
                    Comprar Ahora
                  </button>
                </div>
              )}
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-6">
              {[
                { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, title: 'Garantía Oficial', desc: 'Directa de fabricante' },
                { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, title: 'Envío Rápido', desc: '24-48 horas' },
                { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>, title: 'Pago Seguro', desc: 'Protección total' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-[#2a63cd]">{item.icon}</div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{item.title}</p>
                    <p className="text-[10px] text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div >

        {/* Product Specifications */}
        {
          product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 shadow-xl mb-8">
              <h3 className="text-lg font-black text-[#212529] mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Especificaciones Técnicas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(product.specifications).slice(0, 10).map(([key, value], index) => (
                  <div
                    key={key}
                    className="group relative overflow-hidden rounded-xl bg-gray-50 p-3 hover:bg-white transition-all border border-transparent hover:border-gray-200 hover:shadow-md"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#2a63cd] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex flex-col relative z-10 pl-2">
                      <span className="text-[10px] font-bold text-[#2a63cd] uppercase tracking-wider mb-0.5 opacity-70 group-hover:opacity-100 transition-opacity">{key}</span>
                      <span className="text-sm font-bold text-gray-800 group-hover:text-[#2a63cd] transition-colors">{String(value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        {/* Key Features */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 shadow-xl mb-8">
          <h3 className="text-lg font-black text-[#212529] mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Características Destacadas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(product.features && Array.isArray(product.features) && product.features.length > 0
              ? product.features
              : [
                'Garantía oficial del fabricante',
                'Envío rápido y seguro',
                'Soporte técnico 24/7',
                'Producto 100% original'
              ]
            ).map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-transparent rounded-lg border-l-2 border-green-500">
                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-[#212529]">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8 mb-8">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-3xl font-black text-[#212529]">
              Reseñas y Calificaciones
            </h2>
            <div className="h-1 flex-1 bg-gradient-to-r from-[#2a63cd]/20 to-transparent rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Stats */}
            <div className="lg:col-span-1">
              <ReviewStats
                averageRating={reviewStats.averageRating}
                totalReviews={reviewStats.totalReviews}
              />
            </div>

            {/* Right Column - Reviews List and Form */}
            <div className="lg:col-span-2 space-y-6">
              {!loadingReviews && (
                <>
                  <ReviewList reviews={reviews} />
                  <ReviewForm
                    productId={product.id}
                    onReviewSubmitted={() => fetchReviews()}
                  />
                </>
              )}
              {loadingReviews && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2a63cd]"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {
          relatedProducts.length > 0 && (
            <section className="mt-10">
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-3xl font-black text-[#212529]">
                  Productos Relacionados
                </h2>
                <div className="h-1 flex-1 bg-gradient-to-r from-[#2a63cd]/20 to-transparent rounded-full"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((relatedProduct, index) => (
                  <Link
                    key={relatedProduct.id}
                    href={`/productos/${relatedProduct.slug}`}
                    className="group relative"
                    style={{
                      animation: `fadeInUp 0.6s ease-out ${index * 0.15}s both`,
                    }}
                  >
                    <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-500 border border-gray-200/50 hover:border-[#2a63cd]/30 hover:shadow-2xl hover:shadow-[#2a63cd]/20 hover:-translate-y-2">
                      {/* Magnetic Glow Effect */}
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2a63cd] via-purple-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500"></div>

                      {/* Shimmer Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-10"></div>

                      {/* Image Container */}
                      <div className="relative h-48 bg-gradient-to-br from-[#f8f9fa] to-gray-100 overflow-hidden">
                        {/* Animated Background Pattern */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-[#2a63cd]/5 via-purple-500/5 to-pink-500/5"></div>
                        </div>

                        {(() => {
                          let firstImage = relatedProduct.mainImage;

                          if (!firstImage) {
                            try {
                              if (typeof relatedProduct.images === 'string' && relatedProduct.images) {
                                const parsedImages = JSON.parse(relatedProduct.images);
                                if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                                  firstImage = parsedImages[0];
                                }
                              } else if (Array.isArray(relatedProduct.images) && relatedProduct.images.length > 0) {
                                firstImage = relatedProduct.images[0];
                              }
                            } catch (e) {
                              // Ignore parse errors
                            }
                          }

                          return firstImage ? (
                            <Image
                              src={firstImage}
                              alt={relatedProduct.name}
                              fill
                              className="object-cover group-hover:scale-110 group-hover:rotate-2 transition-all duration-700"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-16 h-16 text-gray-300 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          );
                        })()}

                        {/* Floating Badges */}
                        {relatedProduct.isNew && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-bold rounded-full shadow-lg animate-bounce">
                            NUEVO
                          </div>
                        )}
                        {relatedProduct.hasDiscount && relatedProduct.discountPercent && (
                          <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-red-500 to-pink-600 text-white text-[10px] font-bold rounded-full shadow-lg group-hover:scale-110 transition-transform">
                            -{relatedProduct.discountPercent}%
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="relative p-4 bg-white/90 backdrop-blur-sm">
                        {/* Category Badge */}
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-[#2a63cd]/10 to-[#1e4ba3]/10 rounded-full group-hover:from-[#2a63cd]/20 group-hover:to-[#1e4ba3]/20 transition-all">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#2a63cd] animate-pulse"></div>
                              <span className="text-[10px] font-bold text-[#2a63cd]">{relatedProduct.category.name}</span>
                            </span>
                          </div>
                          {/* Quick View Icon */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-6 h-6 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Product Name */}
                        <h3 className="text-sm font-bold text-[#212529] mb-2 group-hover:text-[#2a63cd] transition-colors line-clamp-2 min-h-[40px]">
                          {relatedProduct.name}
                        </h3>

                        {/* Price with Animation */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-bold text-[#212529] opacity-60">USD</span>
                            <span className="text-lg font-black text-[#212529]">
                              {Number(relatedProduct.priceUSD).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          {/* Add to Cart Quick Action */}
                          <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            <div className="w-8 h-8 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                              <FaShoppingBasket className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>

                        {/* Stock Indicator */}
                        {relatedProduct.stock <= 5 && relatedProduct.stock > 0 && (
                          <div className="mt-2 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
                            <span className="text-[10px] font-semibold text-orange-600">¡Últimas {relatedProduct.stock} unidades!</span>
                          </div>
                        )}
                        {relatedProduct.stock === 0 && (
                          <div className="mt-2 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            <span className="text-[10px] font-semibold text-red-600">Agotado</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Accent Line */}
                      <div className="h-1 bg-gradient-to-r from-transparent via-[#2a63cd] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
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
        @keyframes borderShine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div >
  );
}
