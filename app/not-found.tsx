import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4" role="main">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="relative mb-6">
            <span className="text-[180px] font-black text-[#e9ecef] leading-none select-none" aria-hidden="true">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-[#2a63cd]/10 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#212529] mb-3">
            Página no encontrada
          </h1>
          <p className="text-[#495057] mb-6">
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-[#2a63cd] text-white font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a63cd] focus-visible:ring-offset-2"
            aria-label="Volver a la página de inicio"
          >
            Ir al inicio
          </Link>
          <Link
            href="/productos"
            className="px-6 py-3 bg-white text-[#2a63cd] font-semibold rounded-lg border-2 border-[#2a63cd] hover:bg-[#f8f9fa] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a63cd] focus-visible:ring-offset-2"
            aria-label="Ver todos los productos"
          >
            Ver productos
          </Link>
        </div>

        <div className="mt-10 pt-6 border-t border-[#e9ecef]">
          <p className="text-sm text-[#6a6c6b] mb-3">
            ¿Necesitas ayuda? Intenta buscar lo que necesitas:
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <Link href="/categorias" className="px-3 py-1.5 bg-white rounded-full border border-[#e9ecef] text-[#495057] hover:border-[#2a63cd] hover:text-[#2a63cd] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a63cd]">
              Categorías
            </Link>
            <Link href="/servicios" className="px-3 py-1.5 bg-white rounded-full border border-[#e9ecef] text-[#495057] hover:border-[#2a63cd] hover:text-[#2a63cd] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a63cd]">
              Servicios
            </Link>
            <Link href="/contacto" className="px-3 py-1.5 bg-white rounded-full border border-[#e9ecef] text-[#495057] hover:border-[#2a63cd] hover:text-[#2a63cd] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a63cd]">
              Contacto
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
