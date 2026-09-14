import PublicHeader from '@/components/public/PublicHeader';
import { CategoryCardSkeleton } from '@/components/ui/Skeleton';

export default function CategoriasLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header real: el esqueleto de 80px no coincidía con el header nuevo y causaba un salto */}
      <PublicHeader />

      {/* Hero Skeleton */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-0 sm:pt-10 sm:pb-2 text-center">
          <div className="w-40 h-5 bg-white/20 rounded-full mx-auto mb-3 sm:mb-4 animate-pulse" />
          <div className="w-72 h-8 sm:h-10 bg-white/20 rounded-lg mx-auto mb-2 sm:mb-3 animate-pulse" />
          <div className="w-1/2 h-4 bg-white/10 rounded mx-auto mb-4 animate-pulse" />
        </div>
        {/* Wave placeholder matching AnimatedWave height */}
        <div className="h-16 sm:h-20 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      {/* Categories Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
