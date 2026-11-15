// C-234: cuándo sale cada pedido (el equipo, 14/11: "hay compradores que nos pueden hacer compras un sábado al mediodía,
// su producto sí o sí sale el lunes"). Lo decidió en 6 preguntas (PLAN.md §7.2, PROPUESTA_C234.md):
// - corte de lunes a viernes a las 2:00 p. m. (se cambia en Configuración); el sábado no se despacha;
// - los feriados nacionales de Venezuela, más los días que el equipo cierre o abra en el panel;
// - lo digital llega en el horario de atención; lo de un proveedor que despacha él mismo, un día hábil después.
// Puro, sin Prisma: lo usan el servidor, los correos y el navegador. Todo en hora de Venezuela (UTC−4, sin cambio de hora).

export const HORA_CORTE_POR_DEFECTO = '14:00';
const DIA_MS = 24 * 60 * 60 * 1000;
const DESFASE_VENEZUELA_MS = 4 * 60 * 60 * 1000;

/** Lo que el equipo ajusta en Configuración → Negocio → Despachos */
export interface Calendario {
  /** "14:00": lo pagado antes sale ese día */
  horaCorte: string;
  /** Días que la tienda no despacha, además de los feriados ("2026-12-26") */
  diasCerrados: string[];
  /** Feriados en los que la tienda sí despacha ("2026-04-19") */
  diasAbiertos: string[];
}

export const CALENDARIO_POR_DEFECTO: Calendario = { horaCorte: HORA_CORTE_POR_DEFECTO, diasCerrados: [], diasAbiertos: [] };

/** El calendario desde los settings públicos (cualquier objeto con esos campos) */
export function calendarioDe(s: { horaCorte?: string | null; diasCerrados?: string[] | null; diasAbiertos?: string[] | null } | null | undefined): Calendario {
  return {
    horaCorte: s?.horaCorte && /^\d{1,2}:\d{2}$/.test(s.horaCorte) ? s.horaCorte : HORA_CORTE_POR_DEFECTO,
    diasCerrados: Array.isArray(s?.diasCerrados) ? s.diasCerrados.filter(esFecha) : [],
    diasAbiertos: Array.isArray(s?.diasAbiertos) ? s.diasAbiertos.filter(esFecha) : [],
  };
}

export const esFecha = (texto: unknown): texto is string => typeof texto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(texto);

/* ── Fechas en hora de Venezuela ────────────────────────────────────────── */

/** La fecha ("2026-11-14"), los minutos del día y el día de la semana (0 = domingo) de un instante, en Venezuela */
export function enVenezuela(instante: Date): { fecha: string; minutos: number; diaSemana: number } {
  const local = new Date(instante.getTime() - DESFASE_VENEZUELA_MS);
  return { fecha: local.toISOString().slice(0, 10), minutos: local.getUTCHours() * 60 + local.getUTCMinutes(), diaSemana: local.getUTCDay() };
}

const aFecha = (fecha: string) => new Date(`${fecha}T12:00:00Z`);
export const sumarDias = (fecha: string, dias: number) => new Date(aFecha(fecha).getTime() + dias * DIA_MS).toISOString().slice(0, 10);
export const diaSemanaDe = (fecha: string) => aFecha(fecha).getUTCDay();

