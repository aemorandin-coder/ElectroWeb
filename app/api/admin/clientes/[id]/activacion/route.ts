import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { reenviarActivacion } from '@/lib/clientes/activacion';

// C-276: reenviarle a un cliente el enlace de activación desde su ficha (con los topes del reenvío del cliente).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS') || !session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const r = await reenviarActivacion(id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  await registrarAccionAdmin(session, 'CUSTOMER_ACTIVATION_SENT', { type: 'USER', id }, { cliente: r.correo }, request);
  return NextResponse.json({ ok: true });
}
