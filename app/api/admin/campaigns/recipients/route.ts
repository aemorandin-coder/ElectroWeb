import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { destinatariosWhere } from '@/lib/email-campaigns';

const POR_PAGINA = 50;

/**
 * GET ?q=texto&pagina=1 → destinatarios de promociones, de a 50 (C-109).
 * Antes devolvía todos los correos de clientes de una vez a cualquiera con MANAGE_CONTENT:
 * ahora también exige MANAGE_USERS (el permiso de Clientes) y la búsqueda se hace en la base.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT') || !isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  // Prisma no escapa los comodines de LIKE en `contains`: sin esto, buscar "%" o "_" devolvía a todos
  const q = (searchParams.get('q') ?? '').trim().slice(0, 100).replace(/[\\%_]/g, '\\$&');
  const pagina = Math.min(Math.max(Math.floor(Number(searchParams.get('pagina')) || 1), 1), 1000);

  const where: Prisma.UserWhereInput = q
    ? {
      ...destinatariosWhere,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    }
    : destinatariosWhere;

  const [destinatarios, coincidencias, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    q ? prisma.user.count({ where }) : Promise.resolve(-1),
    prisma.user.count({ where: destinatariosWhere }),
  ]);

  const encontrados = coincidencias < 0 ? total : coincidencias;
  // Sin caché: next.config.js ya pone no-store en todas las APIs
  return NextResponse.json({ destinatarios, total, coincidencias: encontrados, pagina, hayMas: pagina * POR_PAGINA < encontrados });
}
