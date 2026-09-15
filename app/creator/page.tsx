'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import PublicHeader from '@/components/public/PublicHeader';
import PageHeader from '@/components/ui/PageHeader';
import Footer from '@/components/Footer';
import { FiAward, FiTrendingUp, FiDollarSign, FiCheckCircle, FiClock, FiAlertCircle, FiBookOpen, FiUploadCloud, FiArrowRight, FiSend, FiCheck } from 'react-icons/fi';

type CreatorProfile = {
  id: string;
  status: string;
  displayName: string;
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
    <div className="min-h-dvh bg-white text-ink flex flex-col justify-between overflow-x-hidden">
      <PublicHeader />
      
      <PageHeader
        breadcrumbs={[{ label: 'Cursos', href: '/cursos' }, { label: 'Enseña aquí' }]}
        icon={<FiTrendingUp />}
        eyebrow="Programa de creadores de cursos"
        title="Monetiza tu experiencia y quédate con el 90%"
        description="Crea cursos de reparación, redes, CCTV, gaming o electrónica. Nosotros nos encargamos del cobro y el marketing; tú te llevas la mayor parte."
      />
      
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
              <div key={idx} className="relative group overflow-hidden bg-white rounded-2xl p-6 border border-line hover:border-brand-500/30 transition-all duration-300 hover:scale-[1.02] shadow-md hover:shadow-lg">
                
                <div className="w-10 h-10 rounded-xl bg-brand-500/5 flex items-center justify-center border border-brand-500/10 mb-4 group-hover:bg-brand-500/10 group-hover:border-brand-500/20 transition-all duration-300">
                  <Icon className="w-5 h-5 text-brand-500" />
                </div>
                <h3 className="text-3xl font-bold text-brand-500 leading-none mb-2">{stat.value}</h3>
                <h4 className="text-sm font-semibold text-ink mb-1">{stat.label}</h4>
                <p className="text-xs text-muted leading-relaxed">{stat.desc}</p>
              </div>
            );
          })}
        </div>

        {/* How it works */}
        <div className="bg-surface rounded-3xl border border-line p-8 md:p-12 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-bold text-ink text-center mb-12">¿Cómo Funciona el Programa?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[1px] bg-line z-0" />
            
            {[
              { step: '01', title: 'Postúlate en Minutos', desc: 'Llena el formulario abajo con tu perfil y experiencia. Nuestro equipo te revisará en 24/48 horas.', icon: FiSend },
              { step: '02', title: 'Crea tu Curso Técnico', desc: 'Usa nuestro panel intuitivo para subir lecciones, estructurar módulos y conectar tus videos sin esfuerzo.', icon: FiUploadCloud },
              { step: '03', title: 'Recibe tus Ganancias', desc: 'Retira tus ingresos de forma simple. Recibe notificaciones instantáneas de cada nueva inscripción.', icon: FiAward },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="relative z-10 flex flex-col items-center text-center space-y-3 group">
                  <div className="relative w-16 h-16 rounded-2xl bg-white flex items-center justify-center border border-line shadow-sm group-hover:border-brand-500/50 group-hover:shadow-[0_0_20px_rgba(42,99,205,0.1)] transition-all duration-300">
                    <span className="absolute -top-2 -right-2 text-xs font-bold px-2 py-0.5 bg-brand-500 rounded-full text-white">{item.step}</span>
                    <Icon className="w-6 h-6 text-brand-500" />
                  </div>
                  <h3 className="text-lg font-bold text-ink pt-2">{item.title}</h3>
                  <p className="text-sm text-muted max-w-xs">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form & States Section */}
        <div className="max-w-2xl mx-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted text-sm animate-pulse">Consultando tu estado de creador...</p>
            </div>
          ) : creator ? (
            <div className="bg-white rounded-3xl border border-line p-8 md:p-10 shadow-xl relative overflow-hidden">
              {creator.status === 'APPROVED' ? (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-success/10 border border-success/20 rounded-2xl flex items-center justify-center mx-auto ">
                    <FiCheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-ink">¡Eres Creador Oficial!</h2>
                    <p className="text-muted text-sm md:text-base max-w-md mx-auto">
                      Tu solicitud ha sido aprobada. Tienes acceso completo para crear y publicar tus cursos en la plataforma.
                    </p>
                  </div>
                  <Link
                    href="/creator/dashboard"
                    className={`${adminPrimaryButton} inline-flex items-center gap-2 px-8 py-4 font-bold rounded-xl`}
                  >
                    Ir a mi Panel de Creador
                    <FiArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              ) : creator.status === 'PENDING' ? (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-warning/10 border border-warning/20 rounded-2xl flex items-center justify-center mx-auto ">
                    <FiClock className="w-8 h-8 text-warning" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-ink">Solicitud en Revisión</h2>
                    <p className="text-muted text-sm md:text-base max-w-md mx-auto">
                      Estamos evaluando tu perfil de creador. Normalmente respondemos en un plazo de 24 a 48 horas laborables. Te notificaremos vía correo electrónico.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-danger/10 border border-danger/20 rounded-2xl flex items-center justify-center mx-auto ">
                    <FiAlertCircle className="w-8 h-8 text-danger" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-ink">Solicitud No Aprobada</h2>
                    <p className="text-muted text-sm md:text-base max-w-md mx-auto">
                      Lo sentimos, pero tu perfil no cumple con nuestros requisitos actuales. Si crees que se trata de un error o deseas actualizar tus datos, por favor ponte en contacto con nuestro equipo de soporte.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : session ? (
            /* Application Form */
            <div className="bg-white rounded-3xl border border-line p-8 md:p-10 shadow-xl relative">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-ink mb-2">Solicitar Acceso de Creador</h2>
                <p className="text-muted text-sm">Cuéntanos un poco sobre ti y tu experiencia técnica para comenzar.</p>
              </div>

              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-12 h-12 bg-success/10 border border-success/20 rounded-full flex items-center justify-center mx-auto">
                    <FiCheck className="w-6 h-6 text-success" />
                  </div>
                  <h3 className="text-lg font-bold text-ink">¡Solicitud Enviada con Éxito!</h3>
                  <p className="text-muted text-sm max-w-xs mx-auto">
                    Hemos recibido tu postulación. El equipo de ElectroShop se comunicará contigo pronto.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {error && (
                    <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs flex items-center gap-2">
                      <FiAlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-ink-soft text-xs font-semibold uppercase tracking-wider mb-2">
                      Nombre Artístico / Marca Personal <span className="text-brand-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.displayName}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-line rounded-xl text-ink placeholder-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                      placeholder="El nombre que verán tus estudiantes en la web"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-ink-soft text-xs font-semibold uppercase tracking-wider mb-2">
                      Área de Especialidad / Expertise
                    </label>
                    <input
                      type="text"
                      value={form.expertise}
                      onChange={(e) => setForm({ ...form, expertise: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-line rounded-xl text-ink placeholder-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                      placeholder="Ej: Fibra óptica, CCTV, Arduino, Consolas de Videojuegos..."
                    />
                  </div>

                  <div>
                    <label className="block text-ink-soft text-xs font-semibold uppercase tracking-wider mb-2">
                      Biografía & Plan de Cursos
                    </label>
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 bg-white border border-line rounded-xl text-ink placeholder-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm resize-none"
                      placeholder="Cuéntanos brevemente tus años de experiencia y qué tipo de cursos te gustaría subir."
                    />
                  </div>

                  <button
                    onClick={handleApply}
                    disabled={submitting}
                    className={`${adminPrimaryButton} w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold disabled:opacity-50 cursor-pointer`}
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
            <div className="bg-white rounded-3xl border border-line p-8 md:p-10 text-center shadow-xl space-y-6">
              <div className="w-16 h-16 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <FiBookOpen className="w-8 h-8 text-brand-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-ink">Únete como Creador</h2>
                <p className="text-muted text-sm md:text-base max-w-sm mx-auto">
                  Para enviar tu solicitud e iniciar el registro de tus cursos, primero debes contar con una cuenta de usuario.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                <Link 
                  href="/login?redirect=/creator" 
                  className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all duration-300 hover:scale-[1.02] inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  Iniciar Sesión
                </Link>
                <Link 
                  href="/registro" 
                  className="px-8 py-3 bg-white border border-line text-ink font-bold rounded-xl hover:bg-surface transition-all duration-300 hover:scale-[1.02] inline-flex items-center justify-center gap-2 cursor-pointer"
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


