import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  addressInputSchema,
  createSavedAddress,
  firstIssue,
  MAX_SAVED_ADDRESSES,
  parseSavedAddresses,
  updateSavedAddresses,
  type SavedAddress,
} from '@/lib/saved-addresses';

// Libreta de direcciones del cliente (página /customer/addresses). Datos en Profile.savedAddresses,
// los mismos que ofrece el checkout. Cada usuario solo ve y edita las suyas (userId de la sesión).

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

const unauthorized = () => NextResponse.json({ error: 'No autorizado' }, { status: 401 });

async function readBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const profile = await prisma.profile.findUnique({ where: { userId }, select: { savedAddresses: true } });
  return NextResponse.json({ addresses: parseSavedAddresses(profile?.savedAddresses) });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const body = await readBody(request);
  const parsed = addressInputSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  try {
    const outcome = await updateSavedAddresses<SavedAddress>(userId, (list) => {
      if (list.length >= MAX_SAVED_ADDRESSES) {
        return { error: `Puedes guardar hasta ${MAX_SAVED_ADDRESSES} direcciones`, status: 400 };
      }
      // La primera dirección queda como predeterminada
      const created = createSavedAddress({ ...parsed.data, isDefault: parsed.data.isDefault || list.length === 0 });
      const others = created.isDefault ? list.map((entry) => ({ ...entry, isDefault: false })) : list;
      return { list: [...others, created], result: created };
    });
    if ('error' in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    return NextResponse.json({ address: outcome.result, addresses: outcome.list }, { status: 201 });
  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json({ error: 'Error al guardar la dirección' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const body = await readBody(request);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'ID de dirección es requerido' }, { status: 400 });

  try {
    const outcome = await updateSavedAddresses<SavedAddress>(userId, (list) => {
      const current = list.find((entry) => entry.id === id);
      if (!current) return { error: 'Dirección no encontrada', status: 404 };

      // Se valida la dirección completa ya combinada; id y fechas no se pueden cambiar desde el body
      const parsed = addressInputSchema.safeParse({ ...current, ...body });
      if (!parsed.success) return { error: firstIssue(parsed.error), status: 400 };

      const updated: SavedAddress = {
        ...parsed.data,
        id: current.id,
        address: parsed.data.addressLine1,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      };
      const next = list.map((entry) =>
        entry.id === id ? updated : updated.isDefault ? { ...entry, isDefault: false } : entry
      );
      return { list: next, result: updated };
    });
    if ('error' in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    return NextResponse.json({ address: outcome.result, addresses: outcome.list });
  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json({ error: 'Error al actualizar la dirección' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID de dirección es requerido' }, { status: 400 });

  try {
    const outcome = await updateSavedAddresses<null>(userId, (list) => {
      const removed = list.find((entry) => entry.id === id);
      if (!removed) return { error: 'Dirección no encontrada', status: 404 };
      const next = list.filter((entry) => entry.id !== id);
      // Si se borra la predeterminada, pasa a serlo la siguiente
      if (removed.isDefault && next.length > 0) next[0] = { ...next[0], isDefault: true };
      return { list: next, result: null };
    });
    if ('error' in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    return NextResponse.json({ message: 'Dirección eliminada', addresses: outcome.list });
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json({ error: 'Error al eliminar la dirección' }, { status: 500 });
  }
}
