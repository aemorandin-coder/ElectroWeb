import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { esAdminVerificado, isAuthorized } from '@/lib/auth-helpers';
import { ETIQUETA_ACCION } from '@/lib/audit-labels';
import { prisma } from '@/lib/prisma';
import { permisoDeRecurso } from '@/lib/realtime/recursos';

export const dynamic = 'force-dynamic';

// C-169: "Última edición: Luis, hace 5 min" y el historial de un recurso del panel, de la bitácora (audit_logs).
//   GET /api/admin/historial?recurso=product:<id>   → las últimas 20 acciones, con quién y qué campos
const TIPO_BITACORA: Record<string, string> = { product: 'PRODUCT' };

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!esAdminVerificado(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const recurso = new URL(request.url).searchParams.get('recurso') ?? '';
  const permiso = permisoDeRecurso(recurso);
  const [tipo, id] = recurso.split(':');
  const targetType = TIPO_BITACORA[tipo];
  if (!permiso || !targetType || !id) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  if (!isAuthorized(session, permiso)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const filas = await prisma.auditLog.findMany({
    where: { targetType, targetId: id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, action: true, userId: true, userEmail: true, details: true, createdAt: true },
  });
  const ids = [...new Set(filas.map((f) => f.userId).filter((x): x is string => !!x))];
  const usuarios = new Map((ids.length > 0 ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : [])
    .map((u) => [u.id, u.name?.trim() || u.email?.split('@')[0] || 'Alguien del equipo']));

  return NextResponse.json({
    entradas: filas.map((f) => {
      let campos: string[] | undefined;
      try {
        const detalle = f.details ? (JSON.parse(f.details) as { campos?: unknown }) : null;
        if (Array.isArray(detalle?.campos)) campos = detalle.campos.filter((c): c is string => typeof c === 'string').slice(0, 12);
      } catch {
        // Detalle ilegible: se muestra sin campos
      }
      return {
        id: f.id,
        accion: ETIQUETA_ACCION[f.action] ?? f.action,
        quien: (f.userId ? usuarios.get(f.userId) : null) ?? f.userEmail?.split('@')[0] ?? 'El sistema',
        en: f.createdAt.toISOString(),
        campos,
      };
    }),
  });
}
