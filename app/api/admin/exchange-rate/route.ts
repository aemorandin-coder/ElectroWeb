import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { refreshExchangeRate } from '@/lib/exchange-rate';

const MESSAGES = {
  updated: 'Tasa actualizada',
  fresh: 'La tasa ya estaba al día',
  disabled: 'Activa la actualización automática para usar este botón',
  unavailable: 'La fuente de la tasa no respondió. Se mantiene la tasa guardada.',
  rejected: 'La tasa recibida cambia más de 50 % y no se aplicó. Revísala y escríbela a mano.',
} as const;

/** POST /api/admin/exchange-rate — "Actualizar ahora" en Configuración → Precios y pagos (C-50b). */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!hasPermission(session, 'MANAGE_SETTINGS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const result = await refreshExchangeRate({ force: true });
    if (result.status === 'updated') revalidatePath('/', 'layout');
    const ok = result.status === 'updated' || result.status === 'fresh';
    return NextResponse.json(
      { status: result.status, message: MESSAGES[result.status], rate: result.rate, lastRateUpdate: result.lastRateUpdate },
      { status: ok ? 200 : result.status === 'disabled' ? 409 : 502 }
    );
  } catch (error) {
    console.error('[ADMIN EXCHANGE-RATE] Error:', error);
    return NextResponse.json({ error: 'No se pudo actualizar la tasa' }, { status: 500 });
  }
}
