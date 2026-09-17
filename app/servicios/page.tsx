import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import PageHeader from '@/components/ui/PageHeader';
import { getPublicSettings } from '@/lib/site-settings';
import ServiciosPortfolio, { type Video } from '@/components/servicios/ServiciosPortfolio';
import { FiMonitor, FiShield, FiCreditCard, FiAward, FiUsers, FiCheckCircle, FiMail, FiClock, FiVideo, FiTool } from 'react-icons/fi';
import { PiSecurityCameraDuotone } from 'react-icons/pi';
import { FaEthernet } from 'react-icons/fa';
import { SiPcgamingwiki } from 'react-icons/si';

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
    getPublicSettings(),
  ]);

  const videos: Video[] = rawVideos.map((v) => {
    const avg =
      v.reviews.length > 0
        ? v.reviews.reduce((s, r) => s + r.rating, 0) / v.reviews.length
        : null;
    return {
      id: v.id,
      title: v.title,
      description: v.description,
      videoUrl: v.videoUrl,
      thumbnail: v.thumbnail,
      platform: v.platform,
      category: v.category,
      beforeImage: v.beforeImage,
      afterImage: v.afterImage,
      customerName: v.customerName,
      testimonial: v.testimonial,
      avgRating: avg,
      reviewCount: v.reviews.length,
    };
  });

  return (
    <div className="min-h-dvh bg-white">
      <PublicHeader />

      <PageHeader
        breadcrumbs={[{ label: 'Servicios' }]}
        icon={<FiTool />}
        eyebrow="Servicios profesionales"
        title="Servicios tecnológicos"
        description="Instalación de CCTV, redes, puntos de venta y servicio técnico. Soluciones garantizadas para tu negocio."
      />

      {/* 1. MODO MOBILE (lg:hidden) - Current Optimized Layout */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* 1. Portfolio Mobile (Trabajos Realizados) */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-ink mb-1">Trabajos Realizados</h2>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
              Explora demostraciones en video, compara imágenes de Antes/Después y lee testimonios de nuestros clientes satisfechos. Filtra por categoría para ver nuestra experiencia.
            </p>
          </div>
          
          {videos.length > 0 ? (
            <ServiciosPortfolio videos={videos} />
          ) : (
            <div className="bg-surface rounded-xl border border-dashed border-line-strong p-6 text-center shadow-sm">
              <div className="w-10 h-10 bg-brand-50 border border-brand-200 rounded-full flex items-center justify-center text-brand-500 mx-auto mb-3">
                <FiVideo className="w-5 h-5 opacity-80" />
              </div>
              <h3 className="text-sm font-bold text-ink mb-1">Próximamente más proyectos</h3>
              <p className="text-[11px] text-muted leading-normal max-w-xs mx-auto">
                Estamos preparando videos de CCTV, diseño de redes y mantenimiento técnico para compartirlos aquí muy pronto.
              </p>
            </div>
          )}
        </div>
        {/* 2. Servicios Especializados Mobile (Compact) */}
        <div className="bg-white rounded-2xl border border-line p-5 mb-8 shadow-xs">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-ink">Servicios Especializados</h2>
            <p className="text-xs text-muted mt-1">Soluciones tecnológicas completas y garantizadas:</p>
          </div>
          <div className="space-y-3">
            {/* CCTV */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-surface transition-all border border-line hover:border-brand-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.015)] group">
              <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <PiSecurityCameraDuotone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xs text-ink group-hover:text-brand-500 transition-colors">Sistemas CCTV</h3>
                <p className="text-xs text-muted truncate">Instalación y monitoreo de cámaras de videovigilancia 24/7.</p>
              </div>
            </div>
            {/* Redes */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-surface transition-all border border-line hover:border-brand-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.015)] group">
              <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FaEthernet className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xs text-ink group-hover:text-brand-500 transition-colors">Diseño de Redes</h3>
                <p className="text-xs text-muted truncate">Conectividad, cableado estructurado y redes estables.</p>
              </div>
            </div>
            {/* POS */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-surface transition-all border border-line hover:border-brand-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.015)] group">
              <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FiCreditCard className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xs text-ink group-hover:text-brand-500 transition-colors">Puntos de Venta POS</h3>
                <p className="text-xs text-muted truncate">Sistemas de facturación y control comercial para tu negocio.</p>
              </div>
            </div>
            {/* Gaming PC */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-surface transition-all border border-line hover:border-brand-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.015)] group">
              <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <SiPcgamingwiki className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xs text-ink group-hover:text-brand-500 transition-colors">Gaming PC</h3>
                <p className="text-xs text-muted truncate">Ensamblaje y optimización de computadoras de alto rendimiento.</p>
              </div>
            </div>
            {/* Consolas */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-surface transition-all border border-line hover:border-brand-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.015)] group">
              <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FiShield className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xs text-ink group-hover:text-brand-500 transition-colors">Mantenimiento de Consolas</h3>
                <p className="text-xs text-muted truncate">Servicio técnico para Xbox, PlayStation, Steam Deck y Switch.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Por qué confiar en nosotros Mobile (Compact) */}
        <div className="bg-white rounded-2xl border border-line p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-bold text-center text-ink mb-4">¿Por qué confiar en nosotros?</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-surface rounded-xl border border-line">
              <FiAward className="w-6 h-6 text-brand-500 mx-auto mb-1.5" />
              <h3 className="font-bold text-xs text-ink mb-0.5">Experiencia</h3>
              <p className="text-[11px] text-muted">+10 años de trayectoria.</p>
            </div>
            <div className="text-center p-3 bg-surface rounded-xl border border-line">
              <FiUsers className="w-6 h-6 text-brand-500 mx-auto mb-1.5" />
              <h3 className="font-bold text-xs text-ink mb-0.5">Equipo Pro</h3>
              <p className="text-[11px] text-muted">Técnicos certificados.</p>
            </div>
            <div className="text-center p-3 bg-surface rounded-xl border border-line">
              <FiCheckCircle className="w-6 h-6 text-brand-500 mx-auto mb-1.5" />
              <h3 className="font-bold text-xs text-ink mb-0.5">Garantía</h3>
              <p className="text-[11px] text-muted">Soporte post-servicio.</p>
            </div>
            <div className="text-center p-3 bg-surface rounded-xl border border-line">
              <FiClock className="w-6 h-6 text-brand-500 mx-auto mb-1.5" />
              <h3 className="font-bold text-xs text-ink mb-0.5">Atención Rápida</h3>
              <p className="text-[11px] text-muted">Respuesta inmediata.</p>
            </div>
          </div>
        </div>

        {/* 4. Modalidades Mobile (Compact) */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-brand-50 rounded-xl p-4 border border-brand-200 text-center shadow-xs">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-brand-500 mx-auto mb-2 shadow-sm">
              <FiMonitor className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-ink mb-1">Servicios On-Site</h3>
            <p className="text-[11px] text-muted leading-tight">Instalación y soporte directamente en tu negocio o empresa.</p>
          </div>
          <div className="bg-brand-50 rounded-xl p-4 border border-brand-200 text-center shadow-xs">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-brand-500 mx-auto mb-2 shadow-sm">
              <FiShield className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-ink mb-1">Soporte Técnico</h3>
            <p className="text-[11px] text-muted leading-tight">Asistencia remota e incidencias críticas 24/7.</p>
          </div>
        </div>

        {/* CTA Mobile */}
        <div className="bg-brand-600 rounded-xl p-6 text-center text-white">
          <h2 className="text-base font-bold mb-2">¿Necesitas ayuda?</h2>
          <p className="text-xs mb-4 text-white/80">Cotiza hoy mismo con nosotros.</p>
          <Link href="/contacto" className="block w-full py-2.5 bg-white text-brand-500 rounded-lg font-bold text-xs text-center hover:bg-surface transition-all">Enviar Solicitud</Link>
        </div>
      </div>

      {/* 2. MODO ESCRITORIO (hidden lg:block) - Reorganized & Compacted */}
      <div className="hidden lg:block max-w-7xl mx-auto px-8 py-12">
        {/* 1. Portfolio Desktop (Trabajos Realizados) */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-ink mb-3">Trabajos Realizados</h2>
            <p className="text-base text-muted max-w-2xl mx-auto leading-relaxed">
              Descubre cómo trabajamos a través de demostraciones en video en tiempo real de nuestros proyectos de ingeniería, redes y CCTV. Compara el estado del equipamiento antes y después del servicio técnico, y lee las opiniones y calificaciones de nuestros clientes.
            </p>
          </div>
          
          {videos.length > 0 ? (
            <ServiciosPortfolio videos={videos} />
          ) : (
            <div className="relative bg-surface rounded-2xl border-2 border-dashed border-line p-12 text-center overflow-hidden max-w-3xl mx-auto shadow-xs">
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-brand-500/5 rounded-full blur-xl pointer-events-none"></div>
              <div className="w-16 h-16 bg-brand-50 border border-brand-200 rounded-2xl flex items-center justify-center text-brand-500 mx-auto mb-4 shadow-sm">
                <FiVideo className="w-8 h-8 opacity-80" />
              </div>
              <h3 className="text-xl font-bold text-ink mb-2">Construyendo nuestro portafolio digital</h3>
              <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
                Próximamente verás aquí grabaciones de instalaciones de CCTV, configuraciones de racks de redes y diagnósticos de equipos gaming. ¡Vuelve pronto para ver nuestro portafolio de trabajos en acción!
              </p>
            </div>
          )}
        </div>

        {/* 2. Servicios Especializados Desktop (Compact) */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-ink mb-2">Servicios Especializados</h2>
            <p className="text-base text-muted max-w-xl mx-auto">
              Soluciones tecnológicas completas adaptadas a tus requerimientos:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* CCTV Card */}
            <div className="bg-white rounded-2xl border border-line p-6 shadow-xs hover:border-brand-200 transition-colors flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mb-4">
                <PiSecurityCameraDuotone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink text-base mb-1.5 group-hover:text-brand-500 transition-colors">Sistemas CCTV</h3>
              <p className="text-xs text-muted leading-normal">Instalación y monitoreo de cámaras de videovigilancia profesional.</p>
            </div>

            {/* Redes Card */}
            <div className="bg-white rounded-2xl border border-line p-6 shadow-xs hover:border-brand-200 transition-colors flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mb-4">
                <FaEthernet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-ink text-base mb-1.5 group-hover:text-brand-500 transition-colors">Diseño de Redes</h3>
              <p className="text-xs text-muted leading-normal">Despliegue de redes estructuradas e inalámbricas corporativas.</p>
            </div>

            {/* POS Card */}
            <div className="bg-white rounded-2xl border border-line p-6 shadow-xs hover:border-brand-200 transition-colors flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mb-4">
                <FiCreditCard className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink text-base mb-1.5 group-hover:text-brand-500 transition-colors">Puntos de Venta</h3>
              <p className="text-xs text-muted leading-normal">Instalación y soporte de sistemas comerciales de facturación.</p>
            </div>

            {/* Gaming PC Card */}
            <div className="bg-white rounded-2xl border border-line p-6 shadow-xs hover:border-brand-200 transition-colors flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mb-4">
                <SiPcgamingwiki className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink text-base mb-1.5 group-hover:text-brand-500 transition-colors">PC Gaming</h3>
              <p className="text-xs text-muted leading-normal">Ensamblaje y personalización de computadoras de alto rendimiento.</p>
            </div>

            {/* Consolas Card */}
            <div className="bg-white rounded-2xl border border-line p-6 shadow-xs hover:border-brand-200 transition-colors flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mb-4">
                <FiShield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink text-base mb-1.5 group-hover:text-brand-500 transition-colors">Mantenimiento</h3>
              <p className="text-xs text-muted leading-normal">Servicio técnico de consolas (PS5, Xbox, Switch, Steam Deck).</p>
            </div>
          </div>
        </div>

        {/* 3. Por qué confiar en nosotros Desktop (Compact) */}
        <div className="bg-white rounded-2xl border border-line p-8 shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-ink mb-6 text-center">¿Por qué confiar en nosotros?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-surface rounded-2xl border border-line">
              <div className="w-10 h-10 bg-brand-500/10 text-brand-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FiAward className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm mb-1 text-ink">Experiencia Comprobada</h3>
              <p className="text-muted text-[11px] leading-relaxed">Más de 10 años brindando soluciones de tecnología.</p>
            </div>
            <div className="text-center p-4 bg-surface rounded-2xl border border-line">
              <div className="w-10 h-10 bg-brand-500/10 text-brand-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FiUsers className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm mb-1 text-ink">Equipo Profesional</h3>
              <p className="text-muted text-[11px] leading-relaxed">Técnicos calificados y especializados.</p>
            </div>
            <div className="text-center p-4 bg-surface rounded-2xl border border-line">
              <div className="w-10 h-10 bg-brand-500/10 text-brand-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FiCheckCircle className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm mb-1 text-ink">Garantía de Calidad</h3>
              <p className="text-muted text-[11px] leading-relaxed">Soporte post-instalación incluido.</p>
            </div>
            <div className="text-center p-4 bg-surface rounded-2xl border border-line">
              <div className="w-10 h-10 bg-brand-500/10 text-brand-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FiClock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm mb-1 text-ink">Atención Rápida</h3>
              <p className="text-muted text-[11px] leading-relaxed">Respuesta ágil a tus requerimientos.</p>
            </div>
          </div>
        </div>

        {/* 4. Modalidades de Servicio Desktop (Compact) */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="bg-brand-50 rounded-2xl p-6 border border-brand-200 shadow-xs flex gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-500 shadow-sm flex-shrink-0 border border-brand-200">
              <FiMonitor className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-ink">Servicios On-Site</h3>
              <p className="text-xs text-muted leading-relaxed mb-3">Instalación y evaluación directa en tu negocio o empresa con personal especializado:</p>
              <ul className="grid grid-cols-2 gap-2 text-xs text-ink-soft font-medium">
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Instalación directa</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Capacitación de uso</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Evaluación de espacio</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Documentación técnica</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-brand-50 rounded-2xl p-6 border border-brand-200 shadow-xs flex gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-500 shadow-sm flex-shrink-0 border border-brand-200">
              <FiShield className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-ink">Soporte Técnico</h3>
              <p className="text-xs text-muted leading-relaxed mb-3">Asistencia técnica e incidencias para el mantenimiento de tus sistemas:</p>
              <ul className="grid grid-cols-2 gap-2 text-xs text-ink-soft font-medium">
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Mantenimiento preventivo</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Garantía extendida</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Atención remota 24/7</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Actualizaciones de software</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Final Desktop (GitHub Version) */}
        <div className="relative bg-brand-600 text-white rounded-2xl p-8 text-center overflow-hidden">
          <div className="relative">
            <FiMail className="w-16 h-16 text-white/80 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">¿Necesitas alguno de nuestros servicios?</h2>
            <p className="text-lg mb-6 text-white/90">Envíanos tu solicitud y recibe una cotización personalizada en menos de 24 horas</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contacto" className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-brand-500 rounded-xl font-semibold hover:bg-surface transition-all">
                <FiMail className="w-5 h-5" />
                Enviar Solicitud
              </Link>
              <a href={`https://wa.me/${settings?.whatsapp?.replace(/\D/g, '') || '582572511282'}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-success text-white rounded-xl font-semibold hover:bg-success-strong transition-all">
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
