// C-249d: lo que comparten la lista de campañas y su asistente por pasos. Cliente y servidor (sin Prisma).
//
// Las reglas de un bloque son las de `bloqueSchema` en lib/email-campaigns.ts (que no se puede importar aquí: lleva
// Prisma y node:crypto). Sirven para decir en cada paso qué falta; el servidor vuelve a validar al guardar y al probar.

export type Bloque =
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'texto'; texto: string }
  | { tipo: 'imagen'; url: string; alt: string; enlace?: string }
  | { tipo: 'boton'; texto: string; url: string };

export interface Contenido { subject: string; preheader: string; bloques: Bloque[] }

/** Una campaña nueva: el saludo, un texto y el botón a la tienda, como antes */
export const NUEVA: Contenido = {
  subject: '',
  preheader: '',
  bloques: [
    { tipo: 'titulo', texto: 'Hola {nombre}' },
    { tipo: 'texto', texto: '' },
    { tipo: 'boton', texto: 'Ver ofertas', url: '/productos' },
  ],
};

// C-191: por qué cada cliente recibe o no las campañas (lib/email-campaigns.ts, resumenAudiencia)
export interface Audiencia { clientes: number; aceptan: number; sinDecidir: number; dijeronQueNo: number; sinVerificar: number }

export const clientes = (n: number) => `${n} ${n === 1 ? 'cliente' : 'clientes'}`;

export const NOMBRE_BLOQUE: Record<Bloque['tipo'], string> = { titulo: 'Título', texto: 'Texto', imagen: 'Imagen', boton: 'Botón' };

const RUTA_IMAGEN = /^\/(?:api\/)?uploads\/(?:[\w-]+\/)*[\w-][\w.-]*$/;
const IMAGEN_HTTPS = /^https:\/\/[^\s"'<>]+$/i;
const ENLACE_WEB = /^https?:\/\/[^\s"'<>]+$/i;
const RUTA_TIENDA = /^\/(?!\/)[^\s"'<>]*$/;

export const enlaceValido = (v: string) => { const t = v.trim(); return t.length <= 500 && (ENLACE_WEB.test(t) || RUTA_TIENDA.test(t)); };

/** El bloque tiene lo mínimo para verse (mientras se escribe, la vista previa salta los vacíos) */
export function bloqueLleno(b: Bloque): boolean {
  if (b.tipo === 'imagen') return b.url.trim() !== '';
  if (b.tipo === 'boton') return b.texto.trim() !== '' && b.url.trim() !== '';
  return b.texto.trim() !== '';
}

/** Lo que le falta a un bloque, con las reglas del servidor; null si está bien */
export function problemaDeBloque(b: Bloque): string | null {
  if (b.tipo === 'titulo') return !b.texto.trim() ? 'está vacío' : b.texto.trim().length > 150 ? 'pasa de 150 letras' : null;
  if (b.tipo === 'texto') return !b.texto.trim() ? 'está vacío' : b.texto.trim().length > 4000 ? 'pasa de 4.000 letras' : null;
  if (b.tipo === 'imagen') {
    const url = b.url.trim();
    if (!url) return 'no tiene la foto: súbela';
    if (url.length > 500 || !(RUTA_IMAGEN.test(url) || IMAGEN_HTTPS.test(url))) return 'tiene una foto que no es de la tienda: súbela otra vez';
    if (b.enlace?.trim() && !enlaceValido(b.enlace)) return 'tiene un enlace inválido: usa https://… o una ruta como /productos';
    return null;
  }
  if (!b.texto.trim()) return 'no tiene texto';
  if (b.texto.trim().length > 40) return 'pasa de 40 letras';
  if (!b.url.trim()) return 'no tiene enlace';
  return enlaceValido(b.url) ? null : 'tiene un enlace inválido: usa https://… o una ruta como /productos';
}

/** Lo que le falta al contenido para seguir (el primer problema, como el servidor); null si está completo */
export function problemaContenido(bloques: Bloque[]): string | null {
  if (bloques.length === 0) return 'Agrega al menos un bloque.';
  if (bloques.length > 30) return 'Son 30 bloques como máximo.';
  for (let i = 0; i < bloques.length; i++) {
    const p = problemaDeBloque(bloques[i]);
    if (p) return `El bloque ${i + 1} (${NOMBRE_BLOQUE[bloques[i].tipo].toLowerCase()}) ${p}.`;
  }
  return null;
}

/** "Título, texto y botón" */
export function bloquesEnPalabras(bloques: Bloque[]): string {
  if (bloques.length === 0) return 'Sin bloques';
  const nombres = bloques.map((b, i) => (i === 0 ? NOMBRE_BLOQUE[b.tipo] : NOMBRE_BLOQUE[b.tipo].toLowerCase()));
  return nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
