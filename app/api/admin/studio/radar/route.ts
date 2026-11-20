import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { studioRadar } from '@/lib/studio/store';

export const dynamic = 'force-dynamic';

// G-71: sugerencias en vivo "¿Qué publicamos hoy?" para el Home de ElectroStudio
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const items = await studioRadar();
  return NextResponse.json({ items });
}
