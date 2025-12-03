'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import PublicHeader from '@/components/public/PublicHeader';
import { FaShoppingBasket } from 'react-icons/fa';
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
    addItem({
      id: product.id,
      name: product.name,
      price: product.priceUSD,
      imageUrl: product.mainImage || product.images[0],
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
          <nav className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
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
            <svg className="w-4 h-4 text-white/50 animate-pulse flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            {/* Products */}
            <Link
              href="/productos"
              className="group flex items-center gap-1.5 px-3 py-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 hover:bg-white/20 transition-all hover:scale-105 shadow-lg flex-shrink-0"
            >
              <svg className="w-4 h-4 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm font-semibold text-white">Productos</span>
            </Link>

            {/* Separator */}
            <svg className="w-4 h-4 text-white/50 animate-pulse flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            {/* Current Product */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 backdrop-blur-md rounded-lg border border-white/30 shadow-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse"></div>
              <span className="text-sm font-bold text-white">{product.name}</span>
            </div>
          </nav>

          {/* Category and Badges */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
              <span className="text-xs font-semibold text-white">{product.category.name}</span>
            </div>
            {product.isNew && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] font-bold rounded-full shadow-lg">
                <svg className="w-2.5 h-2.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Nuevo
              </div>
            )}
            {product.isFeatured && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-[10px] font-bold rounded-full shadow-lg">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Destacado
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content - 50% More Compact */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          <div className="space-y-4">
            {/* Product Name Above Image - Epic Header */}
            <div className="flex items-stretch gap-4">
              {/* Product Name */}
              <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-4 shadow-xl">
                <h1 className="text-2xl md:text-3xl font-black text-[#212529] mb-2 leading-tight">
                  {product.name}
                </h1>
                {product.brand && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#2a63cd]/10 to-[#1e4ba3]/10 rounded-lg">
                    <svg className="w-4 h-4 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-sm font-bold text-[#2a63cd]">{product.brand}</span>
                  </div>
                )}
              </div>

              {/* HYPER MODERN EPIC LUXURY Price Container */}
              <div className="relative group w-64">
                {/* Animated Gradient Glow - Multiple Layers */}
                <div className="absolute -inset-1 bg-gradient-to-r from-[#2a63cd] via-cyan-400 to-[#1e4ba3] rounded-2xl opacity-30 group-hover:opacity-60 blur-2xl transition-all duration-700 animate-pulse"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-br from-cyan-400 via-[#2a63cd] to-purple-600 rounded-2xl opacity-0 group-hover:opacity-40 blur-xl transition-all duration-500"></div>

                {/* Main Container with Premium Glassmorphism - NO BORDER */}
                <div className="relative h-full bg-gradient-to-br from-white/95 via-blue-50/90 to-cyan-50/95 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden">
                  {/* Animated Gradient Border */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                    background: 'linear-gradient(45deg, transparent 30%, rgba(42, 99, 205, 0.3) 50%, transparent 70%)',
                    backgroundSize: '200% 200%',
                    animation: 'borderShine 3s linear infinite'
                  }}></div>

                  {/* Floating Particles */}
                  <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-40"></div>
                  <div className="absolute bottom-6 left-6 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse opacity-30" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute top-1/2 right-8 w-1 h-1 bg-purple-400 rounded-full animate-ping opacity-20" style={{ animationDelay: '1s' }}></div>

                  {/* Premium Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1500"></div>

                  {/* Content Container */}
                  <div className="relative z-10 h-full flex flex-col justify-center p-4">
                    {/* PVP Label */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-300"></div>
                      <span className="text-xs font-black text-[#212529] uppercase tracking-wider">PVP</span>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-300"></div>
                    </div>

                    {/* Epic Price Display */}
                    <div className="text-center mb-3">
                      <div className="relative inline-block">
                        {/* Price Glow Effect */}
                        <div className="absolute inset-0 blur-xl bg-gradient-to-r from-[#2a63cd] to-cyan-400 opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>

                        <div className="relative flex items-baseline justify-center gap-2 group-hover:scale-105 transition-all duration-300">
                          <span className="text-sm font-bold text-[#212529] opacity-60">USD</span>
                          <span className="text-5xl font-black text-[#212529]">
                            {Number(product.priceUSD).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Discount Badge - Ultra Premium */}
                    {product.hasDiscount && product.discountPercent && (
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="text-xs line-through text-gray-500 font-semibold opacity-60">
                          {formatPrice(product.priceUSD / (1 - product.discountPercent / 100))}
                        </div>
                        <div className="relative group/discount">
                          <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-600 rounded-full blur-md opacity-50 group-hover/discount:opacity-75 transition-opacity"></div>
                          <div className="relative px-3 py-1 bg-gradient-to-r from-red-500 via-pink-500 to-rose-600 text-white text-[10px] font-black rounded-full shadow-xl animate-pulse">
                            🔥 -{product.discountPercent}% OFF
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Luxury Corner Accents */}
                  <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-cyan-400/20 via-[#2a63cd]/10 to-transparent rounded-br-full"></div>
                  <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-blue-500/20 via-purple-400/10 to-transparent rounded-tl-full"></div>

                  {/* Premium Border Highlight */}
                  <div className="absolute inset-0 rounded-2xl border border-white/40 group-hover:border-white/60 transition-colors"></div>
                </div>
              </div>
            </div>

            {/* Main Product Image */}
            <div
              className="relative" style={{ perspective: '1500px' }}>
              {/* Main Image with 3D Effects */}
              <div
                className="relative bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 mb-4 group"
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#2a63cd]/20 via-purple-500/20 to-pink-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"></div>

                <div className="relative aspect-square bg-gradient-to-br from-[#f8f9fa] to-gray-100">
                  {/* Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-10"></div>

                  {currentImage ? (
                    <div className="relative w-full h-full">
                      {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <svg className="animate-spin w-12 h-12 text-[#2a63cd]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
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
                      <svg className="w-32 h-32 text-[#adb5bd] group-hover:scale-110 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Discount Badge */}
                  {product.hasDiscount && product.discountPercent && (
                    <div className="absolute top-6 right-6 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full shadow-2xl animate-pulse"
                      style={{
                        transform: 'translateZ(30px)',
                        boxShadow: '0 10px 30px 0 rgba(220, 38, 38, 0.6)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xl font-black">-{product.discountPercent}% OFF</span>
                      </div>
                    </div>
                  )}

                  {/* Floating Particles */}
                  <div className="absolute top-8 left-8 w-3 h-3 bg-white/70 rounded-full animate-ping"></div>
                  <div className="absolute bottom-8 right-8 w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
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
                      className={`relative aspect-square bg-white rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${selectedImageIndex === index
                        ? 'border-[#2a63cd] shadow-lg ring-2 ring-[#2a63cd]/20'
                        : 'border-gray-200 hover:border-[#2a63cd]/50'
                        }`}
                    >
                      <Image
                        src={img}
                        alt={`${product.name} - Imagen ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-4">
            {/* Description with Expand/Collapse */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 shadow-xl">
              <h3 className="text-lg font-bold text-[#212529] mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Descripción del Producto
              </h3>
              <div className="relative">
                <p className={`text-sm text-[#6a6c6b] leading-relaxed transition-all duration-300 ${!isDescriptionExpanded ? 'line-clamp-2' : ''}`}>
                  {product.description}
                </p>
                {product.description && product.description.length > 200 && (
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#2a63cd] hover:text-[#1e4ba3] transition-colors"
                  >
                    {isDescriptionExpanded ? (
                      <>
                        <span>Ver menos</span>
                        <svg className="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>Ver más</span>
                        <svg className="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Stock Info */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-4 shadow-xl">
              <div className={`flex items-center gap-2 ${isOutOfStock ? '' : isLowStock ? '' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOutOfStock ? 'bg-red-100' : isLowStock ? 'bg-orange-100' : 'bg-green-100'}`}>
                  <svg className={`w-4 h-4 ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[#212529]">Disponibilidad</p>
                  {isOutOfStock ? (
                    <p className="text-sm text-red-600 font-bold">Agotado</p>
                  ) : isLowStock ? (
                    <p className="text-sm text-orange-600 font-bold">¡{product.stock} unids!</p>
                  ) : (
                    <p className="text-sm text-green-600 font-bold">En Stock ({product.stock})</p>
                  )}
                </div>
              </div>
            </div>


            {/* Quantity & Actions - All in One Row with Square Containers */}
            <div className="flex items-center gap-3">
              {!isOutOfStock && (
                <>
                  {/* Quantity Selector - Square Container */}
                  <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-3 shadow-xl hover:shadow-2xl transition-all">
                    <label className="block text-xs font-bold text-[#212529] mb-2 text-center">Cantidad</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg hover:from-[#2a63cd] hover:to-[#1e4ba3] hover:text-white transition-all shadow-sm hover:scale-110"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                        </svg>
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={product.stock}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.min(product.stock, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-14 px-2 py-1.5 text-center text-sm font-bold border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent bg-white"
                      />
                      <button
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg hover:from-[#2a63cd] hover:to-[#1e4ba3] hover:text-white transition-all shadow-sm hover:scale-110"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Comprar Button - Square Container */}
                  <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-3 shadow-xl hover:shadow-2xl transition-all">
                    <button
                      onClick={() => {
                        handleAddToCart();
                        router.push('/checkout');
                      }}
                      disabled={addingToCart}
                      className="group relative w-full flex flex-col items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white rounded-lg overflow-hidden transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                      <FaShoppingBasket className="w-5 h-5 group-hover:scale-110 group-hover:-rotate-12 transition-all relative z-10" />
                      <span className="relative z-10 text-xs font-bold">Comprar</span>
                    </button>
                  </div>

                  {/* Carrito Button - Square Container */}
                  <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-3 shadow-xl hover:shadow-2xl transition-all">
                    <button
                      onClick={handleAddToCart}
                      disabled={addingToCart}
                      className="group relative w-full flex flex-col items-center justify-center gap-1.5 py-2 bg-white text-[#2a63cd] border-2 border-[#2a63cd] rounded-lg overflow-hidden transition-all hover:bg-gradient-to-r hover:from-[#2a63cd]/5 hover:to-[#1e4ba3]/5 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingToCart ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="relative z-10 text-xs font-bold">...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="relative z-10 text-[10px] font-bold leading-tight">Agregar al Carrito</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Favorito Button - Square Container */}
                  <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-3 shadow-xl hover:shadow-2xl transition-all">
                    <button className="group relative w-full flex flex-col items-center justify-center gap-1.5 py-2 bg-white border-2 border-pink-500 text-pink-500 rounded-lg overflow-hidden transition-all hover:bg-pink-50 hover:scale-105">
                      {/* Pulse Effect */}
                      <div className="absolute inset-0 bg-pink-500/10 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-lg"></div>

                      <svg className="w-5 h-5 group-hover:scale-110 group-hover:fill-pink-500 transition-all relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span className="relative z-10 text-xs font-bold">Favorito</span>
                    </button>
                  </div>
                </>
              )}

              {isOutOfStock && (
                <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 p-3 shadow-xl hover:shadow-2xl transition-all">
                  <Link
                    href="/solicitar-producto"
                    className="group w-full flex flex-col items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white rounded-lg hover:scale-105 transition-all"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs font-bold">Solicitar Producto</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Share Product */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-4 shadow-xl">
              <h4 className="text-sm font-bold text-[#212529] mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Compartir producto
              </h4>
              <div className="flex items-center gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#1877f2] text-white rounded-lg hover:opacity-90 transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span className="text-xs font-semibold">Facebook</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#25d366] text-white rounded-lg hover:opacity-90 transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <span className="text-xs font-semibold">WhatsApp</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#1da1f2] text-white rounded-lg hover:opacity-90 transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                  <span className="text-xs font-semibold">Twitter</span>
                </button>
              </div>
            </div>

            {/* Trust Badges - Epic & Compact */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, text: 'Garantía' },
                { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, text: 'Rápido' },
                { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>, text: '24/7' },
              ].map((badge, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center gap-1 p-2 bg-white/80 backdrop-blur-xl rounded-lg border border-gray-200/50 shadow-sm hover:shadow-md transition-all hover:scale-105"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center text-white">
                    {badge.icon}
                  </div>
                  <span className="text-[10px] font-bold text-[#212529]">{badge.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div >

        {/* Product Specifications */}
        {
          product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 shadow-xl mb-8">
              <h3 className="text-lg font-black text-[#212529] mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Especificaciones Técnicas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 p-3 bg-gradient-to-r from-[#2a63cd]/5 to-transparent rounded-lg border-l-2 border-[#2a63cd]">
                    <svg className="w-4 h-4 text-[#2a63cd] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-[#6a6c6b] uppercase">{key}</p>
                      <p className="text-sm font-bold text-[#212529]">{String(value)}</p>
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
        <div className="mt-16 mb-16">
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

        {/* Related Products */}
        {
          relatedProducts.length > 0 && (
            <section className="mt-20">
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

                        {(relatedProduct.mainImage || relatedProduct.images[0]) ? (
                          <Image
                            src={relatedProduct.mainImage || relatedProduct.images[0]}
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
                        )}

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
