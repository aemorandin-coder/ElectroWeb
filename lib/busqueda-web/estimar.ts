import { clave } from './texto';
import { redondear, type Medidas } from './unidades';

// Medidas y peso estimados de la caja (C-155). Módulo puro.
// Decisión de Andrés del 01/10: si la búsqueda no encuentra las medidas, propone un estimado, marcado como tal.
// Desde C-153 las medidas deciden el empaque que se cobra: un estimado siempre se muestra como estimado y se
// comprueba con la caja real.

export interface Estimado {
  medidas: Medidas;
  pesoKg: number;
  /** A qué tipo de producto se parece, para decirlo en pantalla */
  tipo: string;
}

/** Caja típica por tipo de producto: largo, ancho y alto en cm, y peso en kg. La primera que coincide gana */
const TIPOS: Array<{ tipo: string; palabras: RegExp; caja: [number, number, number]; kg: number }> = [
  { tipo: 'memoria USB o tarjeta de memoria', palabras: /pendrive|pen drive|memoria usb|usb flash|flash drive|microsd|micro sd|tarjeta de memoria|tarjeta sd/, caja: [10, 7, 1.5], kg: 0.03 },
  { tipo: 'disco SSD M.2', palabras: /\bm 2\b|nvme/, caja: [12, 8, 2], kg: 0.05 },
  { tipo: 'disco SSD de 2,5 pulgadas', palabras: /\bssd\b|estado solido|solid state/, caja: [13, 10, 2], kg: 0.08 },
  { tipo: 'disco duro externo', palabras: /disco duro|disco externo|hard drive|\bhdd\b/, caja: [15, 11, 4], kg: 0.3 },
  { tipo: 'memoria RAM', palabras: /\bram\b|\bddr\d?\b|\bdimm\b/, caja: [16, 5, 2], kg: 0.06 },
  { tipo: 'audífonos de diadema', palabras: /headset|diadema|over ear|on ear|circumaural|supraaural/, caja: [22, 20, 10], kg: 0.45 },
  { tipo: 'audífonos inalámbricos con estuche', palabras: /\btws\b|true wireless|earbuds|\bbuds\b|airpods/, caja: [10, 10, 4], kg: 0.12 },
  { tipo: 'audífonos intraurales', palabras: /audifono|auricular|in ear|headphone|earphone|manos libres|piston/, caja: [12, 9, 4], kg: 0.08 },
  { tipo: 'teclado', palabras: /teclado|keyboard/, caja: [46, 17, 5], kg: 0.9 },
  { tipo: 'mouse', palabras: /mouse|raton/, caja: [15, 11, 6], kg: 0.18 },
  { tipo: 'alfombrilla', palabras: /mousepad|mouse pad|alfombrilla/, caja: [35, 8, 8], kg: 0.3 },
  { tipo: 'control de videojuegos', palabras: /control|gamepad|joystick|mando/, caja: [18, 16, 8], kg: 0.4 },
  { tipo: 'consola', palabras: /consola|playstation|xbox|nintendo switch/, caja: [42, 34, 14], kg: 4.5 },
  { tipo: 'laptop', palabras: /laptop|portatil|notebook|macbook/, caja: [48, 33, 8], kg: 2.8 },
  { tipo: 'monitor', palabras: /monitor/, caja: [62, 42, 14], kg: 5 },
  { tipo: 'tablet', palabras: /tablet|ipad/, caja: [28, 19, 5], kg: 0.8 },
  { tipo: 'teléfono', palabras: /celular|telefono|smartphone|iphone/, caja: [18, 10, 6], kg: 0.4 },
  { tipo: 'reloj inteligente', palabras: /smartwatch|reloj inteligente|smart band|\bband\b/, caja: [10, 10, 8], kg: 0.2 },
  { tipo: 'batería portátil', palabras: /power ?bank|bateria portatil|bateria externa/, caja: [16, 9, 3], kg: 0.3 },
  { tipo: 'cargador', palabras: /cargador|charger|adaptador de corriente|fuente de poder/, caja: [10, 8, 5], kg: 0.15 },
  { tipo: 'cable o adaptador', palabras: /cable|adaptador|adapter|convertidor|\bhub\b/, caja: [15, 10, 3], kg: 0.08 },
  { tipo: 'router', palabras: /router|enrutador|repetidor|access point|wifi|wi fi/, caja: [30, 22, 8], kg: 0.6 },
  { tipo: 'parlante', palabras: /parlante|corneta|speaker|altavoz|bocina/, caja: [22, 12, 12], kg: 0.8 },
  { tipo: 'cámara web', palabras: /webcam|camara web/, caja: [12, 10, 8], kg: 0.2 },
  { tipo: 'cámara', palabras: /camara|camera/, caja: [15, 12, 10], kg: 0.4 },
  { tipo: 'micrófono', palabras: /microfono|microphone/, caja: [25, 12, 10], kg: 0.7 },
  { tipo: 'impresora', palabras: /impresora|printer/, caja: [45, 38, 25], kg: 6 },
];

/** Un estimado por el tipo de producto, o null si no se parece a ninguno conocido */
export function estimarPorTipo(nombre: string, categoria: string): Estimado | null {
  // El nombre dice más que la categoría ("Accesorios" no dice nada): se prueba primero
  for (const texto of [clave(nombre), clave(categoria)]) {
    const t = TIPOS.find((x) => x.palabras.test(texto));
    if (t) return { medidas: { largo: t.caja[0], ancho: t.caja[1], alto: t.caja[2] }, pesoKg: t.kg, tipo: t.tipo };
  }
  return null;
}

/**
 * La caja a partir del producto sin empacar: 2 cm más por lado (mínimo 2 cm de alto) y el peso con un 25 % más
 * (mínimo 30 g de cartón y bolsa). Es un estimado.
 */
export function cajaDesdeProducto(producto: Medidas | null, pesoKg: number | null): { medidas: Medidas | null; pesoKg: number | null } {
  return {
    medidas: producto
      ? { largo: redondear(producto.largo + 2, 1), ancho: redondear(producto.ancho + 2, 1), alto: redondear(Math.max(producto.alto + 2, 2), 1) }
      : null,
    pesoKg: pesoKg ? redondear(Math.max(pesoKg * 1.25, pesoKg + 0.03), 3) : null,
  };
}
