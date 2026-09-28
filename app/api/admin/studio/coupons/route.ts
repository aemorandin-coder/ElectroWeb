import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { normalizarCodigo } from '@/lib/promotions-core';
import { studioCoupons } from '@/lib/studio/store';

// GET — cupones vigentes de Descuentos para la plantilla "Cupón" (C-113). ?code=X: solo ese (para ponerlo al día)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const raw = request.nextUrl.searchParams.get('code');
  const code = raw ? normalizarCodigo(raw) : null;
  if (raw && !code) return NextResponse.json({ coupons: [] });
  return NextResponse.json({ coupons: await studioCoupons(code ?? undefined) });
}
