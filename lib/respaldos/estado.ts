// Lo que ve el panel de respaldos (C-165). Nunca salen del servidor: el secreto del cliente de Google, el permiso de
// Drive ni la clave (la pública tampoco hace falta: se muestra su huella).
import { prisma } from '@/lib/prisma';
import { siteUrl } from '@/lib/seo';
import { hayRespaldoEnCurso, leerAjustes, problemaDeConfiguracion } from './servicio';

export const REDIRECT_PATH = '/api/admin/respaldos/drive/callback';
/** Cookie con el `state` de la conexión con Google (protege contra que alguien más complete el permiso). */
export const COOKIE_ESTADO = 'respaldos_oauth_state';
export const urlDeRetorno = (): string => `${siteUrl()}${REDIRECT_PATH}`;

export async function estadoParaPanel() {
  const a = await leerAjustes();
  const corridas = await prisma.backupRun.findMany({ orderBy: { startedAt: 'desc' }, take: 20 });
  const ultimoBueno = await prisma.backupRun.findFirst({ where: { kind: 'DB', status: 'OK', deletedAt: null }, orderBy: { startedAt: 'desc' } });
  return {
    enabled: a.enabled,
    hour: a.hour,
    retentionDays: a.retentionDays,
    includeFiles: a.includeFiles,
    problema: problemaDeConfiguracion(a),
    enCurso: hayRespaldoEnCurso(),
    ultimoBueno: ultimoBueno ? { startedAt: ultimoBueno.startedAt.toISOString(), sizeBytes: Number(ultimoBueno.sizeBytes ?? 0) } : null,
    /** El último respaldo bueno de la base tiene menos de 36 horas */
    alDia: Boolean(ultimoBueno && Date.now() - ultimoBueno.startedAt.getTime() < 36 * 3600_000),
    clave: { creada: Boolean(a.publicKeyPem), huella: a.keyFingerprint, creadaEn: a.keyCreatedAt?.toISOString() ?? null },
    drive: {
      clientId: a.driveClientId,
      tieneSecreto: Boolean(a.driveClientSecret),
      conectado: Boolean(a.driveRefreshToken),
      email: a.driveEmail,
      conectadoEn: a.driveConnectedAt?.toISOString() ?? null,
      error: a.driveError,
      urlDeRetorno: urlDeRetorno(),
    },
    corridas: corridas.map((c) => ({
      id: c.id,
      kind: c.kind,
      trigger: c.trigger,
      status: c.status,
      startedAt: c.startedAt.toISOString(),
      finishedAt: c.finishedAt?.toISOString() ?? null,
      fileName: c.fileName,
      sizeBytes: c.sizeBytes === null ? null : Number(c.sizeBytes),
      items: c.items,
      error: c.error,
      verifiedAt: c.verifiedAt?.toISOString() ?? null,
      verifiedOk: c.verifiedOk,
      deleted: c.deletedAt !== null,
    })),
  };
}
