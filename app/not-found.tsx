import Link from 'next/link';
import { FiHome, FiPackage, FiSettings, FiBookOpen, FiMessageCircle, FiBox } from 'react-icons/fi';
import { adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-surface flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12" role="main">
      <div className="w-full max-w-lg mx-auto text-center">
        {/* 404 Visual */}
        <div className="mb-8">
          <div className="flex flex-col items-center gap-2 mb-6">
            <span className="text-7xl sm:text-8xl font-bold text-subtle leading-none select-none" aria-hidden="true">
              404
            </span>
            <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center border border-brand-500/20 shadow-sm -mt-4">
              <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
            Página no encontrada
          </h1>
          <p className="text-sm sm:text-base text-muted max-w-md mx-auto leading-relaxed">
            Lo sentimos, la página que buscas no existe o ha sido movida a otra ubicación.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Link
            href="/"
            className={`${adminPrimaryButton} justify-center gap-2 py-3 px-6`}
          >
            <FiHome className="w-4 h-4" />
            Ir al inicio
          </Link>
          <Link
            href="/productos"
            className={`${adminSecondaryButton} justify-center gap-2 py-3 px-6`}
          >
            <FiPackage className="w-4 h-4" />
            Ver productos
          </Link>
        </div>

        {/* Quick Links Section */}
        <div className="bg-white rounded-2xl border border-line p-5">
          <p className="text-xs text-muted mb-4 font-semibold uppercase tracking-wider">¿Necesitas ayuda? Explora estas secciones:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/categorias"
              className="px-3.5 py-1.5 bg-surface hover:bg-line text-ink-soft hover:text-ink rounded-full border border-line transition-colors text-xs font-semibold flex items-center gap-1.5"
            >
              <FiBox className="w-3.5 h-3.5" /> Categorías
            </Link>
            <Link
              href="/servicios"
              className="px-3.5 py-1.5 bg-surface hover:bg-line text-ink-soft hover:text-ink rounded-full border border-line transition-colors text-xs font-semibold flex items-center gap-1.5"
            >
              <FiSettings className="w-3.5 h-3.5" /> Servicios
            </Link>
            <Link
              href="/cursos"
              className="px-3.5 py-1.5 bg-surface hover:bg-line text-ink-soft hover:text-ink rounded-full border border-line transition-colors text-xs font-semibold flex items-center gap-1.5"
            >
              <FiBookOpen className="w-3.5 h-3.5" /> Cursos
            </Link>
            <Link
              href="/contacto"
              className="px-3.5 py-1.5 bg-surface hover:bg-line text-ink-soft hover:text-ink rounded-full border border-line transition-colors text-xs font-semibold flex items-center gap-1.5"
            >
              <FiMessageCircle className="w-3.5 h-3.5" /> Contacto
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
