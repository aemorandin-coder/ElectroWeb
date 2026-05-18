import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import AnimatedWave from '@/components/AnimatedWave';
import ProductosClient from './ProductosClient';
import Footer from '@/components/Footer';

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

      {/* Hero Section - Responsive, visible on all screens */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-48 h-48 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
            Nuestros <span className="text-cyan-200">Productos</span>
          </h1>

          <p className="text-xs sm:text-sm text-white/80 max-w-2xl mx-auto mt-2 leading-relaxed">
            Explora la mejor selección de saldo digital, gift cards, licencias y hardware gaming de vanguardia.
          </p>

          {/* How It Works - Premium Glassmorphic Step Indicator */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto text-left">
            {/* Step 1 */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex gap-3 transition-all hover:bg-white/10 hover:scale-[1.02] shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
              <div className="w-10 h-10 bg-white text-[#2a63cd] rounded-xl flex items-center justify-center font-black text-base shadow-md flex-shrink-0">
                1
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-black text-white uppercase tracking-wide">1. Selecciona tu Producto</h3>
                <p className="text-[10px] leading-relaxed text-cyan-100/80">
                  Elige tu saldo digital, recargas directas o el hardware y periféricos gaming de tu preferencia.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex gap-3 transition-all hover:bg-white/10 hover:scale-[1.02] shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
              <div className="w-10 h-10 bg-white text-[#2a63cd] rounded-xl flex items-center justify-center font-black text-base shadow-md flex-shrink-0">
                2
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-black text-white uppercase tracking-wide">2. Paga de Forma Segura</h3>
                <p className="text-[10px] leading-relaxed text-cyan-100/80">
                  Realiza tu pago vía Pago Móvil, Binance, Transferencia o Divisas.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex gap-3 transition-all hover:bg-white/10 hover:scale-[1.02] shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
              <div className="w-10 h-10 bg-white text-[#2a63cd] rounded-xl flex items-center justify-center font-black text-base shadow-md flex-shrink-0">
                3
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-black text-white uppercase tracking-wide">3. ¡Recibe tu Compra!</h3>
                <p className="text-[10px] leading-relaxed text-cyan-100/80">
                  Tu recarga digital se procesa en minutos, o recibe tu hardware directamente en tu dirección.
                </p>
              </div>
            </div>
          </div>
        </div>

        <AnimatedWave />
      </section>

      {/* Client Component with Products and Filters */}
      <ProductosClient
        initialProducts={JSON.parse(JSON.stringify(products))}
        initialCategories={JSON.parse(JSON.stringify(categories))}
      />

      {/* Footer CTA - Solicitar Producto */}
      <section className="py-12 bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] relative overflow-hidden mt-20">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-5 left-10 w-48 h-48 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-5 right-10 w-64 h-64 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        {/* Floating Tech Icons */}
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
              <p className="text-base text-white/80">
                Solicítanos cualquier producto tecnológico al mejor precio
              </p>
            </div>
            <Link
              href="/solicitar-producto"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#2a63cd] text-sm font-bold rounded-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Solicitar Producto
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
