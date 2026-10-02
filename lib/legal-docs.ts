// Documentos legales y firmas en el servidor (C-103).
import { createHash, randomBytes } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import type { DocumentSignature, LegalDocument, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { generarPdf, type BloquePdf } from '@/lib/pdf-simple';
import { parsearDocumento, REQUERIDO_PARA, sinNegrita } from '@/lib/legal-docs-core';
import { isInside } from '@/lib/private-uploads';
import { PAGINAS_LEGALES_PUBLICAS } from '@/lib/legal-publico-textos';

export const SLUG_TERMINOS_SALDO = 'terminos-saldo';

/** Carpeta privada de las firmas: nunca en public/ (C-72) */
export const SIGNATURES_DIR = path.join(process.cwd(), 'private-uploads', 'signatures');

// Texto de los términos de recarga que el modal tenía escrito en el código hasta C-103 (versión 1).
export const TERMINOS_SALDO_V1 = {
  title: 'Términos y condiciones de recarga de saldo',
  content: `!! IMPORTANTE: Lee cuidadosamente estos términos antes de realizar tu primera recarga. Al continuar, aceptas legalmente todas las condiciones aquí descritas.

## 1. Origen lícito de fondos
El usuario declara bajo juramento que todos los fondos utilizados para recargar saldo en esta plataforma provienen de actividades lícitas y legales. Queda estrictamente prohibido el uso de fondos provenientes de:
- Actividades de lavado de dinero o activos
- Financiamiento del terrorismo
- Narcotráfico o actividades ilícitas relacionadas
- Fraude, estafa o cualquier otra actividad criminal
- Evasión fiscal o fondos no declarados

## 2. Política de no reembolso
!! EL SALDO RECARGADO NO ES REEMBOLSABLE BAJO NINGUNA CIRCUNSTANCIA.
Una vez que el saldo haya sido acreditado a tu cuenta, no podrá ser retirado, transferido a terceros, ni convertido nuevamente en dinero en efectivo o transferencia bancaria. El saldo únicamente podrá ser utilizado para realizar compras de productos dentro de esta plataforma.

## 3. Veracidad de la información
El usuario se compromete a proporcionar información veraz, exacta y actualizada en todas sus transacciones, incluyendo pero no limitado a:
- Número de referencia de pago correcto
- Monto exacto transferido
- Datos bancarios propios (no de terceros)
- Comprobantes de pago legítimos y sin alteraciones

## 4. Sanciones por incumplimiento
Cualquier intento de fraude, uso de comprobantes falsificados, o suministro de información engañosa resultará en:
- Suspensión inmediata y definitiva de la cuenta
- Pérdida total del saldo acumulado sin derecho a reclamo
- Reporte a las autoridades financieras y judiciales competentes
- Acciones legales pertinentes según las leyes de la República Bolivariana de Venezuela

## 5. Aceptación expresa
Al marcar la casilla de aceptación y estampar tu firma digital, confirmas que has leído, comprendido y aceptado en su totalidad estos Términos y Condiciones, los cuales tienen plena validez legal como contrato de adhesión.`,
  requiredFor: 'RECHARGE',
};

/**
 * Términos de los Puntos ES (C-131 y C-135): "saldo" pasa a "Puntos ES" (regla legal de Andrés, 29 y 30/09) y se
 * explica cómo se muestran ("$12,50 Puntos ES"). La publicó la tienda sola (publicarTerminosDelCodigo): Andrés pidió
 * que la publicara Claude. Desde C-142 queda como historia: se conserva letra por letra porque su huella dice qué
 * tiendas tienen todavía esta versión y deben pasar a la siguiente (TERMINOS_PUNTOS_V3).
 */
export const TERMINOS_PUNTOS_V2 = {
  title: 'Términos y condiciones de los Puntos ES',
  content: `!! IMPORTANTE: Lee cuidadosamente estos términos antes de recargar. Al continuar, aceptas legalmente todas las condiciones aquí descritas.

## 1. Qué son los Puntos ES
Los Puntos ES (Puntos ElectroShop) son un pago anticipado que haces a Electro Shop Morandin C.A. para comprar en la tienda. No son dinero electrónico ni una cuenta de pago: solo sirven para comprar productos y servicios de Electro Shop.

## 2. Cómo se muestran
Cada Punto ES vale un dólar estadounidense (USD). Por eso los Puntos ES se escriben con el signo de dólar: "$12,50 Puntos ES" son 12,50 Puntos ES, que pagan 12,50 dólares de compras en la tienda.
- Los precios de la tienda están en dólares; en bolívares se muestran a la tasa del Banco Central de Venezuela del día.
- Cuando recargas en bolívares, se acreditan los Puntos ES que corresponden a la tasa del día del pago.

## 3. Cómo se obtienen
- Recargas con los métodos de pago de la tienda.
- Gift cards de Electro Shop canjeadas.
- Devoluciones de la tienda: garantías, pedidos cancelados y pagos hechos de más.
- Comisiones de promotores aprobadas.

## 4. Origen lícito de fondos
El usuario declara bajo juramento que todos los fondos utilizados para recargar Puntos ES provienen de actividades lícitas y legales. Queda estrictamente prohibido el uso de fondos provenientes de:
- Actividades de lavado de dinero o activos
- Financiamiento del terrorismo
- Narcotráfico o actividades ilícitas relacionadas
- Fraude, estafa o cualquier otra actividad criminal
- Evasión fiscal o fondos no declarados

## 5. Uso y no reembolso
!! LOS PUNTOS ES NO SE CONVIERTEN EN DINERO.
Una vez acreditados, los Puntos ES no se retiran, no se transfieren a otra persona ni se cambian por efectivo o transferencia bancaria. Se usan solo para comprar en esta tienda. Las devoluciones que haga la tienda (garantía, cancelación o pago de más) se acreditan en Puntos ES.

## 6. Veracidad de la información
El usuario se compromete a proporcionar información veraz, exacta y actualizada en todas sus transacciones, incluyendo pero no limitado a:
- Número de referencia de pago correcto
- Monto exacto transferido
- Datos bancarios propios (no de terceros)
- Comprobantes de pago legítimos y sin alteraciones

## 7. Sanciones por incumplimiento
Cualquier intento de fraude, uso de comprobantes falsificados o suministro de información engañosa resultará en:
- Suspensión inmediata y definitiva de la cuenta
- Pérdida de los Puntos ES obtenidos con el fraude
- Reporte a las autoridades financieras y judiciales competentes
- Acciones legales pertinentes según las leyes de la República Bolivariana de Venezuela

## 8. Aceptación expresa
Al marcar la casilla de aceptación y estampar tu firma digital, confirmas que has leído, comprendido y aceptado en su totalidad estos Términos y Condiciones, los cuales tienen plena validez legal como contrato de adhesión.`,
  requiredFor: 'RECHARGE',
};

/**
 * C-142 (decisión de Andrés del 30/09): quien cierra su cuenta pierde sus Puntos ES; no son reembolsables. La versión
 * anterior decía que no se convierten en dinero, pero no qué pasa al cerrar la cuenta. Es el mismo texto con esa
 * cláusula en la sección 5. Publicarla pide la firma otra vez a cada cliente en su próxima recarga: Andrés lo aceptó.
 */
const CLAUSULA_CIERRE = `!! SI CIERRAS TU CUENTA, PIERDES LOS PUNTOS ES QUE TE QUEDEN.
Los Puntos ES no son reembolsables. Si pides cerrar tu cuenta, los que te queden se pierden: no se devuelven en dinero ni pasan a otra cuenta. Antes de cerrarla puedes usarlos en productos de la tienda. Al pedir el cierre, la tienda te muestra cuántos tienes y te pide confirmarlo.`;
const FIN_SECCION_5 = 'Las devoluciones que haga la tienda (garantía, cancelación o pago de más) se acreditan en Puntos ES.';

export const TERMINOS_PUNTOS_V3 = {
  title: TERMINOS_PUNTOS_V2.title,
  content: TERMINOS_PUNTOS_V2.content.replace(FIN_SECCION_5, `${FIN_SECCION_5}\n\n${CLAUSULA_CIERRE}`),
  requiredFor: TERMINOS_PUNTOS_V2.requiredFor,
};

export function hashContenido(title: string, content: string): string {
  return createHash('sha256').update(`${title}\n\n${content}`, 'utf8').digest('hex');
}

const HASH_V2 = hashContenido(TERMINOS_PUNTOS_V2.title, TERMINOS_PUNTOS_V2.content);

/**
 * ¿Toca publicar la versión del código? Sí, si la vigente todavía habla de "saldo" o "billetera" (anterior a C-131)
 * o si es, letra por letra, la versión anterior del código (sin la cláusula del cierre de cuenta).
 * Una versión que Andrés haya escrito en el panel no entra en ninguno de los dos casos y se respeta.
 */
function necesitaVersionDelCodigo(doc: LegalDocument): boolean {
  return /\b(saldo|billetera)\b/i.test(`${doc.title}\n${doc.content}`) || doc.contentHash === HASH_V2;
}

/**
 * Versión vigente de un documento. Los términos de los Puntos ES se crean solos la primera vez (versión 1) y, si la
 * vigente todavía dice "saldo" o "billetera" (C-135) o es la anterior del código (C-142), se publica la del código.
 */
export async function documentoVigente(slug: string): Promise<LegalDocument | null> {
  const doc = await prisma.legalDocument.findFirst({ where: { slug, isCurrent: true }, orderBy: { version: 'desc' } });
  if (slug !== SLUG_TERMINOS_SALDO) return doc;
  if (doc) return necesitaVersionDelCodigo(doc) ? publicarTerminosDelCodigo(doc) : doc;
  try {
    // La 1 queda en el historial (las aceptaciones de antes de C-103 cuentan como firma de la 1) y se pasa a la 2
    const v1 = await prisma.legalDocument.create({
      data: {
        slug,
        version: 1,
        title: TERMINOS_SALDO_V1.title,
        content: TERMINOS_SALDO_V1.content,
        contentHash: hashContenido(TERMINOS_SALDO_V1.title, TERMINOS_SALDO_V1.content),
        requiredFor: TERMINOS_SALDO_V1.requiredFor,
      },
    });
    return publicarTerminosDelCodigo(v1);
  } catch {
    // Otra petición la creó al mismo tiempo (slug + versión es único)
    return prisma.legalDocument.findFirst({ where: { slug, isCurrent: true } });
  }
}

/**
 * C-135 y C-142: publica los términos de los Puntos ES del código como la versión siguiente, igual que el botón
 * "Publicar versión" del panel: la anterior deja de estar vigente. Solo en los casos de `necesitaVersionDelCodigo`.
 * Dos peticiones a la vez chocan en slug + versión (único): la segunda lee la que creó la primera.
 */
async function publicarTerminosDelCodigo(actual: LegalDocument): Promise<LegalDocument> {
  const v2 = TERMINOS_PUNTOS_V3;
  try {
    return await prisma.$transaction(async (tx) => {
      const ultima = await tx.legalDocument.findFirst({ where: { slug: actual.slug }, orderBy: { version: 'desc' }, select: { version: true } });
      await tx.legalDocument.updateMany({ where: { slug: actual.slug, isCurrent: true }, data: { isCurrent: false } });
      return tx.legalDocument.create({
        data: {
          slug: actual.slug,
          version: (ultima?.version ?? actual.version) + 1,
          title: v2.title,
          content: v2.content,
          contentHash: hashContenido(v2.title, v2.content),
          requiredFor: v2.requiredFor,
        },
      });
    });
  } catch {
    return (await prisma.legalDocument.findFirst({ where: { slug: actual.slug, isCurrent: true }, orderBy: { version: 'desc' } })) ?? actual;
  }
}

/**
 * Firma vigente (no revocada) de un cliente para esa versión. Las aceptaciones de antes de C-103
 * (balance_terms_acceptances) cuentan como firma de la versión 1 de los términos del saldo mientras no se
 * hayan pasado a la tabla nueva: así el deploy no obliga a nadie a firmar de nuevo.
 */
export async function firmaVigente(userId: string, doc: LegalDocument): Promise<DocumentSignature | 'LEGADO' | null> {
  const firma = await prisma.documentSignature.findFirst({
    where: { documentId: doc.id, userId, revokedAt: null },
    orderBy: { signedAt: 'desc' },
  });
  if (firma) return firma;
  if (doc.slug !== SLUG_TERMINOS_SALDO || doc.version !== 1) return null;
  const legado = await prisma.balanceTermsAcceptance.findUnique({ where: { userId }, select: { id: true } });
  if (!legado) return null;
  const pasada = await prisma.documentSignature.findFirst({ where: { legacyAcceptanceId: legado.id }, select: { id: true } });
  return pasada ? null : 'LEGADO';
}

/** ¿Falta la firma de un documento que se exige para esta acción? Devuelve el documento pendiente o null. */
export async function firmaPendientePara(userId: string, requiredFor: 'RECHARGE'): Promise<LegalDocument | null> {
  await documentoVigente(SLUG_TERMINOS_SALDO);
  const docs = await prisma.legalDocument.findMany({ where: { isCurrent: true, requiredFor } });
  for (const doc of docs) {
    if (!(await firmaVigente(userId, doc))) return doc;
  }
  return null;
}

export interface FirmaValida {
  png: Buffer;
  ancho: number;
  alto: number;
}

/**
 * La imagen del trazo: PNG real, de tamaño razonable y con tinta. Antes se guardaba cualquier texto como "firma",
 * sin límite, y el panel lo insertaba en un <img> y en un HTML descargable.
 */
export async function validarFirma(dataUrl: unknown): Promise<FirmaValida | { error: string }> {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) return { error: 'Firma inválida' };
  const base64 = dataUrl.slice('data:image/png;base64,'.length);
  if (base64.length > 600_000) return { error: 'La firma es demasiado grande' };
  const png = Buffer.from(base64, 'base64');
  try {
    const img = sharp(png);
    const meta = await img.metadata();
    if (meta.format !== 'png' || !meta.width || !meta.height || meta.width < 200 || meta.width > 2400 || meta.height < 60 || meta.height > 1200) {
      return { error: 'Firma inválida' };
    }
    // Tinta: en un lienzo transparente, la media del canal alfa mide cuánto está pintado
    const stats = await img.ensureAlpha().stats();
    const alfa = stats.channels[3]?.mean ?? 0;
    if (alfa < 0.6) return { error: 'La firma está vacía o es muy corta. Firma de nuevo.' };
    return { png, ancho: meta.width, alto: meta.height };
  } catch {
    return { error: 'Firma inválida' };
  }
}

