import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import AnimatedWave from '@/components/AnimatedWave';
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

export default async function ServiciosPage() {
  const [videos, settings] = await Promise.all([
    prisma.techServiceVideo.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    }),
    prisma.companySettings.findFirst()
  ]);

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
        {/* Servicios Destacados Mobile */}
        <div className="mb-8">
          <div className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-xl overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-cyan-300 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative p-6 text-center text-white">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-3 border border-white/20">
                <FaScrewdriverWrench className="w-6 h-6 text-white" />
              </div>

              <h2 className="text-xl font-black mb-2">Servicios de Excelencia</h2>
              <div className="max-w-3xl mx-auto space-y-4 text-white/90">
                <p className="text-xs">Ofrecemos soluciones tecnológicas completas:</p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex flex-col items-center text-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center mb-2 shadow-sm">
                      <PiSecurityCameraDuotone className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-xs mb-1">CCTV</h3>
                    <p className="text-[10px] text-white/80 leading-tight">Monitoreo 24/7 y seguridad.</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex flex-col items-center text-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center mb-2 shadow-sm">
                      <FaEthernet className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-xs mb-1">Redes</h3>
                    <p className="text-[10px] text-white/80 leading-tight">Conectividad estable.</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex flex-col items-center text-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center mb-2 shadow-sm">
                      <FiCreditCard className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-xs mb-1">Puntos de Venta</h3>
                    <p className="text-[10px] text-white/80 leading-tight">Control de negocio.</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex flex-col items-center text-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center mb-2 shadow-sm">
                      <SiPcgamingwiki className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-xs mb-1">Gaming PC</h3>
                    <p className="text-[10px] text-white/80 leading-tight">Potencia extrema.</p>
                  </div>
                </div>
                <div className="mt-4 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiShield className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-sm">Mantenimiento Consolas</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-semibold">Xbox S/X</span>
                    <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-semibold">PS5</span>
                    <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-semibold">Switch</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonios Mobile */}
        {videos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-center mb-4">Trabajos Realizados</h2>
            <div className="grid grid-cols-1 gap-4">
              {videos.map((video) => (
                <div key={video.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="relative aspect-video">
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <FiVideo className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold truncate">{video.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{video.description}</p>
                    <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-[#2a63cd] text-white text-xs font-bold rounded-lg ">
                      Ver Video
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Por qué elegirnos Mobile */}
        <div className="bg-white/80 rounded-xl border border-gray-100 p-4 mb-6 shadow-sm">
          <h2 className="text-base font-bold text-center mb-3">¿Por qué confiar en nosotros?</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <FiAward className="w-5 h-5 text-[#2a63cd] mx-auto mb-1" />
              <h3 className="font-bold text-[10px]">Experiencia</h3>
              <p className="text-[9px] text-gray-500">+10 años trayectoria.</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <FiUsers className="w-5 h-5 text-[#2a63cd] mx-auto mb-1" />
              <h3 className="font-bold text-[10px]">Equipo Pro</h3>
              <p className="text-[9px] text-gray-500">Técnicos certificados.</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <FiCheckCircle className="w-5 h-5 text-[#2a63cd] mx-auto mb-1" />
              <h3 className="font-bold text-[10px]">Garantía</h3>
              <p className="text-[9px] text-gray-500">Soporte incluido.</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <FiClock className="w-5 h-5 text-[#2a63cd] mx-auto mb-1" />
              <h3 className="font-bold text-[10px]">Rapidez</h3>
              <p className="text-[9px] text-gray-500">Atención ágil.</p>
            </div>
          </div>
        </div>

        {/* Modalidades Mobile */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
            <FiMonitor className="w-6 h-6 text-[#2a63cd] mx-auto mb-1" />
            <h3 className="text-xs font-bold">On-Site</h3>
            <p className="text-[9px] text-gray-500">Vamos a tu empresa.</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
            <FiShield className="w-6 h-6 text-[#2a63cd] mx-auto mb-1" />
            <h3 className="text-xs font-bold">Soporte</h3>
            <p className="text-[9px] text-gray-500">Asistencia remota.</p>
          </div>
        </div>

        {/* CTA Mobile */}
        <div className="bg-gradient-to-br from-[#2a63cd] to-[#1a3b7e] rounded-xl p-6 text-center text-white">
          <h2 className="text-base font-bold mb-2">¿Necesitas ayuda?</h2>
          <p className="text-xs mb-4 text-white/80">Cotiza hoy mismo con nosotros.</p>
          <Link href="/contacto" className="block w-full py-2.5 bg-white text-[#2a63cd] rounded-lg font-bold text-xs text-center hover:bg-gray-100 transition-all">Enviar Solicitud</Link>
        </div>
      </div>

      {/* 2. MODO ESCRITORIO (hidden lg:block) - GitHub Legacy Layout */}
      <div className="hidden lg:block max-w-7xl mx-auto px-8 py-12 relative z-10">
        {/* Servicios Destacados Desktop (GitHub Version) */}
        <div className="mb-16">
          <div className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-2xl overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-cyan-300 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative p-12 text-center text-white">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20">
                <FaScrewdriverWrench className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-4xl font-black mb-4">Servicios de Excelencia</h2>
              <div className="max-w-3xl mx-auto space-y-4 text-lg text-white/90">
                <p>Ofrecemos soluciones tecnológicas completas y personalizadas para llevar tu negocio o proyecto al siguiente nivel:</p>
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  {/* CCTV Desktop */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center mx-auto mb-3">
                      <PiSecurityCameraDuotone className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-xl mb-2">Sistemas CCTV</h3>
                    <p className="text-sm text-white/80">Instalación y configuración de sistemas de videovigilancia profesional para empresas e industrias.</p>
                  </div>

                  {/* Redes Desktop */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center mx-auto mb-3">
                      <FaEthernet className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-xl mb-2">Diseño de Redes</h3>
                    <p className="text-sm text-white/80">Arquitectura y despliegue de redes empresariales e industriales de alta disponibilidad.</p>
                  </div>

                  {/* POS Desktop */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center mx-auto mb-3">
                      <FiCreditCard className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-xl mb-2">Puntos de Venta POS</h3>
                    <p className="text-sm text-white/80">Creación de sistemas POS completos para microempresas y emprendimientos, adaptados a tu negocio.</p>
                  </div>

                  {/* Gaming Desktop */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center mx-auto mb-3">
                      <SiPcgamingwiki className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-xl mb-2">PCs Gaming de Alto Rendimiento</h3>
                    <p className="text-sm text-white/80">Ensamblaje personalizado de equipos gaming con componentes de última generación.</p>
                  </div>
                </div>

                {/* Mantenimiento de Consolas Desktop */}
                <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center mx-auto mb-3">
                    <FiShield className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-xl mb-2">Mantenimiento de Consolas de Última Generación</h3>
                  <p className="text-sm text-white/80 mb-3">Servicio técnico especializado para consolas modernas con técnicos certificados:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">Xbox Series S/X</span>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">PlayStation 5</span>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">Steam Deck</span>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">Nintendo Switch</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonios y Videos Desktop (GitHub Version) */}
        {videos.length > 0 && (
          <div className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-[#212529] mb-3">Trabajos Realizados</h2>
              <p className="text-base text-[#6a6c6b]">Conoce algunos de nuestros proyectos exitosos y testimonios de clientes satisfechos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {videos.map((video) => (
                <div key={video.id} className="group bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FiVideo className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#2a63cd] ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-bold text-[#212529] mb-2 line-clamp-2 group-hover:text-[#2a63cd] transition-colors">{video.title}</h3>
                    <p className="text-sm text-[#6a6c6b] mb-4 line-clamp-3">{video.description}</p>

                    {video.customerName && video.testimonial && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                        <p className="text-xs text-[#212529] italic mb-2 line-clamp-2">"{video.testimonial}"</p>
                        <p className="text-xs font-bold text-[#2a63cd]">- {video.customerName}</p>
                      </div>
                    )}

                    <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all hover:scale-105">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Ver Video
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Por qué elegirnos Desktop (GitHub Version) */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[#e9ecef] shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-[#212529] mb-8 text-center">¿Por qué confiar en nosotros?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center mx-auto shadow-lg mb-3">
                <FiAward className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[#212529]">Experiencia Comprobada</h3>
              <p className="text-[#6a6c6b] text-sm">Más de 10 años brindando soluciones tecnológicas exitosas.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center mx-auto shadow-lg mb-3">
                <FiUsers className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[#212529]">Equipo Profesional</h3>
              <p className="text-[#6a6c6b] text-sm">Técnicos certificados y especializados en cada área.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center mx-auto shadow-lg mb-3">
                <FiCheckCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[#212529]">Garantía de Calidad</h3>
              <p className="text-[#6a6c6b] text-sm">Todos nuestros servicios incluyen garantía y soporte post-instalación.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center mx-auto shadow-lg mb-3">
                <FiClock className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[#212529]">Atención Rápida</h3>
              <p className="text-[#6a6c6b] text-sm">Respuesta y solución ágil a tus requerimientos técnicos.</p>
            </div>
          </div>
        </div>

        {/* Modalidades de Servicio Desktop (GitHub Version) */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
            <div className="w-14 h-14 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center shadow-lg mb-4">
              <FiMonitor className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#212529] mb-3">Servicios On-Site</h3>
            <ul className="space-y-2 text-[#212529]">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[#2a63cd] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Instalación directa en tu negocio o empresa</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[#2a63cd] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Evaluación personalizada del espacio</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[#2a63cd] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Capacitación del personal incluida</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[#2a63cd] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Documentación técnica completa</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
            <div className="w-14 h-14 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center shadow-lg mb-4">
              <FiShield className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#212529] mb-3">Soporte Técnico</h3>
            <ul className="space-y-2 text-[#212529]">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[#2a63cd] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Mantenimiento preventivo programado</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[#2a63cd] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Atención remota para incidencias</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[#2a63cd] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Garantía extendida disponible</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[#2a63cd] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Actualizaciones y mejoras incluidas</span>
              </li>
            </ul>
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

      {/* Footer - Keep current */}
      <footer className="bg-[#212529] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} {settings?.companyName || 'Electro Shop Morandin C.A.'} - Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
