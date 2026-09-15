import { formatUSD } from '@/lib/currency';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import PageHeader from '@/components/ui/PageHeader';
import Footer from '@/components/Footer';
import ShareEarnButton from '@/components/social/ShareEarnButton';
import { FiStar, FiBookOpen } from 'react-icons/fi';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.companySettings.findFirst({
    select: {
      coursesMetaTitle: true,
      coursesMetaDescription: true,
      coursesMetaKeywords: true,
      coursesMetaImage: true,
      logo: true,
      companyName: true,
    }
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshopve.com';

  const title = settings?.coursesMetaTitle || `Cursos | ${settings?.companyName || 'Electro Shop'}`;
  const description = settings?.coursesMetaDescription || 'Aprende redes, electrónica, CCTV, gaming y más con nuestros cursos online.';
  const keywords = settings?.coursesMetaKeywords ? settings.coursesMetaKeywords.split(',').map(k => k.trim()) : undefined;

  const shareImage = settings?.coursesMetaImage || settings?.logo || '/og-image.png';
  const absoluteShareImage = shareImage.startsWith('http') ? shareImage : `${baseUrl}${shareImage.startsWith('/') ? '' : '/'}${shareImage}`;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      images: [{ url: absoluteShareImage }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: absoluteShareImage }],
    }
  };
}

const CATEGORIES = [
  { value: 'DESARROLLO', label: 'Desarrollo' },
  { value: 'REDES', label: 'Redes' },
  { value: 'ELECTRONICA', label: 'Electrónica' },
  { value: 'GAMING', label: 'Gaming' },
  { value: 'SEGURIDAD', label: 'Seguridad' },
  { value: 'NEGOCIOS', label: 'Negocios' },
];

const LEVEL_LABELS: Record<string, string> = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
};

