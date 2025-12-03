'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      window.location.href = '/';
    }
  }, [countdown]);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-white border-b border-[#e9ecef] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#212529]">Electro Shop</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md border border-[#e9ecef] p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-[#212529] mb-3">
            ¡Pedido Realizado con Éxito!
          </h1>
          <p className="text-lg text-[#6a6c6b] mb-6">
            Tu pedido ha sido procesado correctamente
          </p>

          {/* Order ID */}
          {orderId && (
            <div className="bg-[#f8f9fa] rounded-lg p-4 mb-6 inline-block">
              <p className="text-sm text-[#6a6c6b] mb-1">Número de Orden</p>
              <p className="text-xl font-bold text-[#2a63cd]">#{orderId.slice(0, 8).toUpperCase()}</p>
            </div>
          )}

          {/* Info Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#212529] mb-1">
                    Confirmación Enviada
                  </h3>
                  <p className="text-xs text-[#6a6c6b]">
                    Te hemos enviado un email con los detalles de tu pedido
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#212529] mb-1">
                    Te Contactaremos Pronto
                  </h3>
                  <p className="text-xs text-[#6a6c6b]">
                    Nuestro equipo se pondrá en contacto contigo para coordinar la entrega
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="mb-8 p-6 bg-[#f8f9fa] rounded-lg text-left">
            <h2 className="text-lg font-semibold text-[#212529] mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Próximos Pasos
            </h2>
            <ol className="space-y-3 text-sm text-[#6a6c6b]">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-[#2a63cd] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>Recibirás un email de confirmación con los detalles de tu pedido</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-[#2a63cd] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Nuestro equipo revisará tu orden y te contactará para confirmar disponibilidad</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-[#2a63cd] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Coordinaremos la forma de pago y los detalles de entrega</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-[#2a63cd] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span>¡Recibirás tu pedido en la dirección indicada!</span>
              </li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/productos"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2a63cd] text-white font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Seguir Comprando
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#2a63cd] font-medium border-2 border-[#2a63cd] rounded-lg hover:bg-[#f8f9fa] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Volver al Inicio
            </Link>
          </div>

          {/* Auto-redirect notice */}
          <p className="mt-6 text-xs text-[#6a6c6b]">
            Serás redirigido al inicio en {countdown} segundos...
          </p>
        </div>

        {/* Support Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md border border-[#e9ecef] p-6">
          <h3 className="text-lg font-semibold text-[#212529] mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            ¿Necesitas Ayuda?
          </h3>
          <p className="text-sm text-[#6a6c6b] mb-4">
            Si tienes alguna pregunta sobre tu pedido o necesitas asistencia, no dudes en contactarnos:
          </p>
          <div className="flex flex-col sm:flex-row gap-3 text-sm">
            <a
              href="tel:+584241234567"
              className="flex items-center gap-2 text-[#2a63cd] hover:text-[#1e4ba3] font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              +58 424 1234567
            </a>
            <a
              href="mailto:ventas@electroshop.com"
              className="flex items-center gap-2 text-[#2a63cd] hover:text-[#1e4ba3] font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              ventas@electroshop.com
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e9ecef] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-[#6a6c6b]">
            &copy; {new Date().getFullYear()} Electro Shop Morandin C.A. - Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
