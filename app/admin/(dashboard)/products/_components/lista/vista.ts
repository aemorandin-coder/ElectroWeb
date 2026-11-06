// C-187: la vista de la lista de productos (pestaña, filtro, categoría y búsqueda) vive en la dirección. El editor vuelve a
// la misma vista al guardar: antes volvía siempre a "Todos", sin la búsqueda, y había que filtrar otra vez cada vez.

export type Pestana = 'local' | 'sades' | 'papelera';

const CLAVE = 'admin:productos:vista';
const BASE = '/admin/products';

/** La dirección de la lista con esta vista (sin parámetros cuando es la de siempre) */
export function direccionDeVista(v: { pestana: Pestana; filtro: string; categoria: string; busqueda: string }): string {
  const params = new URLSearchParams();
  if (v.pestana !== 'local') params.set('pestana', v.pestana);
  if (v.filtro !== 'todos') params.set('filtro', v.filtro);
  if (v.categoria) params.set('categoria', v.categoria);
  if (v.busqueda.trim()) params.set('q', v.busqueda.trim());
  const qs = params.toString();
  return qs ? `${BASE}?${qs}` : BASE;
}

/** Recuerda la vista en esta pestaña del navegador (si el navegador no deja, no pasa nada) */
export function recordarVista(direccion: string): void {
  try { sessionStorage.setItem(CLAVE, direccion); } catch { /* sin almacenamiento */ }
}

/** A dónde vuelve el editor al guardar: la última vista de la lista, o la lista sin filtros */
export function vistaRecordada(): string {
  try {
    const v = sessionStorage.getItem(CLAVE);
    if (v && (v === BASE || v.startsWith(`${BASE}?`))) return v;
  } catch { /* sin almacenamiento */ }
  return BASE;
}
