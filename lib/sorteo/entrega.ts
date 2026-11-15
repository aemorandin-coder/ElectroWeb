// C-254: la semana del ganador (el equipo, 15/11: "al terminar el sorteo, que la bandera permanezca una semana más
// mostrando quién ganó y un video de testimonio o una imagen de la persona"; eligió lo recomendado viendo las maquetas).
// - La bandera del inicio, por etapas: abierto ("¡Gánate una PS4!"), cerrado ("Resultado el 20 de diciembre") y, desde el
//   sorteo, "¡Ya hay ganador!" con la foto del premio. Al publicar la entrega pasa a la foto de la persona ("¡Ganó una
//   PS4!") y los 7 días cuentan desde ahí. Sin entrega, se va a los 7 días del sorteo; si la entrega llega después, vuelve.
// - La entrega sale en la tienda solo con el permiso de la persona, su foto y su nombre. Sin eso, el correo tapado.
// Las reglas, puras (sin base ni React): las usan la API, el inicio, /sorteo y el panel.
import { z } from '@/lib/zod';
import { leerYoutube } from '@/lib/youtube';

/** Los días que la bandera muestra al ganador */
export const DIAS_BANDERA = 7;
const DIA = 86_400_000;

export type EtapaBandera = 'abierto' | 'espera' | 'hoy' | 'pronto' | 'ganador';

export interface EstadoSorteoBandera {
  hasta: Date;
  resultadoEl: Date;
  sorteadoAt: Date | null;
  entregaPublicadaAt: Date | null;
  entregaPermiso: boolean;
  entregaFoto: string | null;
  entregaNombre: string | null;
}

/** La entrega se puede mostrar: publicada, con el permiso, la foto y el nombre */
export const entregaVisible = (s: Pick<EstadoSorteoBandera, 'entregaPublicadaAt' | 'entregaPermiso' | 'entregaFoto' | 'entregaNombre'>) =>
  Boolean(s.entregaPublicadaAt && s.entregaPermiso && s.entregaFoto && s.entregaNombre?.trim());

/** El día de Venezuela (UTC-4) de un instante, para comparar días */
const diaVe = (t: Date) => new Date(t.getTime() - 4 * 3600 * 1000).toISOString().slice(0, 10);

/**
 * Qué dice la bandera del inicio ahora, y si lleva a la persona. null: no sale.
 * - Abierto: hasta la última compra.
 * - Cerrado y sin sortear: "Resultado el…"; el día del resultado, "Hoy"; si se pasó el día sin sortear, "pronto".
 * - Sorteado: "¡Ya hay ganador!" 7 días desde el sorteo o, con la entrega publicada, 7 días desde que se publicó.
 */
export function etapaDeLaBandera(s: EstadoSorteoBandera, ahora: Date): { etapa: EtapaBandera; conEntrega: boolean } | null {
  if (!s.sorteadoAt) {
    if (ahora <= s.hasta) return { etapa: 'abierto', conEntrega: false };
    const hoy = diaVe(ahora);
    const dia = diaVe(s.resultadoEl);
    return { etapa: hoy < dia ? 'espera' : hoy === dia ? 'hoy' : 'pronto', conEntrega: false };
  }
  const conEntrega = entregaVisible(s);
  const desde = conEntrega && s.entregaPublicadaAt ? s.entregaPublicadaAt : s.sorteadoAt;
  if (ahora.getTime() - desde.getTime() >= DIAS_BANDERA * DIA) return null;
  return { etapa: 'ganador', conEntrega };
}

/** Hasta cuándo sale la bandera del ganador si la entrega se publica en `publicadaAt` */
export const banderaHasta = (publicadaAt: Date) => new Date(publicadaAt.getTime() + DIAS_BANDERA * DIA);

/** "María G., de Barquisimeto" (o solo el nombre) */
export const nombreConCiudad = (nombre: string, ciudad: string | null | undefined) => (ciudad?.trim() ? `${nombre.trim()}, de ${ciudad.trim()}` : nombre.trim());

/** La foto de la entrega: solo una subida de la tienda del sorteo (nunca una dirección de afuera) */
export const FOTO_ENTREGA = /^\/api\/uploads\/sorteo-[A-Za-z0-9-]+\.(jpg|jpeg|png|webp)$/;

// Un nombre como se escribe una persona: letras, espacios, puntos, apóstrofos y guiones. Sin números ni @: así no se
// publica por error un correo o un teléfono
const NOMBRE = /^\p{L}[\p{L}\p{M} .'’-]*$/u;
const CIUDAD = /^\p{L}[\p{L}\p{M} .,'’-]*$/u;

/** Lo que manda el panel al publicar la entrega. El permiso tiene que ser exactamente `true` */
export const esquemaEntrega = z.object({
  sorteoId: z.string().min(1).max(40),
  nombre: z.string().trim().min(2, 'Escribe su nombre').max(30, 'Hasta 30 letras').regex(NOMBRE, 'Solo el nombre: sin números, correos ni teléfonos'),
  ciudad: z.string().trim().max(40, 'Hasta 40 letras').refine((v) => v === '' || CIUDAD.test(v), 'Solo la ciudad o el estado').optional().default(''),
  foto: z.string().trim().regex(FOTO_ENTREGA, 'Sube su foto con el premio'),
  video: z.string().trim().max(300).refine((v) => v === '' || leerYoutube(v) !== null, 'Ese enlace no es de YouTube. Pega el de YouTube: youtu.be/… o youtube.com/shorts/…').optional().default(''),
  permiso: z.literal(true, { error: 'Marca que la persona aceptó salir en la tienda' }),
});

export type DatosEntrega = z.infer<typeof esquemaEntrega>;
