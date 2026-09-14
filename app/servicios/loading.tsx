import PublicHeader from '@/components/public/PublicHeader';

export default function ServiciosLoading() {
    return (
        <div className="min-h-dvh bg-gradient-to-br from-surface via-white to-surface">
            <PublicHeader />

            {/* Hero Skeleton */}
            <section className="relative bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <div className="w-40 h-8 bg-white/20 rounded-full mx-auto mb-6 animate-pulse" />
                        <div className="w-72 h-14 bg-white/20 rounded-lg mx-auto mb-6 animate-pulse" />
                        <div className="w-2/3 h-6 bg-white/10 rounded mx-auto animate-pulse" />
                    </div>
                </div>
                <div className="h-16" />
            </section>

            {/* Services Grid Skeleton */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                            <div className="w-16 h-16 bg-line rounded-xl mb-6 animate-pulse" />
                            <div className="w-3/4 h-6 bg-line rounded mb-3 animate-pulse" />
                            <div className="w-full h-4 bg-line rounded mb-2 animate-pulse" />
                            <div className="w-2/3 h-4 bg-line rounded mb-6 animate-pulse" />
                            <div className="w-32 h-10 bg-line rounded-lg animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
