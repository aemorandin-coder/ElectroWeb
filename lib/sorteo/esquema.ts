// C-212 y C-221: lo que se guarda de un sorteo desde el panel, con sus reglas, y los días de Venezuela. Lo usan la ruta que
// guarda y la que muestra el efecto de un cambio antes de guardarlo (PLAN.md §1.9), para que las dos lean lo mismo.
import { z } from '@/lib/zod';
import { MAX_QUE_TRAE } from '@/lib/sorteo/premio';

/** Un día de Venezuela ('2026-12-18') como el primer o el último instante de ese día (UTC-4) */
export const inicioDelDia = (dia: string) => new Date(`${dia}T00:00:00-04:00`);
export const finDelDia = (dia: string) => new Date(`${dia}T23:59:59.999-04:00`);
export const diaDe = (fecha: Date) => new Date(fecha.getTime() - 4 * 3600 * 1000).toISOString().slice(0, 10);

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige un día');

export const esquemaSorteo = z.object({
  titulo: z.string().trim().min(3, 'Ponle un título').max(60),
  premio: z.string().trim().min(3, 'Escribe el premio').max(120),
  imagen: z.string().trim().max(300).optional().default(''),
  // C-253: opcionales, para que un panel abierto de antes (que no los manda) no los borre al guardar
  incluye: z.array(z.object({
    texto: z.string().trim().min(2, 'Escribe qué trae').max(60),
    detalle: z.string().trim().max(40).optional().default(''),
  })).max(MAX_QUE_TRAE, `Hasta ${MAX_QUE_TRAE} cosas`).optional(),
  lema: z.string().trim().max(30).optional(),
  nombreCorto: z.string().trim().max(16).optional(),
  costoPremioUSD: z.coerce.number().min(0).max(100_000),
  compraMinimaUSD: z.coerce.number().min(1, 'Desde $1').max(10_000),
  topeInvitar: z.coerce.number().int().min(0).max(20),
  // C-297: la escala por monto y las reseñas. Opcionales, para que un panel abierto de antes (que no los manda) no los cambie
  boletosPorCompra: z.coerce.number().int().min(1, 'Desde 1 boleto').max(50, 'Hasta 50').optional(),
  escalaUSD: z.coerce.number().min(0).max(10_000).optional(),
  boletosPorEscala: z.coerce.number().int().min(0).max(500).optional(),
  boletosPorResena: z.coerce.number().int().min(0).max(20, 'Hasta 20').optional(),
  desde: dia,
  hasta: dia,
  resultadoEl: dia,
  activo: z.boolean(),
}).refine((d) => d.hasta >= d.desde, { path: ['hasta'], message: 'El cierre no puede ser antes del inicio' })
  .refine((d) => d.resultadoEl >= d.hasta, { path: ['resultadoEl'], message: 'El resultado va el día del cierre o después' })
  // C-297: la escala va entera (el monto y sus boletos) o apagada, y su tramo no puede ser menor que la compra mínima
  .refine((d) => d.escalaUSD === undefined || d.boletosPorEscala === undefined || (d.escalaUSD > 0) === (d.boletosPorEscala > 0), { path: ['escalaUSD'], message: 'Pon el monto y sus boletos, o apaga la escala' })
  .refine((d) => !d.escalaUSD || d.escalaUSD >= d.compraMinimaUSD, { path: ['escalaUSD'], message: 'El tramo va desde la compra mínima' });

export type DatosSorteo = z.infer<typeof esquemaSorteo>;

/** Los errores de zod como { campo: mensaje }, para marcar cada campo */
export function erroresPorCampo(issues: Array<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  return Object.fromEntries(issues.map((i) => [String(i.path[0] ?? ''), i.message]));
}
