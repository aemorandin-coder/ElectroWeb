// C-204: lo que le falta a un borrador para publicarse, en la lista de control de la carga masiva. Es lo que eligió
// Andrés el 12/11: cada borrador dice qué le falta (foto, modelo, peso y medidas, descripción, nombre sin ámbar) y
// "Publicar los listos" publica en lote solo los completos. El servidor lo vuelve a revisar antes de publicar.
// Módulo puro: lo usan la pantalla y la API.

import { normalizar } from '@/lib/cotizaciones/busqueda';
import { revisarNombre } from '@/lib/nombres/producto';
import { FICHA_WEB_KEY } from '@/lib/product-specs';

export type Falta = 'foto' | 'precio' | 'descripcion' | 'peso-medidas' | 'nombre' | 'marca-modelo' | 'ficha-web';

export const ETIQUETA_FALTA: Record<Falta, string> = {
  foto: 'Foto',
  precio: 'Precio',
  descripcion: 'Descripción',
  'peso-medidas': 'Peso y medidas de la caja',
  nombre: 'Nombre en mayúsculas o con abreviaturas',
  'marca-modelo': 'Marca o modelo',
  'ficha-web': 'Revisar lo que trajo la web',
};

/** Menos que esto no es una descripción: es un nombre repetido */
export const DESCRIPCION_MIN = 40;

/** Lo que dejó la búsqueda en la web en el borrador (va en specs, como dato interno: no sale a la tienda) */
export interface FichaWeb {
  fecha: string;
  /** false hasta que alguien la mira: con lo que trajo la web sin revisar no se publica */
  revisada: boolean;
  /** Qué llenó: descripción, especificaciones, marca, código de barras, peso, medidas */
  llenado: string[];
  fuentes: Array<{ dominio: string; url: string; titulo: string }>;
  redaccion: 'ia' | 'reglas';
  avisos: string[];
}

export function leerFichaWeb(specs: Record<string, unknown>): FichaWeb | null {
  const f = specs[FICHA_WEB_KEY];
  if (!f || typeof f !== 'object' || Array.isArray(f)) return null;
  const v = f as Record<string, unknown>;
  const textos = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []);
  return {
    fecha: typeof v.fecha === 'string' ? v.fecha : '',
    revisada: v.revisada !== false,
    llenado: textos(v.llenado),
    fuentes: Array.isArray(v.fuentes)
      ? v.fuentes.flatMap((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        return typeof o.url === 'string' && /^https?:\/\//.test(o.url)
          ? [{ dominio: String(o.dominio ?? ''), url: o.url, titulo: String(o.titulo ?? '') }] : [];
      })
      : [],
    redaccion: v.redaccion === 'ia' ? 'ia' : 'reglas',
    avisos: textos(v.avisos),
  };
}

/** El modelo del producto: la especificación "Modelo" (la que muestra la ficha en "De un vistazo") */
export function modeloDe(specs: Record<string, unknown>): string | null {
  for (const [clave, valor] of Object.entries(specs)) {
    if (normalizar(clave) === 'modelo' && typeof valor === 'string' && valor.trim()) return valor.trim();
  }
  return null;
}

/** Las medidas de la caja guardadas ({"length":…,"width":…,"height":…}), si están las tres */
export function medidasCompletas(dimensions: string | null | undefined): boolean {
  if (!dimensions) return false;
  try {
    const d = JSON.parse(dimensions) as Record<string, unknown>;
    return [d.length, d.width, d.height].every((x) => Number(x) > 0);
  } catch {
    return false;
  }
}

export interface DatosBorrador {
  name: string;
  description: string | null;
  fotos: number;
  priceUSD: number;
  weightKg: number | null;
  dimensions: string | null;
  marca: string | null;
  specs: Record<string, unknown>;
}

export interface RevisionBorrador {
  faltan: Falta[];
  /** Tiene la marca pero no el modelo: no frena (la regla del 10/11 pide marca o modelo), pero se dice */
  sinModelo: boolean;
  listo: boolean;
}

export function revisarBorrador(p: DatosBorrador): RevisionBorrador {
  const faltan: Falta[] = [];
  if (p.fotos <= 0) faltan.push('foto');
  if (!(p.priceUSD > 0)) faltan.push('precio');
  if ((p.description ?? '').trim().length < DESCRIPCION_MIN) faltan.push('descripcion');
  if (!(Number(p.weightKg) > 0) || !medidasCompletas(p.dimensions)) faltan.push('peso-medidas');
  const nombre = revisarNombre(p.name);
  if (!p.name.trim() || nombre.mayusculas || nombre.abreviaturas.length > 0) faltan.push('nombre');
  const modelo = modeloDe(p.specs);
  if (!p.marca && !modelo) faltan.push('marca-modelo');
  const ficha = leerFichaWeb(p.specs);
  if (ficha && !ficha.revisada) faltan.push('ficha-web');
  return { faltan, sinModelo: Boolean(p.marca) && !modelo, listo: faltan.length === 0 };
}
