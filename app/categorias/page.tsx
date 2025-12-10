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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <span className="text-sm font-semibold text-white">Explora Nuestro Catálogo</span>
            </div>
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Categorías de <span className="bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent">Productos</span>
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
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

        {/* CTA Section */}
        <div className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-2xl p-8 text-center text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-cyan-300 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          <div className="relative w-full max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-3">
              ¿No encuentras lo que buscas?
            </h2>
            <p className="text-white/90 mb-6 w-full max-w-4xl mx-auto text-lg px-4">
              Podemos ayudarte a conseguir cualquier producto tecnológico al mejor precio
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/solicitar-producto"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#2a63cd] font-semibold rounded-xl hover:bg-gray-50 transition-all hover:scale-105 shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Solicitar Producto
              </Link>
              <Link
                href="/contacto"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md text-white font-semibold border-2 border-white/30 rounded-xl hover:bg-white/20 transition-all hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contactar
              </Link>
            </div>
          </div>
        </div>
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
