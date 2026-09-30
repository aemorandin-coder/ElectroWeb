import type { Metadata } from 'next';
import { sesionReportable } from '@/lib/sesiones';
import NoFuiYo from './NoFuiYo';

// C-140: a esta página llega el botón "No fui yo" del aviso de entrada al panel (Telegram, correo o campana).
export const metadata: Metadata = { title: 'No fui yo', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ s?: string; t?: string }> }) {
  const { s = '', t = '' } = await searchParams;
  const sesion = await sesionReportable(s, t);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6">
        {sesion ? (
          <NoFuiYo
            s={s}
            t={t}
            cuenta={sesion.user.name || sesion.user.email || 'Admin'}
            dispositivo={sesion.dispositivo}
            ip={sesion.ip}
            fecha={sesion.createdAt.toLocaleString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}
          />
        ) : (
          <>
            <h1 className="text-xl font-bold text-ink">El enlace no es válido</h1>
            <p className="mt-2 text-sm text-ink-soft">Puede que esté incompleto o que hayan pasado más de 24 horas. Si alguien entró a tu cuenta, cambia tu contraseña con &quot;¿La olvidaste?&quot; en el inicio de sesión: eso cierra todas las sesiones.</p>
          </>
        )}
      </div>
    </main>
  );
}
