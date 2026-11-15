// C-221: lo que comparten el asistente y el tablero del sorteo (Marketing → Sorteo): los datos que llegan del servidor, el
// formulario, lo que se propone para el primero y las cuentas de días y montos.
import type { AdminTone } from '@/lib/admin-ui';

export interface Formulario {
  titulo: string; premio: string; imagen: string; costoPremioUSD: string; compraMinimaUSD: string; topeInvitar: string;
  desde: string; hasta: string; resultadoEl: string; activo: boolean;
}

export interface SorteoPanel extends Omit<Formulario, 'costoPremioUSD' | 'compraMinimaUSD' | 'topeInvitar'> {
  id: string; costoPremioUSD: number; compraMinimaUSD: number; topeInvitar: number; cerrado: boolean;
  sorteadoAt: string | null; ganadorEmail: string | null; ganadorDetalle: string | null; boletosAlSortear: number | null; huellaLista: string | null;
}

export interface Participante { userId: string; email: string; nombre: string; porCompra: number; porInvitar: number; invitados: number; aviso: string }

export interface Numeros { boletos: number; participantes: number; ventasUSD: number; margenUSD: number }

export interface Datos { sorteo: SorteoPanel | null; numeros?: Numeros; participantes?: Participante[] }

/** Hoy en Venezuela, como '2026-11-14' */
export const hoy = () => new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);

export const esDia = (dia: string) => /^\d{4}-\d{2}-\d{2}$/.test(dia) && !Number.isNaN(new Date(`${dia}T12:00:00-04:00`).getTime());

/** Un día más `n` días ('2026-11-14' + 4 → '2026-11-18') */
export function sumarDias(dia: string, n: number): string {
  const fecha = new Date(`${dia}T12:00:00-04:00`);
  fecha.setUTCDate(fecha.getUTCDate() + n);
  return new Date(fecha.getTime() - 4 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Días de `a` a `b` (0 si es el mismo) */
export const diasEntre = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00-04:00`).getTime() - new Date(`${a}T12:00:00-04:00`).getTime()) / 86_400_000);

/** "sáb 14/11/2026" */
export function fechaCorta(dia: string): string {
  if (!esDia(dia)) return '—';
  return new Intl.DateTimeFormat('es-VE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Caracas' })
    .format(new Date(`${dia}T12:00:00-04:00`)).replace(',', '');
}

/** "14/11" */
export const diaMes = (dia: string) => (esDia(dia) ? `${dia.slice(8, 10)}/${dia.slice(5, 7)}` : '—');

/** Un número escrito en el panel ("10", "10,5"); null si está vacío o no es un número */
export function numero(valor: string): number | null {
  if (!valor.trim()) return null;
  const n = Number(valor.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// El que pidió Andrés el 13/11 (C-212): lo que se propone para el primero
export const PROPUESTO = (): Formulario => ({
  titulo: 'Sorteo de Navidad', premio: 'PlayStation 4 reacondicionada con 1 control y 1 TB', imagen: '', costoPremioUSD: '220',
  compraMinimaUSD: '10', topeInvitar: '3', desde: hoy(), hasta: '2026-12-18', resultadoEl: '2026-12-20', activo: false,
});

export const formularioDe = (s: SorteoPanel): Formulario => ({
  titulo: s.titulo, premio: s.premio, imagen: s.imagen, costoPremioUSD: String(s.costoPremioUSD), compraMinimaUSD: String(s.compraMinimaUSD),
  topeInvitar: String(s.topeInvitar), desde: s.desde, hasta: s.hasta, resultadoEl: s.resultadoEl, activo: s.activo,
});

/** "Sorteo nuevo con estos datos": el mismo premio y las mismas reglas, con las fechas corridas a hoy y el mismo largo */
export function nuevoDesde(s: SorteoPanel): Formulario {
  const desde = hoy();
  const hasta = sumarDias(desde, Math.max(0, diasEntre(s.desde, s.hasta)));
  return { ...formularioDe(s), desde, hasta, resultadoEl: sumarDias(hasta, Math.max(0, diasEntre(s.hasta, s.resultadoEl))), activo: false };
}

export function estadoDe(s: SorteoPanel | null): { etiqueta: string; tono: AdminTone } {
  if (!s) return { etiqueta: 'Sin crear', tono: 'neutral' };
  if (s.sorteadoAt) return { etiqueta: 'Sorteado', tono: 'success' };
  if (s.cerrado) return { etiqueta: 'Cerrado: falta sortear', tono: 'warning' };
  return s.activo ? { etiqueta: 'En la tienda', tono: 'brand' } : { etiqueta: 'Apagado', tono: 'neutral' };
}

/** Lo que le falta a un paso para seguir; null si está completo */
export function problemaDe(paso: number, f: Formulario): string | null {
  if (paso === 0) {
    if (f.titulo.trim().length < 3) return 'Falta el título.';
    if (f.premio.trim().length < 3) return 'Falta el premio.';
    const costo = numero(f.costoPremioUSD);
    if (costo === null || costo < 0) return 'Falta el costo del premio.';
    return null;
  }
  if (paso === 1) {
    const minimo = numero(f.compraMinimaUSD);
    if (minimo === null || minimo < 1) return 'La compra mínima va desde $1.';
    const tope = numero(f.topeInvitar);
    if (tope === null || !Number.isInteger(tope) || tope < 0 || tope > 20) return 'El tope por invitar va de 1 a 20 boletos.';
    return null;
  }
  if (paso === 2) {
    if (!esDia(f.desde) || !esDia(f.hasta) || !esDia(f.resultadoEl)) return 'Elige las tres fechas.';
    if (f.hasta < f.desde) return 'La última compra no puede ser antes de que empiece.';
    if (f.resultadoEl < f.hasta) return 'El resultado va el día de la última compra o después.';
    return null;
  }
  return null;
}

/** El paso donde está cada campo, para llevar ahí al que tiene un error del servidor */
export const PASO_DE: Record<string, number> = {
  titulo: 0, premio: 0, imagen: 0, costoPremioUSD: 0, compraMinimaUSD: 1, topeInvitar: 1, desde: 2, hasta: 2, resultadoEl: 2,
};
