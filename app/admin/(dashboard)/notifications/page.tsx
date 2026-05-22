'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// La sección de Notificaciones fue fusionada con "Mensajes y Alertas" (/admin/inquiries)
// Este redirect preserva bookmarks y enlaces antiguos
export default function NotificationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/inquiries?tab=alerts');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#6a6c6b]">Redirigiendo a Mensajes y Alertas...</p>
      </div>
    </div>
  );
}
