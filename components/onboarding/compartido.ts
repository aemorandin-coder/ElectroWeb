// C-257: lo que comparten las piezas del kit de onboarding (el recorrido de bienvenida y la hoja "Así funciona").
// Sin React: funciones del navegador.

/** Primer elemento visible del selector (el mismo data-tour existe en la PC y en el teléfono). */
export function objetivoVisible(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight && getComputedStyle(el).visibility !== 'hidden') return el;
  }
  return null;
}

/**
 * Otro diálogo visible (por ejemplo el popup del home, o la otra pieza del kit). Los cajones cerrados del header siguen
 * en el DOM fuera de la pantalla: no cuentan. Se pregunta antes de abrir, así la pieza que pregunta todavía no está.
 */
export function hayOtroDialogoAbierto(): boolean {
  return [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')].some((d) => {
    if (d.closest('[inert], [aria-hidden="true"]')) return false;
    const r = d.getBoundingClientRect();
    const estilo = getComputedStyle(d);
    return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight && estilo.visibility !== 'hidden' && estilo.opacity !== '0';
  });
}

/** Las guías ya vistas se recuerdan en este navegador. Sin almacenamiento, la guía puede volver a salir: no es grave. */
export function yaVista(clave: string): boolean {
  try {
    // "todo": quien ya vio todas las guías (también lo pone la prueba de punta a punta, scripts/e2e/lib.ts)
    return localStorage.getItem('electroweb_guias') === 'todo' || localStorage.getItem(clave) === '1';
  } catch {
    return true;
  }
}

export function marcarVista(clave: string) {
  try {
    localStorage.setItem(clave, '1');
  } catch {
    // Sin almacenamiento: no pasa nada
  }
}

/** El Tab da la vuelta dentro del diálogo: la página de atrás no se puede tocar mientras está abierto */
export function atraparTab(e: KeyboardEvent, raiz: HTMLElement | null) {
  if (e.key !== 'Tab' || !raiz) return;
  const botones = [...raiz.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')];
  if (!botones.length) return;
  const primero = botones[0];
  const ultimo = botones[botones.length - 1];
  const activo = document.activeElement;
  if (!raiz.contains(activo)) {
    e.preventDefault();
    primero.focus();
  } else if (e.shiftKey && activo === primero) {
    e.preventDefault();
    ultimo.focus();
  } else if (!e.shiftKey && activo === ultimo) {
    e.preventDefault();
    primero.focus();
  }
}

/** El recorrido de bienvenida de la tienda (C-89): su clave se mantiene, así quien ya lo vio no lo vuelve a ver */
export const CLAVE_RECORRIDO = 'electroweb_onboarding_done';
export const claveAsiFunciona = (pagina: string) => `electroweb_asi_funciona_${pagina}`;
