// C-270: las capas de ElectroStudio, piezas sueltas encima de la plantilla (docs/plan/ELECTROSTUDIO.md §5). Crear,
// duplicar, ordenar y medir. Módulo puro: lo usan el editor y las pruebas; el dibujo está en engine.ts.
import { CAPAS_MAX, ESTILOS_CAPA, TAM_STICKER, TAM_TEXTO, type CapaSticker, type CapaTexto, type ChispaPose, type EstiloCapa, type StudioCapa } from './schema';
import { STICKERS, type Sticker } from './stickers';

/** Lo que se puede cambiar de una capa (de texto o sticker): el id y el tipo no cambian nunca */
export type CambioCapa = Partial<Omit<CapaTexto, 'id' | 'tipo'>> & Partial<Omit<CapaSticker, 'id' | 'tipo'>>;
export const esTexto = (c: StudioCapa): c is CapaTexto => c.tipo === 'texto';

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

export function cambiarCapa(capas: readonly StudioCapa[], id: string, cambio: CambioCapa): StudioCapa[] {
  return capas.map((c) => (c.id === id ? ({ ...c, ...cambio, id: c.id, tipo: c.tipo } as StudioCapa) : c));
}

export const tamTexto = (v: number) => Math.min(TAM_TEXTO.max, Math.max(TAM_TEXTO.min, Math.round(v)));
export const tamSticker = (v: number) => Math.min(TAM_STICKER.max, Math.max(TAM_STICKER.min, Math.round(v)));
/** El tamaño dentro de lo que admite la capa: un texto en px de letra, un sticker en px de ancho */
export const tamDe = (c: Pick<StudioCapa, 'tipo'>, v: number) => (c.tipo === 'sticker' ? tamSticker(v) : tamTexto(v));

const POSES: Record<ChispaPose, string> = { saluda: 'saluda', senala: 'señala', pulgar: 'con el pulgar arriba', celebra: 'celebra', explica: 'explica' };

/** Lo que se lee de una capa en una lista: su texto en una línea, o qué es si no lleva */
export function nombreCapa(c: StudioCapa): string {
  if (c.tipo === 'sticker') {
    const st = STICKERS[c.sticker];
    if (c.sticker === 'chispa') return `Chispa ${POSES[c.pose]}${c.gorro ? ', con gorro' : ''}`;
    if (c.sticker === 'icono') return `Ícono: ${c.icono || 'sin elegir'}`;
    const t = c.texto.replace(/\s+/g, ' ').trim();
    return t ? `${st?.nombre ?? 'Sticker'}: ${t}` : st?.nombre ?? 'Sticker';
  }
  const t = c.texto.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  return t || (c.estilo === 'titulo' ? 'Título vacío' : c.estilo === 'subtitulo' ? 'Subtítulo vacío' : 'Texto vacío');
}

/** "Título: ¡Recarga y juega!" o "Sticker: Estrella: -30 %" (para leerla en la vista previa) */
export const etiquetaCapa = (c: StudioCapa) => (c.tipo === 'sticker' ? `Sticker: ${nombreCapa(c)}` : `${ESTILOS_CAPA[c.estilo]}: ${nombreCapa(c)}`);

/** Un sticker nuevo en el centro (si ya hay otro ahí, un poco más abajo) */
export function nuevoSticker(st: Sticker, capas: readonly StudioCapa[], extra: { icono?: string; pose?: ChispaPose; gorro?: boolean; color?: string; color2?: string } = {}): CapaSticker {
  const encima = capas.filter((c) => Math.abs(c.y - 0.55) < 0.02 && Math.abs(c.x - 0.5) < 0.02).length;
  return {
    id: nuevoIdCapa(capas.map((c) => c.id)),
    tipo: 'sticker',
    sticker: st.id,
    texto: st.texto?.def ?? '',
    icono: extra.icono ?? '',
    pose: extra.pose ?? 'saluda',
    gorro: extra.gorro ?? false,
    color: extra.color ?? '',
    color2: extra.color2 ?? '',
    espejo: false,
    tam: st.tamInicial,
    x: 0.5,
    y: Math.min(0.9, 0.55 + encima * 0.05),
    giro: 0,
    oculta: false,
    bloqueada: false,
  };
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
