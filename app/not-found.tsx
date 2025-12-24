import Link from 'next/link';
import { FiHome, FiPackage, FiSettings, FiBookOpen, FiMessageCircle, FiBox } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-white to-[#f0f4f8] flex items-center justify-center px-4 sm:px-6 lg:px-8" role="main">
      <div className="w-full max-w-2xl mx-auto text-center py-12">
        {/* 404 Visual */}
        <div className="mb-10">
          <div className="flex flex-col items-center gap-4 mb-8">
            {/* 404 Text */}
            <span className="text-[120px] sm:text-[180px] font-black bg-gradient-to-br from-[#e9ecef] to-[#dee2e6] bg-clip-text text-transparent leading-none select-none" aria-hidden="true">
              404
            </span>
            {/* Icon below */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-[#2a63cd]/20 shadow-lg -mt-10">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Title & Description */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#212529] mb-4">
            Página no encontrada
          </h1>
          <p className="text-lg sm:text-xl text-[#6a6c6b] max-w-lg mx-auto leading-relaxed">
            Lo sentimos, la página que buscas no existe o ha sido movida a otra ubicación.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:from-[#1e4ba3] hover:to-[#2a63cd] transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105 text-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Ir al inicio
          </Link>
          <Link
            href="/productos"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#2a63cd] font-bold rounded-xl border-2 border-[#2a63cd] hover:bg-blue-50 transition-all hover:scale-105 text-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Ver productos
          </Link>
        </div>

        {/* Quick Links Section */}
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-[#e9ecef] p-6 sm:p-8">
          <p className="text-base text-[#6a6c6b] mb-5 font-medium">¿Necesitas ayuda? Explora estas secciones:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/categorias"
              className="px-5 py-2.5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-full border border-[#e9ecef] text-[#495057] hover:border-[#2a63cd] hover:text-[#2a63cd] hover:from-blue-50 hover:to-indigo-50 transition-all font-medium flex items-center gap-2"
            >
              <FiBox className="w-4 h-4" /> Categorías
            </Link>
            <Link
              href="/servicios"
              className="px-5 py-2.5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-full border border-[#e9ecef] text-[#495057] hover:border-[#2a63cd] hover:text-[#2a63cd] hover:from-blue-50 hover:to-indigo-50 transition-all font-medium flex items-center gap-2"
            >
              <FiSettings className="w-4 h-4" /> Servicios
            </Link>
            <Link
              href="/cursos"
              className="px-5 py-2.5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-full border border-[#e9ecef] text-[#495057] hover:border-[#2a63cd] hover:text-[#2a63cd] hover:from-blue-50 hover:to-indigo-50 transition-all font-medium flex items-center gap-2"
            >
              <FiBookOpen className="w-4 h-4" /> Cursos
            </Link>
            <Link
              href="/contacto"
              className="px-5 py-2.5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-full border border-[#e9ecef] text-[#495057] hover:border-[#2a63cd] hover:text-[#2a63cd] hover:from-blue-50 hover:to-indigo-50 transition-all font-medium flex items-center gap-2"
            >
              <FiMessageCircle className="w-4 h-4" /> Contacto
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
