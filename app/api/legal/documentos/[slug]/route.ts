import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { documentoVigente, firmaVigente } from '@/lib/legal-docs';
import { REQUERIDO_PARA } from '@/lib/legal-docs-core';
import { esPaginaLegalPublica } from '@/lib/legal-publico-textos';

// Texto vigente de un documento para leerlo y firmarlo (C-103), con los datos del perfil para prellenar
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { slug } = await params;
  if (esPaginaLegalPublica(slug)) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
  const doc = await documentoVigente(slug.slice(0, 80));
  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
  const [firma, perfil] = await Promise.all([
    firmaVigente(session.user.id, doc),
    prisma.profile.findUnique({ where: { userId: session.user.id }, select: { idNumber: true, phone: true, city: true, state: true } }),
  ]);
  return NextResponse.json({
    document: {
      slug: doc.slug,
      title: doc.title,
      version: doc.version,
      content: doc.content,
      contentHash: doc.contentHash,
      requiredFor: doc.requiredFor ? REQUERIDO_PARA[doc.requiredFor] ?? doc.requiredFor : null,
      publishedAt: doc.publishedAt.toISOString(),
    },
    signed: firma !== null,
    signatureId: firma && firma !== 'LEGADO' ? firma.id : null,
    profile: {
      idNumber: perfil?.idNumber ?? '',
      phone: perfil?.phone ?? '',
      address: [perfil?.city, perfil?.state].filter(Boolean).join(', '),
    },
  });
}
