// Sugerencias de especificaciones por categoría (C-136). Módulo puro: lo usan la API y el asistente de productos.
//
// Andrés, 30/09: "rediseñar las etiquetas rápidas dependiendo de la categoría; hay productos que solo tienen 1".
// - Primero lo que ya usan los productos de esa categoría (nombres y valores más frecuentes): se aprende solo y
//   ayuda a escribir igual ("Conexión", no "CONEXION" en un producto y "Puerto" en otro).
// - Después una lista base según el tipo de categoría, para cuando todavía hay pocos productos.
// - Nada es obligatorio: un adaptador puede tener una sola especificación.

/** Listas base: la categoría se reconoce por palabras de su nombre. La primera que coincide gana. */
const BASE_POR_TIPO: Array<{ palabras: RegExp; nombres: string[] }> = [
  { palabras: /aud[ií]fono|audio|parlante|corneta|sonido|auricular/i, nombres: ['Tipo', 'Conexión', 'Micrófono', 'Batería', 'Largo del cable', 'Color'] },
  { palabras: /consola/i, nombres: ['Modelo', 'Almacenamiento', 'Edición', 'Incluye', 'Controles', 'Color'] },
  { palabras: /gaming|teclado|mouse|perif[eé]rico|control|headset/i, nombres: ['Tipo', 'Conexión', 'Iluminación', 'Switches', 'Tamaño', 'Distribución', 'Compatibilidad'] },
  { palabras: /componente|ssd|disco|memoria|ram|almacenamiento|procesador|tarjeta de video|fuente/i, nombres: ['Capacidad', 'Formato', 'Interfaz', 'Velocidad de lectura', 'Velocidad de escritura', 'Compatibilidad'] },
  { palabras: /laptop|computadora|port[aá]til|\bpc\b|notebook/i, nombres: ['Procesador', 'RAM', 'Almacenamiento', 'Pantalla', 'Tarjeta de video', 'Sistema operativo'] },
  { palabras: /celular|tel[eé]fono|smartphone|tablet/i, nombres: ['Pantalla', 'Almacenamiento', 'RAM', 'Cámara', 'Batería', 'Color'] },
  { palabras: /adaptador|cable|cargador|miscel|hub|convertidor/i, nombres: ['Conector', 'Largo del cable', 'Potencia', 'Carga rápida', 'Compatibilidad', 'Color'] },
  { palabras: /red|router|wifi|wi-fi|switch/i, nombres: ['Velocidad', 'Bandas', 'Puertos', 'Cobertura', 'Antenas'] },
  { palabras: /c[aá]mara|seguridad|vigilancia/i, nombres: ['Resolución', 'Visión nocturna', 'Almacenamiento', 'Conexión', 'Uso'] },
  { palabras: /software|licencia|antivirus|office|windows/i, nombres: ['Plataforma', 'Duración', 'Dispositivos', 'Región'] },
];

/** Para cualquier producto */
const BASE_GENERAL = ['Marca', 'Modelo', 'Color', 'Garantía del fabricante'];

export const MAX_SUGERENCIAS = 12;

/** Clave para juntar variantes del mismo nombre: sin tildes, sin mayúsculas, sin espacios de más. */
export function claveNombre(nombre: string): string {
  return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * "TAMAÑO DEL CABLE" → "Tamaño del cable", "tamaño" → "Tamaño". Deja como están las siglas cortas ("RAM", "USB")
 * y los nombres que ya vienen bien escritos.
 */
export function nombreLegible(nombre: string): string {
  const limpio = nombre.replace(/\s+/g, ' ').trim();
  if (limpio === limpio.toUpperCase() && limpio.length > 4) return limpio.charAt(0) + limpio.slice(1).toLowerCase();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/** Entre variantes del mismo nombre igual de usadas, la que ya viene como "Tamaño" (ni todo mayúsculas ni minúsculas). */
export function formaPreferida(a: string, b: string): number {
  const bien = (x: string) => (x.charAt(0) === x.charAt(0).toUpperCase() && x !== x.toUpperCase() ? 0 : 1);
  return bien(a) - bien(b);
}

export function nombresBase(nombreCategoria: string): string[] {
  const tipo = BASE_POR_TIPO.find((t) => t.palabras.test(nombreCategoria));
  return [...(tipo?.nombres ?? []), ...BASE_GENERAL];
}

export interface SugerenciasSpecs {
  /** Nombres en el orden en que se sugieren */
  nombres: string[];
  /** Valores más usados por nombre (clave: claveNombre) */
  valores: Record<string, string[]>;
}

/**
 * Junta lo aprendido de la categoría con la lista base, sin repetir (sin importar tildes ni mayúsculas).
 * `aprendido` viene ordenado de más a menos usado.
 */
export function combinarSugerencias(
  nombreCategoria: string,
  aprendido: Array<{ nombre: string; valores: string[] }>
): SugerenciasSpecs {
  const vistos = new Set<string>();
  const nombres: string[] = [];
  const valores: Record<string, string[]> = {};
  for (const { nombre, valores: vs } of aprendido) {
    const clave = claveNombre(nombre);
    if (!clave || vistos.has(clave)) continue;
    vistos.add(clave);
    nombres.push(nombreLegible(nombre));
    if (vs.length) valores[clave] = vs;
  }
  for (const nombre of nombresBase(nombreCategoria)) {
    const clave = claveNombre(nombre);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    nombres.push(nombre);
  }
  return { nombres: nombres.slice(0, MAX_SUGERENCIAS), valores };
}
