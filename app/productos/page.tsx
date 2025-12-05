import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import AnimatedWave from '@/components/AnimatedWave';
import ProductosClient from './ProductosClient';

export const revalidate = 0;

export default async function ProductosPage() {
  const [products, categories, settings] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' }
    }),
    prisma.companySettings.findFirst()
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-white to-[#f8f9fa]">
      <PublicHeader settings={settings ? JSON.parse(JSON.stringify(settings)) : null} />

      {/* Hero Section with Premium Effects */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-6 animate-fadeIn">
              <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
              <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <span className="text-sm font-semibold text-white">Catálogo Premium</span>
              </div>
              <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
              Nuestros <span className="bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">Productos</span>
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
              Explora nuestra colección de tecnología de vanguardia con las mejores marcas y precios competitivos
            </p>
          </div>
        </div>

        {/* Animated Wave Divider */}
        <AnimatedWave />
      </section>

      {/* Client Component with Products and Filters */}
      <ProductosClient
        initialProducts={JSON.parse(JSON.stringify(products))}
        initialCategories={JSON.parse(JSON.stringify(categories))}
      />

      {/* Footer CTA */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] py-16 mt-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-black text-white mb-4">
            ¿No encuentras lo que buscas?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Solicítanos cualquier producto tecnológico y te lo conseguimos al mejor precio
          </p>
          <Link
            href="/solicitar-producto"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-[#2a63cd] text-lg font-bold rounded-xl hover:bg-gray-50 transition-all shadow-2xl hover:shadow-3xl hover:scale-105"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Solicitar Producto Ahora
          </Link>
        </div>
      </section>
    </div>
  );
}
