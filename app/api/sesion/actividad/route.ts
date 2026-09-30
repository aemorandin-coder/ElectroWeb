import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { anotarActividad } from '@/lib/sesiones';

// C-140: el panel del admin avisa que hubo uso real (clics, teclas, toques) cada pocos minutos.
// La sesión de admin se cierra tras 1 hora sin este aviso (lib/sesiones.ts).

export async function POST(request: NextRequest) {
  // getServerSession ya cierra la sesión si pasó el límite: una sesión vencida no se revive con este aviso
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Sesión cerrada' }, { status: 401 });
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (typeof token?.sid === 'string') await anotarActividad(token.sid, session.user.id);
  return NextResponse.json({ ok: true });
}
