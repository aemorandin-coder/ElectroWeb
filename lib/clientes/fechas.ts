// C-276: las fechas de Clientes, en la hora de Venezuela: "16 nov.", "Hace 2 h", "Ayer". Módulo puro (cliente y servidor).
const ZONA = 'America/Caracas';

export function fechaCorta(iso: string, conAno = false): string {
  return new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', ...(conAno ? { year: 'numeric' } : {}), timeZone: ZONA }).format(new Date(iso));
}

export function fechaYHora(iso: string): string {
  return new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: ZONA }).format(new Date(iso));
}

/** "Hace un momento", "Hace 25 min", "Hace 3 h", "Ayer", "Hace 4 días" y, desde la semana, la fecha */
export function haceCuanto(iso: string, ahora = Date.now()): string {
  const ms = ahora - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 2) return 'Hace un momento';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const dias = Math.round(h / 24);
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  return fechaCorta(iso, new Date(iso).getFullYear() !== new Date(ahora).getFullYear());
}

/** El día de un hito, para agrupar la línea de tiempo: "Hoy", "Ayer" o "12 nov." */
export function diaDe(iso: string, ahora = Date.now()): string {
  const clave = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(d);
  const hoy = clave(new Date(ahora));
  const ayer = clave(new Date(ahora - 24 * 60 * 60 * 1000));
  const dia = clave(new Date(iso));
  if (dia === hoy) return 'Hoy';
  if (dia === ayer) return 'Ayer';
  return fechaCorta(iso, new Date(iso).getFullYear() !== new Date(ahora).getFullYear());
}
