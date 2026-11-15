import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { imagenDePagina } from '@/lib/og/datos';
import PublicHeader from '@/components/public/PublicHeader';
import PageHeader from '@/components/ui/PageHeader';
import Footer from '@/components/Footer';
import CourseCard from '@/components/cursos/CourseCard';
import { IconoCursos, IconoEstrella, IconoFlechaDerecha } from '@/components/iconos';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.companySettings.findFirst({
    select: {
      coursesMetaTitle: true,
      coursesMetaDescription: true,
      coursesMetaKeywords: true,
      coursesMetaImage: true,
    }
  });

  // C-149: el layout ya agrega " | Empresa" (salía "Cursos | Electro Shop | Electro Shop"); el título del admin va tal cual
  const title = settings?.coursesMetaTitle || 'Cursos';
  const description = settings?.coursesMetaDescription || 'Aprende redes, electrónica, CCTV, gaming y más con nuestros cursos online.';
  const keywords = settings?.coursesMetaKeywords ? settings.coursesMetaKeywords.split(',').map(k => k.trim()) : undefined;

  // C-178: la imagen de Configuración → SEO si se subió; si no, la que arma la tienda (antes, el logo cuadrado)
  const images = [await imagenDePagina('cursos', settings?.coursesMetaImage)];

  return {
    title: settings?.coursesMetaTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: { canonical: '/cursos' },
    openGraph: {
      title,
      description,
      url: '/cursos',
      images,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
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
        icon={<IconoCursos />}
        eyebrow="Aprende con expertos"
        title="Cursos online"
        description="Aprende reparación de equipos, redes, CCTV y electrónica con cursos prácticos."
      />

      {/* Course Catalog */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

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
                <h2 className="text-xl font-bold text-ink mb-4 inline-flex items-center gap-1.5"><IconoEstrella lleno className="h-5 w-5 text-brand-500 shrink-0" aria-hidden="true" />Cursos Destacados</h2>
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
              <IconoCursos className="w-6 h-6 text-brand-500" />
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
        <div className="relative rounded-3xl overflow-hidden bg-brand-600 text-white p-8 md:p-12">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white">
                Únete como Creador
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                ¿Eres un experto en tecnología? <br />
                <span>Enseña en ElectroShop</span>
              </h2>
              <p className="text-white/80 text-sm md:text-base max-w-2xl">
                Crea cursos prácticos de reparación, redes, CCTV, gaming o electrónica. Sube tu material y obtén el 90% de comisión por cada venta directa. Nosotros nos encargamos de la plataforma y el procesamiento de pagos.
              </p>
              
              {/* Micro stats inside banner */}
              <div className="grid grid-cols-3 gap-4 pt-2 max-w-md">
                <div>
                  <p className="text-xl md:text-2xl font-bold text-white">90%</p>
                  <p className="text-xs text-white/80">Comisión para ti</p>
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold text-white">Fácil</p>
                  <p className="text-xs text-white/80">Sube tus videos</p>
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold text-white">Soporte</p>
                  <p className="text-xs text-white/80">De principio a fin</p>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-4 flex justify-start lg:justify-end">
              <Link
                href="/creator"
                className="px-8 py-4 bg-white text-brand-500 hover:bg-surface font-bold rounded-2xl transition-all duration-300 inline-flex items-center gap-2"
              >
                Comenzar a Enseñar
                <IconoFlechaDerecha className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
