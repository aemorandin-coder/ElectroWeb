import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { studioProducts } from '@/lib/studio/store';

// GET ?q=teclado — buscar productos publicados para una historia (C-112)
// GET ?ids=a,b,c — precio y foto actuales de los productos de una historia
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { searchParams } = request.nextUrl;
  const ids = (searchParams.get('ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9]{1,40}$/i.test(s));
  const q = (searchParams.get('q') || '').trim().slice(0, 60);
  const products = await studioProducts(ids.length ? { ids } : { q });
  return NextResponse.json({ products });
}
