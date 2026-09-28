import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { studioReviews } from '@/lib/studio/store';

// GET — reseñas aprobadas para la plantilla "Reseña" (C-113): nombre corto del cliente, nunca su correo
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  return NextResponse.json({ reviews: await studioReviews() });
}
