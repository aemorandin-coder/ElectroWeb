'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconoCargando } from '@/components/iconos';

export default function AdminLoginPage() {
  const router = useRouter();

  // Redirect to new unified login page
  useEffect(() => {
    router.replace('/login?redirect=admin');
  }, [router]);

  return (
    <div className="min-h-dvh bg-surface flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-brand-500 mb-4 shadow-lg">
          <IconoCargando className="animate-spin h-8 w-8 text-white" />
        </div>
        <p className="text-sm text-muted font-medium">Redirigiendo...</p>
      </div>
    </div>
  );
}
