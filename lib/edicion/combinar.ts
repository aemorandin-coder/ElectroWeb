// C-169: combinar lo que cambié con lo que cambió otra persona mientras tenía el mismo formulario abierto. Módulo puro.
//
// Tres versiones de cada campo: la BASE (como estaba cuando abrí el formulario), la MÍA (lo que tengo ahora) y la SUYA (lo que
// hay ahora en el servidor). Reglas, campo por campo:
//   - yo no lo toqué                         → queda el suyo (el cambio de la otra persona entra solo)
//   - yo lo cambié y la otra persona no      → queda el mío
//   - los dos lo dejamos igual de distinto   → queda ese valor
//   - los dos lo cambiamos y no coinciden    → CONFLICTO: hay que elegir (por defecto queda el mío)
// Los campos que son listas u objetos (fotos, especificaciones, montos) se comparan enteros: dentro de una lista no se mezcla.

/** JSON con las claves ordenadas: dos objetos con lo mismo en otro orden son iguales */
function estable(valor: unknown): string {
  return JSON.stringify(valor, (_clave, v: unknown) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    }
    return v;
  });
}

export function iguales(a: unknown, b: unknown): boolean {
  return estable(a) === estable(b);
}

export interface ConflictoDeCampo<T> {
  campo: keyof T & string;
  base: unknown;
  mio: unknown;
  suyo: unknown;
}

export interface ResultadoCombinar<T> {
  /** Lo que se guardaría: lo mío, más lo suyo en lo que yo no toqué. En un conflicto queda lo mío */
  combinado: T;
  /** Campos que cambié yo (y la otra persona no) */
  mios: Array<keyof T & string>;
  /** Campos que cambió la otra persona (y yo no) */
  suyos: Array<keyof T & string>;
  conflictos: Array<ConflictoDeCampo<T>>;
}

export function combinar<T extends object>(base: T, mio: T, suyo: T): ResultadoCombinar<T> {
  const b = base as Record<string, unknown>;
  const m = mio as Record<string, unknown>;
  const s = suyo as Record<string, unknown>;
  const combinado: Record<string, unknown> = {};
  const mios: string[] = [];
  const suyos: string[] = [];
  const conflictos: Array<ConflictoDeCampo<T>> = [];

  for (const campo of new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(s)])) {
    const yoCambie = !iguales(m[campo], b[campo]);
    const ellaCambio = !iguales(s[campo], b[campo]);
    if (!yoCambie) {
      combinado[campo] = s[campo];
      if (ellaCambio) suyos.push(campo);
    } else if (!ellaCambio || iguales(m[campo], s[campo])) {
      combinado[campo] = m[campo];
      if (!ellaCambio) mios.push(campo);
    } else {
      combinado[campo] = m[campo];
      conflictos.push({ campo: campo as keyof T & string, base: b[campo], mio: m[campo], suyo: s[campo] });
    }
  }
  return { combinado: combinado as T, mios: mios as Array<keyof T & string>, suyos: suyos as Array<keyof T & string>, conflictos };
}
