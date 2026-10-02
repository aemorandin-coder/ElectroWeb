import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { documentoVigente, hashContenido, SLUG_TERMINOS_SALDO } from '@/lib/legal-docs';
import { REQUERIDO_PARA } from '@/lib/legal-docs-core';
import { asegurarPaginasLegales, esPaginaLegalPublica, VARIABLES_LEGALES_AYUDA } from '@/lib/legal-publico';

// Documentos legales del panel (C-103). Leerlos: permiso de clientes. Publicar: permiso de configuración.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS') && !isAuthorized(session, 'MANAGE_SETTINGS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  await documentoVigente(SLUG_TERMINOS_SALDO);
  // /terminos y /privacidad (C-160): se crean aquí la primera vez para poder editarlas
  await asegurarPaginasLegales();
  const [docs, conteos, legado] = await Promise.all([
    prisma.legalDocument.findMany({ orderBy: [{ slug: 'asc' }, { version: 'desc' }] }),
    prisma.documentSignature.groupBy({ by: ['documentId'], where: { revokedAt: null }, _count: true }),
    prisma.balanceTermsAcceptance.count({ where: { NOT: { id: { in: (await prisma.documentSignature.findMany({ where: { legacyAcceptanceId: { not: null } }, select: { legacyAcceptanceId: true } })).map((f) => f.legacyAcceptanceId as string) } } } }),
  ]);
  const porDoc = new Map(conteos.map((c) => [c.documentId, c._count]));
  return NextResponse.json({
    documents: docs.map((d) => ({
      id: d.id, slug: d.slug, version: d.version, title: d.title, content: d.content, contentHash: d.contentHash,
      requiredFor: d.requiredFor, isCurrent: d.isCurrent, publishedAt: d.publishedAt.toISOString(), publica: esPaginaLegalPublica(d.slug),
      signatures: (porDoc.get(d.id) ?? 0) + (d.slug === SLUG_TERMINOS_SALDO && d.version === 1 ? legado : 0),
    })),
    legacyPending: legado,
    requiredOptions: REQUERIDO_PARA,
    variables: VARIABLES_LEGALES_AYUDA,
  });
}

const esquema = z.object({
  slug: z.string().trim().max(60).regex(/^[a-z0-9-]*$/, 'Solo minúsculas, números y guiones').optional(),
  title: z.string().trim().min(5, 'Escribe un título').max(150),
  content: z.string().trim().min(40, 'El texto es muy corto').max(60000, 'El texto es muy largo'),
  requiredFor: z.enum(['RECHARGE']).nullable().optional(),
});

/** Publica un documento nuevo o una versión nueva: la anterior deja de ser vigente y sus firmas quedan como historial. */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return NextResponse.json({ error: 'Revisa los campos marcados', fields }, { status: 400 });
  }
  const { title, content } = parsed.data;
  const slug = parsed.data.slug || title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
  if (!slug) return NextResponse.json({ error: 'Título inválido', fields: { title: 'Usa letras o números' } }, { status: 400 });

  // Las páginas públicas no se firman: nunca se exigen para nada (C-160)
  const requiredFor = esPaginaLegalPublica(slug) ? null : (parsed.data.requiredFor ?? null);
  const actual = await prisma.legalDocument.findFirst({ where: { slug, isCurrent: true } });
  const contentHash = hashContenido(title, content);
  if (actual && actual.contentHash === contentHash && actual.requiredFor === requiredFor) {
    return NextResponse.json({ error: 'No hay cambios: el texto es igual a la versión vigente' }, { status: 400 });
  }
  const ultima = await prisma.legalDocument.findFirst({ where: { slug }, orderBy: { version: 'desc' }, select: { version: true } });
  const doc = await prisma.$transaction(async (tx) => {
    await tx.legalDocument.updateMany({ where: { slug, isCurrent: true }, data: { isCurrent: false } });
    return tx.legalDocument.create({
      data: {
        slug, version: (ultima?.version ?? 0) + 1, title, content, contentHash,
        requiredFor, createdById: session?.user?.id ?? null,
      },
    });
  });
  await registrarAccionAdmin(session, 'SETTINGS_UPDATED', { type: 'LEGAL_DOCUMENT', id: doc.id }, {
    documento: doc.title, version: doc.version, exigidoPara: doc.requiredFor,
  }, request);
  return NextResponse.json({ document: { id: doc.id, slug: doc.slug, version: doc.version } }, { status: 201 });
}
