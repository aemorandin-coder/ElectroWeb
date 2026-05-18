import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import ProductCarousel from '@/components/home/ProductCarousel';
import VideoPlayer from '@/components/home/VideoPlayer';
import HomeSearchBar from '@/components/home/HomeSearchBar';
import Footer from '@/components/Footer';
import { FiArrowRight, FiShield, FiMessageCircle, FiCode, FiBox, FiSmartphone, FiSearch, FiCreditCard } from 'react-icons/fi';
import { SiPcgamingwiki, SiPlaystation, SiSteam, SiRoblox, SiGoogleplay, SiApple, SiBinance, SiZelle, SiPaypal } from 'react-icons/si';
import { PiSecurityCameraDuotone, PiStudentDuotone } from 'react-icons/pi';
import { FaScrewdriverWrench, FaXbox } from 'react-icons/fa6';
import dynamic from 'next/dynamic';

const PageAnimations = dynamic(() => import('@/components/public/PageAnimations'));
const HotAdOverlay = dynamic(() => import('@/components/HotAdOverlay'));

export const revalidate = 60;


export default async function Home() {
  const [featuredProducts, companySettings] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      take: 8,
      include: { category: true, brand: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.companySettings.findFirst(),
  ]);

  const formattedProducts = featuredProducts.map(p => ({
    ...p,
    priceUSD: Number(p.priceUSD),
    priceVES: p.priceVES ? Number(p.priceVES) : null,
    weightKg: p.weightKg ? Number(p.weightKg) : null,
    shippingCost: p.shippingCost ? Number(p.shippingCost) : null,
    images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images,
  }));

  const settings = companySettings ? JSON.parse(JSON.stringify(companySettings)) : null;

  // Gift card platforms for display
  const GIFT_PLATFORMS = [
    { name: 'PlayStation', color: '#003791', icon: <SiPlaystation />, href: '/productos?search=PlayStation' },
    { name: 'Xbox', color: '#107c10', icon: <FaXbox />, href: '/productos?search=Xbox' },
    { name: 'Steam', color: '#1b2838', icon: <SiSteam />, href: '/productos?search=Steam' },
    { name: 'Roblox', color: '#e31b1b', icon: <SiRoblox />, href: '/productos?search=Roblox' },
    { name: 'Google Play', color: '#34a853', icon: <SiGoogleplay />, href: '/productos?search=Google' },
    { name: 'Apple', color: '#555', icon: <SiApple />, href: '/productos?search=Apple' },
  ];

  const PAYMENT_METHODS = [
    { name: 'Binance', icon: <SiBinance />, color: '#F0B90B', bg: '#fff8e7' },
    { name: 'Zelle', icon: <SiZelle />, color: '#6D1ED4', bg: '#f3eeff' },
    { name: 'PayPal', icon: <SiPaypal />, color: '#003087', bg: '#e8f0ff' },
    { name: 'Pago Móvil', icon: <FiSmartphone />, color: '#2a63cd', bg: '#e8f0ff' },
  ];

  return (
    <div id="homepage-root" className="min-h-screen bg-white">
      <PublicHeader settings={settings} />

      {/* ═══ HERO — BUSCADOR PRIMERO ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a3b7e] via-[#2a63cd] to-[#1e4ba3] pt-8 pb-12 sm:pt-16 sm:pb-20">
        {/* Efectos de neón y malla (Mesh Gradient / Glows) - Visible in mobile and desktop */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[10%] -right-[20%] w-[70%] h-[70%] sm:w-[50%] sm:h-[50%] bg-white/10 rounded-full blur-[80px] sm:blur-[120px]" />
          <div className="absolute top-[20%] -left-[20%] w-[60%] h-[60%] sm:w-[40%] sm:h-[40%] bg-cyan-400/20 rounded-full blur-[80px] sm:blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[20%] w-[80%] h-[80%] sm:w-[60%] sm:h-[60%] bg-blue-500/20 rounded-full blur-[80px] sm:blur-[120px]" />
          {/* Textura de ruido inline */}
          <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-8 pb-4 sm:pt-12 sm:pb-8 text-center">

          {/* Título Épico Dinámico */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white mb-4 sm:mb-6 leading-[1.1] tracking-tight">
            {settings?.heroTitle ? (
              <span dangerouslySetInnerHTML={{ __html: settings.heroTitle.replace(/Gamer/g, '<span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200 drop-shadow-sm">Gamer</span>') }} />
            ) : (
              <>
                Reseller de <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200 drop-shadow-sm">Tecnología</span><br className="hidden sm:block" /> a nivel nacional
              </>
            )}
          </h1>

          <p className="text-white/80 text-sm sm:text-lg mb-8 max-w-2xl mx-auto font-medium leading-relaxed px-2">
            {settings?.heroSubtitle || "Electrónica de consumo, computadoras gaming, consolas y repuestos. Todo en un solo lugar con envíos a nivel nacional."}
          </p>

          {/* Buscador Dinámico */}
          <div className="max-w-2xl mx-auto">
            <HomeSearchBar />
          </div>
        </div>
      </section>

      {/* ═══ CATÁLOGO DIGITAL — GAMING & SALDO ═══ */}
      <section className="py-12 bg-gradient-to-b from-[#1e4ba3] to-[#1a3b7e] relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        {/* Orbes de luz ambientales gaming */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] -left-[10%] w-[350px] h-[350px] bg-cyan-500/15 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-[20%] -right-[10%] w-[350px] h-[350px] bg-purple-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="max-w-5xl mx-auto px-4 relative z-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                Catálogo Digital
              </h2>
              <p className="text-sm text-white/70 mt-1">Saldo, suscripciones y juegos instantáneos</p>
            </div>
            <Link href="/productos" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl text-sm font-bold hover:bg-white/20 transition-all active:scale-95 shadow-lg">
              Explorar catálogo <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Grid de plataformas (Glassmorphism + Iluminación de Marca) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
            {GIFT_PLATFORMS.map(platform => (
              <Link
                key={platform.name}
                href={platform.href}
                className="platform-card group relative flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.08] transition-all duration-300 hover:-translate-y-1.5 overflow-hidden shadow-lg"
                style={{ '--platform-color': platform.color } as React.CSSProperties}
              >
                {/* Glow de fondo en hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-25 transition-opacity duration-500 rounded-2xl" 
                  style={{ background: `radial-gradient(circle at center, ${platform.color} 0%, transparent 80%)` }}
                />
                
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-3xl mb-3 relative z-10 transition-all duration-300 group-hover:scale-110 drop-shadow-md"
                  style={{ color: platform.name === 'Apple' ? '#fff' : platform.color, filter: `drop-shadow(0 0 12px ${platform.color}60)` }}
                >
                  {platform.icon}
                </div>
                <span className="text-xs sm:text-sm font-bold text-white text-center tracking-wide relative z-10">{platform.name}</span>
              </Link>
            ))}
          </div>

          {/* Trust Banner / Payment Methods - Subtle */}
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2">
                <FiShield className="w-4 h-4 text-cyan-400" />
                Pagos automáticos
              </h3>
              <p className="text-xs text-white/70 max-w-md mx-auto md:mx-0 leading-relaxed">
                Usa nuestra herramienta de recarga en <b>Bolívares</b>. Paga con Pago Móvil de forma automática y tu saldo estará disponible al instante para comprar cualquier producto.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4 flex-1">
              {PAYMENT_METHODS.map(m => (
                <div key={m.name} className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors group" title={m.name}>
                  <span className="text-xl group-hover:scale-110 transition-transform" style={{ color: m.color }}>{m.icon}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CÓMO COMPRAR ═══ */}
      <section className="py-16 bg-[#f8f9fa] relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/50 to-transparent rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-cyan-100/40 to-transparent rounded-full blur-3xl pointer-events-none transform -translate-x-1/2 translate-y-1/2" />
        
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-[#2a63cd]/10 text-[#2a63cd] text-xs font-bold tracking-widest uppercase rounded-full mb-4">
              Proceso Simple
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#1a1a1a] tracking-tight">¿Cómo funciona?</h2>
            <p className="text-[#6a6c6b] mt-3 max-w-lg mx-auto text-sm sm:text-base font-medium">Diseñado para que tengas tus productos de la manera más rápida, segura y transparente.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative">
            {/* Connecting Line (Desktop Only) */}
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-[#2a63cd]/20 to-transparent -translate-y-[100px] z-0" />

            {[
              { 
                step: '1', 
                icon: <FiSearch className="w-7 h-7 text-[#2a63cd]" />, 
                title: 'Explora y Elige', 
                desc: 'Navega por nuestro catálogo nacional. Selecciona tecnología, consolas o saldo digital de forma intuitiva.',
                delay: '0ms'
              },
              { 
                step: '2', 
                icon: <FiCreditCard className="w-7 h-7 text-white" />, 
                title: 'Pago Flexible', 
                desc: 'Múltiples opciones: Pago Móvil, Binance, Zelle, PayPal o efectivo. Tú decides cómo pagar.',
                isPrimary: true,
                delay: '100ms'
              },
              { 
                step: '3', 
                icon: <FiBox className="w-7 h-7 text-[#2a63cd]" />, 
                title: 'Recepción Rápida', 
                desc: 'Códigos digitales al instante o envíos seguros a nivel nacional con tu transportista de confianza.',
                delay: '200ms'
              },
            ].map((s) => (
              <div 
                key={s.step} 
                className={`relative group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 z-10 border border-gray-100 ${s.isPrimary ? 'ring-2 ring-[#2a63cd] ring-offset-2 ring-offset-[#f8f9fa]' : ''}`}
                style={{ animationDelay: s.delay }}
              >
                {/* Step Number Badge */}
                <div className={`absolute -top-3 -left-3 w-8 h-8 ${s.isPrimary ? 'bg-[#1e4ba3]' : 'bg-[#2a63cd]'} text-white text-sm font-black rounded-xl flex items-center justify-center shadow-md transform -rotate-6 group-hover:rotate-0 transition-transform`}>
                  {s.step}
                </div>

                {/* Icon Container */}
                <div className="mb-4 relative inline-block">
                  <div className={`absolute inset-0 bg-[#2a63cd] rounded-xl blur-md opacity-20 group-hover:opacity-40 transition-opacity`} />
                  <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transform group-hover:scale-105 transition-transform ${s.isPrimary ? 'bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3]' : 'bg-blue-50 border border-blue-100'}`}>
                    {s.icon}
                  </div>
                </div>

                <h3 className="font-bold text-[#1a1a1a] text-base mb-2">{s.title}</h3>
                <p className="text-xs text-[#6a6c6b] leading-relaxed font-medium">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-16 text-center animate-fadeIn" style={{ animationDelay: '400ms' }}>
            <Link
              href="/registro"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-2xl hover:shadow-[0_0_20px_rgba(42,99,205,0.4)] transition-all duration-300 active:scale-95 text-base overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10">Únete a Electro Shop Gratis</span>
              <FiArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-sm text-[#6a6c6b] mt-4 font-medium">
              ¿Ya eres cliente? <Link href="/login" className="text-[#2a63cd] font-bold hover:underline hover:text-[#1e4ba3] transition-colors">Inicia sesión aquí</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ═══ PRODUCTOS DESTACADOS ═══ */}
      {formattedProducts.length > 0 && (
        <section className="py-10 bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-5 left-5 w-48 h-48 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-5 right-5 w-64 h-64 bg-cyan-300 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Productos Destacados</h2>
                <p className="text-xs text-white/70 mt-0.5">Los más populares de nuestra tienda</p>
              </div>
              <Link href="/productos" className="flex items-center gap-1 text-white text-sm font-bold hover:opacity-80">
                Ver todo <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <ProductCarousel products={formattedProducts} itemsPerPage={4} />
          </div>
        </section>
      )}


      {/* ═══ SERVICIOS ═══ */}
      <section className="py-10 bg-[#f8f9fa]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-[#212529]">Nuestros Servicios</h2>
            <p className="text-sm text-[#6a6c6b] mt-1">Soluciones tecnológicas completas</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { title: 'PC Gaming', icon: <SiPcgamingwiki className="w-7 h-7" />, href: '/servicios' },
              { title: 'CCTV', icon: <PiSecurityCameraDuotone className="w-7 h-7" />, href: '/servicios' },
              { title: 'Serv. Técnico', icon: <FaScrewdriverWrench className="w-7 h-7" />, href: '/servicios' },
              { title: 'Cursos Online', icon: <PiStudentDuotone className="w-7 h-7" />, href: '/cursos' },
              { title: 'Software', icon: <FiCode className="w-7 h-7" />, href: '/servicios' },
            ].map((s, i) => (
              <Link
                key={i}
                href={s.href}
                className="group flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-[#e9ecef] hover:border-[#2a63cd] hover:shadow-lg transition-all active:scale-95 text-center"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                  {s.icon}
                </div>
                <span className="text-xs font-bold text-[#212529] group-hover:text-[#2a63cd] transition-colors leading-tight">{s.title}</span>
              </Link>
            ))}
          </div>
          <div className="mt-5 text-center">
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-[#2a63cd] text-[#2a63cd] font-bold rounded-xl hover:bg-[#2a63cd] hover:text-white transition-all text-sm active:scale-95"
            >
              <FiMessageCircle className="w-4 h-4" />
              Solicitar cotización por WhatsApp
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ VIDEO REVIEWS ═══ */}
      <section className="py-12 bg-gradient-to-br from-[#1a3b7e] to-[#2a63cd] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-6">Reviews y Novedades</h2>
          <VideoPlayer videoId="jfKfPfyJRdk" />
        </div>
      </section>

      <Footer />

      <PageAnimations />
      <HotAdOverlay />
    </div>
  );
}
 

