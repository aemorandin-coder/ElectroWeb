// C-270: las capas de ElectroStudio, piezas sueltas encima de la plantilla (docs/plan/ELECTROSTUDIO.md §5). Crear,
// duplicar, ordenar y medir. Módulo puro: lo usan el editor y las pruebas; el dibujo está en engine.ts.
import { CAPAS_MAX, TAM_TEXTO, type CapaTexto, type EstiloCapa, type StudioCapa } from './schema';

/** Un id corto que no se repite en la historia */
export function nuevoIdCapa(usados: readonly string[]): string {
  for (;;) {
    const id = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
    if (!usados.includes(id)) return id;
  }
}

/** Cómo arranca cada estilo. El texto empieza escrito para que se vea dónde quedó; se cambia en el panel */
const ARRANQUE: Record<EstiloCapa, Omit<CapaTexto, 'id' | 'tipo' | 'estilo' | 'x' | 'giro' | 'oculta' | 'bloqueada' | 'fuente' | 'alinear' | 'color'>> = {
  titulo: { texto: 'Tu título', tam: 120, peso: 900, cursiva: true, mayusculas: true, contorno: false, sombra: true, fondo: 'ninguno', anchoMax: 0, y: 0.3 },
  subtitulo: { texto: 'Tu subtítulo', tam: 56, peso: 800, cursiva: true, mayusculas: false, contorno: false, sombra: false, fondo: 'cinta', anchoMax: 0, y: 0.4 },
  texto: { texto: 'Escribe aquí', tam: 44, peso: 700, cursiva: false, mayusculas: false, contorno: false, sombra: false, fondo: 'ninguno', anchoMax: 860, y: 0.5 },
};

export function nuevaCapa(estilo: EstiloCapa, capas: readonly StudioCapa[]): CapaTexto {
  const a = ARRANQUE[estilo];
  // Si ya hay otra del mismo estilo en ese lugar, la nueva baja un poco para que no quede encima
  const encima = capas.filter((c) => Math.abs(c.y - a.y) < 0.02 && Math.abs(c.x - 0.5) < 0.02).length;
  return {
    id: nuevoIdCapa(capas.map((c) => c.id)),
    tipo: 'texto',
    estilo,
    fuente: 'montserrat',
    alinear: 'centro',
    color: '',
    x: 0.5,
    giro: 0,
    oculta: false,
    bloqueada: false,
    ...a,
    y: Math.min(0.9, a.y + encima * 0.05),
  };
}

export const puedeAgregarCapa = (capas: readonly StudioCapa[]) => capas.length < CAPAS_MAX;

/**
 * Una copia corrida 30 px abajo y a la derecha, justo adelante de la original. El id nuevo se elige antes (nuevoIdCapa):
 * así la función da lo mismo si React la corre dos veces.
 */
export function duplicarCapa(capas: readonly StudioCapa[], id: string, idNuevo: string): StudioCapa[] {
  const i = capas.findIndex((c) => c.id === id);
  if (i < 0 || !puedeAgregarCapa(capas) || capas.some((c) => c.id === idNuevo)) return [...capas];
  const copia = { ...capas[i], id: idNuevo, x: Math.min(1, capas[i].x + 30 / 1080), y: Math.min(1, capas[i].y + 30 / 1920), bloqueada: false };
  const lista = [...capas];
  lista.splice(i + 1, 0, copia);
  return lista;
}

/** Adelante (+1) o atrás (-1): la última de la lista se dibuja encima de todas */
export function moverCapa(capas: readonly StudioCapa[], id: string, paso: 1 | -1): StudioCapa[] {
  const i = capas.findIndex((c) => c.id === id);
  const j = i + paso;
  if (i < 0 || j < 0 || j >= capas.length) return [...capas];
  const lista = [...capas];
  [lista[i], lista[j]] = [lista[j], lista[i]];
  return lista;
}

export function cambiarCapa(capas: readonly StudioCapa[], id: string, cambio: Partial<CapaTexto>): StudioCapa[] {
  return capas.map((c) => (c.id === id ? { ...c, ...cambio, id: c.id, tipo: c.tipo } : c));
}

export const tamTexto = (v: number) => Math.min(TAM_TEXTO.max, Math.max(TAM_TEXTO.min, Math.round(v)));

/** Lo que se lee de una capa en una lista: su texto en una línea, o su estilo si está vacía */
export function nombreCapa(c: StudioCapa): string {
  const t = c.texto.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  return t || (c.estilo === 'titulo' ? 'Título vacío' : c.estilo === 'subtitulo' ? 'Subtítulo vacío' : 'Texto vacío');
}

/** "#0A1B3D" → si es un color claro (para elegir el contorno y la sombra que contrastan) */
export function colorClaro(hex: string): boolean {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  if (!Number.isFinite(n)) return true;
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum > 150;
}

/**
 * C-271: los estilos listos. Cambian el aspecto de la pieza elegida en un toque, sin tocar su texto, su lugar ni su
 * tamaño. El color vacío es el automático (blanco u oscuro según el fondo).
 */
export const ESTILOS_LISTOS: { id: string; nombre: string; cambio: Partial<CapaTexto> }[] = [
  { id: 'oferta', nombre: 'Título de oferta', cambio: { fuente: 'anton', peso: 400, cursiva: false, mayusculas: true, contorno: true, sombra: true, fondo: 'ninguno', color: '' } },
  { id: 'alto', nombre: 'Titular alto', cambio: { fuente: 'bebas', peso: 400, cursiva: false, mayusculas: true, contorno: false, sombra: true, fondo: 'ninguno', color: '' } },
  { id: 'marca', nombre: 'De la marca', cambio: { fuente: 'montserrat', peso: 900, cursiva: true, mayusculas: true, contorno: false, sombra: true, fondo: 'ninguno', color: '' } },
  { id: 'cinta', nombre: 'Subtítulo en cinta', cambio: { fuente: 'montserrat', peso: 800, cursiva: true, mayusculas: false, contorno: false, sombra: false, fondo: 'cinta', color: '' } },
  { id: 'moderno', nombre: 'Moderno', cambio: { fuente: 'unbounded', peso: 800, cursiva: false, mayusculas: false, contorno: false, sombra: false, fondo: 'ninguno', color: '' } },
  { id: 'ficha', nombre: 'Ficha técnica', cambio: { fuente: 'space', peso: 700, cursiva: false, mayusculas: false, contorno: false, sombra: false, fondo: 'caja', color: '' } },
  { id: 'aviso', nombre: 'Aviso amable', cambio: { fuente: 'rubik', peso: 800, cursiva: false, mayusculas: false, contorno: false, sombra: false, fondo: 'pildora', color: '' } },
  { id: 'mano', nombre: 'Nota a mano', cambio: { fuente: 'caveat', peso: 700, cursiva: false, mayusculas: false, contorno: false, sombra: false, fondo: 'ninguno', color: '#FFB400' } },
  { id: 'elegante', nombre: 'Elegante', cambio: { fuente: 'playfair', peso: 800, cursiva: true, mayusculas: false, contorno: false, sombra: false, fondo: 'ninguno', color: '' } },
];

/** El estilo listo que coincide con la pieza (para marcarlo), si alguno coincide */
export function estiloListoDe(c: CapaTexto): string | null {
  const e = ESTILOS_LISTOS.find(({ cambio }) => (Object.keys(cambio) as (keyof CapaTexto)[]).every((k) => c[k] === cambio[k]));
  return e?.id ?? null;
}
