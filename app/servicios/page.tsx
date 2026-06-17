import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import AnimatedWave from '@/components/AnimatedWave';
import ServiciosPortfolio from '@/components/servicios/ServiciosPortfolio';
import {
  FiMonitor, FiShield, FiCreditCard,
  FiAward, FiUsers, FiCheckCircle,
  FiMail, FiClock, FiVideo, FiCpu, FiHardDrive, FiSmartphone, FiHeadphones, FiWifi
} from 'react-icons/fi';
import { PiSecurityCameraDuotone } from 'react-icons/pi';
import { FaEthernet } from 'react-icons/fa';
import { SiPcgamingwiki } from 'react-icons/si';
import { FaScrewdriverWrench } from 'react-icons/fa6';

const FloatingTechIcons = () => {
  const icons = [
    { Icon: FiMonitor, delay: '0s', position: 'top-8 left-10' },
    { Icon: FiCpu, delay: '0.5s', position: 'top-20 right-16' },
    { Icon: FiHardDrive, delay: '1s', position: 'bottom-12 left-20' },
    { Icon: FiSmartphone, delay: '1.5s', position: 'bottom-8 right-12' },
    { Icon: FiHeadphones, delay: '2s', position: 'top-1/2 left-8' },
    { Icon: FiWifi, delay: '2.5s', position: 'top-1/3 right-8' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
      {icons.map(({ Icon, delay, position }, i) => (
        <div
          key={i}
          className={`absolute ${position} animate-bounce`}
          style={{ animationDelay: delay, animationDuration: '3s' }}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      ))}
    </div>
  );
};

export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.companySettings.findFirst({
    select: {
      servicesMetaTitle: true,
      servicesMetaDescription: true,
      servicesMetaKeywords: true,
      servicesMetaImage: true,
      logo: true,
      companyName: true,
    }
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshopve.com';

  const title = settings?.servicesMetaTitle || `Servicios | ${settings?.companyName || 'Electro Shop'}`;
  const description = settings?.servicesMetaDescription || 'Servicios profesionales tecnológicos para tu negocio. Instalación de CCTV, redes, puntos de venta y mantenimiento técnico.';
  const keywords = settings?.servicesMetaKeywords ? settings.servicesMetaKeywords.split(',').map(k => k.trim()) : undefined;

  const shareImage = settings?.servicesMetaImage || settings?.logo || '/og-image.png';
  const absoluteShareImage = shareImage.startsWith('http') ? shareImage : `${baseUrl}${shareImage.startsWith('/') ? '' : '/'}${shareImage}`;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      images: [{ url: absoluteShareImage }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: absoluteShareImage }],
    }
  };
}

