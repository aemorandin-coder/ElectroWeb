// C-279: la recepción del Dashboard (el saludo, la frase del día, los pasos y el pulso) y "Lo que viene", armados en el
// servidor con los datos de la base. Módulo puro: recibe los datos y la hora, y devuelve solo textos y cifras (nada personal).
import { formatUSD } from '@/lib/currency';
import { type Calendario, cuandoSale, duracion, enVenezuela, esDiaHabil, fechaDeSalida, minutosDeCorte, minutosParaElCorte } from '@/lib/horarios';
import type { DashboardData } from '@/lib/queries/dashboard';
import type { DatosSorteo } from './datos';
import { pendientesDe } from './pendientes';

/** Un trozo de la frase; `fuerte` va en negrita */
export interface ParteFrase { texto: string; fuerte?: boolean }

export interface PasoDelDia {
  id: string;
  texto: string;
  icono: string;
  cuenta?: number;
  /** A dónde lleva; con `widget`, baja hasta esa tarjeta si está puesta (si no, va a `href`) */
  href: string;
  widget?: string;
}

export interface DatosRecepcion {
  fecha: string;
  saludo: string;
  frase: ParteFrase[];
  pasos: PasoDelDia[];
  tasa: { valor: number; automatica: boolean } | null;
  corte: { hora: string; texto: string };
  /** La fila de quién está en la tienda (en vivo), con permiso de Reportes */
  verVisitantes: boolean;
}

const DIA_MS = 24 * 60 * 60 * 1000;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "14:00" → "2:00 p. m." */
export function horaLegible(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const hora = h % 12 === 0 ? 12 : h % 12;
  return `${hora}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'p. m.' : 'a. m.'}`;
}

/** Días de `desde` a `hasta` (AAAA-MM-DD) */
export const diasEntre = (desde: string, hasta: string) => Math.round((new Date(`${hasta}T12:00:00Z`).getTime() - new Date(`${desde}T12:00:00Z`).getTime()) / DIA_MS);

/** "2 pagos por confirmar", "1 mensaje": con `y` antes del último */
function unir(partes: ParteFrase[]): ParteFrase[] {
  const salida: ParteFrase[] = [];
  partes.forEach((p, i) => {
    if (i > 0) salida.push({ texto: i === partes.length - 1 ? ' y ' : ', ' });
    salida.push(p);
  });
  return salida;
}

/** El corte de despachos de hoy: a qué hora y cuánto falta, o cuándo sale lo que se pague ahora */
export function corteDeHoy(ahora: Date, cal: Calendario): { hora: string; texto: string; faltan: number | null; sale: string } {
  const faltan = minutosParaElCorte(ahora, cal);
  const sale = cuandoSale(fechaDeSalida(ahora, cal), ahora);
  const minutos = minutosDeCorte(cal);
  const hora = horaLegible(`${Math.floor(minutos / 60)}:${minutos % 60}`);
  return { hora, faltan, sale, texto: faltan !== null ? `Faltan ${duracion(faltan)} para despachar hoy` : `Lo pagado ahora sale ${sale}` };
}

export function armarRecepcion(entrada: {
  ahora: Date;
  nombre: string | null | undefined;
  puede: (permiso: string) => boolean;
  datos: Pick<DashboardData, 'porAtender' | 'ventas' | 'tienda'>;
  sorteo: DatosSorteo | null;
  tasa: { valor: number; automatica: boolean } | null;
  calendario: Calendario;
  /** El primer pago por confirmar, para ir directo a esa orden */
  primerPago?: string | null;
}): DatosRecepcion {
  const { ahora, puede, datos, sorteo } = entrada;
  const { fecha: hoy, minutos } = enVenezuela(ahora);
  const hora = Math.floor(minutos / 60);
  const nombre = (entrada.nombre ?? '').trim().split(/\s+/)[0]?.slice(0, 24);
  const saludo = `${hora < 12 ? '¡Buenos días' : hora < 19 ? '¡Buenas tardes' : '¡Buenas noches'}${nombre ? `, ${nombre}` : ''}!`;
  const fecha = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', weekday: 'long', day: 'numeric', month: 'long' }).format(ahora);

  const pendientes = pendientesDe(datos.porAtender, puede);
  const urgentes = pendientes.filter((p) => p.urgente);
  const frase: ParteFrase[] = [];
  if (urgentes.length > 0) {
    frase.push({ texto: 'Te toca: ' });
    frase.push(...unir(urgentes.map((p) => ({ texto: p.cantidad === 1 ? p.cortoUno : `${p.cantidad} ${p.cortoVarios}`, fuerte: true }))));
    frase.push({ texto: '. Lo demás está al día.' });
  } else if (datos.ventas.hoyOrdenes > 0) {
    frase.push({ texto: '¡Venta cobrada! Hoy llevas ' }, { texto: formatUSD(datos.ventas.hoyUSD), fuerte: true }, { texto: ' y el mes va en ' }, { texto: formatUSD(datos.ventas.mesUSD), fuerte: true }, { texto: '.' });
  } else {
    frase.push({ texto: 'Todo al día: ' }, { texto: 'ningún pago ni pedido te espera', fuerte: true }, { texto: '.' });
  }
  const diasSorteo = sorteo ? diasEntre(hoy, sorteo.resultado) : null;
  if (diasSorteo !== null && diasSorteo >= 0) {
    if (diasSorteo === 0) frase.push({ texto: ' ' }, { texto: 'Hoy', fuerte: true }, { texto: ' es el sorteo.' });
    else frase.push({ texto: diasSorteo === 1 ? ' Falta ' : ' Faltan ' }, { texto: diasSorteo === 1 ? '1 día' : `${diasSorteo} días`, fuerte: true }, { texto: ' para el sorteo.' });
  }

  // Los pasos del día: primero lo que espera (con su número), después crear, completar y el sorteo. Tres como mucho
  const pasos: PasoDelDia[] = [];
  for (const p of pendientes) {
    if (!p.paso) continue;
    const href = p.clave === 'pagosPorConfirmar' && p.cantidad === 1 && entrada.primerPago ? `/admin/orders?orden=${encodeURIComponent(entrada.primerPago)}` : p.href;
    pasos.push({ id: p.clave, texto: p.cantidad === 1 ? p.paso.uno : p.paso.varios, icono: p.icono, cuenta: p.cantidad, href, widget: p.urgente ? 'por-atender' : undefined });
  }
  if (puede('MANAGE_CONTENT')) pasos.push({ id: 'historia', texto: sorteo ? 'Crear la historia del sorteo' : 'Crear una historia', icono: 'Claqueta', href: '/admin/studio/nueva' });
  if (datos.tienda.length > 0) pasos.push({ id: 'tienda', texto: 'Completar la tienda', icono: 'Tienda', cuenta: datos.tienda.length, href: datos.tienda[0].href, widget: 'tienda' });
  if (sorteo && puede('MANAGE_CONTENT')) pasos.push({ id: 'sorteo', texto: 'Ver el sorteo', icono: 'Premio', href: '/admin/marketing#sorteo', widget: 'sorteo' });
  if (pasos.length === 0) pasos.push({ id: 'ordenes', texto: 'Ver las órdenes', icono: 'Ordenes', href: '/admin/orders' });

  const corte = corteDeHoy(ahora, entrada.calendario);
  return {
    fecha, saludo, frase, pasos: pasos.slice(0, 3), tasa: entrada.tasa,
    corte: { hora: corte.hora, texto: corte.texto }, verVisitantes: puede('VIEW_REPORTS'),
  };
}

