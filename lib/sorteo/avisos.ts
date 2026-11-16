// C-262: los avisos del sorteo en la campana de Mi panel (además de los correos de correos.ts). El equipo, 15/11: "¿cómo
// sabe el cliente cuántos boletos tiene?, ¿cómo sabe si los amigos le aceptaron o le hace falta un amigo de su link?".
// Antes, quien invitaba no se enteraba de que un amigo se había unido hasta que se completaba el par, y solo por correo.
// Nunca lanzan: un aviso que no sale no puede romper un registro, un pago ni la activación de una cuenta.

import { createNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import { nombreCorto, type EstadoAmigo } from './reglas';

/** Los avisos llevan a "Tus boletos" de /sorteo, con la lista de amigos */
const ENLACE = '/sorteo#tus-boletos';
const boletos = (n: number) => `${n} ${n === 1 ? 'boleto' : 'boletos'}`;

/** Un amigo se registró con el enlace: a quien invitó, con lo que le falta al amigo para contar */
export async function avisarAmigoRegistrado(invitaUserId: string, amigoUserId: string): Promise<void> {
  try {
    const amigo = await prisma.user.findUnique({
      where: { id: amigoUserId },
      select: { name: true, emailVerified: true, profile: { select: { phone: true } } },
    });
    if (!amigo) return;
    const conTelefono = (amigo.profile?.phone ?? '').replace(/\D/g, '').length >= 10;
    const falta = !amigo.emailVerified
      ? 'Cuenta para tu boleto cuando active su cuenta con el enlace de su correo.'
      : !conTelefono
        ? 'Cuenta para tu boleto cuando agregue su teléfono en su cuenta.'
        : 'Ya cuenta para tu boleto.';
    await createNotification({ userId: invitaUserId, type: 'SORTEO', title: `${nombreCorto(amigo.name)} se unió con tu enlace`, message: falta, link: ENLACE });
  } catch (error) {
    console.error('[SORTEO] No se pudo avisar el amigo registrado:', error);
  }
}

/**
 * Un amigo activó su cuenta (o agregó su teléfono) sin completar un par: a quien invitó, si ya cuenta y cuántos le faltan
 * para el próximo boleto, o por qué no suma. Cuando completa un par, el aviso es el del boleto (avisarBoletoEnCampana).
 */
export async function avisarAmigoListo(invitaUserId: string, nombre: string | null, estado: EstadoAmigo, faltan: number): Promise<void> {
  const quien = nombreCorto(nombre);
  if (estado === 'cuenta') {
    await createNotification({
      userId: invitaUserId,
      type: 'SORTEO',
      title: `${quien} ya cuenta para tu boleto`,
      message: faltan > 0 ? `Te ${faltan === 1 ? 'falta 1 amigo' : `faltan ${faltan} amigos`} para tu próximo boleto.` : 'Ya ganaste todos los boletos de invitar: sigue sumando con tus compras.',
      link: ENLACE,
    });
  } else if (estado === 'repetido') {
    await createNotification({
      userId: invitaUserId,
      type: 'SORTEO',
      title: `${quien} activó su cuenta, pero no suma`,
      message: 'Esa persona ya cuenta con otra cuenta que se registró antes: cada persona suma una sola vez.',
      link: ENLACE,
    });
  }
}

/**
 * C-264: a un participante le deja de sumar un amigo: la misma persona tiene otra cuenta, invitada antes por alguien más,
 * que ahora cuenta (cada persona suma una sola vez, para quien la invitó primero). Raro, pero sin sorpresas el día del sorteo.
 */
export async function avisarAmigoYaNoSuma(invitaUserId: string, nombre: string | null, perdioBoleto: boolean, total: number): Promise<void> {
  await createNotification({
    userId: invitaUserId,
    type: 'SORTEO',
    title: `${nombreCorto(nombre)} ya no suma para ti`,
    message: `Esa persona ya cuenta con otra cuenta, que alguien invitó antes: cada persona suma una sola vez.${perdioBoleto ? ` Ahora tienes ${boletos(total)}.` : ''}`,
    link: ENLACE,
  });
}

/** Ganó un boleto, por una compra o por dos amigos que ya cuentan: a la campana, con cuántos lleva */
export async function avisarBoletoEnCampana(userId: string, porque: 'compra' | 'invitados', total: number): Promise<void> {
  await createNotification({
    userId,
    type: 'SORTEO',
    title: '¡Ganaste un boleto!',
    message: porque === 'compra'
      ? `Tu compra te dio un boleto para el sorteo. Ya tienes ${boletos(total)}.`
      : `Dos amigos tuyos ya cuentan: ganaste un boleto. Ya tienes ${boletos(total)}.`,
    link: ENLACE,
  });
}
