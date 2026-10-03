import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { esAdminVerificado, isAuthorized } from '@/lib/auth-helpers';
import { checkRateLimit } from '@/lib/rate-limit';
import { marcarAusente, marcarPresente, presentesDeTipo, todosLosPresentes } from '@/lib/realtime/presencia';
import { permisoDeRecurso } from '@/lib/realtime/recursos';
import { limpiarEtiqueta, nombreDeSesion } from '@/lib/edicion/servidor';
import { MODULOS } from '@/lib/modulos';

export const dynamic = 'force-dynamic';

// C-169: "Luis también está editando esto". El editor avisa al abrir el recurso, cada 20 s mientras sigue abierto y al
// cerrarlo (con sendBeacon). Las pestañas que dejan de avisar caducan a los 60 s (lib/realtime/presencia.ts).
// Los demás se enteran por el canal en vivo (`admin:presencia`); aquí se devuelve quién más lo tiene abierto ahora.
//   POST { recurso: 'product:<id>', accion: 'entrar' | 'latido' | 'salir', pestana: '<id corto de la pestaña>', etiqueta?: 'nombre del producto' }
// C-174: `seccion:<módulo>` dice en qué sector del panel está cada persona (la marquesina del equipo) y `etiqueta` qué está editando.

// GET ?tipo=product: quién tiene abierto cada recurso de ese tipo (para la lista: "Luis está editando")
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!esAdminVerificado(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const parametros = new URL(request.url).searchParams;
  // ?todos=1 (C-174): todo lo que hay abierto, solo de los recursos que esta persona puede ver
  if (parametros.get('todos') === '1') {
    const visibles = Object.fromEntries(Object.entries(todosLosPresentes(session.user.id)).filter(([recurso]) => {
      const pedido = permisoDeRecurso(recurso);
      return pedido !== null && isAuthorized(session, pedido);
    }));
    return NextResponse.json({ presentes: visibles });
  }
  const tipo = parametros.get('tipo') ?? '';
  const permiso = permisoDeRecurso(`${tipo}:x`);
  if (!permiso || !isAuthorized(session, permiso)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  return NextResponse.json({ presentes: presentesDeTipo(tipo, session.user.id) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!esAdminVerificado(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { recurso?: unknown; accion?: unknown; pestana?: unknown; etiqueta?: unknown } | null;
  const recurso = typeof body?.recurso === 'string' ? body.recurso : '';
  const pestana = typeof body?.pestana === 'string' && /^[A-Za-z0-9_-]{6,40}$/.test(body.pestana) ? body.pestana : null;
  const accion = body?.accion;
  const permiso = permisoDeRecurso(recurso);
  if (!permiso || !pestana || (accion !== 'entrar' && accion !== 'latido' && accion !== 'salir')) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  // Un sector del panel tiene que ser un módulo que existe
  if (recurso.startsWith('seccion:') && !MODULOS.some((m) => `seccion:${m.id}` === recurso)) {
    return NextResponse.json({ error: 'Sector inválido' }, { status: 400 });
  }
  // Solo quien puede editar ese recurso se anota (un administrador sin el permiso no aparece ni ve a nadie)
  if (!isAuthorized(session, permiso)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  if (!checkRateLimit(session.user.id, 'admin:presencia', { maxRequests: 180, windowSeconds: 60 }).success) {
    return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  }

  if (accion === 'salir') {
    marcarAusente(recurso, pestana);
    return NextResponse.json({ editores: [] });
  }
  const editores = marcarPresente(recurso, pestana, { id: session.user.id, nombre: nombreDeSesion(session) }, limpiarEtiqueta(body?.etiqueta));
  return NextResponse.json({ editores });
}
