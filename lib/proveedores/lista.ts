// C-196: la lista de un proveedor (su Excel de precios y su listado de existencia), leída en el navegador y revisada en
// el servidor. Módulo puro: sin base de datos, para que la pantalla y la API usen las mismas reglas.

import { normalizar } from '@/lib/cotizaciones/busqueda';

/** Una fila de la lista del proveedor, ya leída. Lo que falta es null (un archivo de existencia no trae precio). */
export interface FilaProveedor {
  codigo: string;
  nombre: string;
  precioLista: number | null;
  existencia: number | null;
  departamento: string | null;
  unidad: string | null;
  /** Opcionales, para dejar el producto listo para el envío y el catálogo (los trae el archivo de los 60, no el del proveedor) */
  categoria: string | null;
  marca: string | null;
  pesoKg: number | null;
  /** Largo, ancho y alto de la caja en cm */
  medidas: [number, number, number] | null;
}

export type CampoLista = 'codigo' | 'nombre' | 'precio' | 'existencia' | 'departamento' | 'unidad' | 'categoria' | 'marca' | 'peso' | 'largo' | 'ancho' | 'alto';
/** Columna de cada campo en el archivo (índice desde 0); undefined = el archivo no lo trae */
export type Columnas = Partial<Record<CampoLista, number>>;

export const ETIQUETA_CAMPO: Record<CampoLista, string> = {
  codigo: 'Código',
  nombre: 'Nombre',
  precio: 'Precio de lista',
  existencia: 'Existencia',
  departamento: 'Departamento',
  unidad: 'Unidad',
  categoria: 'Categoría en la tienda',
  marca: 'Marca',
  peso: 'Peso (kg)',
  largo: 'Largo (cm)',
  ancho: 'Ancho (cm)',
  alto: 'Alto (cm)',
};

export const LISTA_MAX_FILAS = 20_000;
/** Filas por pedido al servidor */
export const LOTE_REVISAR = 1_000;
export const LOTE_CREAR = 100;
export const LOTE_ACTUALIZAR = 500;
export const CODIGO_MAX = 64;
export const NOMBRE_MAX = 200;
export const DESCUENTO_MAX = 90;
export const MARGEN_MAX = 300;
export const RESERVA_MAX = 20;
/** Los topes del asistente para un físico (lib/validations y el paso de envío) */
export const PESO_MAX = 500;
export const MEDIDA_MAX = 500;

/**
 * Qué columna es cada campo, por el encabezado. "Existencia Actual" gana a las otras existencias (mínima, máxima,
 * ordenada, comprometida) y "Referencia" no se toma como código: en la lista de la ferretería es una fecha.
 */
export function detectarColumnas(encabezados: string[]): Columnas {
  const h = encabezados.map((e) => normalizar(String(e ?? '')).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim());
  const primero = (prueba: (x: string) => boolean, excluir: number[] = []) => {
    const i = h.findIndex((x, idx) => x !== '' && !excluir.includes(idx) && prueba(x));
    return i >= 0 ? i : undefined;
  };
  const col: Columnas = {};
  col.codigo = primero((x) => x === 'codigo' || x === 'cod' || x.startsWith('codigo ') || x === 'sku' || x === 'item' || x === 'articulo cod');
  const usadas = () => Object.values(col).filter((v): v is number => v !== undefined);
  col.nombre = primero((x) => /^(nombre|descripcion|producto|articulo|denominacion)( |$)/.test(x), usadas());
  col.precio = primero((x) => /^precio maximo/.test(x), usadas())
    ?? primero((x) => /^(precio|pvp|p v p|costo)( |$)/.test(x), usadas());
  col.existencia = primero((x) => /^existencia actual/.test(x), usadas())
    ?? primero((x) => /^existencia/.test(x) && !/(minima|maxima|ordenada|comprometida|pedida)/.test(x), usadas())
    ?? primero((x) => /^(stock|disponible|cantidad|inventario)( |$)/.test(x), usadas());
  col.departamento = primero((x) => /^(dpto|departamento|depto|linea|familia|grupo)( |$)/.test(x), usadas());
  col.unidad = primero((x) => /^(und|unidad|u m|um)( |$)/.test(x), usadas());
  col.categoria = primero((x) => /^categoria/.test(x), usadas());
  col.marca = primero((x) => /^marca( |$)/.test(x), usadas());
  col.peso = primero((x) => /^peso/.test(x), usadas());
  col.largo = primero((x) => /^largo/.test(x), usadas());
  col.ancho = primero((x) => /^ancho/.test(x), usadas());
  col.alto = primero((x) => /^alto/.test(x), usadas());
  for (const k of Object.keys(col) as CampoLista[]) if (col[k] === undefined) delete col[k];
  return col;
}