function fechaLegible(fecha: Date): string {
  return fecha.toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'medium', timeZone: 'America/Caracas' });
}

/** Constancia en PDF: el texto exacto que se firmó, los datos del firmante, la firma y la huella. */
export async function generarConstancia(doc: LegalDocument, firma: {
  id: string; userName: string; userEmail: string; idNumber: string; phone: string | null; address: string | null;
  ipAddress: string | null; signedAt: Date; png: Buffer; empresa: string;
}): Promise<Buffer> {
  const { data: jpeg, info } = await sharp(firma.png).flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
  const bloques: BloquePdf[] = [
    { tipo: 'parrafo', texto: firma.empresa, bold: true, size: 9, color: 'gris' },
    { tipo: 'espacio', alto: 4 },
    { tipo: 'titulo', texto: doc.title },
    { tipo: 'parrafo', texto: `Versión ${doc.version} · Publicada el ${fechaLegible(doc.publishedAt)}`, size: 9, color: 'gris' },
    { tipo: 'linea' },
  ];
  for (const b of parsearDocumento(doc.content)) {
    if (b.tipo === 'subtitulo' || b.tipo === 'subsubtitulo') bloques.push({ tipo: 'subtitulo', texto: b.texto });
    else if (b.tipo === 'aviso') bloques.push({ tipo: 'parrafo', texto: sinNegrita(b.texto), bold: true, color: 'rojo' });
    else if (b.tipo === 'lista') b.items.forEach((texto) => bloques.push({ tipo: 'vineta', texto: sinNegrita(texto) }));
    else bloques.push({ tipo: 'parrafo', texto: sinNegrita(b.texto) });
    bloques.push({ tipo: 'espacio', alto: 4 });
  }
  const altoFirma = (220 * info.height) / info.width;
  bloques.push(
    { tipo: 'mantenerJuntos', alto: 130 + altoFirma },
    { tipo: 'linea' },
    { tipo: 'subtitulo', texto: 'Firmado por' },
    { tipo: 'parrafo', texto: `${firma.userName} · C.I. ${firma.idNumber}` },
    { tipo: 'parrafo', texto: [firma.userEmail, firma.phone, firma.address].filter(Boolean).join(' · '), color: 'gris' },
    { tipo: 'parrafo', texto: `Fecha: ${fechaLegible(firma.signedAt)} (hora de Venezuela)`, color: 'gris' },
    { tipo: 'parrafo', texto: `Dirección IP: ${firma.ipAddress ?? 'no registrada'}`, color: 'gris' },
    { tipo: 'espacio', alto: 8 },
    { tipo: 'imagen', jpeg, ancho: info.width, alto: info.height, anchoPt: 220 },
    { tipo: 'espacio', alto: 6 },
    { tipo: 'parrafo', texto: `Huella del texto firmado (SHA-256): ${doc.contentHash}`, size: 8, color: 'gris' },
    { tipo: 'parrafo', texto: `Constancia ${firma.id}. La huella cambia si se altera una sola letra del documento.`, size: 8, color: 'gris' },
  );
  return generarPdf(bloques, `${doc.title} v${doc.version} · Constancia ${firma.id}`);
}

