// Íconos de línea de ElectroStudio (C-112), en una grilla de 24 unidades. El canvas los dibuja con Path2D y el
// editor los muestra como SVG, así el ícono que se elige es el mismo que sale en la historia.

const R_ = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
const C_ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 -${2 * r} 0z`;

export const ICON_PATHS: Record<string, string[]> = {
  check: [C_(12, 12, 10), 'm8.5 12 2.5 2.5 4.5-5'],
  chip: [R_(4, 4, 16, 16, 2), R_(9, 9, 6, 6, 1), 'M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2'],
  memoria: ['M6 22a2 2 0 0 1-2-2V6l4-4h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2z', 'M9 6v4M12.5 6v4M16 6v4'],
  disco: ['M22 12H2', 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z', 'M6 16h.01M10 16h.01'],
  velocidad: ['m12 14 4-4', 'M3.34 19a10 10 0 1 1 17.32 0'],
  teclado: [R_(2, 4, 20, 16, 2), 'M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10'],
  luz: [C_(12, 12, 4), 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41'],
  bateria: [R_(2, 6, 16, 12, 2), 'M22 14v-4', 'M6 10v4M10 10v4M14 10v4'],
  camara: ['M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z', C_(12, 13, 3)],
  pantalla: [R_(2, 3, 20, 14, 2), 'M8 21h8M12 17v4'],
  wifi: ['M12 20h.01', 'M2 8.82a15 15 0 0 1 20 0', 'M5 12.86a10 10 0 0 1 14 0', 'M8.5 16.43a5 5 0 0 1 7 0'],
  escudo: [
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    'm9 12 2 2 4-4',
  ],
  tarjeta: [R_(2, 5, 20, 14, 2), 'M2 10h20', 'M6 15h4'],
  control: [
    'M6 11h4M8 9v4M15 12h.01M18 10h.01',
    'M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.54-.6-6.58-.69-7.26A4 4 0 0 0 17.32 5z',
  ],
  rayo: ['M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'],
  camion: ['M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2', 'M15 18H9', 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14', C_(17, 18, 2), C_(7, 18, 2)],
  movil: [R_(5, 2, 14, 20, 2), 'M12 18h.01', 'M9 7.5h6M13 5.5l2 2-2 2', 'M15 12.5H9M11 10.5l-2 2 2 2'],
  cripto: [C_(8, 8, 6), 'M18.09 10.37A6 6 0 1 1 10.34 18', 'M7 6h1v4', 'M16.71 13.88l.7.71-2.82 2.82'],
  billetera: ['M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1', 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4'],
  billete: [R_(2, 6, 20, 12, 2), C_(12, 12, 2), 'M6 12h.01M18 12h.01'],
  banco: ['M3 22h18', 'M6 18v-7M10 18v-7M14 18v-7M18 18v-7', 'M12 2l8 5H4z'],
  chat: ['M7.9 20A9 9 0 1 0 4 16.1L2 22z', 'M8 12h.01M12 12h.01M16 12h.01'],
  tasa: ['M8 3 4 7l4 4', 'M4 7h16', 'm16 21 4-4-4-4', 'M20 17H4'],
  regalo: [R_(3, 8, 18, 4, 1), 'M12 8v13', 'M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7', 'M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5'],
  estrella: [
    'M11.53 2.3a.53.53 0 0 1 .95 0l2.31 4.68a2.12 2.12 0 0 0 1.6 1.16l5.17.76a.53.53 0 0 1 .29.9l-3.74 3.64a2.12 2.12 0 0 0-.61 1.88l.88 5.14a.53.53 0 0 1-.77.56l-4.62-2.43a2.12 2.12 0 0 0-1.97 0L6.4 21.02a.53.53 0 0 1-.77-.56l.88-5.14a2.12 2.12 0 0 0-.61-1.88L2.16 9.8a.53.53 0 0 1 .29-.9l5.17-.76a2.12 2.12 0 0 0 1.6-1.16z',
  ],
  reloj: [C_(12, 12, 10), 'M12 6v6l4 2'],
  ubicacion: ['M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0', C_(12, 10, 3)],
};

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
  ['wifi', 'WiFi'],
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
  [/wifi|bluetooth|inal[aá]mbric|conectividad/i, 'wifi'],
  [/garant[ií]a/i, 'escudo'],
  [/potencia|watt|energ|voltaje/i, 'rayo'],
];

export function guessSpecIcon(label: string): string {
  for (const [re, ic] of SPEC_GUESS) if (re.test(label)) return ic;
  return 'check';
}
