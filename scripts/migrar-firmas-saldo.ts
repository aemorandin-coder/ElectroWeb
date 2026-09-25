/**
 * C-103: pasa las aceptaciones de los términos del saldo (balance_terms_acceptances, firma en base64 en la base)
 * a la tabla nueva de firmas, con la imagen y la constancia en PDF en private-uploads/signatures.
 *
 * Uso (en el servidor, después de `npx prisma db push`):
 *   npx tsx scripts/migrar-firmas-saldo.ts           → solo muestra lo que haría (no escribe)
 *   npx tsx scripts/migrar-firmas-saldo.ts --apply   → crea las firmas
 *
 * Es idempotente (salta las ya pasadas) y no borra nada: la tabla vieja queda como historial.
 * Mientras no se corra, esas aceptaciones siguen valiendo como firma de la versión 1 (lib/legal-docs.ts).
 * Las que tengan una firma que no es una imagen válida se informan y siguen valiendo igual.
 */
import { prisma } from '../lib/prisma';
import { documentoVigente, generarConstancia, guardarArchivos, sha256, SLUG_TERMINOS_SALDO, validarFirma } from '../lib/legal-docs';
import { normalizarCedula } from '../lib/legal-docs-core';

const apply = process.argv.includes('--apply');

async function main() {
  await documentoVigente(SLUG_TERMINOS_SALDO);
  const v1 = await prisma.legalDocument.findUnique({ where: { slug_version: { slug: SLUG_TERMINOS_SALDO, version: 1 } } });
  if (!v1) throw new Error('No existe la versión 1 de los términos del saldo');

  const settings = await prisma.companySettings.findUnique({ where: { id: 'default' }, select: { companyName: true, legalName: true, rif: true } });
  const empresa = [settings?.legalName || settings?.companyName || 'Electro Shop Morandin C.A.', settings?.rif ? `RIF ${settings.rif}` : null].filter(Boolean).join(' · ');

  const aceptaciones = await prisma.balanceTermsAcceptance.findMany({ orderBy: { acceptedAt: 'asc' } });
  let pasadas = 0, yaEstaban = 0, invalidas = 0;
  for (const a of aceptaciones) {
    if (await prisma.documentSignature.findUnique({ where: { legacyAcceptanceId: a.id } })) { yaEstaban++; continue; }
    const firma = await validarFirma(a.signatureData);
    if ('error' in firma) {
      invalidas++;
      console.log(`  Sin imagen válida: ${a.userEmail} (${a.id}) — sigue valiendo como firma de la versión 1`);
      continue;
    }
    if (!apply) { pasadas++; continue; }
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 25);
    const datos = {
      userName: a.userName,
      userEmail: a.userEmail,
      idNumber: normalizarCedula(a.userIdNumber) ?? (a.userIdNumber || 'Sin cédula'),
      phone: a.userPhone,
      address: a.userAddress,
    };
    const pdf = await generarConstancia(v1, { id, ...datos, ipAddress: a.ipAddress, signedAt: a.acceptedAt, png: firma.png, empresa });
    const archivos = await guardarArchivos(a.userId, firma.png, pdf);
    await prisma.documentSignature.create({
      data: {
        id, documentId: v1.id, userId: a.userId, ...datos, contentHash: v1.contentHash, ...archivos, pdfHash: sha256(pdf),
        ipAddress: a.ipAddress, userAgent: a.userAgent, signedAt: a.acceptedAt, legacyAcceptanceId: a.id,
      },
    });
    pasadas++;
  }
  console.log(`${apply ? 'Pasadas' : 'Se pasarían'}: ${pasadas} · Ya estaban: ${yaEstaban} · Sin imagen válida: ${invalidas} · Total: ${aceptaciones.length}`);
  if (!apply && pasadas > 0) console.log('Nada se escribió. Corre con --apply para crearlas.');
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
