import { nombreLegible } from '@/lib/spec-sugerencias';
import type { Par } from './extraer';
import { clave } from './texto';
import { comoTexto, leerMedidas, leerPeso, redondear } from './unidades';

// De las fichas de otras páginas a especificaciones de la tienda (C-155). Módulo puro.
// - Cada etiqueta se lleva al nombre que usa la tienda ("Tecnología de conectividad" y "Connectivity" → "Conexión"),
//   para que la ficha quede escrita igual que las demás (C-136).
// - Lo que no es del producto (precio, opiniones, códigos de la tienda de origen) se descarta.
// - De una página que no está en español solo pasan los valores que no hay que traducir (números, siglas) o los que
//   tienen traducción directa (colores, sí y no).

const NOMBRES: Array<[string, RegExp]> = [
  ['Modelo', /^(modelo|model|numero de modelo|model number|nombre del modelo|nombre modelo|model name)$/],
  ['Color', /^(color|colour|colores|colors)$/],
  ['Tipo', /^(tipo|type|tipo de producto|product type)$/],
  ['Formato', /^(formato|factor de forma|form factor)$/],
  ['Conexión', /^(conexion|conectividad|connectivity|tecnologia de conectividad|tecnologia de conexion|connectivity technology|tipo de conexion|connection|connection type)$/],
  ['Conector', /^(conector|connector|tipo de conector|connector type|clavija|plug)$/],
  ['Interfaz', /^(interfaz|interface|interfaz del disco duro|hardware interface)$/],
  ['Capacidad', /^(capacidad|capacity|capacidad de almacenamiento|storage capacity|capacidad de almacenamiento digital|capacidad de almacenamiento de memoria)$/],
  ['Almacenamiento', /^(almacenamiento|storage|almacenamiento interno|memoria interna|internal storage)$/],
  ['RAM', /^(ram|memoria ram|memory|tamano de memoria ram)$/],
  ['Procesador', /^(procesador|processor|cpu|modelo de cpu|cpu model)$/],
  ['Pantalla', /^(pantalla|tamano de pantalla|tamano de la pantalla|screen size|display|display size)$/],
  ['Resolución', /^(resolucion|resolution|resolucion de pantalla|screen resolution)$/],
  ['Sistema operativo', /^(sistema operativo|operating system|os)$/],
  ['Tarjeta de video', /^(tarjeta de video|tarjeta grafica|graphics|gpu|graphics card)$/],
  ['Batería', /^(bateria|battery|capacidad de la bateria|battery capacity|duracion de la bateria|battery life|autonomia)$/],
  ['Micrófono', /^(microfono|microphone|mic|remote mic)$/],
  ['Largo del cable', /^(largo del cable|longitud del cable|longitud de cable|cable length|wire length|cord length)$/],
  ['Impedancia', /^(impedancia|impedance)$/],
  ['Sensibilidad', /^(sensibilidad|sensitivity)$/],
  ['Respuesta de frecuencia', /^(respuesta de frecuencia|frequency response|rango de frecuencia|frequency range|respuesta en frecuencia)$/],
  ['Material', /^(material|materiales|materials)$/],
  ['Iluminación', /^(iluminacion|retroiluminacion|backlight|backlit|luz de fondo|tipo de iluminacion)$/],
  ['Switches', /^(switches|switch|tipo de interruptor|tipo de switch|switch type|interruptores)$/],
  ['Distribución', /^(distribucion|distribucion del teclado|layout|keyboard layout|idioma del teclado)$/],
  ['Número de teclas', /^(numero de teclas|cantidad de teclas|keys|number of keys|teclas)$/],
  ['Compatibilidad', /^(compatibilidad|compatible con|dispositivos compatibles|compatible devices|compatibility|plataformas compatibles)$/],
  ['Velocidad de lectura', /^(velocidad de lectura|read speed|lectura secuencial|sequential read|velocidad de lectura secuencial|lectura)$/],
  ['Velocidad de escritura', /^(velocidad de escritura|write speed|escritura secuencial|sequential write|velocidad de escritura secuencial|escritura)$/],
  ['Potencia', /^(potencia|power|potencia de salida|output power|vataje|wattage|potencia maxima)$/],
  ['Bluetooth', /^(bluetooth|version de bluetooth|bluetooth version|version bluetooth)$/],
  ['Cámara', /^(camara|camera|camara principal|camara trasera|rear camera)$/],
  ['Puertos', /^(puertos|ports|interfaces|numero de puertos)$/],
  ['Velocidad', /^(velocidad|speed|velocidad de transferencia|transfer rate|velocidad de transferencia de datos)$/],
  ['DPI', /^(dpi|resolucion del sensor|sensibilidad dpi|resolucion dpi)$/],
  ['Botones', /^(botones|cantidad de botones|numero de botones|buttons|number of buttons)$/],
  ['Controladores', /^(controladores|drivers|driver|tamano del controlador|driver size|diafragma)$/],
  ['Incluye', /^(incluye|contenido del paquete|contenido de la caja|que hay en la caja|in the box|package contents|box contents|componentes incluidos|included components)$/],
  ['Peso', /^(peso|weight|peso del producto|peso del articulo|item weight|peso neto)$/],
  ['Dimensiones', /^(dimensiones|dimensions|dimensiones del producto|product dimensions|medidas|tamano)$/],
];

