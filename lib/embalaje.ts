// Armador de paquetes (C-153): con las medidas de cada producto y los empaques de la tienda decide en qué
// viaja el pedido, cuántas piezas son y cuánto se cobra de embalaje.
// Módulo puro: lo usan igual el servidor (fuente de verdad) y la tienda (para mostrar al instante).
//
// Reglas, las mismas de un almacén:
// - Lo que se consolida va junto, en el empaque más barato en el que quepa (un sobre antes que una caja).
// - Si no cabe en el empaque más grande, se reparte en varios.
// - "Bulto aparte" (y lo que no cabe en ningún empaque) viaja en su propia caja: una pieza por unidad.
// - Cabe = cada producto entra por sus tres medidas y el volumen total no pasa del 80 % del empaque
//   (el resto es el relleno que protege).

export const LLENADO_UTIL = 0.8;
export const MAX_EMPAQUES = 8;
/** Peso que se asume si el producto no lo tiene (el mismo de lib/pricing.ts) */
const PESO_SIN_DATO_KG = 0.1;
/** Sin medidas, el volumen se estima con el peso: 5.000 cm³ por kilo, la equivalencia de las empresas de envío */
const CM3_POR_KG = 5000;

export interface Empaque {
  id: string;
  nombre: string;
  largoCm: number;
  anchoCm: number;
  altoCm: number;
  precioUSD: number;
}

export interface ReglasEmbalaje {
  /** Apagado: la tienda cobra el precio único de siempre */
  activo: boolean;
  empaques: Empaque[];
  /** Lo que se cobra por cada producto que viaja en su propia caja (etiqueta y refuerzo) */
  bultoAparteUSD: number;
}

const dinero = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;

/** Medidas de adentro de empaques corrientes y cuánto pesa cada uno frente a la caja mediana */
const EMPAQUES_BASE = [
  { id: 'sobre', nombre: 'Sobre acolchado', largoCm: 25, anchoCm: 18, altoCm: 5, proporcion: 0.3 },
  { id: 'caja-s', nombre: 'Caja pequeña', largoCm: 25, anchoCm: 20, altoCm: 12, proporcion: 0.6 },
  // Teclados, barras de sonido y lo que es largo y plano: no entra en la mediana y no merece la grande
  { id: 'caja-larga', nombre: 'Caja alargada', largoCm: 50, anchoCm: 20, altoCm: 10, proporcion: 1 },
  { id: 'caja-m', nombre: 'Caja mediana', largoCm: 40, anchoCm: 30, altoCm: 20, proporcion: 1 },
  { id: 'caja-l', nombre: 'Caja grande', largoCm: 60, anchoCm: 40, altoCm: 40, proporcion: 1.6 },
] as const;

/**
 * Punto de partida que ofrece Configuración al activar el cálculo, a partir del precio único que la tienda ya cobra:
 * la caja mediana queda en ese precio, lo pequeño paga menos y lo grande más. La tienda pone después sus medidas
 * y precios reales. Los precios se redondean a 5 céntimos.
 */
export function empaquesSugeridos(precioUnicoUSD: number): Empaque[] {
  const base = precioUnicoUSD > 0 ? precioUnicoUSD : 2.5;
  return EMPAQUES_BASE.map(({ proporcion, ...empaque }) => ({ ...empaque, precioUSD: dinero(Math.max(0.05, Math.round((base * proporcion) / 0.05) * 0.05)) }));
}

