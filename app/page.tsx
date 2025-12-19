import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import AnimatedWave from '@/components/AnimatedWave';
import ProductCard from '@/components/ui/ProductCard';
import PageAnimations from '@/components/public/PageAnimations';
import HotAdOverlay from '@/components/HotAdOverlay';
import SubtleParticles from '@/components/SubtleParticles';
import FloatingTechIcons from '@/components/FloatingTechIcons';
import {
  FiBox, FiGrid, FiStar, FiHeadphones,
  FiShield, FiTool, FiBook,
  FiSearch, FiArrowRight, FiClock,
  FiMail
} from 'react-icons/fi';
import { PiSecurityCameraDuotone, PiStudentDuotone } from 'react-icons/pi';
import { FaEthernet } from 'react-icons/fa';
import { SiPcgamingwiki } from 'react-icons/si';
import { FaScrewdriverWrench } from 'react-icons/fa6';

// Helper to get YouTube Embed URL
const getYouTubeEmbedUrl = (url: string | null) => {
  if (!url) return null;
  let videoId = null;
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1]?.split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0];
  } else if (url.includes('youtube.com/embed/')) {
    return url;
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&showinfo=0&rel=0` : null;
};

// Helper to get Icon by name
const getIconByName = (iconName: string | null) => {
  switch (iconName) {
    case 'FiBox': return <FiBox className="w-8 h-8 text-white" />;
    case 'FiGrid': return <FiGrid className="w-8 h-8 text-white" />;
    case 'FiStar': return <FiStar className="w-8 h-8 text-white" />;
    case 'FiHeadphones': return <FiHeadphones className="w-8 h-8 text-white" />;
    default: return <FiBox className="w-8 h-8 text-white" />;
  }
};

// Helper to check if a phone number is a seed/placeholder
const isSeedPhoneNumber = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  const seedNumbers = ['584241234567', '4241234567', '+584241234567'];
  const normalizedPhone = phone.replace(/[\s\-\+]/g, '');
  return seedNumbers.some(seed => normalizedPhone.includes(seed.replace(/[\s\-\+]/g, '')));
};

export const revalidate = 0; // Ensure fresh data on every request

export default async function Home() {
  // Fetch data directly from DB
  const [featuredProducts, categories, companySettings] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      take: 8,
      include: { category: true, brand: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' }
    }),
    prisma.companySettings.findFirst()
  ]);

  // Transform products for ProductCard (ensure images is string[])
  const formattedProducts = featuredProducts.map(p => ({
    ...p,
    priceUSD: Number(p.priceUSD),
    images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images,
  }));

  return (
    <div id="homepage-root" className="min-h-screen bg-white" suppressHydrationWarning>
      <PublicHeader settings={companySettings ? JSON.parse(JSON.stringify(companySettings)) : null} />

      {/* Hero Section - Premium Design */}
      <section className="relative overflow-hidden min-h-[600px] flex items-center justify-center">
        {/* Background: Video or Gradient */}
        <div className="absolute inset-0 z-0" suppressHydrationWarning>
          {companySettings?.heroVideoEnabled && companySettings?.heroVideoUrl ? (
            <div className="relative w-full h-full" suppressHydrationWarning>
              {companySettings.heroVideoUrl.includes('youtube') || companySettings.heroVideoUrl.includes('youtu.be') ? (
                <iframe
                  className="absolute top-1/2 left-1/2 w-[150%] h-[150%] -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-60"
                  src={getYouTubeEmbedUrl(companySettings.heroVideoUrl) || ''}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  suppressHydrationWarning
                />
              ) : (
                <video
                  className="absolute top-0 left-0 w-full h-full object-cover opacity-60"
                  src={companySettings.heroVideoUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  suppressHydrationWarning
                />
              )}
              {/* Overlay to ensure text readability */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a3b7e]/90 via-[#1e4ba3]/80 to-[#2a63cd]/70 mix-blend-multiply"></div>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e]">
              {/* Animated Background Particles (Only if no video) */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
              </div>
            </div>
          )}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
          <div className="text-center">
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-3 mb-6 animate-fadeIn">
              <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
              <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <span className="text-sm font-semibold text-white">Bienvenido a {companySettings?.companyName || 'Electro Shop'}</span>
              </div>
              <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            </div>

            {/* Title with Gradient */}
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight drop-shadow-lg">
              {companySettings?.heroTitle || companySettings?.heroVideoTitle || 'Tecnología'} <span className="bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">{companySettings?.heroSubtitle ? '' : (companySettings?.heroVideoDescription ? 'Avanzada' : 'Premium')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto mb-10 font-light leading-relaxed drop-shadow-md">
              {companySettings?.heroSubtitle || companySettings?.heroVideoDescription || companySettings?.tagline || 'Descubre los mejores productos tecnológicos con precios competitivos y atención personalizada'}
            </p>

            {/* Hero Button */}
            {(companySettings?.heroButtonText || companySettings?.heroButtonLink) && (
              <div className="mb-12 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                <Link
                  href={companySettings?.heroButtonLink || '/productos'}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#2a63cd] text-lg font-bold rounded-full hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  {companySettings?.heroButtonText || 'Ver Productos'}
                  <FiArrowRight className="w-5 h-5" />
                </Link>
              </div>
            )}

            {/* Space to maintain hero height */}
            <div className="h-16"></div>
          </div>
        </div>

        {/* Premium Animated Wave */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <AnimatedWave />
        </div>
      </section>

      {/* Categories Section */}
      {companySettings?.showCategories !== false && (
        <section className="py-16 bg-white relative overflow-hidden" data-section="light">
          <SubtleParticles particleCount={15} />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-[#212529] mb-3">Explora por Categoría</h2>
              <p className="text-base text-[#6a6c6b]">
                Encuentra exactamente lo que necesitas
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.slice(0, companySettings?.maxCategoriesDisplay || 12).map((category) => {
                // Gradiente azul tenue y suave para todas las categorías
                const gradient = 'from-[#6b9edd] via-[#5a8ad0] to-[#4a7dc4]';

                return (
                  <Link
                    key={category.id}
                    href={`/categorias/${category.slug}`}
                    className="group relative bg-[#f8f9fa] hover:bg-white border border-[#e9ecef] rounded-2xl p-4 transition-all hover:shadow-xl hover:border-[#2a63cd]/40 hover:-translate-y-2"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`}></div>
                    <div className="relative flex flex-col items-center gap-3">
                      {/* 3D Glossy Icon with Shine Effect */}
                      <div className="relative w-16 h-16">
                        <div
                          className={`
                            relative w-full h-full rounded-2xl flex items-center justify-center
                            bg-gradient-to-br ${gradient}
                            shadow-xl
                            group-hover:scale-110 transition-all duration-500
                            overflow-hidden
                          `}
                          style={{
                            boxShadow: `
                              0 10px 40px -10px rgba(107, 158, 221, 0.5),
                              0 6px 16px -6px rgba(74, 125, 196, 0.4),
                              inset 0 2px 0 rgba(255, 255, 255, 0.6),
                              inset 0 -2px 0 rgba(0, 0, 0, 0.15)
                            `,
                            border: '1px solid rgba(255, 255, 255, 0.3)'
                          }}
                        >
                          {/* Glossy overlay */}
                          <div
                            className="absolute inset-0 rounded-2xl"
                            style={{
                              background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 100%)',
                              pointerEvents: 'none'
                            }}
                          />
                          {/* Shine effect on hover */}
                          <div
                            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                            style={{
                              background: 'linear-gradient(45deg, transparent 20%, rgba(255,255,255,0.5) 50%, transparent 80%)',
                              backgroundSize: '200% 200%',
                              animation: 'shine 2s infinite'
                            }}
                          />
                          {/* Icon/Image with rotation */}
                          <div className="relative z-10 group-hover:rotate-12 transition-transform duration-500 drop-shadow-lg w-full h-full p-2 flex items-center justify-center">
                            {category.image ? (
                              <Image
                                src={category.image}
                                alt={category.name}
                                width={56}
                                height={56}
                                className="w-full h-full object-cover drop-shadow-md"
                              />
                            ) : (
                              <FiGrid className="w-7 h-7 text-white" />
                            )}
                          </div>
                          {/* Bottom glow */}
                          <div
                            className="absolute inset-0 rounded-2xl opacity-40"
                            style={{
                              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25) 0%, transparent 50%)',
                              pointerEvents: 'none'
                            }}
                          />
                        </div>
                      </div>
                      <h3 className="text-sm font-bold text-[#212529] group-hover:text-[#2a63cd] transition-colors text-center line-clamp-2">{category.name}</h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      <section className="py-12 bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-black text-white mb-1">Productos Destacados</h2>
              <p className="text-sm text-white/80 font-medium">Aprovecha los mejores precios en tecnología</p>
            </div>
            <Link
              href="/productos"
              className="group px-5 py-2.5 bg-white text-[#2a63cd] text-sm font-bold rounded-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <span className="flex items-center gap-2">
                Ver todo
                <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>

          {formattedProducts.length === 0 ? (
            <div className="text-center py-8 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-white/20 mb-3">
                <FiClock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Próximamente</h3>
              <p className="text-xs text-white/70">Estamos preparando productos increíbles para ti</p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              {formattedProducts.map((product) => (
                <div key={product.id} className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] xl:w-[calc(25%-0.75rem)]">
                  <ProductCard product={product as any} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Services Section */}
      <section className="py-12 bg-white relative overflow-hidden" data-section="light">
        <SubtleParticles particleCount={15} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-[#212529] mb-3">Nuestros Servicios</h2>
            <p className="text-base text-[#6a6c6b]">
              Soluciones completas en tecnología
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'PC Gaming',
                description: 'Equipos gaming personalizados de alta gama',
                icon: <SiPcgamingwiki className="w-8 h-8" />,
                color: 'from-blue-600 to-indigo-600',
              },
              {
                title: 'Sistemas CCTV',
                description: 'Seguridad y videovigilancia profesional',
                icon: <PiSecurityCameraDuotone className="w-8 h-8" />,
                color: 'from-cyan-600 to-blue-600',
              },
              {
                title: 'Servicio Técnico',
                description: 'Reparación y mantenimiento especializado',
                icon: <FaScrewdriverWrench className="w-8 h-8" />,
                color: 'from-blue-500 to-cyan-500',
              },
              {
                title: 'Cursos Online',
                description: 'Formación en tecnología y programación',
                icon: <PiStudentDuotone className="w-8 h-8" />,
                color: 'from-indigo-500 to-purple-500',
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
                    <FiArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Request Product */}
      {companySettings?.ctaEnabled !== false && (
        <section className="py-12 bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-5 left-10 w-48 h-48 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-5 right-10 w-64 h-64 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          {/* Floating Tech Icons Animation */}
          <FloatingTechIcons />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-white text-center md:text-left">
                <h2 className="text-2xl font-bold mb-2">{companySettings?.ctaTitle || '¿No encuentras lo que buscas?'}</h2>
                <p className="text-base text-white/80">
                  {companySettings?.ctaDescription || 'Solicítanos cualquier producto tecnológico al mejor precio'}
                </p>
              </div>
              <Link
                href={companySettings?.ctaButtonLink || '/solicitar-producto'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#2a63cd] text-sm font-bold rounded-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap"
              >
                <FiSearch className="w-4 h-4" />
                {companySettings?.ctaButtonText || 'Solicitar Producto'}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-[#212529] text-white pt-12 pb-6 relative overflow-hidden" suppressHydrationWarning>
        {/* Metallic Grid Background Effect */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 50%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" suppressHydrationWarning>
            {/* Company Info */}
            <div suppressHydrationWarning>
              <div className="flex items-center gap-2 mb-2" suppressHydrationWarning>
                {companySettings?.logo ? (
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden">
                    <Image src={companySettings.logo} alt={companySettings.companyName || 'Logo'} fill className="object-contain" sizes="32px" unoptimized />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2a63cd] shadow-md">
                    <FiBox className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <h3
                    className="text-base font-bold text-white"
                    style={{ fontFamily: 'var(--font-tektrron), sans-serif' }}
                  >
                    {companySettings?.companyName || 'Electro Shop Morandin C.A.'}
                  </h3>
                  {companySettings?.rif && (
                    <p className="text-xs text-gray-500">RIF: {companySettings.rif}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                {companySettings?.tagline || 'Tu tienda de tecnología en Venezuela 🇻🇪'}
              </p>
              <div className="flex gap-2 flex-wrap">
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
                {companySettings?.telegram && (
                  <a href={companySettings.telegram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-[#2a63cd] transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.504-1.357 8.63-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  </a>
                )}
                {companySettings?.tiktok && (
                  <a href={companySettings.tiktok} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-[#2a63cd] transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
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
                <li><Link href="/contacto" className="hover:text-[#2a63cd] transition-colors">Contacto</Link></li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Servicios</h4>
              <ul className="space-y-1.5 text-xs text-gray-400">
                <li><Link href="/servicios" className="hover:text-[#2a63cd] transition-colors">PC Gaming</Link></li>
                <li><Link href="/servicios" className="hover:text-[#2a63cd] transition-colors">Sistemas CCTV</Link></li>
                <li><Link href="/servicios" className="hover:text-[#2a63cd] transition-colors">Servicio Técnico</Link></li>
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
                {companySettings?.phone && !isSeedPhoneNumber(companySettings.phone) && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#2a63cd] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${companySettings.phone}`} className="hover:text-[#2a63cd] transition-colors">
                      {companySettings.phone}
                    </a>
                  </li>
                )}
                {companySettings?.whatsapp && !isSeedPhoneNumber(companySettings.whatsapp) && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#2a63cd] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    <a href={`https://wa.me/${companySettings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#2a63cd] transition-colors">
                      {companySettings.whatsapp}
                    </a>
                  </li>
                )}
                {companySettings?.email && (
                  <li className="flex items-center gap-2">
                    <FiMail className="w-4 h-4 text-[#2a63cd] flex-shrink-0" />
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
              <p>&copy; 2025 Electro Shop Morandin C.A. Todos los derechos reservados.</p>
              <div className="flex gap-4">
                <Link href="/terminos" className="hover:text-[#2a63cd] transition-colors">Términos</Link>
                <Link href="/privacidad" className="hover:text-[#2a63cd] transition-colors">Privacidad</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <PageAnimations />
      <HotAdOverlay />
    </div>
  );
}
