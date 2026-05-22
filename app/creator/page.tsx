'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import PublicHeader from '@/components/public/PublicHeader';
import Footer from '@/components/Footer';
import AnimatedWave from '@/components/AnimatedWave';
import { 
  FiAward, 
  FiTrendingUp, 
  FiDollarSign, 
  FiCheckCircle, 
  FiClock, 
  FiAlertCircle, 
  FiBookOpen, 
  FiUploadCloud, 
  FiArrowRight, 
  FiSend, 
  FiCheck,
  FiMonitor,
  FiCpu,
  FiHardDrive,
  FiSmartphone,
  FiHeadphones,
  FiWifi
} from 'react-icons/fi';

type CreatorProfile = {
  id: string;
  status: string;
  displayName: string;
};

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

export default function CreatorLandingPage() {
  const { data: session, status } = useSession();
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ displayName: '', bio: '', expertise: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/creator')
        .then((r) => r.json())
        .then((data) => {
          if (data?.id) setCreator(data);
        })
        .finally(() => setLoading(false));
    } else if (status !== 'loading') {
      setLoading(false);
    }
  }, [status]);

  async function handleApply() {
    if (!form.displayName) { setError('El nombre es requerido'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al enviar'); return; }
      setCreator(data);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#212529] flex flex-col justify-between overflow-x-hidden">
      <PublicHeader />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden text-center text-white">
        {/* Floating Icons Effect */}
        <FloatingTechIcons />
        {/* Animated Background Particles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-0 lg:py-10 text-center space-y-4 lg:space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-2 lg:mb-4">
            <div className="h-0.5 w-8 lg:w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <span className="text-[10px] lg:text-xs font-semibold text-white uppercase tracking-wider">
                Programa de Creadores de Cursos
              </span>
            </div>
            <div className="h-0.5 w-8 lg:w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none text-white max-w-4xl mx-auto">
            Monetiza tu Experiencia. <br />
            <span className="bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">
              Quédate con el 90%.
            </span>
          </h1>
          <p className="text-white/80 text-xs md:text-sm lg:text-base max-w-2xl mx-auto leading-relaxed">
            Crea cursos premium de reparación, redes, CCTV, gaming o electrónica. Nosotros nos encargamos del procesamiento y el marketing; tú te llevas la gran parte.
          </p>
        </div>

        {/* Animated Wave Divider */}
        <AnimatedWave />
      </section>
      
      {/* Content wrapper under wave */}
      <div className="max-w-5xl w-full mx-auto px-4 md:px-8 py-10 lg:py-16 relative z-10 space-y-16 flex-grow">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { value: '90%', label: 'Comisión Directa', desc: 'El porcentaje más alto para ti por cada estudiante.', icon: FiDollarSign },
            { value: '10%', label: 'Fee de la Plataforma', desc: 'Cubre procesamiento, hosting y soporte.', icon: FiTrendingUp },
            { value: 'Ilimitados', label: 'Cursos & Lecciones', desc: 'Sube todo el contenido técnico que desees.', icon: FiBookOpen },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="relative group overflow-hidden bg-white rounded-2xl p-6 border border-[#e9ecef] hover:border-[#2a63cd]/30 transition-all duration-300 hover:scale-[1.02] shadow-md hover:shadow-lg">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#2a63cd]/5 to-transparent rounded-full blur-xl group-hover:scale-150 transition-all duration-500" />
                <div className="w-10 h-10 rounded-xl bg-[#2a63cd]/5 flex items-center justify-center border border-[#2a63cd]/10 mb-4 group-hover:bg-[#2a63cd]/10 group-hover:border-[#2a63cd]/20 transition-all duration-300">
                  <Icon className="w-5 h-5 text-[#2a63cd]" />
                </div>
                <h3 className="text-3xl font-black text-[#2a63cd] leading-none mb-2">{stat.value}</h3>
                <h4 className="text-sm font-semibold text-[#212529] mb-1">{stat.label}</h4>
                <p className="text-xs text-[#6a6c6b] leading-relaxed">{stat.desc}</p>
              </div>
            );
          })}
        </div>

        {/* How it works */}
        <div className="bg-[#f8f9fa] rounded-3xl border border-[#e9ecef] p-8 md:p-12 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-black text-[#212529] text-center mb-12">¿Cómo Funciona el Programa?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent z-0" />
            
            {[
              { step: '01', title: 'Postúlate en Minutos', desc: 'Llena el formulario abajo con tu perfil y experiencia. Nuestro equipo te revisará en 24/48 horas.', icon: FiSend },
              { step: '02', title: 'Crea tu Curso Técnico', desc: 'Usa nuestro panel intuitivo para subir lecciones, estructurar módulos y conectar tus videos sin esfuerzo.', icon: FiUploadCloud },
              { step: '03', title: 'Recibe tus Ganancias', desc: 'Retira tus ingresos de forma simple. Recibe notificaciones instantáneas de cada nueva inscripción.', icon: FiAward },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="relative z-10 flex flex-col items-center text-center space-y-3 group">
                  <div className="relative w-16 h-16 rounded-2xl bg-white flex items-center justify-center border border-[#e9ecef] shadow-sm group-hover:border-[#2a63cd]/50 group-hover:shadow-[0_0_20px_rgba(42,99,205,0.1)] transition-all duration-300">
                    <span className="absolute -top-2 -right-2 text-[10px] font-bold px-2 py-0.5 bg-[#2a63cd] rounded-full text-white">{item.step}</span>
                    <Icon className="w-6 h-6 text-[#2a63cd]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#212529] pt-2">{item.title}</h3>
                  <p className="text-sm text-[#6a6c6b] max-w-xs">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form & States Section */}
        <div className="max-w-2xl mx-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-4 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#6a6c6b] text-sm animate-pulse">Consultando tu estado de creador...</p>
            </div>
          ) : creator ? (
            <div className="bg-white rounded-3xl border border-[#e9ecef] p-8 md:p-10 shadow-xl relative overflow-hidden">
              {creator.status === 'APPROVED' ? (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                    <FiCheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-black text-[#212529]">¡Eres Creador Oficial!</h2>
                    <p className="text-[#6a6c6b] text-sm md:text-base max-w-md mx-auto">
                      Tu solicitud ha sido aprobada. Tienes acceso completo para crear y publicar tus cursos en la plataforma.
                    </p>
                  </div>
                  <Link
                    href="/creator/dashboard"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl shadow-lg hover:shadow-cyan-500/10 hover:scale-[1.02] transition-all duration-300"
                  >
                    Ir a mi Panel de Creador
                    <FiArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              ) : creator.status === 'PENDING' ? (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(245,158,11,0.05)]">
                    <FiClock className="w-8 h-8 text-amber-600" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-black text-[#212529]">Solicitud en Revisión</h2>
                    <p className="text-[#6a6c6b] text-sm md:text-base max-w-md mx-auto">
                      Estamos evaluando tu perfil de creador. Normalmente respondemos en un plazo de 24 a 48 horas laborables. Te notificaremos vía correo electrónico.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(239,68,68,0.05)]">
                    <FiAlertCircle className="w-8 h-8 text-rose-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-black text-[#212529]">Solicitud No Aprobada</h2>
                    <p className="text-[#6a6c6b] text-sm md:text-base max-w-md mx-auto">
                      Lo sentimos, pero tu perfil no cumple con nuestros requisitos actuales. Si crees que se trata de un error o deseas actualizar tus datos, por favor ponte en contacto con nuestro equipo de soporte.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : session ? (
            /* Application Form */
            <div className="bg-white rounded-3xl border border-[#e9ecef] p-8 md:p-10 shadow-xl relative">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-[#212529] mb-2">Solicitar Acceso de Creador</h2>
                <p className="text-[#6a6c6b] text-sm">Cuéntanos un poco sobre ti y tu experiencia técnica para comenzar.</p>
              </div>

              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                    <FiCheck className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold text-[#212529]">¡Solicitud Enviada con Éxito!</h3>
                  <p className="text-[#6a6c6b] text-sm max-w-xs mx-auto">
                    Hemos recibido tu postulación. El equipo de ElectroShop se comunicará contigo pronto.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                      <FiAlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-[#495057] text-xs font-semibold uppercase tracking-wider mb-2">
                      Nombre Artístico / Marca Personal <span className="text-[#2a63cd]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.displayName}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-[#e9ecef] rounded-xl text-[#212529] placeholder-gray-400 focus:outline-none focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd] transition-all text-sm"
                      placeholder="El nombre que verán tus estudiantes en la web"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[#495057] text-xs font-semibold uppercase tracking-wider mb-2">
                      Área de Especialidad / Expertise
                    </label>
                    <input
                      type="text"
                      value={form.expertise}
                      onChange={(e) => setForm({ ...form, expertise: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-[#e9ecef] rounded-xl text-[#212529] placeholder-gray-400 focus:outline-none focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd] transition-all text-sm"
                      placeholder="Ej: Fibra óptica, CCTV, Arduino, Consolas de Videojuegos..."
                    />
                  </div>

                  <div>
                    <label className="block text-[#495057] text-xs font-semibold uppercase tracking-wider mb-2">
                      Biografía & Plan de Cursos
                    </label>
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 bg-white border border-[#e9ecef] rounded-xl text-[#212529] placeholder-gray-400 focus:outline-none focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd] transition-all text-sm resize-none"
                      placeholder="Cuéntanos brevemente tus años de experiencia y qué tipo de cursos te gustaría subir."
                    />
                  </div>

                  <button
                    onClick={handleApply}
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] hover:from-[#3572e8] hover:to-[#225ccb] text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.01] flex items-center justify-center gap-2 shadow-lg shadow-[#2a63cd]/25 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enviando Postulación...</span>
                      </>
                    ) : (
                      <>
                        <FiSend className="w-4 h-4" />
                        <span>Enviar Solicitud de Creador</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Not logged in state */
            <div className="bg-white rounded-3xl border border-[#e9ecef] p-8 md:p-10 text-center shadow-xl space-y-6">
              <div className="w-16 h-16 bg-[#2a63cd]/10 border border-[#2a63cd]/20 rounded-2xl flex items-center justify-center mx-auto">
                <FiBookOpen className="w-8 h-8 text-[#2a63cd]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-[#212529]">Únete como Creador</h2>
                <p className="text-[#6a6c6b] text-sm md:text-base max-w-sm mx-auto">
                  Para enviar tu solicitud e iniciar el registro de tus cursos, primero debes contar con una cuenta de usuario.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                <Link 
                  href="/login?redirect=/creator" 
                  className="px-8 py-3 bg-[#2a63cd] hover:bg-[#1e4ba3] text-white font-bold rounded-xl shadow-lg shadow-[#2a63cd]/20 transition-all duration-300 hover:scale-[1.02] inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  Iniciar Sesión
                </Link>
                <Link 
                  href="/registro" 
                  className="px-8 py-3 bg-white border border-[#e9ecef] text-[#212529] font-bold rounded-xl hover:bg-gray-50 transition-all duration-300 hover:scale-[1.02] inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  Crear Cuenta
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}