const LEVEL_COLORS: Record<string, string> = {
  PRINCIPIANTE: 'bg-green-100 text-green-700',
  INTERMEDIO: 'bg-yellow-100 text-yellow-700',
  AVANZADO: 'bg-red-100 text-red-700',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

type CourseCardProps = {
  course: {
    id: string; title: string; slug: string; shortDesc?: string | null;
    thumbnail?: string | null; category?: string | null; level?: string | null;
    priceUSD: any; rating?: any; enrollmentCount: number;
    totalDuration?: number | null; totalLessons?: number | null;
    isFeatured: boolean; instructor?: string | null;
    creator?: { displayName: string } | null;
  };
};

function CourseCard({ course }: CourseCardProps) {
  const instructorName = course.creator?.displayName || course.instructor || 'ElectroShop';
  const price = Number(course.priceUSD);
  const rating = course.rating ? Number(course.rating) : null;

  function formatDuration(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
  }

  return (
    <Link href={`/cursos/${course.slug}`} className="group flex flex-col bg-white rounded-xl border border-line overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      {/* Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-brand-500/10 to-brand-500/5 overflow-hidden">
        {/* Botón Compartir y Ganar */}
        <ShareEarnButton
          url={`/cursos/${course.slug}`}
          title={course.title}
          description={course.shortDesc || ''}
          image={course.thumbnail || ''}
          price={price}
          type="course"
          className="absolute top-2 right-2 z-30 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 transition-opacity duration-300"
        />
        {course.thumbnail ? (
          <Image src={course.thumbnail} alt={course.title} width={640} height={360} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <svg className="w-12 h-12 text-brand-500/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center lg:opacity-0 lg:group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-brand-500 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div className="absolute top-2 left-2 flex gap-1">
          {course.level && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${LEVEL_COLORS[course.level] || 'bg-gray-100 text-gray-600'}`}>
              {LEVEL_LABELS[course.level] || course.level}
            </span>
          )}
          {course.isFeatured && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700" aria-label="Destacado">
              <FiStar className="h-3 w-3 fill-current" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-semibold text-ink text-sm line-clamp-2 mb-1 group-hover:text-brand-500 transition-colors">
          {course.title}
        </h3>
        {course.shortDesc && (
          <p className="text-xs text-muted line-clamp-2 mb-2">{course.shortDesc}</p>
        )}
        <p className="text-xs text-muted mb-2">{instructorName}</p>

        {/* Rating */}
        {rating && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-bold text-yellow-600">{rating.toFixed(1)}</span>
            <StarRating rating={rating} />
            <span className="text-xs text-muted">({course.enrollmentCount})</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-2 text-xs text-muted mb-3">
          {course.totalLessons && <span>{course.totalLessons} lecciones</span>}
          {course.totalDuration && <span>· {formatDuration(course.totalDuration)}</span>}
        </div>

        {/* Price */}
        <div className="mt-auto">
          <span className="text-base font-bold text-ink">
            {price === 0 ? 'Gratis' : formatUSD(price)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export const revalidate = 0;

export default async function CursosPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string | string[] }>;
}) {
  // Next 16: searchParams es una Promise. Solo se acepta una categoría conocida.
  const { cat } = await searchParams;
  const selectedCat = CATEGORIES.find((c) => c.value === cat)?.value;

  const [courses] = await Promise.all([
    prisma.course.findMany({
      where: {
        isActive: true,
        ...(selectedCat ? { category: selectedCat } : {}),
      },
      select: {
        id: true, title: true, slug: true, shortDesc: true, thumbnail: true,
        category: true, level: true, priceUSD: true, rating: true,
        enrollmentCount: true, totalDuration: true, totalLessons: true,
        isFeatured: true, instructor: true,
        creator: { select: { displayName: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { enrollmentCount: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  const hasCourses = courses.length > 0;

  return (
    <div className="min-h-dvh bg-white">
      <PublicHeader />

      <PageHeader
        breadcrumbs={[{ label: 'Cursos' }]}
        icon={<FiBookOpen />}
        eyebrow="Aprende con expertos"
        title="Cursos online"
        description="Aprende reparación de equipos, redes, CCTV y electrónica con cursos prácticos."
      />

      {/* Course Catalog */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 relative z-10">

        {/* Category filter pills - ALWAYS visible */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          <Link
            href="/cursos"
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              !selectedCat
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'bg-surface text-muted hover:bg-line'
            }`}
          >
            Todos
          </Link>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCat === cat.value;
            return (
              <Link
                key={cat.value}
                href={`/cursos?cat=${cat.value}`}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'bg-surface text-muted hover:bg-line'
                }`}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>

        {hasCourses ? (
          <>
            {/* Featured courses */}
            {courses.some((c) => c.isFeatured) && (
              <div className="mb-10">
                <h2 className="text-xl font-bold text-ink mb-4 inline-flex items-center gap-1.5"><FiStar className="h-5 w-5 fill-current text-warning shrink-0" aria-hidden="true" />Cursos Destacados</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {courses.filter((c) => c.isFeatured).map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </div>
            )}

            {/* All courses */}
            <div>
              <h2 className="text-xl font-bold text-ink mb-4">Todos los Cursos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Elegant empty state - no massive blue banner */
          <div className="text-center py-16 border border-dashed border-line rounded-2xl p-8 bg-surface">
            <div className="w-12 h-12 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-ink font-bold text-lg mb-1">Próximamente más cursos</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Estamos preparando el mejor contenido educativo para ti. Regresa pronto para explorar nuestros nuevos cursos técnicos.
            </p>
          </div>
        )}
      </div>

      {/* Banner / CTA Enseña Aquí */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white p-8 md:p-12 shadow-2xl border border-white/10">
          {/* Decorative background blur blobs */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-cyan-200">
                Únete como Creador
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                ¿Eres un experto en tecnología? <br />
                <span className="bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">Enseña en ElectroShop</span>
              </h2>
              <p className="text-white/80 text-sm md:text-base max-w-2xl">
                Crea cursos prácticos de reparación, redes, CCTV, gaming o electrónica. Sube tu material y obtén el 90% de comisión por cada venta directa. Nosotros nos encargamos de la plataforma y el procesamiento de pagos.
              </p>
              
              {/* Micro stats inside banner */}
              <div className="grid grid-cols-3 gap-4 pt-2 max-w-md">
                <div>
                  <p className="text-xl md:text-2xl font-bold text-cyan-300">90%</p>
                  <p className="text-xs text-white/80">Comisión para ti</p>
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold text-cyan-300">Fácil</p>
                  <p className="text-xs text-white/80">Sube tus videos</p>
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold text-cyan-300">Soporte</p>
                  <p className="text-xs text-white/80">De principio a fin</p>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-4 flex justify-start lg:justify-end">
              <Link
                href="/creator"
                className="px-8 py-4 bg-white text-brand-500 hover:bg-gray-50 font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
              >
                Comenzar a Enseñar
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
