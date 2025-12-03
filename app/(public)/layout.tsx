'use client';

import PublicHeader from '@/components/public/PublicHeader';
import PublicPageTransition from '@/components/public/PublicPageTransition';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PublicHeader />
      <PublicPageTransition>
        {children}
      </PublicPageTransition>
    </div>
  );
}
