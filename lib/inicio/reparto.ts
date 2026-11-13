// C-207: el reparto de los productos del inicio (decisión de Andrés del 13/11, PLAN.md §7.2). Sin Prisma ni React, para
// poder probarlo solo.
// - Un producto sale una sola vez: en la primera sección que le toca, en el orden de la página.
// - Una sección con menos del mínimo no se muestra, y lo que no alcanzó a salir queda libre para las de abajo.
// - "Recién llegados" trae lo último de toda la tienda, ferretería incluida, pero variado: una carga de 70 productos de un
//   proveedor no llena la sección.
// - La vitrina de "Destacados" se completa solo hasta lo que necesita para verse: lo nuevo que no es destacado va a
//   "Recién llegados", que es su lugar.

/** Lo mínimo para que una sección del inicio se muestre (PLAN.md §3) */
export const MIN_SECCION = 4;

/** Las secciones del inicio piden productos en el orden de la página: lo que una muestra, las de abajo ya no lo repiten. */
export interface Reparto {
  /**
   * Hasta `max` de `candidatos`, en su orden, sin lo que ya salió arriba y sin repetir (los candidatos pueden venir de
   * varias listas). Con menos de `minimo`, la sección no se muestra: devuelve [] y no se queda con nada.
   */
  tomar<T extends { id: string }>(candidatos: readonly T[], max: number, minimo?: number): T[];
  /** ¿Ya salió arriba? */
  mostrado(id: string): boolean;
}

export function crearReparto(minimoPorDefecto = MIN_SECCION): Reparto {
  const mostrados = new Set<string>();
  return {
    tomar(candidatos, max, minimo = minimoPorDefecto) {
      const ids = new Set<string>();
      const elegidos = candidatos.filter((p) => !mostrados.has(p.id) && !ids.has(p.id) && (ids.add(p.id), true)).slice(0, Math.max(0, max));
      if (elegidos.length < minimo) return [];
      for (const p of elegidos) mostrados.add(p.id);
      return elegidos;
    },
    mostrado: (id) => mostrados.has(id),
  };
}

// ---------- "Compra por categoría"

/** Una categoría suelta con menos productos que esto va dentro de "Más categorías": con 1 o 2, su página se ve vacía */
export const MIN_CATEGORIA_SOLA = 3;

/** La cuenta de una categoría sale desde aquí: "3 productos" se lee como una tienda vacía */
export const CUENTA_VISIBLE_DESDE = 10;

/**
 * Qué categorías llevan casilla propia y cuáles van juntas en "Más categorías". `categorias` llega en el orden en que se
 * muestran (los departamentos primero y después de más a menos productos). Un departamento siempre va solo. Si hay que
 * juntar, la última casilla es "Más categorías": lo chico y lo que no cabe. Con menos de dos que se sostengan solas,
 * juntar no ayuda y van todas como siempre.
 */
export function repartirCategorias<T extends { productCount: number; esDepartamento?: boolean }>(
  categorias: readonly T[],
  max: number
): { solas: T[]; resto: T[] } {
  const casillas = Math.max(2, max);
  const sola = (c: T) => Boolean(c.esDepartamento) || c.productCount >= MIN_CATEGORIA_SOLA;
  const grandes = categorias.filter(sola);
  if (grandes.length < 2) return { solas: categorias.slice(0, casillas), resto: [] };
  const chicas = categorias.filter((c) => !sola(c));
  if (chicas.length === 0 && grandes.length <= casillas) return { solas: grandes, resto: [] };
  return { solas: grandes.slice(0, casillas - 1), resto: [...grandes.slice(casillas - 1), ...chicas] };
}

// ---------- "Recién llegados"

/**
 * Lo más nuevo primero, por día: lo que llegó el mismo día va con los destacados adelante. Así, de una carga de un
 * proveedor (todo el mismo día), "Recién llegados" muestra lo que el equipo marcó como destacado y no las primeras filas
 * de su Excel. `dia` da el día de cada producto ('AAAA-MM-DD').
 */
export function porDiaYDestacado<T extends { createdAt: string; isFeatured: boolean }>(productos: readonly T[], dia: (p: T) => string): T[] {
  return [...productos].sort((a, b) => {
    const da = dia(a);
    const db = dia(b);
    if (da !== db) return da < db ? 1 : -1;
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
  });
}

/**
 * De todo un poco: recorre `productos` en su orden y deja como mucho `porGrupo` de cada grupo (un departamento, como
 * Ferretería, o una categoría suelta). Lo que sobra de un grupo no se repone: queda para su vitrina o su estante, más abajo.
 */
export function variados<T>(productos: readonly T[], grupo: (p: T) => string, porGrupo: number): T[] {
  const cuenta = new Map<string, number>();
  return productos.filter((p) => {
    const g = grupo(p);
    const n = cuenta.get(g) ?? 0;
    if (n >= porGrupo) return false;
    cuenta.set(g, n + 1);
    return true;
  });
}
