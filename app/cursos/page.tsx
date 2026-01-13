import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import AnimatedWave from '@/components/AnimatedWave';
import { FiMonitor, FiCpu, FiHardDrive, FiSmartphone, FiHeadphones, FiWifi } from 'react-icons/fi';

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

export default async function CursosPage() {
  const settings = await prisma.companySettings.findFirst();

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader settings={settings ? JSON.parse(JSON.stringify(settings)) : null} />

      {/* Hero Section - Premium Design (Keep Hero exactly as is) */}
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
              <span className="text-[10px] lg:text-xs font-semibold text-white">Aprende con Expertos</span>
            </div>
            <div className="h-0.5 w-8 lg:w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-1 lg:mb-3 tracking-tight">
            Cursos <span className="bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">Online</span>
          </h1>
          <p className="text-xs md:text-sm lg:text-base text-white/90 max-w-3xl mx-auto leading-relaxed">
            Aprende reparación de equipos con cursos prácticos.
          </p>
        </div>

        {/* Animated Wave Divider */}
        <AnimatedWave />
      </section>

      {/* 1. MODO MOBILE (lg:hidden) - Current Optimized Layout */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 sm:px-6 py-4 relative z-10">
        {/* Próximamente Disponible - Mobile */}
        <div className="mb-8">
          <div className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-xl overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-cyan-300 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative p-6 text-center text-white">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-3 border border-white/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>

              <h2 className="text-xl font-black mb-2">Próximamente</h2>
              <div className="max-w-3xl mx-auto space-y-2 text-xs text-white/90">
                <p>Plataforma de cursos online:</p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex flex-col items-center text-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mb-2 shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-xs mb-1">Comprar</h3>
                    <p className="text-[10px] text-white/80 leading-tight">Acceso inmediato.</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex flex-col items-center text-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mb-2 shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-xs mb-1">Vender</h3>
                    <p className="text-[10px] text-white/80 leading-tight">Gana dinero.</p>
                  </div>
                </div>
                <p className="mt-6 text-white/70 text-xs">
                  Regístrate para ser notificado.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-3 justify-center">
                <Link href="/registro" className="px-6 py-2 bg-white text-[#2a63cd] text-sm rounded-lg font-semibold shadow-xl">
                  Registrarme Ahora
                </Link>
                <Link href="/contacto" className="px-6 py-2 bg-white/10 backdrop-blur-md text-white text-sm rounded-lg font-semibold border-2 border-white/30">
                  Más Información
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Beneficios - Mobile */}
        <div className="bg-white/80 rounded-xl border border-gray-100 p-4 mb-8 shadow-sm">
          <h2 className="text-base font-bold text-center mb-3">¿Por qué estudiarnos?</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-1 text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" /></svg>
              </div>
              <h3 className="font-bold text-[10px]">Práctico</h3>
              <p className="text-[9px] text-gray-500">Aprende haciendo.</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-1 text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h3 className="font-bold text-[10px]">Expertos</h3>
              <p className="text-[9px] text-gray-500">Profesionales reales.</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-1 text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="font-bold text-[10px]">Certificado</h3>
              <p className="text-[9px] text-gray-500">Al completar.</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-1 text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="font-bold text-[10px]">Laboral</h3>
              <p className="text-[9px] text-gray-500">Alta demanda.</p>
            </div>
          </div>
        </div>

        {/* Modalidades Mobile */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
            <h3 className="text-xs font-bold mb-1">Online</h3>
            <p className="text-[9px] text-gray-500">Flexible 24/7.</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 border border-green-100 text-center">
            <h3 className="text-xs font-bold mb-1">Presencial</h3>
            <p className="text-[9px] text-gray-500">Práctica real.</p>
          </div>
        </div>

        {/* CTA Mobile */}
        <div className="bg-gradient-to-br from-[#2a63cd] to-[#1a3b7e] rounded-xl p-6 text-center text-white">
          <h2 className="text-base font-bold mb-2">¿Listo?</h2>
          <p className="text-xs mb-4 text-white/80">Inscríbete hoy mismo.</p>
          <Link href="/contacto" className="block w-full py-2.5 bg-white text-[#2a63cd] rounded-lg font-bold text-xs">
            Contactar Ahora
          </Link>
        </div>
      </div>

      {/* 2. MODO ESCRITORIO (hidden lg:block) - GitHub Legacy Layout */}
      <div className="hidden lg:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Próximamente Disponible - Marketplace Info Desktop */}
        <div className="mb-16">
          <div className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-2xl overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-cyan-300 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative p-12 text-center text-white">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>

              <h2 className="text-4xl font-black mb-4">Próximamente Disponible</h2>
              <div className="max-w-3xl mx-auto space-y-4 text-lg text-white/90">
                <p>
                  Estamos construyendo una plataforma completa de cursos online donde podrás:
                </p>
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-xl mb-2">Comprar Cursos</h3>
                    <p className="text-sm text-white/80">
                      Accede a cursos profesionales creados por nuestra empresa sobre reparación, ensamblaje y tecnología.
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-xl mb-2">Vender tus Cursos</h3>
                    <p className="text-sm text-white/80">
                      Como cliente registrado, podrás crear y vender tus propios cursos en nuestra plataforma.
                    </p>
                  </div>
                </div>
                <p className="mt-6 text-white/70 text-base">
                  Regístrate ahora para ser notificado cuando lancemos esta funcionalidad
                </p>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/registro"
                  className="px-8 py-3 bg-white text-[#2a63cd] rounded-xl font-semibold hover:bg-gray-50 transition-all hover:scale-105 shadow-xl"
                >
                  Registrarme Ahora
                </Link>
                <Link
                  href="/contacto"
                  className="px-8 py-3 bg-white/10 backdrop-blur-md text-white rounded-xl font-semibold hover:bg-white/20 transition-all border-2 border-white/30 hover:scale-105"
                >
                  Más Información
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Beneficios Desktop */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[#e9ecef] shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-[#212529] mb-8 text-center">
            ¿Por qué tomar nuestros cursos?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mx-auto shadow-lg mb-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[#212529]">Enfoque Práctico</h3>
              <p className="text-[#6a6c6b] text-sm">
                Aprende haciendo. Trabajarás con equipos reales desde el primer día.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mx-auto shadow-lg mb-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[#212529]">Instructores Expertos</h3>
              <p className="text-[#6a6c6b] text-sm">
                Profesionales con años de experiencia en el campo.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto shadow-lg mb-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[#212529]">Certificado</h3>
              <p className="text-[#6a6c6b] text-sm">
                Recibe un certificado al completar el curso exitosamente.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center mx-auto shadow-lg mb-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[#212529]">Salida Laboral</h3>
              <p className="text-[#6a6c6b] text-sm">
                Habilidades demandadas en el mercado laboral actual.
              </p>
            </div>
          </div>
        </div>

        {/* Modalidades Desktop */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#212529] mb-3">Cursos Online</h3>
            <ul className="space-y-2 text-[#212529]">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Aprende a tu propio ritmo</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Acceso 24/7 al material</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Sesiones en vivo con el instructor</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Grupo de WhatsApp para soporte</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
            <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#212529] mb-3">Cursos Presenciales</h3>
            <ul className="space-y-2 text-[#212529]">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Práctica directa con equipos</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Atención personalizada</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Grupos reducidos (máx 15 personas)</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Certificado de asistencia</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Desktop */}
        <div className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] text-white rounded-2xl p-8 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-cyan-300 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          <div className="relative">
            <h2 className="text-3xl font-bold mb-4">¿Listo para comenzar?</h2>
            <p className="text-xl mb-6 text-white/90">
              Contáctanos para más información sobre inscripciones y próximas fechas
            </p>
            <Link
              href="/contacto"
              className="inline-block px-8 py-3 bg-white text-[#2a63cd] rounded-xl font-semibold hover:bg-gray-50 transition-all hover:scale-105 shadow-xl"
            >
              Contactar Ahora
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
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
