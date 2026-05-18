import { CategoryCardSkeleton } from '@/components/ui/Skeleton';

export default function CategoriasLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e9ecef] shadow-sm h-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#e9ecef] rounded-lg animate-shimmer" />
            <div className="w-32 h-6 bg-[#e9ecef] rounded animate-shimmer" />
          </div>
          <div className="hidden md:flex gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-20 h-4 bg-[#e9ecef] rounded animate-shimmer" />
            ))}
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-[#e9ecef] rounded-lg animate-shimmer" />
            <div className="w-10 h-10 bg-[#e9ecef] rounded-lg animate-shimmer" />
          </div>
        </div>
      </header>

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
