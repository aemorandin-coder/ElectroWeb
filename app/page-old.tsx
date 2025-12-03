'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PublicHeader from '@/components/public/PublicHeader';
import { formatPrice } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  priceUSD: number;
  images: string[];
  category: Category;
  brand?: { name: string };
  stock: number;
}

interface CompanySettings {
  companyName: string;
  tagline: string | null;
  logo: string | null;
  favicon: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
  youtube: string | null;
  socialMedia: any;
}

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes, settingsRes] = await Promise.all([
          fetch('/api/products?status=published&featured=true'),
          fetch('/api/categories'),
          fetch('/api/settings/public')
        ]);

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setFeaturedProducts(productsData.slice(0, 6)); // Get first 6 featured products
        }

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData);
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setCompanySettings(settingsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PublicHeader />

      {/* Hero Section - Premium Enhanced */}
      <section className="relative bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#1e4ba3] text-white overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
        </div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        {/* Shimmer Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ 
              animation: 'shimmer-move 4s ease-in-out infinite',
              transform: 'translateX(-100%)'
            }}
          ></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="grid lg:grid-cols-2 gap-4 items-center">
            {/* Left Content - Enhanced */}
            <div className="space-y-3 animate-fadeIn">
              <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold leading-tight">
                <span className="block text-white">Tecnología Premium para</span>
                <span className="block text-[#a5d8ff] mt-1 bg-gradient-to-r from-white via-[#a5d8ff] to-white bg-clip-text text-transparent">
                  Gaming y Profesionales
                </span>
              </h1>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/productos"
                  className="group relative px-5 py-3 bg-white text-[#1e3a8a] text-sm font-bold rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-2xl shadow-black/20 hover:shadow-3xl hover:scale-105 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                  <span className="relative z-10 flex items-center gap-2">
                    Ver Productos
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>
                <Link
                  href="/contacto"
                  className="group px-5 py-3 bg-white/15 backdrop-blur-md text-white text-sm font-bold rounded-xl hover:bg-white/25 transition-all duration-300 border-2 border-white/30 shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  Contáctanos
                </Link>
              </div>
            </div>
            
            {/* Right Visual - Premium Features Grid */}
            <div className="relative lg:pl-8 animate-slideInRight">
              <div className="grid grid-cols-2 gap-3">
                {/* Feature Card 1 - Envío Rápido */}
                <div className="group relative bg-white/15 backdrop-blur-xl rounded-2xl p-4 border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-xl">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-400/50 transition-shadow">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Envío Rápido</p>
                      <p className="text-xs text-blue-100/80">Entrega local</p>
                    </div>
                  </div>
                </div>

                {/* Feature Card 2 - Garantía */}
                <div className="group relative bg-white/15 backdrop-blur-xl rounded-2xl p-4 border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-xl">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-green-400/50 transition-shadow">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Garantía</p>
                      <p className="text-xs text-blue-100/80">100% Segura</p>
                    </div>
                  </div>
                </div>

                {/* Feature Card 3 - Soporte */}
                <div className="group relative bg-white/15 backdrop-blur-xl rounded-2xl p-4 border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-xl">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-400/50 transition-shadow">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Soporte 24/7</p>
                      <p className="text-xs text-blue-100/80">Siempre activo</p>
                    </div>
                  </div>
                </div>

                {/* Feature Card 4 - Stats */}
                <div className="group relative bg-white/15 backdrop-blur-xl rounded-2xl p-4 border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-xl">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-orange-400/50 transition-shadow">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-black text-white">{featuredProducts.length > 0 ? featuredProducts.length * 50 : 500}+</p>
                      <p className="text-xs text-blue-100/80">Clientes felices</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Product Count Badge */}
              <div className="absolute -bottom-3 -left-3 bg-gradient-to-br from-white to-blue-50 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-3 border-2 border-white/60 animate-scaleIn hover:scale-110 transition-transform duration-300">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl shadow-xl">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-black text-[#212529] leading-none">{loading ? '...' : featuredProducts.length * 10}+</p>
                    <p className="text-[10px] text-[#6a6c6b] leading-tight font-semibold">Productos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#212529] mb-2">Explora por Categoría</h2>
            <p className="text-sm text-[#6a6c6b]">
              Encuentra exactamente lo que necesitas
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                name: 'Gaming',
                color: 'from-purple-500 to-pink-500',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              },
              {
                name: 'Laptops',
                color: 'from-blue-500 to-cyan-500',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )
              },
              {
                name: 'Componentes',
                color: 'from-orange-500 to-red-500',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                )
              },
              {
                name: 'Periféricos',
                color: 'from-green-500 to-teal-500',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )
              },
              {
                name: 'CCTV',
                color: 'from-indigo-500 to-blue-500',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )
              },
              {
                name: 'Consolas',
                color: 'from-red-500 to-pink-500',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                  </svg>
                )
              },
            ].map((category, index) => (
              <Link
                key={index}
                href={`/categorias/${category.name.toLowerCase()}`}
                className="group relative bg-[#f8f9fa] hover:bg-white border border-[#e9ecef] rounded-lg p-4 transition-all hover:shadow-md hover:border-[#2a63cd]/20"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-5 rounded-lg transition-opacity`}></div>
                <div className="relative flex flex-col items-center gap-2">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} text-white shadow-sm`}>
                    {category.icon}
                  </div>
                  <h3 className="text-xs font-semibold text-[#212529]">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section - MercadoLibre Style */}
      <section className="py-12 bg-[#ededed]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-black text-[#212529] mb-1">Ofertas del día</h2>
              <p className="text-sm text-[#6a6c6b] font-medium">Aprovecha los mejores precios en tecnología</p>
            </div>
            <Link
              href="/productos"
              className="group px-5 py-2.5 bg-[#2a63cd] text-white text-sm font-bold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <span className="flex items-center gap-2">
                Ver todo
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#2a63cd] mb-3 shadow-md">
                <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-sm text-[#6a6c6b]">Cargando productos...</p>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border border-[#e9ecef]">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#f8f9fa] mb-3">
                <svg className="w-6 h-6 text-[#6a6c6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[#212529] mb-1">Próximamente</h3>
              <p className="text-xs text-[#6a6c6b]">Estamos preparando productos increíbles para ti</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {featuredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="group relative bg-white rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-transparent hover:border-[#2a63cd]/20"
                >
                  <Link href={`/productos/${product.slug}`}>
                    {/* Image Section */}
                    <div className="relative aspect-square bg-white flex items-center justify-center overflow-hidden p-4">
                      {/* Badges */}
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-[#ff6b00] text-white text-[10px] font-black rounded shadow-lg uppercase">
                            Más vendido
                          </span>
                        )}
                        {index === 1 && (
                          <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-black rounded shadow-lg uppercase">
                            Oferta
                          </span>
                        )}
                        {product.stock > 0 && product.stock <= 5 && (
                          <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-black rounded shadow-lg">
                            ¡Últimas {product.stock}!
                          </span>
                        )}
                      </div>

                      {/* Free Shipping Badge */}
                      {index % 2 === 0 && (
                        <div className="absolute top-2 right-2 z-10">
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/95 backdrop-blur-sm text-white rounded shadow-lg">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-[10px] font-bold">Envío gratis</span>
                          </div>
                        </div>
                      )}

                      {product.images[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <svg className="w-20 h-20 text-[#dee2e6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}

                      {/* Quick Actions - Hidden by default, shown on hover */}
                      <div className="absolute bottom-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={(e) => { e.preventDefault(); }}
                          className="p-2 bg-white rounded-full shadow-lg hover:bg-[#2a63cd] hover:text-white transition-all hover:scale-110"
                          title="Agregar a favoritos"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); }}
                          className="p-2 bg-white rounded-full shadow-lg hover:bg-[#2a63cd] hover:text-white transition-all hover:scale-110"
                          title="Vista rápida"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>

                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-20">
                          <span className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg shadow-lg">
                            Agotado
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="p-3 border-t border-[#e9ecef]">
                      {/* Brand */}
                      {product.brand && (
                        <p className="text-xs text-[#6a6c6b] font-medium mb-1 uppercase tracking-wide">{product.brand.name}</p>
                      )}

                      {/* Product Name */}
                      <h3 className="text-sm font-semibold text-[#212529] mb-2 line-clamp-2 min-h-[40px] group-hover:text-[#2a63cd] transition-colors">
                        {product.name}
                      </h3>

                      {/* Price Section */}
                      <div className="space-y-1">
                        {/* Original Price with discount simulation */}
                        {index % 3 === 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#6a6c6b] line-through">${formatPrice(product.priceUSD * 1.3)}</span>
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded">
                              30% OFF
                            </span>
                          </div>
                        )}

                        {/* Current Price */}
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-[#212529]">${Math.floor(product.priceUSD)}</span>
                          <span className="text-sm font-semibold text-[#6a6c6b]">{((product.priceUSD % 1) * 100).toFixed(0).padStart(2, '0')}</span>
                        </div>

                        {/* Shipping Info */}
                        {index % 2 === 0 ? (
                          <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Envío gratis
                          </p>
                        ) : (
                          <p className="text-xs text-[#6a6c6b]">Envío disponible</p>
                        )}

                        {/* Stock indicator */}
                        {product.stock > 0 && product.stock > 5 && (
                          <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Disponible
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Services Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#212529] mb-2">Nuestros Servicios</h2>
            <p className="text-sm text-[#6a6c6b]">
              Soluciones completas en tecnología
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'PC Gaming',
                description: 'Equipos gaming personalizados de alta gama',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                color: 'from-purple-500 to-pink-500',
              },
              {
                title: 'Sistemas CCTV',
                description: 'Seguridad y videovigilancia profesional',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ),
                color: 'from-blue-500 to-cyan-500',
              },
              {
                title: 'Servicio Técnico',
                description: 'Reparación y mantenimiento especializado',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                color: 'from-green-500 to-teal-500',
              },
              {
                title: 'Cursos Online',
                description: 'Formación en tecnología y programación',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ),
                color: 'from-orange-500 to-red-500',
              },
            ].map((service, index) => (
              <div
                key={index}
                className="group relative bg-[#f8f9fa] hover:bg-white border border-[#e9ecef] rounded-lg p-4 hover:shadow-md transition-all"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 rounded-lg transition-opacity`}></div>
                <div className="relative">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${service.color} text-white mb-3 shadow-md`}>
                    {service.icon}
                  </div>
                  <h3 className="text-sm font-bold text-[#212529] mb-1">{service.title}</h3>
                  <p className="text-xs text-[#6a6c6b] mb-3">{service.description}</p>
                  <Link
                    href="/servicios"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#2a63cd] group-hover:gap-2 transition-all"
                  >
                    Conocer más
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Request Product */}
      <section className="py-8 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-white text-center md:text-left">
              <h2 className="text-xl font-bold mb-1">¿No encuentras lo que buscas?</h2>
              <p className="text-sm text-blue-100">
                Solicítanos cualquier producto tecnológico al mejor precio
              </p>
            </div>
            <Link
              href="/solicitar-producto"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#2a63cd] text-sm font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-md whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Solicitar Producto
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#212529] text-white pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                {companySettings?.logo ? (
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden">
                    <Image src={companySettings.logo} alt={companySettings.companyName} fill className="object-contain" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2a63cd] shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold">
                    {companySettings?.companyName?.split(' ')[0] || 'Electro Shop'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {companySettings?.companyName?.split(' ').slice(1).join(' ') || 'Morandin C.A.'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                {companySettings?.tagline || 'Tu tienda de confianza en tecnología y gaming en Guanare, Venezuela.'}
              </p>
              <div className="flex gap-2">
                {companySettings?.facebook && (
                  <a href={companySettings.facebook} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-[#2a63cd] transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                )}
                {companySettings?.instagram && (
                  <a href={companySettings.instagram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-[#2a63cd] transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}
                {companySettings?.twitter && (
                  <a href={companySettings.twitter} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-[#2a63cd] transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                  </a>
                )}
                {companySettings?.youtube && (
                  <a href={companySettings.youtube} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-[#2a63cd] transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Enlaces Rápidos</h4>
              <ul className="space-y-1.5 text-xs text-gray-400">
                <li><Link href="/productos" className="hover:text-[#2a63cd] transition-colors">Productos</Link></li>
                <li><Link href="/categorias" className="hover:text-[#2a63cd] transition-colors">Categorías</Link></li>
                <li><Link href="/ofertas" className="hover:text-[#2a63cd] transition-colors">Ofertas</Link></li>
                <li><Link href="/nuevos" className="hover:text-[#2a63cd] transition-colors">Nuevos Ingresos</Link></li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Servicios</h4>
              <ul className="space-y-1.5 text-xs text-gray-400">
                <li><Link href="/servicios/gaming" className="hover:text-[#2a63cd] transition-colors">PC Gaming</Link></li>
                <li><Link href="/servicios/cctv" className="hover:text-[#2a63cd] transition-colors">Sistemas CCTV</Link></li>
                <li><Link href="/servicios/tecnico" className="hover:text-[#2a63cd] transition-colors">Servicio Técnico</Link></li>
                <li><Link href="/cursos" className="hover:text-[#2a63cd] transition-colors">Cursos Online</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Contacto</h4>
              <ul className="space-y-2 text-xs text-gray-400">
                {companySettings?.address && (
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-[#2a63cd] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{companySettings.address}</span>
                  </li>
                )}
                {companySettings?.phone && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#2a63cd] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${companySettings.phone}`} className="hover:text-[#2a63cd] transition-colors">
                      {companySettings.phone}
                    </a>
                  </li>
                )}
                {companySettings?.whatsapp && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#2a63cd] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <a href={`https://wa.me/${companySettings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#2a63cd] transition-colors">
                      {companySettings.whatsapp}
                    </a>
                  </li>
                )}
                {companySettings?.email && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#2a63cd] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${companySettings.email}`} className="hover:text-[#2a63cd] transition-colors">
                      {companySettings.email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-white/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-400">
              <p>&copy; {new Date().getFullYear()} {companySettings?.companyName || 'Electro Shop Morandin C.A.'} Todos los derechos reservados.</p>
              <div className="flex gap-4">
                <Link href="/terminos" className="hover:text-[#2a63cd] transition-colors">Términos</Link>
                <Link href="/privacidad" className="hover:text-[#2a63cd] transition-colors">Privacidad</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