/** El domingo de Pascua (algoritmo anónimo gregoriano): de ahí salen Carnaval y Semana Santa */
export function pascua(año: number): string {
  const a = año % 19;
  const b = Math.floor(año / 100);
  const c = año % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export interface Feriado { fecha: string; nombre: string }

/** Los feriados de Venezuela de un año: los de la LOTTT (art. 184, con el 24 y el 31 de diciembre) y los de la Ley de Fiestas Nacionales */
export function feriadosDelAño(año: number): Feriado[] {
  const p = pascua(año);
  const fijo = (mmdd: string, nombre: string): Feriado => ({ fecha: `${año}-${mmdd}`, nombre });
  return [
    fijo('01-01', 'Año Nuevo'),
    { fecha: sumarDias(p, -48), nombre: 'Lunes de Carnaval' },
    { fecha: sumarDias(p, -47), nombre: 'Martes de Carnaval' },
    { fecha: sumarDias(p, -3), nombre: 'Jueves Santo' },
    { fecha: sumarDias(p, -2), nombre: 'Viernes Santo' },
    fijo('04-19', 'Declaración de la Independencia'),
    fijo('05-01', 'Día del Trabajador'),
    fijo('06-24', 'Batalla de Carabobo'),
    fijo('07-05', 'Día de la Independencia'),
    fijo('07-24', 'Natalicio de Simón Bolívar'),
    fijo('10-12', 'Día de la Resistencia Indígena'),
    fijo('12-24', 'Nochebuena'),
    fijo('12-25', 'Navidad'),
    fijo('12-31', 'Fin de año'),
  ].sort((x, y) => x.fecha.localeCompare(y.fecha));
}

const cacheFeriados = new Map<number, Set<string>>();
function esFeriado(fecha: string): boolean {
  const año = Number(fecha.slice(0, 4));
  let set = cacheFeriados.get(año);
  if (!set) {
    set = new Set(feriadosDelAño(año).map((f) => f.fecha));
    cacheFeriados.set(año, set);
  }
  return set.has(fecha);
}

/** Un día en que la tienda despacha: de lunes a viernes, sin feriado (salvo que el equipo lo abra) ni día cerrado */
export function esDiaHabil(fecha: string, cal: Calendario): boolean {
  const dia = diaSemanaDe(fecha);
  if (dia === 0 || dia === 6) return false;
  if (cal.diasCerrados.includes(fecha)) return false;
  return !esFeriado(fecha) || cal.diasAbiertos.includes(fecha);
}

/** El primer día hábil después de `fecha` (nunca la misma) */
export function siguienteDiaHabil(fecha: string, cal: Calendario): string {
  let f = sumarDias(fecha, 1);
  for (let i = 0; i < 60 && !esDiaHabil(f, cal); i++) f = sumarDias(f, 1);
  return f;
}

export function minutosDeCorte(cal: Calendario): number {
  const [h, m] = cal.horaCorte.split(':').map(Number);
  const minutos = h * 60 + m;
  return Number.isFinite(minutos) && minutos > 0 && minutos < 24 * 60 ? minutos : 14 * 60;
}

/**
 * El día en que sale un paquete pagado en `pagadoEl`. Pagado un día hábil antes del corte: ese día; si no, el siguiente
 * día hábil. `diasProveedor`: los días hábiles de más de quien despacha (0 la tienda; 1 un proveedor, decidido el 14/11).
 */
export function fechaDeSalida(pagadoEl: Date, cal: Calendario, diasProveedor = 0): string {
  const { fecha, minutos } = enVenezuela(pagadoEl);
  let salida = esDiaHabil(fecha, cal) && minutos < minutosDeCorte(cal) ? fecha : siguienteDiaHabil(fecha, cal);
  for (let i = 0; i < diasProveedor; i++) salida = siguienteDiaHabil(salida, cal);
  return salida;
}

/** Los minutos que faltan para el corte de hoy, si hoy se despacha y todavía no pasó. null si no */
export function minutosParaElCorte(ahora: Date, cal: Calendario): number | null {
  const { fecha, minutos } = enVenezuela(ahora);
  if (!esDiaHabil(fecha, cal)) return null;
  const faltan = minutosDeCorte(cal) - minutos;
  return faltan > 0 ? faltan : null;
}

/* ── Cómo se dice ───────────────────────────────────────────────────────── */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "el lunes 16 de noviembre" */
export function fechaLarga(fecha: string): string {
  const d = aFecha(fecha);
  return `el ${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

/** "hoy", "mañana", "el lunes 16" (este mes y esta semana) o "el lunes 16 de noviembre". `largo`: siempre con el mes */
export function cuandoSale(fecha: string, ahora: Date, largo = false): string {
  const hoy = enVenezuela(ahora).fecha;
  if (!largo && fecha === hoy) return 'hoy';
  if (!largo && fecha === sumarDias(hoy, 1)) return 'mañana';
  const d = aFecha(fecha);
  const cerca = fecha.slice(0, 7) === hoy.slice(0, 7) && aFecha(fecha).getTime() - aFecha(hoy).getTime() < 7 * DIA_MS;
  return largo || !cerca ? fechaLarga(fecha) : `el ${DIAS[d.getUTCDay()]} ${d.getUTCDate()}`;
}

/** "2 h 15 min", "45 min", "1 h" */
export function duracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${Math.max(1, m)} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * Lo que dicen la ficha y el carrito antes de comprar (la decisión 6 del 14/11): "Compra en las próximas 2 h 15 min y sale
 * hoy" mientras hoy se despacha y no pasó el corte; si no, "Compra hoy y sale el lunes 16".
 */
export function mensajeDeSalida(ahora: Date, cal: Calendario, diasProveedor = 0): { texto: string; fecha: string; conCuenta: boolean } {
  const fecha = fechaDeSalida(ahora, cal, diasProveedor);
  const faltan = minutosParaElCorte(ahora, cal);
  return faltan !== null
    ? { texto: `Compra en las próximas ${duracion(faltan)} y sale ${cuandoSale(fecha, ahora)}`, fecha, conCuenta: true }
    : { texto: `Compra hoy y sale ${cuandoSale(fecha, ahora)}`, fecha, conCuenta: false };
}

/** "Sale hoy", "Sale el lunes 16 de noviembre": el checkout, Mi pedido y los correos, ya con el pago hecho */
export function textoSalida(fecha: string, ahora: Date, largo = false): string {
  const cuando = cuandoSale(fecha, ahora, largo);
  return `Sale ${cuando}`;
}

const CLAVES_DIA = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
type HorarioAtencion = Record<string, { open: string; close: string; enabled: boolean }> | null | undefined;
const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * Lo digital (códigos y recargas que compra el equipo a mano) llega en el horario de atención: "en minutos" si la tienda
 * está atendiendo; si no, "al abrir: el lunes a las 9:00". Los feriados y los días cerrados no atienden.
 */
export function entregaDigital(ahora: Date, horario: HorarioAtencion, cal: Calendario): { ahora: boolean; texto: string } {
  if (!horario) return { ahora: true, texto: 'Te llega en minutos, en el horario de atención' };
  const { fecha, minutos, diaSemana } = enVenezuela(ahora);
  const atiende = (f: string, dia: number) => {
    const h = horario[CLAVES_DIA[dia]];
    const cerrado = cal.diasCerrados.includes(f) || (esFeriado(f) && !cal.diasAbiertos.includes(f));
    return h?.enabled && !cerrado ? h : null;
  };
  const hoy = atiende(fecha, diaSemana);
  if (hoy && minutos >= aMinutos(hoy.open) && minutos < aMinutos(hoy.close)) return { ahora: true, texto: 'Te llega en minutos' };
  for (let i = hoy && minutos < aMinutos(hoy.open) ? 0 : 1; i <= 14; i++) {
    const f = sumarDias(fecha, i);
    const h = atiende(f, diaSemanaDe(f));
    if (h) return { ahora: false, texto: `Te llega al abrir: ${i === 0 ? 'hoy' : i === 1 ? 'mañana' : cuandoSale(f, ahora)} a las ${h.open.replace(/^0/, '')}` };
  }
  return { ahora: false, texto: 'Te llega al abrir' };
}
