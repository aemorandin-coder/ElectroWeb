import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4" role="main">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="relative mb-6 inline-block">
            <span className="text-[140px] font-black text-[#e9ecef] leading-none select-none" aria-hidden="true">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-[#2a63cd]/10 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#212529] mb-2">Página no encontrada</h1>
          <p className="text-[#495057]">Lo sentimos, la página que buscas no existe o ha sido movida.</p>
        </div>

        <div className="flex gap-3 justify-center mb-8">
          <Link
            href="/"
            className="px-5 py-2.5 bg-[#2a63cd] text-white font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-md hover:shadow-lg"
          >
            Ir al inicio
          </Link>
          <Link
            href="/productos"
            className="px-5 py-2.5 bg-white text-[#2a63cd] font-semibold rounded-lg border-2 border-[#2a63cd] hover:bg-[#f8f9fa] transition-all"
          >
            Ver productos
          </Link>
        </div>

        <div className="pt-6 border-t border-[#e9ecef]">
          <p className="text-sm text-[#6a6c6b] mb-3">¿Necesitas ayuda? Intenta buscar:</p>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <Link href="/categorias" className="px-3 py-1.5 bg-white rounded-full border border-[#e9ecef] text-[#495057] hover:border-[#2a63cd] hover:text-[#2a63cd] transition-colors">
              Categorías
            </Link>
            <Link href="/servicios" className="px-3 py-1.5 bg-white rounded-full border border-[#e9ecef] text-[#495057] hover:border-[#2a63cd] hover:text-[#2a63cd] transition-colors">
              Servicios
            </Link>
            <Link href="/contacto" className="px-3 py-1.5 bg-white rounded-full border border-[#e9ecef] text-[#495057] hover:border-[#2a63cd] hover:text-[#2a63cd] transition-colors">
              Contacto
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