export interface FechaQueViene { id: string; fecha: string; titulo: string; detalle: string; icono: string; dias: number; hoy?: boolean; hora?: string }

/** "Lo que viene": el corte de hoy, los impuestos del mes (con permiso de Contabilidad) y las fechas del sorteo */
export function loQueViene(ahora: Date, cal: Calendario, sorteo: DatosSorteo | null, verContabilidad: boolean): FechaQueViene[] {
  const hoy = enVenezuela(ahora).fecha;
  const corte = corteDeHoy(ahora, cal);
  const salida: FechaQueViene[] = [{
    id: 'corte', fecha: hoy, dias: 0, hoy: true, icono: 'Envio', hora: corte.hora,
    titulo: esDiaHabil(hoy, cal) ? 'Corte de despachos' : 'Hoy no se despacha',
    detalle: corte.faltan !== null ? `Lo pagado antes de las ${corte.hora} sale hoy` : `Lo de ahora sale ${corte.sale}`,
  }];
  // Cada mes, la alcaldía vence el 10 y el IVA el 15 (lo dice la mesa de la contadora)
  const proximo = (dia: number) => {
    const [a, mes] = hoy.split('-').map(Number);
    const este = `${a}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    if (este >= hoy) return este;
    const sig = mes === 12 ? `${a + 1}-01` : `${a}-${String(mes + 1).padStart(2, '0')}`;
    return `${sig}-${String(dia).padStart(2, '0')}`;
  };
  if (verContabilidad) {
    const alcaldia = proximo(10);
    const iva = proximo(15);
    const mesIva = Number(iva.slice(5, 7)) - 2; // el IVA del 15 es del mes anterior
    salida.push({ id: 'alcaldia', fecha: alcaldia, dias: diasEntre(hoy, alcaldia), icono: 'Documento', titulo: 'La alcaldía', detalle: 'Vence la declaración del mes' });
    salida.push({ id: 'iva', fecha: iva, dias: diasEntre(hoy, iva), icono: 'Maletin', titulo: `El IVA de ${MESES[(mesIva + 12) % 12]}`, detalle: 'Lo declara la contadora' });
  }
  if (sorteo) {
    if (sorteo.hasta >= hoy) salida.push({ id: 'boletos', fecha: sorteo.hasta, dias: diasEntre(hoy, sorteo.hasta), icono: 'Cupon', titulo: 'Cierran los boletos', detalle: 'Cuentan las compras hasta este día' });
    if (sorteo.resultado >= hoy) salida.push({ id: 'ganador', fecha: sorteo.resultado, dias: diasEntre(hoy, sorteo.resultado), icono: 'Premio', titulo: 'Sale el ganador', detalle: `${sorteo.titulo}: ${sorteo.premio}` });
  }
  return salida.sort((a, b) => (a.hoy ? -1 : b.hoy ? 1 : a.fecha.localeCompare(b.fecha)));
}

/** El periodo del sorteo: qué día es de cuántos y el avance */
export function periodoDelSorteo(ahora: Date, sorteo: DatosSorteo): { dia: number; total: number; pct: number } {
  const hoy = enVenezuela(ahora).fecha;
  const total = Math.max(1, diasEntre(sorteo.desde, sorteo.hasta) + 1);
  const dia = Math.min(total, Math.max(1, diasEntre(sorteo.desde, hoy) + 1));
  return { dia, total, pct: Math.round((dia / total) * 100) };
}

/** "18 dic" */
export function fechaCorta(fecha: string): string {
  const [, mes, dia] = fecha.split('-').map(Number);
  return `${dia} ${MESES[mes - 1].slice(0, 3)}`;
}

/** "20 de diciembre" */
export function fechaConMes(fecha: string): string {
  const [, mes, dia] = fecha.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]}`;
}

