// G-74: Configuración compartida de la portada (Marketing → Vitrina y Portada → Portada).
// Módulo puro, sin Prisma ni navegador: lo usan app/page.tsx, lib/queries/home.ts, la validación y el panel.

export interface DefinicionSeccionPortada {
  id: SeccionPortadaId;
  titulo: string;
  detalle: string;
}

export const SECCION_PORTADA_IDS = [
  'featured',
  'categories',
  'deals',
  'bestSellers',
  'digital',
  'recent',
  'departments',
  'shelves',
  'trust',
  'more',
] as const;

export type SeccionPortadaId = (typeof SECCION_PORTADA_IDS)[number];

export const SECCIONES_PORTADA: readonly DefinicionSeccionPortada[] = [
  { id: 'featured', titulo: 'Destacados de la semana', detalle: 'Producto estrella + fila rotativa de destacados.' },
  { id: 'categories', titulo: 'Compra por categoría', detalle: 'Casillas con fotos reales de cada categoría.' },
  { id: 'deals', titulo: 'Ofertas', detalle: 'Productos rebajados o con promoción vigente.' },
  { id: 'bestSellers', titulo: 'Lo más vendido', detalle: 'Más vendidos de los últimos 90 días.' },
  { id: 'digital', titulo: 'Códigos digitales', detalle: 'Franja de gift cards, juegos y recargas.' },
  { id: 'recent', titulo: 'Recién llegados', detalle: 'Los 12 últimos productos publicados en toda la tienda.' },
  { id: 'departments', titulo: 'Departamentos', detalle: 'Vitrinas aparte con catálogo propio (como Ferretería).' },
  { id: 'shelves', titulo: 'Estantes por categoría', detalle: 'Filas destacadas de las categorías principales.' },
  { id: 'trust', titulo: 'Por qué comprar en Electro Shop', detalle: 'Sellos de garantía, Pago Móvil BCV y envíos.' },
  { id: 'more', titulo: 'Más de Electro Shop', detalle: 'Accesos rápidos a servicios, cursos y sorteo.' },
];

export const POSICIONES_VIDEO = ['after-featured', 'middle', 'bottom'] as const;
export type PosicionVideoPortada = (typeof POSICIONES_VIDEO)[number];

export interface HomeSectionsConfig {
  orden: SeccionPortadaId[];
  ocultas: SeccionPortadaId[];
}

export const DEFAULT_HOME_SECTIONS_CONFIG: HomeSectionsConfig = {
  orden: [...SECCION_PORTADA_IDS],
  ocultas: [],
};

const VALIDOS = new Set<string>(SECCION_PORTADA_IDS);
const VALIDAS_VIDEO = new Set<string>(POSICIONES_VIDEO);

export function normalizarConfigSecciones(input: unknown): HomeSectionsConfig {
  const source = input && typeof input === 'object' ? (input as { orden?: unknown; ocultas?: unknown }) : {};
  const vistas = new Set<SeccionPortadaId>();
  const orden: SeccionPortadaId[] = [];

  if (Array.isArray(source.orden)) {
    for (const item of source.orden) {
      if (typeof item === 'string' && VALIDOS.has(item)) {
        const id = item as SeccionPortadaId;
        if (!vistas.has(id)) {
          vistas.add(id);
          orden.push(id);
        }
      }
    }
  }
  for (const id of SECCION_PORTADA_IDS) {
    if (!vistas.has(id)) orden.push(id);
  }

  const ocultasSet = new Set<SeccionPortadaId>();
  if (Array.isArray(source.ocultas)) {
    for (const item of source.ocultas) {
      if (typeof item === 'string' && VALIDOS.has(item)) {
        ocultasSet.add(item as SeccionPortadaId);
      }
    }
  }

  return { orden, ocultas: [...ocultasSet] };
}

export function leerConfigSeccionesPortada(raw: unknown): HomeSectionsConfig {
  if (!raw) return { orden: [...SECCION_PORTADA_IDS], ocultas: [] };
  if (typeof raw === 'string') {
    try {
      return normalizarConfigSecciones(JSON.parse(raw));
    } catch {
      return { orden: [...SECCION_PORTADA_IDS], ocultas: [] };
    }
  }
  return normalizarConfigSecciones(raw);
}

export function normalizarPosicionVideo(raw: unknown): PosicionVideoPortada {
  return typeof raw === 'string' && VALIDAS_VIDEO.has(raw) ? (raw as PosicionVideoPortada) : 'bottom';
}

export function extraerYoutubeIdPortada(url: string | null | undefined): string | null {
  if (!url) return null;
  const limpio = url.trim();
  const match = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/.exec(limpio);
  return match ? match[1] : null;
}
