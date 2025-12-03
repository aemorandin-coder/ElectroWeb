export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center">
      <svg
        className={`animate-spin ${sizeClasses[size]} text-[#2a63cd]`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[#2a63cd] mb-4 shadow-lg shadow-[#2a63cd]/20 animate-pulse">
          <LoadingSpinner size="md" />
        </div>
        <p className="text-sm text-[#6a6c6b] font-medium">Cargando...</p>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#e9ecef] p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-[#f8f9fa] rounded-lg" />
        <div className="w-16 h-6 bg-[#f8f9fa] rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-[#f8f9fa] rounded w-1/3" />
        <div className="h-6 bg-[#f8f9fa] rounded w-1/2" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-[#e9ecef]">
          <div className="w-12 h-12 bg-[#f8f9fa] rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#f8f9fa] rounded w-1/4" />
            <div className="h-3 bg-[#f8f9fa] rounded w-1/3" />
          </div>
          <div className="w-20 h-8 bg-[#f8f9fa] rounded" />
        </div>
      ))}
    </div>
  );
}