/** Etiquetas que no describen el producto, o que la tienda guarda en su propio campo */
const DESCARTAR = /asin|clasificacion|ranking|opinion|precio|price|disponib|stock|envio|shipping|sku|referencia|fecha|date|vendedor|seller|garantia|warranty|devoluc|rating|valoraci|resena|review|numero de articulos|rango de edad|descatalogado|pais de origen|\b(upc|ean|gtin)\b|codigo|departamento|categoria|category|sitio|website|trace|\bid\b|marca|brand|fabricante|manufacturer|paquete|package|bruto|cantidad|quantity|unidades|pagos|cuotas|mas vendidos|best sellers/;

const VALORES_EN: Record<string, string> = {
  yes: 'Sí', no: 'No', black: 'Negro', white: 'Blanco', silver: 'Plata', gray: 'Gris', grey: 'Gris', red: 'Rojo', blue: 'Azul',
  green: 'Verde', pink: 'Rosa', gold: 'Dorado', purple: 'Morado', orange: 'Naranja', yellow: 'Amarillo',
  wired: 'Con cable', wireless: 'Inalámbrico', 'in ear': 'Intraurales', mechanical: 'Mecánico', aluminum: 'Aluminio', aluminium: 'Aluminio', plastic: 'Plástico',
};

/** El nombre que usa la tienda para esa etiqueta, o null si no se reconoce */
export function nombreDeTienda(etiqueta: string): string | null {
  const k = clave(etiqueta);
  return NOMBRES.find(([, patron]) => patron.test(k))?.[0] ?? null;
}

export interface EspecificacionHallada {
  nombre: string;
  valor: string;
  /** true si la etiqueta se reconoció (pesa más al elegir entre fuentes) */
  reconocida: boolean;
}

function valorLimpio(valor: string, enEspanol: boolean): string | null {
  const limpio = valor.replace(/\s+/g, ' ').replace(/^[-–—:\s]+|[-–—:;,\s]+$/g, '').trim();
  if (!limpio || limpio.length > 100 || limpio.split(' ').length > 16) return null;
  if (enEspanol) return limpio;
  const traducido = limpio
    .split(/\s*[\/,]\s*/)
    .map((parte) => VALORES_EN[clave(parte)] ?? null);
  if (traducido.every(Boolean)) return traducido.join(', ');
  // Números y siglas se leen igual en cualquier idioma: "480 GB", "SATA III", "20 Hz - 20 kHz"
  return /\d/.test(limpio) && !/[a-z]{6,}/i.test(limpio.replace(/\b(mm|cm|kg|hz|khz|ohm|ohms|gb|tb|mb|mah|rpm|dpi|usb|sata|type|tipo|pcie|nvme|ddr\d?|hdmi|bluetooth|wifi|led|rgb|mhz|ghz|ms)\b/gi, '')) ? limpio : null;
}

/** El valor escrito como en el resto de la tienda: "Alámbrico", "Cableado" y "wired" son "Con cable" */
function valorDeTienda(canonico: string | null, valor: string): string {
  const k = clave(valor);
  if (canonico === 'Conexión') {
    if (/^(alambric[oa]|cablead[oa]|con cable|wired|cable|por cable)$/.test(k)) return 'Con cable';
    if (/^(inalambric[oa]|wireless|sin cable)$/.test(k)) return 'Inalámbrica';
    if (k === 'usb') return 'USB';
  }
  return /^[a-záéíóúñ]/.test(valor) ? valor.charAt(0).toUpperCase() + valor.slice(1) : valor;
}

/** Las especificaciones de una página, con los nombres de la tienda. `idioma` es el que declara la página */
export function especificacionesDe(pares: Par[], idioma: string): EspecificacionHallada[] {
  const enEspanol = idioma === 'es' || idioma === '';
  const salida = new Map<string, EspecificacionHallada>();
  for (const par of pares) {
    const k = clave(par.nombre);
    const canonico = nombreDeTienda(par.nombre);
    if (!canonico && (DESCARTAR.test(k) || !enEspanol || k.split(' ').length > 4 || /\d{3,}/.test(k))) continue;
    let valor = valorLimpio(par.valor, enEspanol);
    // Peso y dimensiones del producto, siempre en gramos o kilos y en centímetros (hay fichas en libras y pulgadas)
    if (canonico === 'Peso') {
      const kg = leerPeso(par.valor);
      valor = kg ? (kg < 1 ? `${comoTexto(redondear(kg * 1000, 0))} g` : `${comoTexto(redondear(kg, 2))} kg`) : null;
    } else if (canonico === 'Dimensiones') {
      const m = leerMedidas(par.valor);
      valor = m ? `${comoTexto(m.largo)} × ${comoTexto(m.ancho)} × ${comoTexto(m.alto)} cm` : null;
    }
    if (!valor || /[¡!]/.test(valor)) continue;
    valor = valorDeTienda(canonico, valor);
    const nombre = canonico ?? nombreLegible(par.nombre);
    const id = clave(nombre);
    // La primera aparición gana: las fichas ponen arriba lo principal
    if (!salida.has(id)) salida.set(id, { nombre, valor, reconocida: Boolean(canonico) });
  }
  return [...salida.values()];
}