/** Guarda la imagen y el PDF en la carpeta privada. Devuelve las rutas relativas a SIGNATURES_DIR. */
export async function guardarArchivos(userId: string, png: Buffer, pdf: Buffer): Promise<{ signaturePath: string; pdfPath: string }> {
  const carpeta = path.join(SIGNATURES_DIR, userId.replace(/[^a-z0-9]/gi, ''));
  await mkdir(carpeta, { recursive: true });
  const base = `${Date.now()}-${randomBytes(6).toString('hex')}`;
  await writeFile(path.join(carpeta, `${base}.png`), png, { mode: 0o600 });
  await writeFile(path.join(carpeta, `${base}.pdf`), pdf, { mode: 0o600 });
  const rel = path.relative(SIGNATURES_DIR, carpeta);
  return { signaturePath: path.join(rel, `${base}.png`), pdfPath: path.join(rel, `${base}.pdf`) };
}

/** Lee un archivo de firma sin salir de la carpeta privada */
export async function leerArchivo(relativo: string): Promise<Buffer | null> {
  const destino = path.join(SIGNATURES_DIR, relativo);
  if (!isInside(SIGNATURES_DIR, destino)) return null;
  return readFile(destino).catch(() => null);
}

export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/** Documentos vigentes con el estado de firma del cliente, para "Mis documentos" */
export async function documentosDelCliente(userId: string) {
  await documentoVigente(SLUG_TERMINOS_SALDO);
  // Las páginas públicas (/terminos y /privacidad, C-160) se leen en la tienda: no se firman ni salen aquí
  const docs = await prisma.legalDocument.findMany({ where: { isCurrent: true, slug: { notIn: [...PAGINAS_LEGALES_PUBLICAS] } }, orderBy: { publishedAt: 'asc' } });
  const anteriores = await prisma.documentSignature.findMany({
    where: { userId, document: { isCurrent: false } },
    include: { document: { select: { title: true, version: true, slug: true } } },
    orderBy: { signedAt: 'desc' },
  });
  const vigentes = await Promise.all(docs.map(async (doc) => {
    const firma = await firmaVigente(userId, doc);
    return {
      slug: doc.slug,
      title: doc.title,
      version: doc.version,
      requiredFor: doc.requiredFor ? REQUERIDO_PARA[doc.requiredFor] ?? doc.requiredFor : null,
      signed: firma !== null,
      signatureId: firma && firma !== 'LEGADO' ? firma.id : null,
      signedAt: firma && firma !== 'LEGADO' ? firma.signedAt.toISOString() : null,
      legacy: firma === 'LEGADO',
    };
  }));
  return {
    documents: vigentes,
    history: anteriores.map((f) => ({
      id: f.id,
      title: f.document.title,
      version: f.document.version,
      signedAt: f.signedAt.toISOString(),
      revoked: f.revokedAt !== null,
    })),
  };
}

export const firmaSelectAdmin = {
  id: true, userId: true, userName: true, userEmail: true, idNumber: true, phone: true, address: true,
  ipAddress: true, userAgent: true, signedAt: true, revokedAt: true, revokedReason: true, contentHash: true, pdfHash: true,
  document: { select: { id: true, slug: true, title: true, version: true, isCurrent: true } },
} satisfies Prisma.DocumentSignatureSelect;
