// La tarjeta de un curso en /cursos. C-249e: sale de app/cursos/page.tsx para que el asistente del panel muestre la misma
// como vista previa (sin el botón de compartir).
import type { Prisma } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';
import ShareEarnButton from '@/components/social/ShareEarnButton';
import { IconoCursos, IconoEstrella, IconoEstrellaLlena, IconoPlay } from '@/components/iconos';
import { formatUSD } from '@/lib/currency';

const LEVEL_LABELS: Record<string, string> = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
};

const LEVEL_COLORS: Record<string, string> = {
  // C-192: el nivel no es un estado (verde, ámbar y rojo decían "bien, cuidado, error"): la misma familia azul, de menos a más
  PRINCIPIANTE: 'bg-brand-50 text-brand-700',
  INTERMEDIO: 'bg-brand-100 text-brand-800',
  AVANZADO: 'bg-brand-700 text-white',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <IconoEstrellaLlena key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-warning' : 'text-line'}`} />
      ))}
    </span>
  );
}

type CourseCardProps = {
  course: {
    id: string; title: string; slug: string; shortDesc?: string | null;
    thumbnail?: string | null; category?: string | null; level?: string | null;
    priceUSD: number | string | Prisma.Decimal; rating?: number | string | Prisma.Decimal | null; enrollmentCount: number;
    totalDuration?: number | null; totalLessons?: number | null;
    isFeatured: boolean; instructor?: string | null;
    creator?: { displayName: string } | null;
  };
};

export default function CourseCard({ course, compartir = true }: CourseCardProps & { compartir?: boolean }) {
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
      <div className="relative h-40 bg-brand-50 overflow-hidden">
        {/* Botón Compartir y Ganar (no va en la vista previa del panel) */}
        {compartir && <ShareEarnButton
          url={`/cursos/${course.slug}`}
          title={course.title}
          description={course.shortDesc || ''}
          image={course.thumbnail || ''}
          price={price}
          type="course"
          className="absolute top-2 right-2 z-30 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 transition-opacity duration-300"
        />}
        {course.thumbnail ? (
          <Image src={course.thumbnail} alt={course.title} width={640} height={360} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <IconoCursos className="w-12 h-12 text-brand-500/25" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center lg:opacity-0 lg:group-hover:opacity-100 transition-opacity bg-ink/20">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <IconoPlay lleno className="w-5 h-5 text-brand-500 ml-0.5" />
          </div>
        </div>
        <div className="absolute top-2 left-2 flex gap-1">
          {course.level && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${LEVEL_COLORS[course.level] || 'bg-surface text-ink-soft'}`}>
              {LEVEL_LABELS[course.level] || course.level}
            </span>
          )}
          {course.isFeatured && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-600" aria-label="Destacado">
              <IconoEstrella lleno className="h-3 w-3" aria-hidden="true" />
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
            <span className="text-xs font-bold text-warning-strong">{rating.toFixed(1)}</span>
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
