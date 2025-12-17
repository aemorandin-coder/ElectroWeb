import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import AnimatedWave from '@/components/AnimatedWave';
import PageAnimations from '@/components/public/PageAnimations';
import { FiGrid } from 'react-icons/fi';

export const revalidate = 0;

export default async function CategoriasPage() {
  const [categories, settings] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: 'asc' }
    }),
    prisma.companySettings.findFirst()
  ]);

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader settings={settings ? JSON.parse(JSON.stringify(settings)) : null} />

      {/* Hero Section - Premium Design */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <span className="text-xs font-semibold text-white">Explora Nuestro Catálogo</span>
            </div>
            <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">
            Categorías de <span className="bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent">Productos</span>
          </h1>
          <p className="text-base text-white/90 max-w-3xl mx-auto leading-relaxed">
            Explora nuestra amplia selección de productos tecnológicos organizados por categoría
          </p>
        </div>

        {/* Animated Wave Divider */}
        <AnimatedWave />
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {categories.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <FiGrid className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No hay categorías disponibles</h3>
            <p className="text-gray-500">Vuelve más tarde para ver nuestras nuevas categorías.</p>
          </div>
        ) : (
          /* Categories Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {categories.map((category, index) => {
              // Professional Blue/Slate Gradients
              const gradients = [
                'from-blue-600 to-blue-800',
                'from-sky-600 to-blue-700',
                'from-indigo-600 to-blue-800',
                'from-slate-600 to-slate-800',
                'from-cyan-600 to-blue-700',
              ];
              const gradient = gradients[index % gradients.length];

              return (
                <Link
                  key={category.id}
                  href={`/categorias/${category.slug}`}
                  className="group bg-white/80 backdrop-blur-xl rounded-2xl border border-[#e9ecef] shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  {/* Card Content */}
                  <div className="p-6">
                    {/* 3D Glossy Icon - Enhanced */}
                    <div className="relative w-20 h-20 mx-auto mb-4">
                      <div
                        className={`
                          relative w-full h-full rounded-2xl flex items-center justify-center
                          bg-gradient-to-br ${gradient}
                          shadow-2xl
                          group-hover:scale-110 transition-all duration-500
                          overflow-hidden
                        `}
                        style={{
                          boxShadow: `
                            0 15px 50px -12px rgba(0, 0, 0, 0.6),
                            0 8px 20px -8px rgba(0, 0, 0, 0.4),
                            inset 0 2px 0 rgba(255, 255, 255, 0.7),
                            inset 0 -2px 0 rgba(0, 0, 0, 0.3),
                            inset 0 0 60px rgba(255, 255, 255, 0.1)
                          `,
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        <div
                          className="absolute inset-0 rounded-2xl"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.15) 100%)',
                            pointerEvents: 'none'
                          }}
                        />
                        <div
                          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                          style={{
                            background: 'linear-gradient(45deg, transparent 20%, rgba(255,255,255,0.5) 50%, transparent 80%)',
                            backgroundSize: '200% 200%',
                            animation: 'shine 2s infinite'
                          }}
                        />
                        <div className="relative z-10 group-hover:rotate-12 transition-transform duration-500 drop-shadow-lg w-full h-full p-4 flex items-center justify-center">
                          {category.image ? (
                            <Image
                              src={category.image}
                              alt={category.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-contain drop-shadow-md"
                            />
                          ) : (
                            <FiGrid className="w-8 h-8 text-white" />
                          )}
                        </div>
                        <div
                          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4/5 h-3 bg-black/40 blur-lg rounded-full"
                          style={{ filter: 'blur(10px)' }}
                        />
                        <div
                          className="absolute inset-0 rounded-2xl opacity-50"
                          style={{
                            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)',
                            pointerEvents: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-[#212529] mb-2 text-center group-hover:text-[#2a63cd] transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-[#6a6c6b] mb-4 text-center line-clamp-2 min-h-[40px]">
                      {category.description || 'Explora los mejores productos en esta categoría.'}
                    </p>
                    <div className="flex items-center justify-center text-[#2a63cd] text-sm font-semibold group-hover:gap-3 transition-all">
                      Ver productos
                      <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA Section - Premium Style matching Homepage */}
        <section className="py-12 bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-2xl relative overflow-hidden">
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
        </section>
      </main>

      <PageAnimations />

      {/* Footer */}
      <footer className="bg-[#212529] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} {settings?.companyName || 'Electro Shop Morandin C.A.'} - Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
