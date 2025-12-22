import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-white to-[#f0f4f8] flex items-center justify-center p-4 sm:p-6 lg:p-8" role="main">
      <div className="w-full max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <div className="relative mb-6 inline-block">
            <span className="text-[120px] sm:text-[160px] lg:text-[200px] font-black text-[#e9ecef] leading-none select-none" aria-hidden="true">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-[#2a63cd]/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#212529] mb-3">Página no encontrada</h1>
          <p className="text-base sm:text-lg text-[#495057] max-w-xl mx-auto">
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Link
            href="/"
            className="px-6 py-3 bg-[#2a63cd] text-white font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-md hover:shadow-lg text-base sm:text-lg"
          >
            Ir al inicio
          </Link>
          <Link
            href="/productos"
            className="px-6 py-3 bg-white text-[#2a63cd] font-semibold rounded-lg border-2 border-[#2a63cd] hover:bg-[#f8f9fa] transition-all text-base sm:text-lg"
          >
            Ver productos
          </Link>
        </div>

        <div className="pt-6 border-t border-[#e9ecef]">
          <p className="text-sm sm:text-base text-[#6a6c6b] mb-4">¿Necesitas ayuda? Intenta buscar:</p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 text-sm sm:text-base">
            <Link href="/categorias" className="px-4 py-2 bg-white rounded-full border border-[#e9ecef] text-[#495057] hover:border-[#2a63cd] hover:text-[#2a63cd] transition-colors">
              Categorías
            </Link>
            <Link href="/servicios" className="px-4 py-2 bg-white rounded-full border border-[#e9ecef] text-[#495057] hover:border-[#2a63cd] hover:text-[#2a63cd] transition-colors">
              Servicios
            </Link>
            <Link href="/contacto" className="px-4 py-2 bg-white rounded-full border border-[#e9ecef] text-[#495057] hover:border-[#2a63cd] hover:text-[#2a63cd] transition-colors">
              Contacto
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
