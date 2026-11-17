// C-285: los enlaces de activación (EmailVerificationToken) y de recuperación de contraseña (PasswordResetToken) se guardan
// como huella, no tal cual. El valor que viaja en el correo y en la dirección es el de siempre; en la columna `token` queda
// su huella con una marca ("sha256:" + SHA-256 en hexadecimal): en la base no queda ningún enlace que se pueda abrir tal
// cual. Sin cambio de esquema. Solo en el servidor; sin Prisma, se prueba solo.
import { createHash } from 'crypto';

/** Lo que lleva por delante la huella guardada en la columna `token`. */
export const MARCA_HUELLA = 'sha256:';

/** SHA-256 en hexadecimal (64 caracteres) del valor del enlace. */
export function huellaDeToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Lo que se guarda en la columna `token` al crear un enlace: la marca y la huella del valor que va en el correo. */
export function tokenParaGuardar(token: string): string {
  return `${MARCA_HUELLA}${huellaDeToken(token)}`;
}

/**
 * Los valores de la columna `token` con que se busca el valor que presentó alguien (el del enlace): primero su huella con marca
 * y, mientras duren los enlaces creados antes de C-285 (guardados tal cual), el valor mismo. Lo que se presenta con la marca
 * nunca se busca tal cual: ni la huella guardada ni la huella sin marca sirven como enlace.
 *
 * El respaldo de "tal cual" se quita (queda solo la primera) cuando pasen los plazos de los enlaces viejos: 24 horas (activación
 * de la cuenta e invitación al equipo) o 1 hora (recuperar la contraseña y "No fui yo"), contadas desde que C-285 está en producción.
 */
export function valoresDeToken(presentado: string): string[] {
  const guardado = tokenParaGuardar(presentado);
  return presentado.startsWith(MARCA_HUELLA) ? [guardado] : [guardado, presentado];
}
