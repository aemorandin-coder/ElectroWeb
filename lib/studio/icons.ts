// Íconos de ElectroStudio (C-112; desde C-193, los del pack propio de Electro Shop). El canvas los dibuja con Path2D y el
// editor los muestra como SVG (StudioIcon), así el ícono que se elige es el mismo que sale en la historia.
// Los dibujos están en ./iconos-pack.ts, generado desde components/iconos con scripts/studio-iconos.py.
import { ICONOS_PACK, type PiezaIcono } from './iconos-pack';

export type { PiezaIcono };

/** Las piezas de un ícono; si el nombre no existe (una historia vieja), el de "check". */
export function piezasIcono(name: string): PiezaIcono[] {
  return ICONOS_PACK[name] || ICONOS_PACK.check;
}

/** Íconos que se pueden elegir para una característica o de fondo en un mensaje. */
export const SPEC_ICONS: [string, string][] = [
  ['check', 'Check'],
  ['chip', 'Chip / RAM'],
  ['memoria', 'Memoria'],
  ['disco', 'Disco'],
  ['velocidad', 'Velocidad'],
  ['teclado', 'Teclado'],
  ['luz', 'Luz / RGB'],
  ['bateria', 'Batería'],
  ['camara', 'Cámara'],
  ['pantalla', 'Pantalla'],
  ['wifi', 'WiFi / inalámbrico'],
  ['cable', 'Cable / USB'],
  ['escudo', 'Garantía'],
  ['tarjeta', 'Tarjeta'],
  ['control', 'Control'],
  ['rayo', 'Energía'],
];

const PAY_ICON: [RegExp, string][] = [
  [/m[oó]vil|pago\s*m/i, 'movil'],
  [/binance|usdt|cripto|crypto|bitcoin/i, 'cripto'],
  [/paypal|zelle|zinli|wally/i, 'billetera'],
  [/efectivo|cash|d[oó]lares/i, 'billete'],
  [/transfer|banco|bancaria/i, 'banco'],
  [/tarjeta|punto|pos|d[eé]bito|cr[eé]dito/i, 'tarjeta'],
];

export function payIcon(label: string): string {
  for (const [re, ic] of PAY_ICON) if (re.test(label)) return ic;
  return 'billetera';
}

/** Ícono sugerido para una característica de la ficha ("Memoria RAM" → chip). */
const SPEC_GUESS: [RegExp, string][] = [
  [/ram|procesador|cpu|chip|n[uú]cleo/i, 'chip'],
  [/almacenamiento|capacidad|ssd|hdd|disco|rom/i, 'disco'],
  [/memoria/i, 'memoria'],
  [/velocidad|frecuencia|ghz|mhz|hz|rpm|dpi/i, 'velocidad'],
  [/teclado|switch|tecla/i, 'teclado'],
  [/rgb|luz|ilumina|led/i, 'luz'],
  [/bater[ií]a|mah|autonom|carga/i, 'bateria'],
  [/c[aá]mara|mp|megap/i, 'camara'],
  [/pantalla|resoluci|pulgada|display|monitor/i, 'pantalla'],
  [/usb|cable|\bal[aá]mbric/i, 'cable'],
  [/wifi|bluetooth|inal[aá]mbric|conectividad/i, 'wifi'],
  [/garant[ií]a/i, 'escudo'],
  [/potencia|watt|energ|voltaje/i, 'rayo'],
];

export function guessSpecIcon(label: string): string {
  for (const [re, ic] of SPEC_GUESS) if (re.test(label)) return ic;
  return 'check';
}
