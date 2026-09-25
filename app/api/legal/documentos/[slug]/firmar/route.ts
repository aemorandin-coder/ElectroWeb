import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { ipParaRegistro } from '@/lib/ip';
import { createAuditLog } from '@/lib/audit-log';
import { documentoVigente, firmaVigente, generarConstancia, guardarArchivos, sha256, validarFirma } from '@/lib/legal-docs';
import { normalizarCedula } from '@/lib/legal-docs-core';

// Firmar la versión vigente de un documento (C-103).
// - contentHash: la huella del texto que el cliente leyó. Si el documento cambió mientras lo leía, 409 y lo vuelve a leer.
// - La firma se valida como PNG con tinta; la constancia en PDF se genera aquí y se guarda en la carpeta privada.
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const userId = session.user.id;

  const limite = checkRateLimit(userId, 'legal:firmar', RATE_LIMITS.SENSITIVE);
  if (!limite.success) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera un minuto.' }, { status: 429, headers: getRateLimitHeaders(limite, RATE_LIMITS.SENSITIVE) });
  }

  const { slug } = await params;
  const doc = await documentoVigente(slug.slice(0, 80));
  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  if (body.contentHash !== doc.contentHash) {
    return NextResponse.json({ error: 'El documento se actualizó mientras lo leías. Léelo de nuevo antes de firmar.', code: 'DOCUMENTO_CAMBIO' }, { status: 409 });
  }
  if (await firmaVigente(userId, doc)) {
    return NextResponse.json({ error: 'Ya firmaste este documento', code: 'YA_FIRMADO' }, { status: 409 });
  }

  const idNumber = normalizarCedula(body.idNumber);
  if (!idNumber) return NextResponse.json({ error: 'Escribe tu cédula: V o E y 6 a 9 números', field: 'idNumber' }, { status: 400 });
  const phone = typeof body.phone === 'string' ? body.phone.replace(/[^\d+]/g, '').slice(0, 20) || null : null;
  const address = typeof body.address === 'string' ? body.address.trim().slice(0, 200) || null : null;
  const firma = await validarFirma(body.signature);
  if ('error' in firma) return NextResponse.json({ error: firma.error, field: 'signature' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const settings = await prisma.companySettings.findUnique({ where: { id: 'default' }, select: { companyName: true, legalName: true, rif: true } }).catch(() => null);
  const empresa = [settings?.legalName || settings?.companyName || 'Electro Shop Morandin C.A.', settings?.rif ? `RIF ${settings.rif}` : null].filter(Boolean).join(' · ');
  const ipAddress = ipParaRegistro(request.headers);
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 300) || null;
  const signedAt = new Date();
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 25);

  const datos = { userName: user?.name || user?.email || 'Cliente', userEmail: user?.email || '', idNumber, phone, address };
  const pdf = await generarConstancia(doc, { id, ...datos, ipAddress, signedAt, png: firma.png, empresa });
  const archivos = await guardarArchivos(userId, firma.png, pdf);

  const creada = await prisma.documentSignature.create({
    data: {
      id, documentId: doc.id, userId, ...datos, contentHash: doc.contentHash,
      ...archivos, pdfHash: sha256(pdf), ipAddress, userAgent, signedAt,
    },
  });
  // La cédula queda también en el perfil si no la tenía (el checkout la pide igual, C-85)
  await prisma.profile.updateMany({ where: { userId, OR: [{ idNumber: null }, { idNumber: '' }] }, data: { idNumber } });
  await createAuditLog({
    action: 'SECURITY_ADMIN_ACTION', userId, userEmail: datos.userEmail, targetType: 'LEGAL_SIGNATURE', targetId: creada.id,
    details: { documento: doc.title, version: doc.version }, ipAddress, userAgent: userAgent ?? undefined,
  });

  return NextResponse.json({ success: true, signatureId: creada.id, signedAt: creada.signedAt.toISOString() }, { status: 201 });
}
