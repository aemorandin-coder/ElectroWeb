export default function CursosLoading() {
    return (
        <div className="min-h-dvh bg-gradient-to-br from-surface via-white to-surface">
            {/* Header Skeleton */}
            <header className="sticky top-0 z-50 bg-white border-b border-line shadow-sm h-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-line rounded-lg animate-pulse" />
                        <div className="w-32 h-6 bg-line rounded animate-pulse" />
                    </div>
                    <div className="hidden md:flex gap-6">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="w-20 h-4 bg-line rounded animate-pulse" />
                        ))}
                    </div>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-line rounded-lg animate-pulse" />
                        <div className="w-10 h-10 bg-line rounded-lg animate-pulse" />
                    </div>
                </div>
            </header>

            {/* Hero Skeleton */}
            <section className="relative bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <div className="w-40 h-8 bg-white/20 rounded-full mx-auto mb-6 animate-pulse" />
                        <div className="w-64 h-14 bg-white/20 rounded-lg mx-auto mb-6 animate-pulse" />
                        <div className="w-2/3 h-6 bg-white/10 rounded mx-auto animate-pulse" />
                    </div>
                </div>
                <div className="h-16" />
            </section>

            {/* Courses Grid Skeleton */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                            <div className="w-full h-48 bg-line animate-pulse" />
                            <div className="p-6">
                                <div className="w-20 h-5 bg-line rounded-full mb-3 animate-pulse" />
                                <div className="w-4/5 h-6 bg-line rounded mb-3 animate-pulse" />
                                <div className="w-full h-4 bg-line rounded mb-2 animate-pulse" />
                                <div className="w-2/3 h-4 bg-line rounded mb-4 animate-pulse" />
                                <div className="flex justify-between items-center">
                                    <div className="w-24 h-8 bg-line rounded animate-pulse" />
                                    <div className="w-28 h-10 bg-line rounded-lg animate-pulse" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
