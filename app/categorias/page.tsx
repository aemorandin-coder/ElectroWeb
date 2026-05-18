import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import AnimatedWave from '@/components/AnimatedWave';
import PageAnimations from '@/components/public/PageAnimations';
import Footer from '@/components/Footer';
import CategoriasClient from './CategoriasClient';

export const revalidate = 0;

export default async function CategoriasPage() {
  const [rawCategories, settings] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        color: true,
        _count: { select: { products: true } },
      },
    }),
    prisma.companySettings.findFirst(),
  ]);

  const categories = rawCategories as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    _count: { products: number };
  }[];

  const totalProducts = categories.reduce((sum, c) => sum + c._count.products, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader settings={settings ? JSON.parse(JSON.stringify(settings)) : null} />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-0 sm:pt-10 sm:pb-2 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-3 sm:mb-4">
            <div className="h-px w-8 bg-white/30 rounded-full" />
            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[10px] sm:text-xs font-semibold text-white">
              Catálogo Completo
            </span>
            <div className="h-px w-8 bg-white/30 rounded-full" />
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 sm:mb-3 tracking-tight">
            Categorías de{' '}
            <span className="bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent">
              Productos
            </span>
          </h1>

          <p className="text-xs sm:text-sm lg:text-base text-white/80 max-w-xl mx-auto leading-relaxed mb-4">
            {categories.length} categorías · {totalProducts} productos disponibles
          </p>
        </div>

        <AnimatedWave />
      </section>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12 relative z-10">
        <CategoriasClient categories={categories} />
      </main>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="py-12 bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-2xl relative overflow-hidden">
          {/* Background blobs */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-5 left-10 w-48 h-48 bg-white rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-5 right-10 w-64 h-64 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          {/* Floating icons */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-[10%] animate-float opacity-20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="absolute top-1/3 right-[15%] animate-float-delayed opacity-20">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="absolute bottom-1/4 left-[20%] animate-float opacity-15">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div className="absolute bottom-1/3 right-[25%] animate-float-delayed opacity-20">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-white text-center md:text-left">
                <h2 className="text-2xl font-bold mb-2">¿No encuentras lo que buscas?</h2>
                <p className="text-base text-white/80">Solicítanos cualquier producto tecnológico al mejor precio</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/solicitar-producto"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#2a63cd] text-sm font-bold rounded-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Solicitar Producto
                </Link>
                <Link
                  href="/contacto"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md text-white font-semibold border border-white/30 rounded-lg hover:bg-white/20 transition-all hover:scale-105 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contactar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PageAnimations />
      <Footer />
    </div>
  );
}
