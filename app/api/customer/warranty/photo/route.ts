import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { saveWarrantyPhoto } from '@/lib/warranty-server';

const PHOTO_RATE_LIMIT = { maxRequests: 20, windowSeconds: 600 };

// POST — una foto para una solicitud de garantía (C-122). Queda privada: solo la ven el cliente y el equipo
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const rateLimit = checkRateLimit(session.user.id, 'warranty:photo', PHOTO_RATE_LIMIT);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Subiste muchas fotos seguidas. Espera unos minutos.' }, { status: 429, headers: getRateLimitHeaders(rateLimit, PHOTO_RATE_LIMIT) });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Falta la foto' }, { status: 400 });
  const saved = await saveWarrantyPhoto(session.user.id, file);
  if ('error' in saved) return NextResponse.json({ error: saved.error }, { status: 400 });
  return NextResponse.json({ url: saved.url }, { status: 201 });
}
