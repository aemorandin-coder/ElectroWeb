import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { firmaSelectAdmin } from '@/lib/legal-docs';

// Firmas de los clientes (C-103). Sin la imagen en la lista: se pide aparte al abrir una (antes venía base64 en cada fila).
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, Number.parseInt(sp.get('page') || '1', 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(sp.get('limit') || '20', 10) || 20));
  const search = (sp.get('search') || '').trim().slice(0, 80);
  const estado = sp.get('estado');
  const where: Prisma.DocumentSignatureWhereInput = {
    ...(search ? { OR: [
      { userName: { contains: search, mode: 'insensitive' } },
      { userEmail: { contains: search, mode: 'insensitive' } },
      { idNumber: { contains: search.toUpperCase().replace(/[\s.-]/g, '') } },
    ] } : {}),
    ...(estado === 'vigentes' ? { revokedAt: null, document: { isCurrent: true } } : estado === 'revocadas' ? { revokedAt: { not: null } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.documentSignature.findMany({ where, select: firmaSelectAdmin, orderBy: { signedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.documentSignature.count({ where }),
  ]);
  return NextResponse.json({
    signatures: rows.map((r) => ({ ...r, signedAt: r.signedAt.toISOString(), revokedAt: r.revokedAt?.toISOString() ?? null })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}