export default async function ServiciosPage() {
  const [rawVideos, settings] = await Promise.all([
    prisma.techServiceVideo.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: { reviews: { select: { rating: true } } },
    }),
    prisma.companySettings.findFirst(),
  ]);

  const videos = rawVideos.map((v) => {
    const avg =
      v.reviews.length > 0
        ? v.reviews.reduce((s, r) => s + r.rating, 0) / v.reviews.length
        : null;
    return {
      ...v,
      avgRating: avg,
      reviewCount: v.reviews.length,
      reviews: undefined,
    };
  });

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader settings={settings ? JSON.parse(JSON.stringify(settings)) : null} />

      {/* Hero Section - Keep current version as requested */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden">
        {/* Floating Icons Effect */}
        <FloatingTechIcons />
        {/* Animated Background Particles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-0 lg:py-10 text-center">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-2 mb-2 lg:mb-4">
            <div className="h-0.5 w-8 lg:w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            <div className="px-2 lg:px-3 py-0.5 lg:py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <span className="text-[10px] lg:text-xs font-semibold text-white">Servicios Profesionales</span>
            </div>
            <div className="h-0.5 w-8 lg:w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-2 lg:mb-3 tracking-tight">
            Servicios <span className="bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">Tecnológicos</span>
          </h1>
          <p className="text-xs lg:text-base text-white/90 max-w-3xl mx-auto leading-relaxed">
            Soluciones integrales garantizadas para tu negocio.
          </p>
        </div>

        {/* Animated Wave Divider */}
        <AnimatedWave />
      </section>

      {/* 1. MODO MOBILE (lg:hidden) - Current Optimized Layout */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 sm:px-6 py-4 relative z-10">
        {/* 1. Portfolio Mobile (Trabajos Realizados) */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-[#212529] mb-1">Trabajos Realizados</h2>
            <p className="text-xs text-[#6a6c6b] max-w-md mx-auto leading-relaxed">
              Explora demostraciones en video, compara imágenes de Antes/Después y lee testimonios de nuestros clientes satisfechos. Filtra por categoría para ver nuestra experiencia.
            </p>
          </div>
          
          {videos.length > 0 ? (
            <ServiciosPortfolio videos={videos as any} />
          ) : (
            <div className="bg-[#f8f9fa] rounded-xl border border-dashed border-[#dee2e6] p-6 text-center shadow-sm">
              <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-[#2a63cd] mx-auto mb-3">
                <FiVideo className="w-5 h-5 opacity-80" />
              </div>
              <h3 className="text-sm font-bold text-[#212529] mb-1">Próximamente más proyectos</h3>
              <p className="text-[11px] text-[#6a6c6b] leading-normal max-w-xs mx-auto">
                Estamos preparando videos de CCTV, diseño de redes y mantenimiento técnico para compartirlos aquí muy pronto.
              </p>
            </div>
          )}
        </div>
        {/* 2. Servicios Especializados Mobile (Compact) */}
        <div className="bg-gradient-to-b from-white to-slate-50/50 rounded-2xl border border-slate-200/60 p-5 mb-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-[#212529]">Servicios Especializados</h2>
            <p className="text-xs text-gray-500 mt-1">Soluciones tecnológicas completas y garantizadas:</p>
          </div>
          <div className="space-y-3">
            {/* CCTV */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-slate-50/50 transition-all border border-slate-200/50 hover:border-[#2a63cd]/30 shadow-[0_2px_8px_rgba(0,0,0,0.015)] group">
              <div className="w-9 h-9 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 text-[#2a63cd] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-[#2a63cd] group-hover:to-[#1e4ba3] group-hover:text-white group-hover:scale-105 transition-all duration-300">
                <PiSecurityCameraDuotone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xs text-[#212529] group-hover:text-[#2a63cd] transition-colors">Sistemas CCTV</h3>
                <p className="text-[10px] text-gray-500 truncate">Instalación y monitoreo de cámaras de videovigilancia 24/7.</p>
              </div>
            </div>
            {/* Redes */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-slate-50/50 transition-all border border-slate-200/50 hover:border-[#2a63cd]/30 shadow-[0_2px_8px_rgba(0,0,0,0.015)] group">
              <div className="w-9 h-9 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 text-[#2a63cd] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-[#2a63cd] group-hover:to-[#1e4ba3] group-hover:text-white group-hover:scale-105 transition-all duration-300">
                <FaEthernet className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xs text-[#212529] group-hover:text-[#2a63cd] transition-colors">Diseño de Redes</h3>
                <p className="text-[10px] text-gray-500 truncate">Conectividad, cableado estructurado y redes estables.</p>
              </div>
            </div>
            {/* POS */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-slate-50/50 transition-all border border-slate-200/50 hover:border-[#2a63cd]/30 shadow-[0_2px_8px_rgba(0,0,0,0.015)] group">
              <div className="w-9 h-9 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 text-[#2a63cd] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-[#2a63cd] group-hover:to-[#1e4ba3] group-hover:text-white group-hover:scale-105 transition-all duration-300">
                <FiCreditCard className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xs text-[#212529] group-hover:text-[#2a63cd] transition-colors">Puntos de Venta POS</h3>
                <p className="text-[10px] text-gray-500 truncate">Sistemas de facturación y control comercial para tu negocio.</p>
              </div>
            </div>
            {/* Gaming PC */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-slate-50/50 transition-all border border-slate-200/50 hover:border-[#2a63cd]/30 shadow-[0_2px_8px_rgba(0,0,0,0.015)] group">
              <div className="w-9 h-9 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 text-[#2a63cd] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-[#2a63cd] group-hover:to-[#1e4ba3] group-hover:text-white group-hover:scale-105 transition-all duration-300">
                <SiPcgamingwiki className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xs text-[#212529] group-hover:text-[#2a63cd] transition-colors">Gaming PC</h3>
                <p className="text-[10px] text-gray-500 truncate">Ensamblaje y optimización de computadoras de alto rendimiento.</p>
              </div>
            </div>
            {/* Consolas */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-slate-50/50 transition-all border border-slate-200/50 hover:border-[#2a63cd]/30 shadow-[0_2px_8px_rgba(0,0,0,0.015)] group">
              <div className="w-9 h-9 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 text-[#2a63cd] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-[#2a63cd] group-hover:to-[#1e4ba3] group-hover:text-white group-hover:scale-105 transition-all duration-300">
                <FiShield className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xs text-[#212529] group-hover:text-[#2a63cd] transition-colors">Mantenimiento de Consolas</h3>
                <p className="text-[10px] text-gray-500 truncate">Servicio técnico para Xbox, PlayStation, Steam Deck y Switch.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Por qué confiar en nosotros Mobile (Compact) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-bold text-center text-[#212529] mb-4">¿Por qué confiar en nosotros?</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100/50">
              <FiAward className="w-6 h-6 text-[#2a63cd] mx-auto mb-1.5" />
              <h3 className="font-bold text-xs text-[#212529] mb-0.5">Experiencia</h3>
              <p className="text-[9px] text-gray-500">+10 años de trayectoria.</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100/50">
              <FiUsers className="w-6 h-6 text-[#2a63cd] mx-auto mb-1.5" />
              <h3 className="font-bold text-xs text-[#212529] mb-0.5">Equipo Pro</h3>
              <p className="text-[9px] text-gray-500">Técnicos certificados.</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100/50">
              <FiCheckCircle className="w-6 h-6 text-[#2a63cd] mx-auto mb-1.5" />
              <h3 className="font-bold text-xs text-[#212529] mb-0.5">Garantía</h3>
              <p className="text-[9px] text-gray-500">Soporte post-servicio.</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100/50">
              <FiClock className="w-6 h-6 text-[#2a63cd] mx-auto mb-1.5" />
              <h3 className="font-bold text-xs text-[#212529] mb-0.5">Atención Rápida</h3>
              <p className="text-[9px] text-gray-500">Respuesta inmediata.</p>
            </div>
          </div>
        </div>

        {/* 4. Modalidades Mobile (Compact) */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-100/80 text-center shadow-sm">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-[#2a63cd] mx-auto mb-2 shadow-sm">
              <FiMonitor className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-[#212529] mb-1">Servicios On-Site</h3>
            <p className="text-[9px] text-gray-500 leading-tight">Instalación y soporte directamente en tu negocio o empresa.</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-100/80 text-center shadow-sm">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-[#2a63cd] mx-auto mb-2 shadow-sm">
              <FiShield className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-[#212529] mb-1">Soporte Técnico</h3>
            <p className="text-[9px] text-gray-500 leading-tight">Asistencia remota e incidencias críticas 24/7.</p>
          </div>
        </div>

        {/* CTA Mobile */}
        <div className="bg-gradient-to-br from-[#2a63cd] to-[#1a3b7e] rounded-xl p-6 text-center text-white">
          <h2 className="text-base font-bold mb-2">¿Necesitas ayuda?</h2>
          <p className="text-xs mb-4 text-white/80">Cotiza hoy mismo con nosotros.</p>
          <Link href="/contacto" className="block w-full py-2.5 bg-white text-[#2a63cd] rounded-lg font-bold text-xs text-center hover:bg-gray-100 transition-all">Enviar Solicitud</Link>
        </div>
      </div>

      {/* 2. MODO ESCRITORIO (hidden lg:block) - Reorganized & Compacted */}
      <div className="hidden lg:block max-w-7xl mx-auto px-8 py-12 relative z-10">
        {/* 1. Portfolio Desktop (Trabajos Realizados) */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#212529] mb-3">Trabajos Realizados</h2>
            <p className="text-base text-[#6a6c6b] max-w-2xl mx-auto leading-relaxed">
              Descubre cómo trabajamos a través de demostraciones en video en tiempo real de nuestros proyectos de ingeniería, redes y CCTV. Compara el estado del equipamiento antes y después del servicio técnico, y lee las opiniones y calificaciones de nuestros clientes.
            </p>
          </div>
          
          {videos.length > 0 ? (
            <ServiciosPortfolio videos={videos as any} />
          ) : (
            <div className="relative bg-gradient-to-r from-[#f8f9fa] to-white rounded-2xl border-2 border-dashed border-[#e9ecef] p-12 text-center overflow-hidden max-w-3xl mx-auto shadow-sm">
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-[#2a63cd]/5 rounded-full blur-xl pointer-events-none"></div>
              <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-[#2a63cd] mx-auto mb-4 shadow-sm">
                <FiVideo className="w-8 h-8 opacity-80 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-[#212529] mb-2">Construyendo nuestro portafolio digital</h3>
              <p className="text-sm text-[#6a6c6b] max-w-md mx-auto leading-relaxed">
                Próximamente verás aquí grabaciones de instalaciones de CCTV, configuraciones de racks de redes y diagnósticos de equipos gaming. ¡Vuelve pronto para ver nuestro portafolio de trabajos en acción!
              </p>
            </div>
          )}
        </div>

        {/* 2. Servicios Especializados Desktop (Compact) */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#212529] mb-2">Servicios Especializados</h2>
            <p className="text-base text-[#6a6c6b] max-w-xl mx-auto">
              Soluciones tecnológicas completas adaptadas a tus requerimientos:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* CCTV Card */}
            <div className="bg-gradient-to-b from-white to-slate-50/30 rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:border-[#2a63cd]/45 hover:shadow-[0_15px_35px_rgba(42,99,205,0.09)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 text-[#2a63cd] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:from-[#2a63cd] group-hover:to-[#1e4ba3] group-hover:text-white group-hover:shadow-[0_8px_20px_rgba(42,99,205,0.2)] transition-all duration-300">
                <PiSecurityCameraDuotone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-[#212529] text-base mb-1.5 group-hover:text-[#2a63cd] transition-colors">Sistemas CCTV</h3>
              <p className="text-xs text-gray-500 leading-normal">Instalación y monitoreo de cámaras de videovigilancia profesional.</p>
            </div>

            {/* Redes Card */}
            <div className="bg-gradient-to-b from-white to-slate-50/30 rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:border-[#2a63cd]/45 hover:shadow-[0_15px_35px_rgba(42,99,205,0.09)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 text-[#2a63cd] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:from-[#2a63cd] group-hover:to-[#1e4ba3] group-hover:text-white group-hover:shadow-[0_8px_20px_rgba(42,99,205,0.2)] transition-all duration-300">
                <FaEthernet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#212529] text-base mb-1.5 group-hover:text-[#2a63cd] transition-colors">Diseño de Redes</h3>
              <p className="text-xs text-gray-500 leading-normal">Despliegue de redes estructuradas e inalámbricas corporativas.</p>
            </div>

            {/* POS Card */}
            <div className="bg-gradient-to-b from-white to-slate-50/30 rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:border-[#2a63cd]/45 hover:shadow-[0_15px_35px_rgba(42,99,205,0.09)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 text-[#2a63cd] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:from-[#2a63cd] group-hover:to-[#1e4ba3] group-hover:text-white group-hover:shadow-[0_8px_20px_rgba(42,99,205,0.2)] transition-all duration-300">
                <FiCreditCard className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-[#212529] text-base mb-1.5 group-hover:text-[#2a63cd] transition-colors">Puntos de Venta</h3>
              <p className="text-xs text-gray-500 leading-normal">Instalación y soporte de sistemas comerciales de facturación.</p>
            </div>

            {/* Gaming PC Card */}
            <div className="bg-gradient-to-b from-white to-slate-50/30 rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:border-[#2a63cd]/45 hover:shadow-[0_15px_35px_rgba(42,99,205,0.09)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 text-[#2a63cd] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:from-[#2a63cd] group-hover:to-[#1e4ba3] group-hover:text-white group-hover:shadow-[0_8px_20px_rgba(42,99,205,0.2)] transition-all duration-300">
                <SiPcgamingwiki className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-[#212529] text-base mb-1.5 group-hover:text-[#2a63cd] transition-colors">PC Gaming</h3>
              <p className="text-xs text-gray-500 leading-normal">Ensamblaje y personalización de computadoras de alto rendimiento.</p>
            </div>

            {/* Consolas Card */}
            <div className="bg-gradient-to-b from-white to-slate-50/30 rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:border-[#2a63cd]/45 hover:shadow-[0_15px_35px_rgba(42,99,205,0.09)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 text-[#2a63cd] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:from-[#2a63cd] group-hover:to-[#1e4ba3] group-hover:text-white group-hover:shadow-[0_8px_20px_rgba(42,99,205,0.2)] transition-all duration-300">
                <FiShield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-[#212529] text-base mb-1.5 group-hover:text-[#2a63cd] transition-colors">Mantenimiento</h3>
              <p className="text-xs text-gray-500 leading-normal">Servicio técnico de consolas (PS5, Xbox, Switch, Steam Deck).</p>
            </div>
          </div>
        </div>

        {/* 3. Por qué confiar en nosotros Desktop (Compact) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-[#212529] mb-6 text-center">¿Por qué confiar en nosotros?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div className="w-10 h-10 bg-[#2a63cd]/10 text-[#2a63cd] rounded-xl flex items-center justify-center mx-auto mb-3">
                <FiAward className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm mb-1 text-[#212529]">Experiencia Comprobada</h3>
              <p className="text-gray-500 text-[11px] leading-relaxed">Más de 10 años brindando soluciones de tecnología.</p>
            </div>
            <div className="text-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div className="w-10 h-10 bg-[#2a63cd]/10 text-[#2a63cd] rounded-xl flex items-center justify-center mx-auto mb-3">
                <FiUsers className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm mb-1 text-[#212529]">Equipo Profesional</h3>
              <p className="text-gray-500 text-[11px] leading-relaxed">Técnicos calificados y especializados.</p>
            </div>
            <div className="text-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div className="w-10 h-10 bg-[#2a63cd]/10 text-[#2a63cd] rounded-xl flex items-center justify-center mx-auto mb-3">
                <FiCheckCircle className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm mb-1 text-[#212529]">Garantía de Calidad</h3>
              <p className="text-gray-500 text-[11px] leading-relaxed">Soporte post-instalación incluido.</p>
            </div>
            <div className="text-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div className="w-10 h-10 bg-[#2a63cd]/10 text-[#2a63cd] rounded-xl flex items-center justify-center mx-auto mb-3">
                <FiClock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm mb-1 text-[#212529]">Atención Rápida</h3>
              <p className="text-gray-500 text-[11px] leading-relaxed">Respuesta ágil a tus requerimientos.</p>
            </div>
          </div>
        </div>

        {/* 4. Modalidades de Servicio Desktop (Compact) */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/20 rounded-2xl p-6 border border-blue-200/60 shadow-sm flex gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#2a63cd] shadow-sm flex-shrink-0 border border-blue-100">
              <FiMonitor className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#212529]">Servicios On-Site</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">Instalación y evaluación directa en tu negocio o empresa con personal especializado:</p>
              <ul className="grid grid-cols-2 gap-2 text-xs text-gray-600 font-medium">
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#2a63cd] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Instalación directa</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#2a63cd] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Capacitación de uso</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#2a63cd] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Evaluación de espacio</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#2a63cd] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Documentación técnica</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100/20 rounded-2xl p-6 border border-blue-200/60 shadow-sm flex gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#2a63cd] shadow-sm flex-shrink-0 border border-blue-100">
              <FiShield className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#212529]">Soporte Técnico</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">Asistencia técnica e incidencias para el mantenimiento de tus sistemas:</p>
              <ul className="grid grid-cols-2 gap-2 text-xs text-gray-600 font-medium">
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#2a63cd] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Mantenimiento preventivo</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#2a63cd] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Garantía extendida</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#2a63cd] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Atención remota 24/7</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#2a63cd] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Actualizaciones de software</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Final Desktop (GitHub Version) */}
        <div className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] text-white rounded-2xl p-8 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-cyan-300 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          <div className="relative">
            <FiMail className="w-16 h-16 text-white/80 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">¿Necesitas alguno de nuestros servicios?</h2>
            <p className="text-lg mb-6 text-white/90">Envíanos tu solicitud y recibe una cotización personalizada en menos de 24 horas</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contacto" className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-[#2a63cd] rounded-xl font-semibold hover:bg-gray-50 transition-all hover:scale-105 shadow-xl">
                <FiMail className="w-5 h-5" />
                Enviar Solicitud
              </Link>
              <a href={`https://wa.me/${settings?.whatsapp?.replace(/\D/g, '') || '582572511282'}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all hover:scale-105 shadow-xl">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  </div>

  <Footer />
</div>
  );
}
