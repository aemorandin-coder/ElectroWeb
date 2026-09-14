import PublicHeader from '@/components/public/PublicHeader';

export default function ContactoLoading() {
    return (
        <div className="min-h-dvh bg-gradient-to-br from-surface via-white to-surface">
            <PublicHeader />

            {/* Hero Skeleton */}
            <section className="relative bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <div className="w-40 h-8 bg-white/20 rounded-full mx-auto mb-6 animate-pulse" />
                        <div className="w-56 h-14 bg-white/20 rounded-lg mx-auto mb-6 animate-pulse" />
                        <div className="w-2/3 h-6 bg-white/10 rounded mx-auto animate-pulse" />
                    </div>
                </div>
                <div className="h-16" />
            </section>

            {/* Contact Content Skeleton */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Contact Info Skeleton */}
                    <div className="space-y-6">
                        <div className="w-48 h-8 bg-line rounded mb-6 animate-pulse" />
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                                <div className="w-12 h-12 bg-line rounded-lg animate-pulse" />
                                <div className="flex-1">
                                    <div className="w-24 h-5 bg-line rounded mb-2 animate-pulse" />
                                    <div className="w-40 h-4 bg-line rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Contact Form Skeleton */}
                    <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                        <div className="w-40 h-8 bg-line rounded mb-6 animate-pulse" />
                        <div className="space-y-4">
                            <div className="w-full h-12 bg-line rounded-lg animate-pulse" />
                            <div className="w-full h-12 bg-line rounded-lg animate-pulse" />
                            <div className="w-full h-12 bg-line rounded-lg animate-pulse" />
                            <div className="w-full h-32 bg-line rounded-lg animate-pulse" />
                            <div className="w-full h-12 bg-line rounded-lg animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