/**
 * Un número de una celda: 54.9, "54,90", "1.234,56", "$ 12", "1,234.56". Vacío o texto → null.
 * Como escribe un sistema en español: "1.234" son miles y "0,751" lleva coma decimal.
 */
export function leerNumeroCelda(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== 'string') return null;
  let t = valor.trim().replace(/[\s$]|USD|Bs\.?/gi, '');
  if (!t) return null;
  const punto = t.lastIndexOf('.'), coma = t.lastIndexOf(',');
  if (punto >= 0 && coma >= 0) {
    t = coma > punto ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else if (coma >= 0) {
    // Una sola coma es la coma decimal ("0,751", "54,90"); varias, separadores de miles ("1,234,567")
    t = /^-?[1-9]\d{0,2}(,\d{3}){2,}$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
  } else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '');
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * El nombre como viene, sin los caracteres que el sistema del proveedor estropea: "CU;ETE" y "BA¥O" son CUÑETE y BAÑO.
 * Sin espacios dobles y con un tope de largo. No cambia mayúsculas: el nombre para la tienda lo escribe el equipo.
 */
export function limpiarNombre(nombre: string): string {
  return nombre
    .replace(/¥/g, 'Ñ')
    .replace(/([A-Za-zÁÉÍÓÚáéíóú]);(?=[A-Za-zÁÉÍÓÚáéíóú])/g, '$1Ñ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NOMBRE_MAX);
}

/** "HERR - HERR" → "HERR"; "RESP - RESPUESTOS" → "RESPUESTOS" */
export function limpiarDepartamento(valor: string): string | null {
  const partes = valor.split(' - ').map((p) => p.trim()).filter(Boolean);
  if (partes.length === 0) return null;
  const elegido = partes.length === 2 && partes[0] === partes[1] ? partes[0] : partes[partes.length - 1];
  return elegido.slice(0, 60);
}

/** El código tal cual, sin espacios al borde. Vacío, con caracteres de control o demasiado largo → null */
export function limpiarCodigo(valor: unknown): string | null {
  const t = (typeof valor === 'number' ? String(valor) : typeof valor === 'string' ? valor : '').trim();
  if (!t || t.length > CODIGO_MAX || /[\u0000-\u001f\u007f]/.test(t)) return null;
  return t;
}

/** Las filas de una hoja (la primera fila son los encabezados) con las columnas elegidas. Sin código, la fila no cuenta. */
export function leerFilas(hoja: unknown[][], columnas: Columnas): FilaProveedor[] {
  const filas: FilaProveedor[] = [];
  const vistos = new Set<string>();
  const celda = (fila: unknown[], campo: CampoLista) => (columnas[campo] === undefined ? undefined : fila[columnas[campo] as number]);
  for (const fila of hoja.slice(1)) {
    if (!Array.isArray(fila)) continue;
    const codigo = limpiarCodigo(celda(fila, 'codigo'));
    if (!codigo || vistos.has(codigo)) continue;
    vistos.add(codigo);
    const precio = leerNumeroCelda(celda(fila, 'precio'));
    const existencia = leerNumeroCelda(celda(fila, 'existencia'));
    const dpto = celda(fila, 'departamento');
    const und = celda(fila, 'unidad');
    const texto = (campo: CampoLista, max: number) => {
      const v = celda(fila, campo);
      return typeof v === 'string' && v.trim() ? limpiarNombre(v).slice(0, max) : null;
    };
    const peso = leerNumeroCelda(celda(fila, 'peso'));
    const lados = (['largo', 'ancho', 'alto'] as const).map((c) => leerNumeroCelda(celda(fila, c)));
    filas.push({
      codigo,
      nombre: limpiarNombre(String(celda(fila, 'nombre') ?? '')),
      precioLista: precio !== null && precio >= 0 ? precio : null,
      existencia: existencia !== null ? Math.max(0, existencia) : null,
      departamento: typeof dpto === 'string' && dpto.trim() ? limpiarDepartamento(dpto.trim()) : null,
      unidad: typeof und === 'string' && und.trim() ? und.trim().slice(0, 20) : null,
      categoria: texto('categoria', 80),
      marca: texto('marca', 60),
      pesoKg: peso !== null && peso > 0 && peso <= PESO_MAX ? peso : null,
      medidas: lados.every((x): x is number => x !== null && x > 0 && x <= MEDIDA_MAX) ? [lados[0], lados[1], lados[2]] as [number, number, number] : null,
    });
    if (filas.length >= LISTA_MAX_FILAS) break;
  }
  return filas;
}

/**
 * Junta dos listas del mismo proveedor por código: la de precios y la de existencia. El precio sale de la que lo trae,
 * igual la existencia; el nombre y el departamento, de la primera que los tenga.
 */
export function unirListas(...listas: FilaProveedor[][]): FilaProveedor[] {
  const porCodigo = new Map<string, FilaProveedor>();
  for (const lista of listas) {
    for (const f of lista) {
      const previa = porCodigo.get(f.codigo);
      if (!previa) { porCodigo.set(f.codigo, { ...f }); continue; }
      previa.nombre ||= f.nombre;
      previa.precioLista ??= f.precioLista;
      previa.existencia ??= f.existencia;
      previa.departamento ??= f.departamento;
      previa.unidad ??= f.unidad;
      previa.categoria ??= f.categoria;
      previa.marca ??= f.marca;
      previa.pesoKg ??= f.pesoKg;
      previa.medidas ??= f.medidas;
    }
  }
  return [...porCodigo.values()];
}

const centavos = (n: number) => Math.round(n * 100) / 100;

/** Lo que cuesta: el precio de su lista menos el descuento que da el proveedor */
export function costoDesdeLista(precioLista: number | null, descuentoPercent: number): number | null {
  if (precioLista === null || !(precioLista > 0)) return null;
  const d = Math.min(Math.max(descuentoPercent, 0), DESCUENTO_MAX);
  return centavos(precioLista * (1 - d / 100));
}

/**
 * Lo que se publica de su existencia: entera y con unidades de reserva para su mostrador (la existencia es compartida).
 * Sin el dato, null: no se toca.
 */
export function existenciaPublicable(existencia: number | null, reserva: number): number | null {
  if (existencia === null) return null;
  return Math.max(0, Math.floor(existencia) - Math.max(0, Math.floor(reserva)));
}

/** El prefijo de los SKU de un proveedor: las tres primeras letras de su nombre ("Ferretería X" → "FER") */
export function prefijoSku(nombreProveedor: string): string {
  const letras = normalizar(nombreProveedor).replace(/[^a-z0-9]/g, '').toUpperCase();
  return (letras.slice(0, 3) || 'PRV').padEnd(3, 'X');
}

/** SKU de un producto que viene de la lista: prefijo del proveedor y su código ("FER-R023127") */
export function skuDesdeCodigo(prefijo: string, codigo: string): string {
  return `${prefijo}-${codigo.toUpperCase().replace(/[^A-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '')}`.slice(0, 60);
}

/**
 * El código de una foto por su nombre: "R023127.jpg", "R023127-2.jpg", "R023127 (2).png" o "R023127_3.webp".
 * Devuelve el nombre sin extensión y, si termina en un número de foto, también el código sin ese número y el orden.
 */
export function codigoDeFoto(nombreArchivo: string): { entero: string; base: string | null; orden: number } {
  const entero = nombreArchivo.replace(/\.[a-z0-9]{2,5}$/i, '').trim();
  const m = /^(.+?)[\s_-]*[(]?(\d{1,2})[)]?$/.exec(entero);
  const conNumero = m && /[\s_(-]/.test(entero.slice(m[1].length, entero.length - m[2].length - (entero.endsWith(')') ? 1 : 0)) || '')
    ? { base: m[1].trim(), orden: Number(m[2]) } : null;
  return { entero, base: conNumero?.base ?? null, orden: conNumero?.orden ?? 1 };
}
