'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { IconoAjustes } from '@/components/iconos';
import { adminPageHeader, adminPageSubtitle, adminPageTitle } from '@/lib/admin-ui';
import { hasPermission } from '@/lib/auth-helpers';
import Inbox from './_components/Inbox';

// Notificaciones del equipo (C-73): la bandeja. Antes esta ruta solo redirigía a una pestaña de Mensajes (F5).
// C-294 (D6 del 18/11): "Qué avisar" y el bot de Telegram son ajustes de toda la tienda: pasaron a Ajustes → Avisos, con los
// correos de alerta. Aquí queda la bandeja; las direcciones viejas (#avisos, #telegram) llevan allá.

const EN_AJUSTES: Record<string, string> = { avisos: '/admin/settings#avisos', telegram: '/admin/settings#telegram' };

export default function NotificationsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const esDueno = hasPermission(session, 'MANAGE_SETTINGS');

  useEffect(() => {
    // Después de pintar: al llegar desde otra pantalla del panel, el hash llega a la dirección un momento después
    const t = window.setTimeout(() => {
      const destino = EN_AJUSTES[window.location.hash.slice(1)];
      if (destino) router.replace(destino);
    }, 0);
    return () => window.clearTimeout(t);
  }, [router]);

  return (
    <div className="min-w-0">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Notificaciones</h1>
          <p className={adminPageSubtitle}>Todo lo que pasa en la tienda.</p>
        </div>
        {esDueno && (
          <Link href="/admin/settings#avisos" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
            <IconoAjustes className="h-4 w-4" aria-hidden="true" />
            Qué avisar y por dónde
          </Link>
        )}
      </div>
      <Inbox puedeElegir={esDueno} />
    </div>
  );
}
