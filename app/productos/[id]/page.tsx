'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import PublicHeader from '@/components/public/PublicHeader';
import { FaShoppingBasket, FaGlobeAmericas, FaFlagUsa } from 'react-icons/fa';
import { HiShoppingBag } from "react-icons/hi2";
import { FiHeart, FiZap } from "react-icons/fi";
import { SiRoblox, SiSteam, SiPlaystation, SiNintendoswitch, SiNetflix, SiSpotify, SiApple } from 'react-icons/si';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
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
  specs?: Record<string, any>;
  features?: string[];
  createdAt: string;
  // Digital Product Fields
  productType?: 'PHYSICAL' | 'DIGITAL';
  digitalPlatform?: string;
  digitalRegion?: string;
  deliveryMethod?: string;
  // Shipping Fields
  weightKg?: number;
  dimensions?: string; // JSON: {length, width, height} in cm
  isConsolidable?: boolean;
  shippingCost?: number;
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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const [isSpecsExpanded, setIsSpecsExpanded] = useState(false);
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [activeTab, setActiveTab] = useState('description');
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  // Digital Product State
  const [selectedDigitalAmount, setSelectedDigitalAmount] = useState<{
    amount: number;
    salePrice: number;
  } | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchProduct();
      fetchRelatedProducts();
    }
  }, [params.id]);

  // Fetch reviews after product is loaded (need product.id)
  useEffect(() => {
    if (product?.id) {
      fetchReviews(product.id);
    }
  }, [product?.id]);

  // Auto-select first digital amount when product loads
  useEffect(() => {
    if (product?.productType === 'DIGITAL' && product?.specs?.digitalPricing) {
      const pricing = product.specs.digitalPricing as any[];
      if (pricing.length > 0 && !selectedDigitalAmount) {
        setSelectedDigitalAmount(pricing[0]);
      }
    }
  }, [product]);

  useEffect(() => {
    if (session?.user && product) {
      checkWishlistStatus();
    }
  }, [session, product]);

  const checkWishlistStatus = async () => {
    try {
      const res = await fetch('/api/customer/wishlist');
      if (res.ok) {
        const data = await res.json();
        const exists = data.products?.some((p: any) => p.id === product?.id);
        setIsInWishlist(exists);
      }
    } catch (error) {
      console.error('Error checking wishlist:', error);
    }
  };

  const handleToggleWishlist = async () => {
    if (!session) {
      toast.error('Inicia sesión para guardar favoritos');
      return;
    }
    if (!product) return;

    setWishlistLoading(true);
    try {
      const res = await fetch('/api/customer/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          action: isInWishlist ? 'remove' : 'add'
        })
      });

      if (res.ok) {
        setIsInWishlist(!isInWishlist);
        toast.success(isInWishlist ? 'Eliminado de favoritos' : 'Añadido a favoritos');
      } else {
        toast.error('Error al actualizar favoritos');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setWishlistLoading(false);
    }
  };

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

  const fetchReviews = async (productId: string) => {
    try {
      setLoadingReviews(true);
      const response = await fetch(`/api/reviews?productId=${productId}&publishedOnly=true`);
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

    // For digital products, must have selected an amount
    if (product.productType === 'DIGITAL' && product.specs?.digitalPricing) {
      if (!selectedDigitalAmount) {
        toast.error('Selecciona un monto');
        return;
      }
    }

    // Check if adding this quantity would exceed stock (only for physical products)
    if (product.productType !== 'DIGITAL') {
      const currentCartItem = items.find((item: CartItem) => item.id === product.id);
      const currentCartQuantity = currentCartItem ? currentCartItem.quantity : 0;
      const totalQuantity = currentCartQuantity + quantity;

      if (totalQuantity > product.stock) {
        alert(`Solo hay ${product.stock} unidades disponibles. Ya tienes ${currentCartQuantity} en el carrito.`);
        return;
      }
    }

    setAddingToCart(true);

    const cleanImage = getCleanImageUrl(product.mainImage || (product.images && product.images[0]));

    // For digital products, create unique cart ID with amount
    const isDigital = product.productType === 'DIGITAL' && selectedDigitalAmount;
    const cartItemId = isDigital
      ? `${product.id}-${selectedDigitalAmount.amount}`
      : product.id;
    const cartItemName = isDigital
      ? `${product.name} ($${selectedDigitalAmount.amount})`
      : product.name;
    const cartItemPrice = isDigital
      ? selectedDigitalAmount.salePrice
      : product.priceUSD;

    addItem({
      id: cartItemId,
      name: cartItemName,
      price: cartItemPrice,
      imageUrl: cleanImage,
      stock: isDigital ? 999 : product.stock, // Digital products have unlimited stock
      // Shipping fields for checkout calculation
      productType: product.productType || 'PHYSICAL',
      weightKg: product.weightKg || 0,
      dimensions: product.dimensions, // For volumetric weight calculation
      isConsolidable: product.isConsolidable !== false,
      shippingCost: product.shippingCost || 0,
    }, quantity);

    toast.success(isDigital
      ? `Añadido: ${product.name} $${selectedDigitalAmount?.amount}`
      : 'Añadido al carrito');

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

  // Helper para obtener icono de plataforma
  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, { icon: React.ReactNode; name: string }> = {
      'ROBLOX': { icon: <SiRoblox className="w-4 h-4" />, name: 'Roblox' },
      'STEAM': { icon: <SiSteam className="w-4 h-4" />, name: 'Steam' },
      'PLAYSTATION': { icon: <SiPlaystation className="w-4 h-4" />, name: 'PlayStation' },
      'XBOX': { icon: <FiZap className="w-4 h-4" />, name: 'Xbox' },
      'NINTENDO': { icon: <SiNintendoswitch className="w-4 h-4" />, name: 'Nintendo' },
      'NETFLIX': { icon: <SiNetflix className="w-4 h-4" />, name: 'Netflix' },
      'SPOTIFY': { icon: <SiSpotify className="w-4 h-4" />, name: 'Spotify' },
      'APPLE': { icon: <SiApple className="w-4 h-4" />, name: 'Apple' },
      'GOOGLE_PLAY': { icon: <FiZap className="w-4 h-4" />, name: 'Google Play' },
      'FREEFIRE': { icon: <FiZap className="w-4 h-4" />, name: 'Free Fire' },
      'VALORANT': { icon: <FiZap className="w-4 h-4" />, name: 'Valorant' },
      'FORTNITE': { icon: <FiZap className="w-4 h-4" />, name: 'Fortnite' },
      'PUBG': { icon: <FiZap className="w-4 h-4" />, name: 'PUBG Mobile' },
    };
    return icons[platform] || { icon: <FiZap className="w-4 h-4" />, name: platform };
  };

  // Helper para obtener icono de región
  const getRegionInfo = (region: string) => {
    const regions: Record<string, { icon: React.ReactNode; name: string }> = {
      'GLOBAL': { icon: <FaGlobeAmericas className="w-4 h-4" />, name: 'Global' },
      'USA': { icon: <FaFlagUsa className="w-4 h-4" />, name: 'Estados Unidos' },
      'LATAM': { icon: <FaGlobeAmericas className="w-4 h-4" />, name: 'Latinoamérica' },
      'EU': { icon: <FaGlobeAmericas className="w-4 h-4" />, name: 'Europa' },
      'ASIA': { icon: <FaGlobeAmericas className="w-4 h-4" />, name: 'Asia' },
    };
    return regions[region] || { icon: <FaGlobeAmericas className="w-4 h-4" />, name: region };
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Epic Breadcrumb with Glassmorphism */}
          <nav className="flex items-center gap-2 mb-0 overflow-x-auto pb-2 no-scrollbar">
            {/* Home */}
            <Link
              href="/"
              className="group flex items-center gap-1 px-2.5 py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 hover:bg-white/20 transition-all hover:scale-105 shadow-lg flex-shrink-0"
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
              className="group flex items-center gap-1 px-2.5 py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 hover:bg-white/20 transition-all hover:scale-105 shadow-lg flex-shrink-0"
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
                  className="group flex items-center gap-1 px-2.5 py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 hover:bg-white/20 transition-all hover:scale-105 shadow-lg flex-shrink-0"
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
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 backdrop-blur-md rounded-lg border border-white/30 shadow-xl flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse"></div>
              <span className="text-sm font-bold text-white whitespace-nowrap">{product.name}</span>
            </div>
          </nav>
        </div>
      </section>

      {/* Main Content - 50% More Compact */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Image with Thumbnails Inside */}
          <div
            className="relative" style={{ perspective: '1500px' }}>
            {/* Main Image with 3D Effects */}
            <div
              className="relative bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 group"
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#2a63cd]/5 via-purple-500/5 to-pink-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"></div>

              <div className="relative aspect-square bg-white">
                {currentImage ? (
                  <div className="relative w-full h-full">
                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2a63cd]"></div>
                      </div>
                    )}
                    <Image
                      src={currentImage}
                      alt={product.name}
                      fill
                      className="object-contain p-6 group-hover:scale-105 transition-transform duration-700"
                      onLoad={() => setImageLoading(false)}
                      priority
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/no-image.png';
                        setImageLoading(false);
                      }}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image
                      src="/images/no-image.png"
                      alt="Imagen no disponible"
                      fill
                      className="object-contain p-6"
                    />
                  </div>
                )}

                {/* Vertical Thumbnails - Inside Left */}
                {displayImages.length > 1 && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
                    {displayImages.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedImageIndex(index);
                          setImageLoading(true);
                        }}
                        className={`relative w-12 h-12 bg-white/90 backdrop-blur-sm rounded-lg overflow-hidden border-2 transition-all duration-300 shadow-md hover:scale-110 ${selectedImageIndex === index
                          ? 'border-[#2a63cd] ring-2 ring-[#2a63cd]/30'
                          : 'border-white/50 hover:border-gray-300'
                          }`}
                      >
                        <Image
                          src={img}
                          alt={`${product.name} - Imagen ${index + 1}`}
                          fill
                          className="object-contain p-1"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/no-image.png';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Discount Badge */}
                {product.hasDiscount && product.discountPercent && (
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-red-600 text-white rounded-full shadow-lg font-bold text-sm z-10">
                    -{product.discountPercent}%
                  </div>
                )}

                {/* Floating Share Button */}
                <div className="absolute top-16 right-4 z-20" style={{ right: product.hasDiscount ? '5rem' : '1rem' }}>
                  <div className="relative group/share">
                    <button
                      className="p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all flex items-center justify-center"
                      title="Compartir producto"
                    >
                      <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                    {/* Share Dropdown */}
                    <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover/share:opacity-100 group-hover/share:visible transition-all duration-200 z-30">
                      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 py-2 min-w-[180px] animate-scaleIn">
                        <p className="px-4 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">Compartir</p>
                        {/* WhatsApp */}
                        <button
                          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Mira este producto: ${product.name} - ${window.location.href}`)}`, '_blank')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-gray-700">WhatsApp</span>
                        </button>
                        {/* Facebook */}
                        <button
                          onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-gray-700">Facebook</span>
                        </button>
                        {/* Twitter/X */}
                        <button
                          onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Mira este producto: ${product.name}`)}&url=${encodeURIComponent(window.location.href)}`, '_blank')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 transition-colors text-left"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-black rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-gray-700">X (Twitter)</span>
                        </button>
                        {/* Copy Link */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success('¡Enlace copiado!');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-gray-700">Copiar enlace</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Wishlist Button */}
                <div className="absolute top-4 right-4 z-10" style={{ right: product.hasDiscount ? '5rem' : '1rem' }}>
                  <button
                    onClick={handleToggleWishlist}
                    disabled={wishlistLoading}
                    className={`p-3 backdrop-blur-md rounded-full shadow-lg hover:scale-110 transition-all flex items-center justify-center ${isInWishlist
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                      : 'bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white'
                      }`}
                    title={isInWishlist ? "En tu lista de deseos" : "Añadir a lista de deseos"}
                  >
                    {wishlistLoading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FiHeart className={`w-5 h-5 ${isInWishlist ? 'fill-current' : ''}`} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-6">
            {/* Header Section - Name, Rating & Price in same row */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              {/* Left: Name & Rating */}
              <div className="flex-1 space-y-2">
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

                <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 leading-snug line-clamp-2">
                  {product.name}
                </h1>

                {/* Rating & Stock Status in same row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < Math.round(reviewStats.averageRating) ? 'fill-current' : 'text-gray-200'}`} viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-500">
                      ({reviewStats.totalReviews} reseñas)
                    </span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  {/* Stock Status */}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-[#2a63cd] animate-pulse' : 'bg-green-500'}`}></div>
                    <span className={`text-sm font-semibold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-[#2a63cd]' : 'text-green-600'}`}>
                      {isOutOfStock ? 'Agotado' : isLowStock ? `¡Solo ${product.stock}!` : 'Disponible'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Price - Protagonist */}
              <div className="flex-shrink-0">
                {product.productType === 'DIGITAL' && product.specs?.digitalPricing && selectedDigitalAmount ? (
                  <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-xl border border-blue-100 px-6 py-3 text-center shadow-lg">

                    <span className="block text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2a63cd] via-[#1e4ba3] to-[#2a63cd] tracking-tight leading-none">
                      ${selectedDigitalAmount.salePrice.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-xl border border-blue-100 px-6 py-3 text-center shadow-lg">

                    <span className="block text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2a63cd] via-[#1e4ba3] to-[#2a63cd] tracking-tight leading-none">
                      ${Number(product.priceUSD).toFixed(2)}
                    </span>
                    {product.hasDiscount && product.discountPercent && (
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-sm text-gray-400 line-through">
                          ${formatPrice(product.priceUSD / (1 - product.discountPercent / 100))}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                          -{product.discountPercent}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Digital Product - Amount Selector (price already shown in header) */}
            {product.productType === 'DIGITAL' && product.specs?.digitalPricing && (
              <div className="space-y-3">
                {/* Platform & Region Info */}
                <div className="flex flex-wrap items-center gap-3">
                  {product.digitalPlatform && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-[#2a63cd]">{getPlatformIcon(product.digitalPlatform).icon}</span>
                      <span className="text-xs text-gray-500">Plataforma:</span>
                      <span className="text-xs font-bold text-gray-800">{getPlatformIcon(product.digitalPlatform).name}</span>
                    </div>
                  )}
                  {product.digitalRegion && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-[#2a63cd]">{getRegionInfo(product.digitalRegion).icon}</span>
                      <span className="text-xs text-gray-500">Región:</span>
                      <span className="text-xs font-bold text-gray-800">{getRegionInfo(product.digitalRegion).name}</span>
                    </div>
                  )}
                </div>

                {/* Amount Selector */}
                <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-xl border border-blue-100 p-4">
                  <p className="text-xs font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#2a63cd] via-purple-500 to-[#2a63cd] mb-2">
                    Selecciona el monto a añadir
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(product.specs.digitalPricing as any[]).map((pricing: any) => (
                      <button
                        key={pricing.amount}
                        onClick={() => setSelectedDigitalAmount(pricing)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${selectedDigitalAmount?.amount === pricing.amount
                          ? 'bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white shadow-lg shadow-blue-500/20'
                          : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-[#2a63cd] hover:bg-blue-50'
                          }`}
                      >
                        ${pricing.amount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Description - Always Visible, Clean Design */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </div>
                <h3 className="font-bold text-[#212529]">Descripción del Producto</h3>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                {product.description ? (
                  <p className="text-gray-600 leading-relaxed text-sm">{product.description}</p>
                ) : (
                  <p className="text-sm italic text-gray-400">Descripción por definir</p>
                )}
              </div>

              {/* Trust Badges - Below Description (conditional for digital) */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {/* 100% Original - Always show */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold text-green-600 bg-green-50 border-green-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>100% Original</span>
                </div>

                {/* Conditional: Physical = Envío Nacional, Digital = Envío Instantáneo */}
                {product.productType === 'DIGITAL' ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold text-[#2a63cd] bg-blue-50 border-blue-100">
                    <FiZap className="w-4 h-4" />
                    <span>Producto digital con envío instantáneo</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold text-[#2a63cd] bg-blue-50 border-blue-100">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Envío Nacional</span>
                  </div>
                )}

                {/* Pago Seguro - Always show */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold text-purple-600 bg-purple-50 border-purple-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <span>Pago Seguro</span>
                </div>
              </div>

              {/* Specifications - Same style as Description */}
              {product.specs && (() => {
                const filteredSpecs = Object.entries(product.specs).filter(([key, value]) =>
                  key !== 'digitalPricing' && typeof value !== 'object'
                );

                return filteredSpecs.length > 0 && (
                  <div className="mt-6">
                    {/* Header - Same style as Description */}
                    <button
                      onClick={() => setIsSpecsExpanded(!isSpecsExpanded)}
                      className="flex items-center gap-2 mb-3 w-full text-left"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-[#212529] flex-1">Especificaciones Técnicas</h3>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[#2a63cd]/10 rounded-full text-xs text-[#2a63cd] font-medium">
                          {filteredSpecs.length}
                        </span>
                        <div className={`w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center transition-all duration-300 ${isSpecsExpanded ? 'rotate-180' : ''}`}>
                          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Specs Grid - Dynamic columns based on count */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isSpecsExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className={`grid gap-3 ${filteredSpecs.length === 1 ? 'grid-cols-1' :
                          filteredSpecs.length === 2 ? 'grid-cols-2' :
                            filteredSpecs.length === 3 ? 'grid-cols-3' :
                              filteredSpecs.length <= 4 ? 'grid-cols-2 md:grid-cols-4' :
                                filteredSpecs.length <= 6 ? 'grid-cols-2 md:grid-cols-3' :
                                  'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                          }`}>
                          {filteredSpecs.map(([key, value]) => (
                            <div key={key} className="bg-white rounded-lg px-3 py-2.5 border border-gray-100 hover:border-[#2a63cd]/30 transition-colors">
                              <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{key}</span>
                              <span className="text-sm font-bold text-[#212529]">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Actions Section */}
            <div className="space-y-4 pt-6 border-t border-gray-100">

              {!isOutOfStock && (
                <div className="flex items-center gap-2">
                  {/* Quantity Selector */}
                  <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-10 flex items-center justify-center text-gray-500 hover:text-[#2a63cd] transition-colors text-lg"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(product.stock, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-10 text-center bg-transparent font-bold text-gray-900 focus:outline-none text-sm"
                    />
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="w-8 h-10 flex items-center justify-center text-gray-500 hover:text-[#2a63cd] transition-colors text-lg"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart */}
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="flex-[1.25] h-10 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-lg shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    {addingToCart ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="hidden sm:inline">Añadir</span>
                      </>
                    )}

                  </button>

                  {/* Buy Now */}
                  <button
                    onClick={() => {
                      // Check if user is logged in before proceeding to checkout
                      if (!session) {
                        // Save the current product URL for redirect after login
                        const currentUrl = `/productos/${product.slug}`;
                        toast.error('Inicia sesión para continuar con la compra');
                        router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}&action=buy`);
                        return;
                      }
                      handleAddToCart();
                      router.push('/checkout');
                    }}
                    disabled={addingToCart}
                    className="flex-1 h-10 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <HiShoppingBag className="w-4 h-4" />
                    <span className="hidden sm:inline">Comprar</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div >


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
                  <ReviewList reviews={reviews} showLoginPrompt={!session} />
                  <ReviewForm
                    productId={product.id}
                    onReviewSubmitted={() => fetchReviews(product.id)}
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

      {/* Footer */}
      <footer className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Electro Shop - Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div >
  );
}
