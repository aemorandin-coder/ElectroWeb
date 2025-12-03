'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import PublicHeader from '@/components/public/PublicHeader';
import AnimatedWave from '@/components/AnimatedWave';

interface TechServiceVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnail?: string;
  customerName?: string;
  testimonial?: string;
}

export default function ServiciosPage() {
  const [videos, setVideos] = useState<TechServiceVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tech-service-videos?activeOnly=true')
      .then(res => res.json())
      .then(data => {
        setVideos(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading videos:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      {/* Hero Section - Premium Design from /productos */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <span className="text-sm font-semibold text-white">Servicio Profesional</span>
            </div>
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Servicio Técnico <span className="bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">Especializado</span>
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Reparación y mantenimiento de laptops, PCs, consolas y equipos gaming. Más de 10 años de experiencia respaldándonos.
          </p>
        </div>

        {/* Animated Wave Divider */}
        <AnimatedWave />
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Servicios Ofrecidos */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#212529] mb-8">Nuestros Servicios</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <div key={index} className="group bg-white/80 backdrop-blur-xl rounded-2xl border border-[#e9ecef] shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-6">
                {/* 3D Glossy Icon - Enhanced */}
                <div className="relative w-14 h-14 mb-4">
                  <div
                    className={`
                      relative w-full h-full rounded-2xl flex items-center justify-center
                      bg-gradient-to-br ${service.gradient}
                      shadow-2xl
                      group-hover:scale-110 transition-all duration-500
                    `}
                    style={{
                      boxShadow: `
                        0 15px 50px -12px rgba(0, 0, 0, 0.6),
                        0 8px 20px -8px rgba(0, 0, 0, 0.4),
                        inset 0 2px 0 rgba(255, 255, 255, 0.7),
                        inset 0 -2px 0 rgba(0, 0, 0, 0.3),
                        inset 0 0 60px rgba(255, 255, 255, 0.1)
                      `,
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.15) 100%)',
                        pointerEvents: 'none'
                      }}
                    />
                    <div
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                      style={{
                        background: 'linear-gradient(45deg, transparent 20%, rgba(255,255,255,0.5) 50%, transparent 80%)',
                        backgroundSize: '200% 200%',
                        animation: 'shine 2s infinite'
                      }}
                    />
                    <div className="relative z-10 group-hover:rotate-12 transition-transform duration-500 drop-shadow-lg">
                      {service.icon}
                    </div>
                    <div
                      className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4/5 h-3 bg-black/40 blur-lg rounded-full"
                      style={{ filter: 'blur(10px)' }}
                    />
                    <div
                      className="absolute inset-0 rounded-2xl opacity-50"
                      style={{
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-[#212529] mb-2">{service.title}</h3>
                <p className="text-[#6a6c6b] mb-4">{service.description}</p>
                <ul className="space-y-2">
                  {service.items.map((item, i) => (
                    <li key={i} className="flex items-start text-sm text-[#212529]">
                      <svg className="w-4 h-4 text-[#2a63cd] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonios en Video */}
        {videos.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-[#212529] mb-8">Testimonios de Clientes</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <div key={video.id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow border border-[#e9ecef]">
                  <div className="aspect-video bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] relative">
                    {video.thumbnail ? (
                      <Image src={video.thumbnail} alt={video.title} fill className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[#212529] mb-2">{video.title}</h3>
                    {video.description && (
                      <p className="text-sm text-[#6a6c6b] mb-3">{video.description}</p>
                    )}
                    {video.customerName && video.testimonial && (
                      <div className="border-t border-[#e9ecef] pt-3 mt-3">
                        <p className="text-sm italic text-[#212529] mb-1">&ldquo;{video.testimonial}&rdquo;</p>
                        <p className="text-xs text-[#6a6c6b]">- {video.customerName}</p>
                      </div>
                    )}
                    <a
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-[#2a63cd] hover:text-[#1e4ba3] text-sm font-medium transition-colors"
                    >
                      Ver video
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Garantía y Proceso */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[#e9ecef] shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-[#212529] mb-6">¿Por qué elegirnos?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group">
              <div className="relative w-14 h-14 mb-3">
                <div className="relative w-full h-full rounded-2xl flex items-center justify-center bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-2xl group-hover:scale-110 transition-all duration-500" style={{ boxShadow: '0 15px 50px -12px rgba(0, 0, 0, 0.6), 0 8px 20px -8px rgba(0, 0, 0, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.7), inset 0 -2px 0 rgba(0, 0, 0, 0.3), inset 0 0 60px rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.15) 100%)', pointerEvents: 'none' }} />
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: 'linear-gradient(45deg, transparent 20%, rgba(255,255,255,0.5) 50%, transparent 80%)', backgroundSize: '200% 200%', animation: 'shine 2s infinite' }} />
                  <div className="relative z-10 group-hover:rotate-12 transition-transform duration-500 drop-shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4/5 h-3 bg-black/40 blur-lg rounded-full" style={{ filter: 'blur(10px)' }} />
                  <div className="absolute inset-0 rounded-2xl opacity-50" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)', pointerEvents: 'none' }} />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[#212529]">Garantía de Servicio</h3>
              <p className="text-[#6a6c6b]">Todos nuestros trabajos cuentan con garantía. Si algo falla, lo corregimos sin costo adicional.</p>
            </div>
            <div className="group">
              <div className="relative w-14 h-14 mb-3">
                <div className="relative w-full h-full rounded-2xl flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-2xl group-hover:scale-110 transition-all duration-500" style={{ boxShadow: '0 15px 50px -12px rgba(0, 0, 0, 0.6), 0 8px 20px -8px rgba(0, 0, 0, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.7), inset 0 -2px 0 rgba(0, 0, 0, 0.3), inset 0 0 60px rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.15) 100%)', pointerEvents: 'none' }} />
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: 'linear-gradient(45deg, transparent 20%, rgba(255,255,255,0.5) 50%, transparent 80%)', backgroundSize: '200% 200%', animation: 'shine 2s infinite' }} />
                  <div className="relative z-10 group-hover:rotate-12 transition-transform duration-500 drop-shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4/5 h-3 bg-black/40 blur-lg rounded-full" style={{ filter: 'blur(10px)' }} />
                  <div className="absolute inset-0 rounded-2xl opacity-50" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)', pointerEvents: 'none' }} />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[#212529]">Diagnóstico Gratuito</h3>
              <p className="text-[#6a6c6b]">Evaluamos tu equipo sin costo. Recibes un presupuesto detallado antes de cualquier reparación.</p>
            </div>
            <div className="group">
              <div className="relative w-14 h-14 mb-3">
                <div className="relative w-full h-full rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-2xl group-hover:scale-110 transition-all duration-500" style={{ boxShadow: '0 15px 50px -12px rgba(0, 0, 0, 0.6), 0 8px 20px -8px rgba(0, 0, 0, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.7), inset 0 -2px 0 rgba(0, 0, 0, 0.3), inset 0 0 60px rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.15) 100%)', pointerEvents: 'none' }} />
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: 'linear-gradient(45deg, transparent 20%, rgba(255,255,255,0.5) 50%, transparent 80%)', backgroundSize: '200% 200%', animation: 'shine 2s infinite' }} />
                  <div className="relative z-10 group-hover:rotate-12 transition-transform duration-500 drop-shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4/5 h-3 bg-black/40 blur-lg rounded-full" style={{ filter: 'blur(10px)' }} />
                  <div className="absolute inset-0 rounded-2xl opacity-50" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)', pointerEvents: 'none' }} />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[#212529]">Técnicos Certificados</h3>
              <p className="text-[#6a6c6b]">Personal capacitado y con experiencia en las principales marcas y tecnologías del mercado.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] text-white rounded-2xl p-8 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-cyan-300 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          <div className="relative">
            <h2 className="text-3xl font-bold mb-4">¿Necesitas reparar tu equipo?</h2>
            <p className="text-xl mb-6 text-white/90">
              Contáctanos y recibe un diagnóstico gratuito
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contacto"
                className="px-8 py-3 bg-white text-[#2a63cd] rounded-xl font-semibold hover:bg-gray-50 transition-all hover:scale-105 shadow-xl"
              >
                Contactar Ahora
              </Link>
              <Link
                href="/cursos"
                className="px-8 py-3 bg-white/10 backdrop-blur-md text-white rounded-xl font-semibold hover:bg-white/20 transition-all border-2 border-white/30 hover:scale-105"
              >
                Ver Cursos de Reparación
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shine {
          0% {
            background-position: -200% -200%;
          }
          100% {
            background-position: 200% 200%;
          }
        }
      `}</style>
    </div>
  );
}

const services = [
  {
    gradient: 'from-blue-400 to-blue-600',
    icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    title: 'Reparación de Laptops',
    description: 'Diagnóstico y reparación especializada',
    items: [
      'Cambio de pantallas y teclados',
      'Reemplazo de baterías',
      'Actualización de RAM y SSD',
      'Limpieza profunda y pasta térmica',
      'Reparación de placa madre',
    ],
  },
  {
    gradient: 'from-purple-400 to-purple-600',
    icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    title: 'Mantenimiento de PCs',
    description: 'Optimización y upgrades',
    items: [
      'Limpieza interna y externa',
      'Instalación de componentes',
      'Optimización de software',
      'Formateo e instalación de OS',
      'Backup y recuperación de datos',
    ],
  },
  {
    gradient: 'from-pink-400 to-pink-600',
    icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>,
    title: 'Reparación de Consolas',
    description: 'PlayStation, Xbox, Nintendo',
    items: [
      'Cambio de lectores de disco',
      'Reparación de controladores',
      'Limpieza de ventiladores',
      'Reemplazo de pasta térmica',
      'Actualización de disco duro',
    ],
  },
  {
    gradient: 'from-orange-400 to-orange-600',
    icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    title: 'Ensamblaje de PCs',
    description: 'Armado personalizado',
    items: [
      'Selección de componentes',
      'Ensamblaje profesional',
      'Instalación de sistema operativo',
      'Configuración de BIOS',
      'Pruebas de rendimiento',
    ],
  },
  {
    gradient: 'from-green-400 to-green-600',
    icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    title: 'Reparación de Tablets',
    description: 'Todas las marcas',
    items: [
      'Cambio de pantallas táctiles',
      'Reemplazo de baterías',
      'Reparación de botones',
      'Actualización de software',
      'Liberación de equipos',
    ],
  },
  {
    gradient: 'from-cyan-400 to-cyan-600',
    icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    title: 'Instalación de Periféricos',
    description: 'Configuración de equipos',
    items: [
      'Instalación de impresoras',
      'Configuración de redes',
      'Setup de audio profesional',
      'Montaje de monitores múltiples',
      'Instalación de cámaras',
    ],
  },
];
