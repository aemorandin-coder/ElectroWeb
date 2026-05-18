import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const API_URL = process.env.SADES_API_URL;
  const API_KEY = process.env.SADES_API_KEY;

  if (!API_URL || !API_KEY) {
    return NextResponse.json({ status: 'error', message: 'SADES_API_URL o SADES_API_KEY no configurados en .env' }, { status: 503 });
  }

  try {
    const res = await fetch(`${API_URL}/health`, {
      headers: { 'X-API-Key': API_KEY },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      return NextResponse.json({ status: 'ok' });
    }
    return NextResponse.json({ status: 'error', message: `SADES respondió con status ${res.status}` }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message || 'Sin respuesta de SADES' }, { status: 503 });
  }
}