const numero = (valor: unknown): number => {
  const n = typeof valor === 'number' ? valor : Number(String(valor ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};
/**
 * Lee las reglas guardadas (texto JSON de la base o el objeto de los ajustes públicos) sin confiar en su forma.
 * Siempre devuelve algo que el formulario puede mostrar; los empaques inválidos se descartan.
 */
export function leerReglasEmbalaje(raw: unknown): ReglasEmbalaje {
  let dato: unknown = raw;
  if (typeof raw === 'string') {
    try {
      dato = JSON.parse(raw);
    } catch {
      dato = null;
    }
  }
  const o = (dato && typeof dato === 'object' ? dato : {}) as Record<string, unknown>;
  const empaques: Empaque[] = [];
  for (const [i, item] of (Array.isArray(o.empaques) ? o.empaques : []).entries()) {
    const e = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const largoCm = numero(e.largoCm);
    const anchoCm = numero(e.anchoCm);
    const altoCm = numero(e.altoCm);
    const precioUSD = numero(e.precioUSD);
    const nombre = typeof e.nombre === 'string' ? e.nombre.trim().slice(0, 40) : '';
    if (!nombre || !(largoCm > 0) || !(anchoCm > 0) || !(altoCm > 0) || !(precioUSD >= 0)) continue;
    empaques.push({ id: typeof e.id === 'string' && e.id ? e.id.slice(0, 40) : `empaque-${i + 1}`, nombre, largoCm, anchoCm, altoCm, precioUSD: dinero(precioUSD) });
    if (empaques.length === MAX_EMPAQUES) break;
  }
  const bulto = numero(o.bultoAparteUSD);
  return { activo: o.activo === true, empaques, bultoAparteUSD: bulto >= 0 ? dinero(bulto) : 0 };
}

/** Las reglas solo si el cálculo por paquete está activo y tiene al menos un empaque; si no, `null` (precio único). */
export function reglasEmbalajeActivas(raw: unknown): ReglasEmbalaje | null {
  const reglas = leerReglasEmbalaje(raw);
  return reglas.activo && reglas.empaques.length > 0 ? reglas : null;
}

export interface LineaEmbalaje {
  nombre: string;
  cantidad: number;
  pesoKg: number | null;
  /** JSON del producto: {length, width, height} en cm */
  dimensions: string | null;
  consolidable: boolean;
}

export interface BultoEmbalaje {
  /** EMPAQUE: lo arma la tienda en uno de sus empaques. PROPIO: el producto viaja en su propia caja */
  tipo: 'EMPAQUE' | 'PROPIO';
  nombre: string;
  /** "25 × 20 × 12 cm" del empaque, o las medidas del producto si viaja en su caja */
  medidas: string | null;
  /** Bultos iguales (10 televisores = un renglón con cantidad 10) */
  cantidad: number;
  /** Cada uno */
  precioUSD: number;
  /** Peso de cada uno, con lo que lleva dentro */
  pesoKg: number;
  contenido: Array<{ nombre: string; cantidad: number }>;
}

export interface PlanEmbalaje {
  bultos: BultoEmbalaje[];
  /** Piezas que se declaran en la guía */
  piezas: number;
  pesoKg: number;
  totalUSD: number;
  /** Productos sin medidas: su tamaño se estimó con el peso */
  estimados: string[];
  /** Todo va en un solo empaque y todavía le queda al menos un cuarto libre */
  conEspacio: boolean;
}

type Medidas = [number, number, number];

function medidasDe(dimensions: string | null): Medidas | null {
  if (!dimensions) return null;
  try {
    const d = JSON.parse(dimensions) as Record<string, unknown> | null;
    const lados = [numero(d?.length), numero(d?.width), numero(d?.height)];
    if (lados.some((l) => !(l > 0))) return null;
    return lados.sort((a, b) => b - a) as Medidas;
  } catch {
    return null;
  }
}

const ladosDe = (e: Empaque): Medidas => [e.largoCm, e.anchoCm, e.altoCm].sort((a, b) => b - a) as Medidas;
const volumenDe = (e: Empaque) => e.largoCm * e.anchoCm * e.altoCm;
const entra = (m: Medidas | null, e: Empaque) => {
  if (!m) return true;
  const lados = ladosDe(e);
  return m[0] <= lados[0] && m[1] <= lados[1] && m[2] <= lados[2];
};
const texto = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const medidasTexto = (m: Medidas | [number, number, number]) => `${texto(m[0])} × ${texto(m[1])} × ${texto(m[2])} cm`;

interface Grupo {
  nombre: string;
  cantidad: number;
  pesoKg: number;
  medidas: Medidas | null;
  volumen: number;
}

interface Caja {
  /** Cajas idénticas (solo las llenas de un mismo producto) */
  veces: number;
  libre: number;
  /** El empaque con el que se abrió: lo que se le agregue tiene que entrar en él */
  base: Empaque;
  contenido: Map<number, number>;
}

/** El empaque más barato (y, a igual precio, el más pequeño) en el que cabe ese contenido. */
function empaquePara(empaques: Empaque[], grupos: Grupo[], contenido: Map<number, number>): Empaque | null {
  let volumen = 0;
  for (const [i, cantidad] of contenido) volumen += grupos[i].volumen * cantidad;
  let mejor: Empaque | null = null;
  for (const e of empaques) {
    if (volumen > volumenDe(e) * LLENADO_UTIL + 1e-6) continue;
    if ([...contenido.keys()].some((i) => !entra(grupos[i].medidas, e))) continue;
    if (!mejor || e.precioUSD < mejor.precioUSD || (e.precioUSD === mejor.precioUSD && volumenDe(e) < volumenDe(mejor))) mejor = e;
  }
  return mejor;
}

/**
 * Arma los paquetes de los productos físicos de un pedido. `null` si no hay nada que empacar.
 * El costo es lineal en los renglones del carrito, no en las unidades: 999 unidades de un producto son un renglón.
 */
export function armarPaquetes(lineas: LineaEmbalaje[], reglas: ReglasEmbalaje): PlanEmbalaje | null {
  const validas = lineas.filter((l) => Number.isFinite(l.cantidad) && l.cantidad >= 1);
  if (validas.length === 0 || reglas.empaques.length === 0) return null;

  const empaques = [...reglas.empaques].sort((a, b) => volumenDe(a) - volumenDe(b));
  const mayor = empaques[empaques.length - 1];
  const bultos: BultoEmbalaje[] = [];
  const estimados: string[] = [];
  const grupos: Grupo[] = [];

  for (const linea of validas) {
    const cantidad = Math.floor(linea.cantidad);
    const pesoKg = linea.pesoKg && linea.pesoKg > 0 ? linea.pesoKg : PESO_SIN_DATO_KG;
    const medidas = medidasDe(linea.dimensions);
    const volumen = medidas ? medidas[0] * medidas[1] * medidas[2] : pesoKg * CM3_POR_KG;
    if (!medidas && !estimados.includes(linea.nombre)) estimados.push(linea.nombre);

    const cabeEnAlguno = empaques.some((e) => entra(medidas, e) && volumen <= volumenDe(e) * LLENADO_UTIL + 1e-6);
    if (!linea.consolidable || !cabeEnAlguno) {
      bultos.push({
        tipo: 'PROPIO',
        nombre: 'En su propia caja',
        medidas: medidas ? medidasTexto(medidas) : null,
        cantidad,
        precioUSD: reglas.bultoAparteUSD,
        pesoKg: dinero(pesoKg),
        contenido: [{ nombre: linea.nombre, cantidad: 1 }],
      });
      continue;
    }
    grupos.push({ nombre: linea.nombre, cantidad, pesoKg, medidas, volumen });
  }

  // Lo que se consolida: primero se intenta todo junto; si no cabe, se reparte (de mayor a menor) en cajas del
  // empaque más grande en el que entra cada producto, y cada caja baja después al empaque que le alcance.
  const cajas: Caja[] = [];
  if (grupos.length > 0) {
    const todo = new Map(grupos.map((g, i) => [i, g.cantidad]));
    if (empaquePara(empaques, grupos, todo)) {
      cajas.push({ veces: 1, libre: 0, base: mayor, contenido: todo });
    } else {
      const orden = grupos.map((_, i) => i).sort((a, b) => grupos[b].volumen - grupos[a].volumen);
      for (const i of orden) {
        const g = grupos[i];
        let faltan = g.cantidad;
        // Primero, los huecos de las cajas ya abiertas
        for (const caja of cajas) {
          if (faltan === 0) break;
          if (caja.veces !== 1 || !entra(g.medidas, caja.base)) continue;
          const caben = Math.min(faltan, Math.floor((caja.libre + 1e-6) / g.volumen));
          if (caben <= 0) continue;
          caja.contenido.set(i, (caja.contenido.get(i) ?? 0) + caben);
          caja.libre -= caben * g.volumen;
          faltan -= caben;
        }
        if (faltan === 0) continue;
        // Después, cajas nuevas: las que salen llenas del mismo producto son un solo renglón
        const base = [...empaques].reverse().find((e) => entra(g.medidas, e) && g.volumen <= volumenDe(e) * LLENADO_UTIL + 1e-6) ?? mayor;
        const capacidad = volumenDe(base) * LLENADO_UTIL;
        const porCaja = Math.max(1, Math.floor((capacidad + 1e-6) / g.volumen));
        const llenas = Math.floor(faltan / porCaja);
        if (llenas > 0) cajas.push({ veces: llenas, libre: 0, base, contenido: new Map([[i, porCaja]]) });
        const resto = faltan - llenas * porCaja;
        if (resto > 0) cajas.push({ veces: 1, libre: capacidad - resto * g.volumen, base, contenido: new Map([[i, resto]]) });
      }
    }
  }

  let volumenUnico = 0;
  let empaqueUnico: Empaque | null = null;
  for (const caja of cajas) {
    const empaque = empaquePara(empaques, grupos, caja.contenido) ?? caja.base;
    let peso = 0;
    let volumen = 0;
    const contenido: BultoEmbalaje['contenido'] = [];
    for (const [i, cantidad] of caja.contenido) {
      peso += grupos[i].pesoKg * cantidad;
      volumen += grupos[i].volumen * cantidad;
      contenido.push({ nombre: grupos[i].nombre, cantidad });
    }
    if (cajas.length === 1 && caja.veces === 1) {
      volumenUnico = volumen;
      empaqueUnico = empaque;
    }
    bultos.push({
      tipo: 'EMPAQUE',
      nombre: empaque.nombre,
      medidas: medidasTexto([empaque.largoCm, empaque.anchoCm, empaque.altoCm]),
      cantidad: caja.veces,
      precioUSD: empaque.precioUSD,
      pesoKg: dinero(peso),
      contenido,
    });
  }

  // Los empaques de la tienda primero: es el orden en que se arma el despacho
  bultos.sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'EMPAQUE' ? -1 : 1));

  const soloUno = bultos.length === 1 && bultos[0].tipo === 'EMPAQUE' && bultos[0].cantidad === 1;
  return {
    bultos,
    piezas: bultos.reduce((suma, b) => suma + b.cantidad, 0),
    pesoKg: dinero(bultos.reduce((suma, b) => suma + b.pesoKg * b.cantidad, 0)),
    totalUSD: dinero(bultos.reduce((suma, b) => suma + b.precioUSD * b.cantidad, 0)),
    estimados,
    conEspacio: soloUno && empaqueUnico !== null && volumenUnico <= volumenDe(empaqueUnico) * LLENADO_UTIL * 0.75,
  };
}

