import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

// GET /api/admin/users (C-24): lista corta de usuarios para el admin.
// Usos: Configuración → Sistema (?role=admin) y buscador de influencers en Marketing (?search=…&limit=8).
// Solo lectura y solo id, nombre, email y rol: nada de contraseñas, tokens ni datos de perfil.

const MAX_LIMIT = 50;
const ROLE_FILTERS: Record<string, Prisma.UserWhereInput> = {
  admin: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
  staff: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] } },
  user: { role: 'USER' },
};

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const role = params.get('role')?.toLowerCase() ?? '';
  if (role && !ROLE_FILTERS[role]) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }
  const search = (params.get('search') ?? '').trim().slice(0, 100);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(params.get('limit') ?? '', 10) || 20));

  const where: Prisma.UserWhereInput = {
    ...(role ? ROLE_FILTERS[role] : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  try {
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: role === 'admin' ? [{ role: 'desc' }, { createdAt: 'asc' }] : { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      // Configuración usa name.charAt(0): nunca se devuelve un nombre vacío
      users: users.map((user) => ({ ...user, name: user.name || user.email?.split('@')[0] || 'Sin nombre' })),
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}
