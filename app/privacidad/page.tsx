'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 rounded-full text-white text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver
      </button>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-cyan-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

      <div className="w-full max-w-4xl relative z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-slideInUp max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="p-8 border-b border-white/10 bg-white/5">
            <h1 className="text-3xl font-black text-white tracking-tight font-[family-name:var(--font-tektur)]">
              Política de <span className="text-cyan-200">Privacidad</span>
            </h1>
            <p className="text-blue-100 mt-2">Última actualización: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Content - Scrollable */}
          <div className="p-8 overflow-y-auto custom-scrollbar text-white/90 space-y-6 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-white mb-3">1. Recopilación de Información</h2>
              <p>
                Recopilamos información personal que usted nos proporciona voluntariamente al registrarse, realizar una compra o comunicarse con nosotros. Esto puede incluir su nombre, dirección de correo electrónico, número de teléfono, dirección de envío y detalles de pago.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">2. Uso de la Información</h2>
              <p>
                Utilizamos la información recopilada para procesar sus pedidos, mejorar nuestros servicios, personalizar su experiencia de compra y enviarle comunicaciones relevantes sobre sus transacciones y promociones (si ha optado por recibirlas).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">3. Protección de Datos</h2>
              <p>
                Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal contra el acceso no autorizado, la pérdida o la alteración. Utilizamos encriptación SSL para proteger la transmisión de datos sensibles.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">4. Cookies y Tecnologías Similares</h2>
              <p>
                Utilizamos cookies para mejorar la funcionalidad de nuestro sitio web, recordar sus preferencias y analizar el tráfico. Puede configurar su navegador para rechazar las cookies, pero esto podría limitar algunas funcionalidades del sitio.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">5. Compartir Información</h2>
              <p>
                No vendemos ni alquilamos su información personal a terceros. Solo compartimos su información con proveedores de servicios de confianza (como empresas de envío y procesadores de pago) estrictamente para cumplir con los fines descritos en esta política.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">6. Sus Derechos</h2>
              <p>
                Usted tiene derecho a acceder, corregir o eliminar su información personal en cualquier momento. Puede gestionar sus datos desde su perfil de usuario o contactándonos directamente.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
            <Link
              href="/"
              className="px-6 py-3 bg-white text-[#2a63cd] font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
