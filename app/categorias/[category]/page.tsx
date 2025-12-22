import Image from 'next/image';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import AnimatedWave from '@/components/AnimatedWave';
import CategoryClient from '@/components/public/CategoryClient';
import PageAnimations from '@/components/public/PageAnimations';
import { FiGrid } from 'react-icons/fi';

export const revalidate = 0;

// Dynamic Gradient based on name length (deterministic) - BLUE TONES ONLY
const getGradient = (name: string) => {
  const gradients = [
    'from-blue-600 to-blue-800',
    'from-sky-600 to-blue-700',
    'from-indigo-600 to-blue-800',
    'from-slate-600 to-slate-800',
    'from-cyan-600 to-blue-700',
  ];
  return gradients[name.length % gradients.length];
};

export default async function CategoryDetailPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = await params;

  const [category, settings] = await Promise.all([
    prisma.category.findUnique({
      where: { slug: categorySlug }
    }),
    prisma.companySettings.findFirst()
  ]);

  if (!category) {
    notFound();
  }

  const products = await prisma.product.findMany({
    where: {
      categoryId: category.id,
      status: 'PUBLISHED'
    },
    include: {
      category: true,
      brand: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Transform products for client component (convert Decimal fields to Number)
  const formattedProducts = products.map(p => ({
    ...p,
    priceUSD: Number(p.priceUSD),
    priceVES: p.priceVES ? Number(p.priceVES) : null,
    weightKg: p.weightKg ? Number(p.weightKg) : null,
    shippingCost: p.shippingCost ? Number(p.shippingCost) : null,
    images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images,
  }));


  const gradient = getGradient(category.name);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PublicHeader settings={settings ? JSON.parse(JSON.stringify(settings)) : null} />

      {/* Hero Section */}
      <section className={`relative bg-gradient-to-br ${gradient} overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        </div>

        {/* Animated Particles */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Category Icon/Image */}
            <div className="relative group">
              <div className="absolute inset-0 bg-white/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative w-32 h-32 md:w-40 md:h-40 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-500">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    width={100}
                    height={100}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FiGrid className="w-16 h-16 text-white" />
                )}

                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ transform: 'skewX(-20deg)' }}></div>
              </div>
            </div>

            {/* Text Content */}
            <div className="text-center md:text-left text-white flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-sm font-medium mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                {products.length} productos disponibles
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight drop-shadow-lg break-words">
                {category.name}
              </h1>
              <p className="text-lg md:text-xl text-white/90 w-full max-w-4xl leading-relaxed font-light break-words">
                {category.description || `Explora nuestra colección exclusiva de ${category.name}.`}
              </p>
            </div>
          </div>
        </div>

        <AnimatedWave />
      </section>

      {/* Main Content (Client Component) */}
      <CategoryClient category={category} initialProducts={formattedProducts as any} />

      <PageAnimations />
    </div>
  );
}
