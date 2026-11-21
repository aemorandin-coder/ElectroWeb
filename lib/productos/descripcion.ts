// G-72: Estructura inteligente de descripciones de producto y pasos de canje en texto plano.
// Módulo puro: convierte bloques escritos con saltos de línea, viñetas y "Etiqueta: detalle" en
// secciones ordenadas sin modificar lo que el administrador guardó en base de datos.

export interface ItemDescripcion {
  etiqueta?: string;
  texto: string;
}

export interface SeccionDescripcion {
  titulo?: string;
  parrafos: string[];
  items: ItemDescripcion[];
}

export interface DescripcionEstructurada {
  intro: string[];
  secciones: SeccionDescripcion[];
}

const BULLET_RX = /^[•▪▸✓✔*-]\s+(.+)$/;
const NUMBERED_RX = /^(\d{1,2})[.)]\s+(.+)$/;

function partirEtiqueta(linea: string): ItemDescripcion {
  const idx = linea.indexOf(':');
  if (idx >= 2 && idx <= 44) {
    const posible = linea.slice(0, idx).trim();
    const resto = linea.slice(idx + 1).trim();
    if (resto && !/^https?$/i.test(posible) && !posible.includes('://')) {
      return { etiqueta: posible, texto: resto };
    }
  }
  return { texto: linea };
}

function esSubtitulo(linea: string, siguiente: string | undefined): boolean {
  if (!siguiente) return false;
  if (linea.length > 68 || linea.length < 3) return false;
  if (BULLET_RX.test(linea) || NUMBERED_RX.test(linea)) return false;
  if (/[.,;!?]$/.test(linea)) return false;
  // Si termina en ":" y tiene texto corto, también puede introducir la sección siguiente
  const sinDosPuntos = linea.endsWith(':') ? linea.slice(0, -1).trim() : linea;
  if (!sinDosPuntos || sinDosPuntos.length > 60) return false;
  // Evitar marcar como subtítulo un párrafo normal corto seguido de otro igual sin listas ni estructura
  const siguienteEsLista = BULLET_RX.test(siguiente) || NUMBERED_RX.test(siguiente);
  const tieneDosPuntosEnMedio = !linea.endsWith(':') && linea.includes(':');
  if (tieneDosPuntosEnMedio) return false;
  return siguienteEsLista || linea.endsWith(':') || (linea.split(/\s+/).length <= 6 && !/[.]/.test(linea));
}

export function estructurarDescripcion(raw: string | null | undefined): DescripcionEstructurada {
  if (!raw) return { intro: [], secciones: [] };
  const lineas = raw.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim());

  const intro: string[] = [];
  const secciones: SeccionDescripcion[] = [];
  let actual: SeccionDescripcion | null = null;
  let enSeccion = false;

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea) continue;

    // Buscar la siguiente línea no vacía para evaluar si la actual es subtítulo
    let siguiente: string | undefined;
    for (let j = i + 1; j < lineas.length; j++) {
      if (lineas[j]) {
        siguiente = lineas[j];
        break;
      }
    }

    const bullet = BULLET_RX.exec(linea);
    const numbered = NUMBERED_RX.exec(linea);

    if (bullet) {
      if (!actual) {
        actual = { parrafos: [], items: [] };
        secciones.push(actual);
      }
      enSeccion = true;
      actual.items.push(partirEtiqueta(bullet[1].trim()));
      continue;
    }

    if (numbered) {
      if (!actual) {
        actual = { parrafos: [], items: [] };
        secciones.push(actual);
      }
      enSeccion = true;
      actual.items.push(partirEtiqueta(numbered[2].trim()));
      continue;
    }

    if (esSubtitulo(linea, siguiente)) {
      const titulo = linea.endsWith(':') ? linea.slice(0, -1).trim() : linea;
      actual = { titulo, parrafos: [], items: [] };
      secciones.push(actual);
      enSeccion = true;
      continue;
    }

    // Si aún no entramos en ninguna sección y no es "Etiqueta: valor", va a intro
    const posibleItem = partirEtiqueta(linea);
    if (!enSeccion) {
      if (posibleItem.etiqueta && siguiente && partirEtiqueta(siguiente).etiqueta) {
        actual = { parrafos: [], items: [posibleItem] };
        secciones.push(actual);
        enSeccion = true;
      } else {
        intro.push(linea);
      }
    } else if (actual) {
      if (posibleItem.etiqueta && actual.items.length > 0) {
        actual.items.push(posibleItem);
      } else {
        actual.parrafos.push(linea);
      }
    }
  }

  return { intro, secciones };
}

/** Separa instrucciones numeradas ("1. Entra...", "2. Abre...") de párrafos sueltos para mostrarlas paso a paso. */
export function parsearPasosCanje(raw: string | null | undefined): { pasos: string[]; parrafos: string[] } {
  if (!raw) return { pasos: [], parrafos: [] };
  const lineas = raw.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  const pasos: string[] = [];
  const parrafos: string[] = [];
  for (const linea of lineas) {
    const m = NUMBERED_RX.exec(linea) ?? BULLET_RX.exec(linea);
    if (m) pasos.push((m[2] ?? m[1]).trim());
    else parrafos.push(linea);
  }
  return { pasos, parrafos };
}
