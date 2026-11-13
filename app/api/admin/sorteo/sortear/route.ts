// C-212: sortear (una sola vez, cuando ya cerró). Queda en la bitácora quién lo hizo, cuántos boletos había y la huella de
// la lista, para poder mostrar después que no cambió.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { sortearAhora } from '@/lib/sorteo/servidor';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { sorteoId?: unknown } | null;
  if (typeof body?.sorteoId !== 'string') return NextResponse.json({ error: 'Falta el sorteo' }, { status: 400 });
  const r = await sortearAhora(body.sorteoId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
  await registrarAccionAdmin(session, 'SETTINGS_UPDATED', { type: 'SORTEO', id: r.sorteo.id }, {
    sorteo: r.sorteo.titulo, ganador: r.sorteo.ganadorEmail, detalle: r.sorteo.ganadorDetalle, boletos: r.sorteo.boletosAlSortear, huella: r.sorteo.huellaLista,
  }, request);
  revalidateStorefront();
  return NextResponse.json({ ganadorEmail: r.sorteo.ganadorEmail, ganadorDetalle: r.sorteo.ganadorDetalle, boletos: r.sorteo.boletosAlSortear, huella: r.sorteo.huellaLista, sorteadoAt: r.sorteo.sorteadoAt });
}
