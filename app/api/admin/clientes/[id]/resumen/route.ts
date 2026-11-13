import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { claudeDisponible, FallaIA } from '@/lib/ia/claude';
import { hechosDelCliente, resumirCliente } from '@/lib/ia/resumen-cliente';
import { checkRateLimit } from '@/lib/rate-limit';

// C-213: el resumen del cliente en su ficha.
// GET: los números y lo pendiente (sin IA, para abrir la pestaña al instante).
// POST: lo mismo más el resumen de Claude y qué ofrecerle. No guarda nada.

async function autorizar() {
  const session = await getServerSession(authOptions);
  return isAuthorized(session, 'MANAGE_USERS') && session?.user?.id ? session.user.id : null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await autorizar())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const { id } = await params;
  const hechos = await hechosDelCliente(id);
  if (!hechos) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  return NextResponse.json({ hechos, iaDisponible: claudeDisponible() });
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const quien = await autorizar();
  if (!quien) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  // Cada resumen es un pedido a Claude: 10 por minuto por persona alcanzan para atender
  const limite = checkRateLimit(quien, 'admin:clientes:resumen', { maxRequests: 10, windowSeconds: 60 });
  if (!limite.success) {
    return NextResponse.json({ error: `Demasiados resúmenes seguidos. Espera ${limite.resetIn} s.` }, { status: 429 });
  }
  const { id } = await params;
  try {
    const resultado = await resumirCliente(id);
    if (!resultado) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof FallaIA) {
      return NextResponse.json({ error: error.message }, { status: error.motivo === 'sin-clave' ? 503 : 502 });
    }
    console.error('[resumen del cliente]', error instanceof Error ? error.name : 'desconocido');
    return NextResponse.json({ error: 'No se pudo armar el resumen.' }, { status: 500 });
  }
}
