'use client';

import { useRouter } from 'next/navigation';

export default function TermsPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] flex items-center justify-center px-4 py-12 relative overflow-hidden">
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
              Términos y <span className="text-cyan-200">Condiciones</span>
            </h1>
            <p className="text-blue-100 mt-2">Última actualización: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Content - Scrollable */}
          <div className="p-8 overflow-y-auto custom-scrollbar text-white/90 space-y-6 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-white mb-3">1. Aceptación de los Términos</h2>
              <p>
                Al acceder y utilizar los servicios de Electro Shop Morandin C.A., usted acepta estar legalmente vinculado por estos términos y condiciones. Si no está de acuerdo con alguno de estos términos, por favor no utilice nuestros servicios.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">2. Registro y Seguridad de la Cuenta</h2>
              <p>
                Para acceder a ciertas funciones, deberá registrarse y crear una cuenta. Usted es responsable de mantener la confidencialidad de su contraseña y cuenta, y es totalmente responsable de todas las actividades que ocurran bajo su contraseña o cuenta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">3. Envíos y Entregas</h2>
              <p>
                Actualmente realizamos envíos exclusivamente dentro del territorio de la República Bolivariana de Venezuela. Los tiempos de entrega pueden variar según la ubicación y el método de envío seleccionado. Nos esforzamos por procesar todos los pedidos dentro de las 24-48 horas hábiles siguientes a la confirmación del pago.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">4. Garantía y Devoluciones</h2>
              <p>
                Todos nuestros productos cuentan con garantía por defectos de fábrica. El período de garantía varía según el producto y se especifica en la descripción del mismo. Para procesar una garantía, es indispensable presentar la factura de compra y el producto en su empaque original con todos sus accesorios.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">5. Pagos y Facturación</h2>
              <p>
                Aceptamos diversos métodos de pago, incluyendo transferencias bancarias nacionales, pago móvil, Zelle y efectivo en tienda. Todos los precios están expresados en Dólares Americanos (USD) y pueden ser pagados en Bolívares a la tasa de cambio oficial del BCV vigente al momento del pago.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">6. Propiedad Intelectual</h2>
              <p>
                Todo el contenido incluido en este sitio, como texto, gráficos, logotipos, iconos de botones, imágenes, clips de audio, descargas digitales, compilaciones de datos y software, es propiedad de Electro Shop Morandin C.A. o de sus proveedores de contenido y está protegido por las leyes de propiedad intelectual.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
            <button
              onClick={() => router.back()}
              className="group flex items-center gap-2 px-6 py-3 bg-white text-[#2a63cd] font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