/** "Sobre acolchado", "2 paquetes" o "Caja mediana + 1 en su propia caja": el plan en pocas palabras. */
export function resumenEmbalaje(plan: Pick<PlanEmbalaje, 'bultos' | 'piezas'>): string {
  if (plan.bultos.length === 0) return plan.piezas === 1 ? '1 paquete' : `${plan.piezas} paquetes`;
  if (plan.piezas === 1) return plan.bultos[0].tipo === 'PROPIO' ? 'En su propia caja' : plan.bultos[0].nombre;
  return `${plan.piezas} paquetes`;
}

/** Renglones para el panel y para "Copiar datos para la guía": qué empaque usar y qué va dentro. */
export function renglonesEmbalaje(plan: Pick<PlanEmbalaje, 'bultos'>): string[] {
  return plan.bultos.map((b) => {
    const contenido = b.contenido.map((c) => `${c.cantidad} × ${c.nombre}`).join(', ');
    const cabecera = b.tipo === 'PROPIO'
      ? `${b.cantidad} × en su propia caja${b.medidas ? ` (${b.medidas})` : ''}`
      : `${b.cantidad} × ${b.nombre}${b.medidas ? ` (${b.medidas})` : ''}`;
    const peso = `${String(b.pesoKg).replace('.', ',')} kg${b.cantidad > 1 ? ' cada uno' : ''}`;
    return b.tipo === 'PROPIO' ? `${cabecera}: ${b.contenido[0]?.nombre ?? 'Producto'}, ${peso}` : `${cabecera}: ${contenido}, ${peso}`;
  });
}

/** Lo que la orden guarda (texto JSON) para que el panel sepa cómo se despacha. */
export interface EmbalajeGuardado {
  piezas: number;
  pesoKg: number;
  bultos: BultoEmbalaje[];
  estimados: string[];
}

export function leerEmbalajeGuardado(raw: unknown): EmbalajeGuardado | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<EmbalajeGuardado> | null;
    if (!o || typeof o !== 'object' || !(Number(o.piezas) >= 1)) return null;
    return {
      piezas: Number(o.piezas),
      pesoKg: Number(o.pesoKg) || 0,
      bultos: Array.isArray(o.bultos) ? o.bultos : [],
      estimados: Array.isArray(o.estimados) ? o.estimados.filter((n): n is string => typeof n === 'string') : [],
    };
  } catch {
    return null;
  }
}
