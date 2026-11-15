// C-229: el talonario de facturas (la Serie A de la empresa y los que vengan): el número de cada factura, su control
// preimpreso y cuántas quedan. Módulo puro: lo usan el servidor, el panel y las pruebas. docs/plan/CONTABILIDAD.md §6.

export interface NumerosTalonario {
  serie: string;
  numeroDesde: number;
  numeroHasta: number;
  /** La próxima por usar */
  proximo: number;
  /** "00" en 00-000572 */
  controlSerie: string;
  controlDesde: number;
  controlHasta: number;
  estado?: string;
}

/** Cifras con que se escribe el número de factura: las del último, y por lo menos 4 ("0072"). */
export function cifrasFactura(t: Pick<NumerosTalonario, 'numeroHasta'>): number {
  return Math.max(4, String(t.numeroHasta).length);
}

/** "0072" */
export function numeroFactura(t: Pick<NumerosTalonario, 'numeroHasta'>, n: number): string {
  return String(n).padStart(cifrasFactura(t), '0');
}

/** El control preimpreso de la factura n: el talonario corre los dos rangos juntos (la 0072 lleva el 00-000572). */
export function numeroControl(t: Pick<NumerosTalonario, 'numeroDesde' | 'controlSerie' | 'controlDesde'>, n: number): string {
  return `${t.controlSerie}-${String(t.controlDesde + (n - t.numeroDesde)).padStart(6, '0')}`;
}

/** Cómo queda anotada en la orden y en el pedido del cliente (C-147, invoiceNumber): "A-0072". */
export function etiquetaFactura(serie: string | null | undefined, numeroTexto: string): string {
  return serie ? `${serie}-${numeroTexto}` : numeroTexto;
}

export function quedan(t: Pick<NumerosTalonario, 'numeroHasta' | 'proximo' | 'estado'>): number {
  if (t.estado && t.estado !== 'EN_USO') return 0;
  return Math.max(0, t.numeroHasta - t.proximo + 1);
}

export function usadas(t: Pick<NumerosTalonario, 'numeroDesde' | 'numeroHasta' | 'proximo'>): number {
  return Math.max(0, Math.min(t.proximo, t.numeroHasta + 1) - t.numeroDesde);
}

export const SERIE = /^[A-Z0-9]{1,3}$/;
export const SERIE_CONTROL = /^\d{2}$/;
const TOPE = 99_999_999;

/** Lo que está mal en un talonario que se carga, por campo. Vacío si está bien. */
export function problemasTalonario(t: NumerosTalonario): Partial<Record<keyof NumerosTalonario, string>> {
  const p: Partial<Record<keyof NumerosTalonario, string>> = {};
  const entero = (n: number) => Number.isInteger(n) && n >= 1 && n <= TOPE;
  if (!SERIE.test(t.serie)) p.serie = 'La serie: de 1 a 3 letras o números, como está impresa ("A").';
  if (!entero(t.numeroDesde)) p.numeroDesde = 'El primer número de factura del talonario.';
  if (!entero(t.numeroHasta) || t.numeroHasta < t.numeroDesde) p.numeroHasta = 'El último número: igual o mayor que el primero.';
  if (!entero(t.proximo) || t.proximo < t.numeroDesde || t.proximo > t.numeroHasta) p.proximo = 'La próxima por usar tiene que estar dentro del talonario.';
  if (!SERIE_CONTROL.test(t.controlSerie)) p.controlSerie = 'Las dos cifras antes del guion ("00").';
  if (!entero(t.controlDesde)) p.controlDesde = 'El primer número de control.';
  if (!entero(t.controlHasta) || t.controlHasta < t.controlDesde) p.controlHasta = 'El último número de control: igual o mayor que el primero.';
  else if (!p.numeroDesde && !p.numeroHasta && !p.controlDesde && t.controlHasta - t.controlDesde !== t.numeroHasta - t.numeroDesde) {
    p.controlHasta = `Tiene que haber un control por factura: ${t.numeroHasta - t.numeroDesde + 1} en los dos rangos.`;
  }
  return p;
}
