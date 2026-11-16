// C-271: las fuentes de las capas de ElectroStudio (docs/plan/ELECTROSTUDIO.md, decisión D3: las 8 propuestas).
// Locales y con licencia libre (OFL, la licencia al lado de cada archivo en public/fonts/studio), solo la parte latina:
// tildes, ñ, ¿ y ¡ incluidas. Se cargan cuando una historia las usa o cuando se abre el selector: la tienda no pesa más.
// Los datos son puros; `cargarFuentes` es solo del navegador.

export const FUENTES_IDS = ['montserrat', 'anton', 'bebas', 'unbounded', 'space', 'rubik', 'caveat', 'playfair'] as const;
export type FuenteId = (typeof FUENTES_IDS)[number];

export interface FuenteStudio {
  nombre: string;
  /** Para qué sirve, en pocas palabras */
  rol: string;
  /** Nombre de la familia en el navegador: propio, para no chocar con las fuentes de la tienda */
  familia: string;
  archivos: { url: string; estilo: 'normal' | 'italic'; pesos: string }[];
  /** Los pesos que tiene el archivo: [mínimo, máximo] */
  pesos: [number, number];
  cursiva: boolean;
}

export const FUENTES: Record<FuenteId, FuenteStudio> = {
  montserrat: {
    nombre: 'Montserrat',
    rol: 'La de siempre',
    familia: 'StudioMontserrat',
    archivos: [
      { url: '/fonts/Montserrat-latin-wght-normal.woff2', estilo: 'normal', pesos: '100 900' },
      { url: '/fonts/Montserrat-latin-wght-italic.woff2', estilo: 'italic', pesos: '100 900' },
    ],
    pesos: [100, 900],
    cursiva: true,
  },
  anton: { nombre: 'Anton', rol: 'Impacto: ofertas y precios', familia: 'StudioAnton', archivos: [{ url: '/fonts/studio/Anton-latin-normal.woff2', estilo: 'normal', pesos: '400' }], pesos: [400, 400], cursiva: false },
  bebas: { nombre: 'Bebas Neue', rol: 'Titulares altos', familia: 'StudioBebas', archivos: [{ url: '/fonts/studio/BebasNeue-latin-normal.woff2', estilo: 'normal', pesos: '400' }], pesos: [400, 400], cursiva: false },
  unbounded: { nombre: 'Unbounded', rol: 'Moderna, de tecnología', familia: 'StudioUnbounded', archivos: [{ url: '/fonts/studio/Unbounded-latin-normal.woff2', estilo: 'normal', pesos: '200 900' }], pesos: [200, 900], cursiva: false },
  space: { nombre: 'Space Grotesk', rol: 'Fichas técnicas y datos', familia: 'StudioSpaceGrotesk', archivos: [{ url: '/fonts/studio/SpaceGrotesk-latin-normal.woff2', estilo: 'normal', pesos: '300 700' }], pesos: [300, 700], cursiva: false },
  rubik: {
    nombre: 'Rubik',
    rol: 'Amigable, para avisos',
    familia: 'StudioRubik',
    archivos: [
      { url: '/fonts/studio/Rubik-latin-normal.woff2', estilo: 'normal', pesos: '300 900' },
      { url: '/fonts/studio/Rubik-latin-italic.woff2', estilo: 'italic', pesos: '300 900' },
    ],
    pesos: [300, 900],
    cursiva: true,
  },
  caveat: { nombre: 'Caveat', rol: 'A mano: notas y flechas', familia: 'StudioCaveat', archivos: [{ url: '/fonts/studio/Caveat-latin-normal.woff2', estilo: 'normal', pesos: '400 700' }], pesos: [400, 700], cursiva: false },
  playfair: {
    nombre: 'Playfair Display',
    rol: 'Elegante: felicitaciones',
    familia: 'StudioPlayfair',
    archivos: [
      { url: '/fonts/studio/PlayfairDisplay-latin-normal.woff2', estilo: 'normal', pesos: '400 900' },
      { url: '/fonts/studio/PlayfairDisplay-latin-italic.woff2', estilo: 'italic', pesos: '400 900' },
    ],
    pesos: [400, 900],
    cursiva: true,
  },
};

export const fuenteDe = (id: string): FuenteStudio => FUENTES[id as FuenteId] ?? FUENTES.montserrat;

/** El peso que se pide, dentro de los que tiene la fuente (Anton y Bebas solo tienen uno) */
export const pesoEn = (f: FuenteStudio, peso: number) => Math.min(f.pesos[1], Math.max(f.pesos[0], peso));

/** La fuente de un texto para el canvas o para CSS: la familia, con Montserrat y Arial Black detrás mientras carga */
export function cssFuente(id: string, peso: number, cursiva: boolean, px: number): string {
  const f = fuenteDe(id);
  return `${cursiva && f.cursiva ? 'italic ' : ''}${pesoEn(f, peso)} ${px}px "${f.familia}", StudioMontserrat, "Arial Black", Arial, sans-serif`;
}

const cargas = new Map<FuenteId, Promise<void>>();

/** Carga estas fuentes (una sola vez cada una) y espera a que estén. Si una falla, se dibuja con la de respaldo */
export function cargarFuentes(ids: Iterable<string>): Promise<void> {
  if (typeof FontFace === 'undefined' || typeof document === 'undefined') return Promise.resolve();
  const pendientes: Promise<void>[] = [];
  for (const id of new Set(ids)) {
    if (!(FUENTES_IDS as readonly string[]).includes(id)) continue;
    const fid = id as FuenteId;
    let p = cargas.get(fid);
    if (!p) {
      const f = FUENTES[fid];
      p = Promise.all(
        f.archivos.map((a) => new FontFace(f.familia, `url(${a.url})`, { weight: a.pesos, style: a.estilo }).load().then((cargada) => void document.fonts.add(cargada))),
      )
        .then(() => undefined)
        .catch(() => undefined);
      cargas.set(fid, p);
    }
    pendientes.push(p);
  }
  return Promise.all(pendientes).then(() => undefined);
}
