// Avisos de la Content-Security-Policy (C-166): lectura, limpieza y guardado agrupado. Solo servidor.
//
// /api/csp-report es pública (la llaman los navegadores de los visitantes, sin sesión), así que todo lo que llega es
// dato no confiable: se lee con un tope de tamaño, se descarta lo que no sea de esta tienda o venga de una extensión del
// navegador, se reduce a un puñado de campos cortos y solo se guarda un conteo por (directiva, a quién se bloquea, página).
// Hay un tope de filas: un atacante que mande miles de avisos distintos no puede llenar la base.
import { prisma } from '@/lib/prisma';
import { siteUrl } from '@/lib/seo';

export const MAX_BYTES_AVISO = 20_000;
export const MAX_AVISOS_POR_ENVIO = 20;
export const MAX_FILAS = 400;

export interface AvisoCsp {
  directive: string;
  blocked: string;
  pagePath: string;
  disposition: 'report' | 'enforce';
  sample: string | null;
}

const ESQUEMAS_DE_EXTENSION = /^(chrome-extension|moz-extension|safari-extension|safari-web-extension|webkit-masked-url|ms-browser-extension):/i;

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** A quién se bloqueó, corto y sin parámetros: "www.googletagmanager.com", "inline", "eval", "data:". */
export function normalizarBloqueado(valor: unknown): string {
  const s = texto(valor, 2000);
  if (!s || s === 'inline') return 'inline';
  if (s === 'eval' || s === 'wasm-eval') return s;
  const esquema = /^(data|blob|about|filesystem):/i.exec(s);
  if (esquema) return `${esquema[1].toLowerCase()}:`;
  try {
    const url = new URL(s);
    return `${url.hostname.slice(0, 100)}${url.protocol === 'http:' ? ' (http)' : ''}`;
  } catch {
    return 'otro';
  }
}

/** "/productos/clx8k2m4p0001abc" → "/productos/:id": agrupa por tipo de página y no guarda identificadores. */
export function normalizarRuta(pathname: string): string {
  const segmentos = pathname.split('/').filter(Boolean).slice(0, 3).map((s) => {
    const limpio = s.slice(0, 40);
    // Números, códigos de orden (ORD-2026-00123), identificadores y slugs con cifras: ninguno se guarda
    return /^\d+$/.test(limpio) || /^[0-9a-f-]{8,}$/i.test(limpio) || limpio.length >= 20 || (limpio.length > 6 && /\d/.test(limpio)) ? ':id' : limpio;
  });
  return `/${segmentos.join('/')}`;
}

function rutaPropia(documentUrl: string): string | null {
  try {
    const url = new URL(documentUrl);
    return url.hostname === new URL(siteUrl()).hostname ? normalizarRuta(url.pathname) : null;
  } catch {
    return null;
  }
}

function aviso(datos: { directive: unknown; blocked: unknown; document: unknown; disposition: unknown; source: unknown; sample: unknown }): AvisoCsp | null {
  const directiva = texto(datos.directive, 60).split(/\s+/)[0].toLowerCase();
  if (!/^[a-z-]{3,30}$/.test(directiva)) return null;
  const bloqueado = texto(datos.blocked, 2000);
  if (ESQUEMAS_DE_EXTENSION.test(bloqueado) || ESQUEMAS_DE_EXTENSION.test(texto(datos.source, 2000))) return null;
  const pagePath = rutaPropia(texto(datos.document, 2000));
  if (!pagePath) return null;
  const muestra = texto(datos.sample, 80);
  return {
    directive: directiva,
    blocked: normalizarBloqueado(bloqueado),
    pagePath,
    disposition: datos.disposition === 'enforce' ? 'enforce' : 'report',
    sample: muestra || null,
  };
}

/** Lee los dos formatos: `report-uri` ({"csp-report": {...}}) y la Reporting API ([{type: "csp-violation", body}]). */
export function extraerAvisos(cuerpo: string): AvisoCsp[] {
  let datos: unknown;
  try {
    datos = JSON.parse(cuerpo);
  } catch {
    return [];
  }
  const salida: AvisoCsp[] = [];
  const agregar = (a: AvisoCsp | null) => { if (a) salida.push(a); };

  if (esObjeto(datos) && esObjeto(datos['csp-report'])) {
    const r = datos['csp-report'];
    agregar(aviso({ directive: r['effective-directive'] ?? r['violated-directive'], blocked: r['blocked-uri'], document: r['document-uri'], disposition: r.disposition, source: r['source-file'], sample: r['script-sample'] }));
  } else if (Array.isArray(datos)) {
    for (const item of datos.slice(0, MAX_AVISOS_POR_ENVIO)) {
      if (!esObjeto(item) || item.type !== 'csp-violation' || !esObjeto(item.body)) continue;
      const b = item.body;
      agregar(aviso({ directive: b.effectiveDirective ?? b.violatedDirective, blocked: b.blockedURL, document: b.documentURL ?? item.url, disposition: b.disposition, source: b.sourceFile, sample: b.sample }));
    }
  }
  return salida.slice(0, MAX_AVISOS_POR_ENVIO);
}

/** Guarda el conteo. Con MAX_FILAS distintas, solo suma a las que ya existen. */
export async function guardarAvisos(avisos: AvisoCsp[]): Promise<number> {
  if (avisos.length === 0) return 0;
  // Los repetidos del mismo envío se suman antes de tocar la base
  const agrupados = new Map<string, { a: AvisoCsp; n: number }>();
  for (const a of avisos) {
    const clave = [a.directive, a.blocked, a.pagePath, a.disposition].join('|');
    const previo = agrupados.get(clave);
    if (previo) previo.n++;
    else agrupados.set(clave, { a, n: 1 });
  }
  let total = await prisma.cspViolation.count();
  let guardados = 0;
  for (const { a, n } of agrupados.values()) {
    const donde = { directive_blocked_pagePath_disposition: { directive: a.directive, blocked: a.blocked, pagePath: a.pagePath, disposition: a.disposition } };
    const existe = await prisma.cspViolation.findUnique({ where: donde, select: { id: true } });
    if (existe) {
      await prisma.cspViolation.update({ where: donde, data: { count: { increment: n }, lastSeen: new Date() } });
    } else if (total < MAX_FILAS) {
      await prisma.cspViolation.create({ data: { directive: a.directive, blocked: a.blocked, pagePath: a.pagePath, disposition: a.disposition, sample: a.sample, count: n } }).catch(() => undefined);
      total++;
    } else continue;
    guardados++;
  }
  // Las que no se repiten en 90 días ya no importan
  if (Math.random() < 0.02) await prisma.cspViolation.deleteMany({ where: { lastSeen: { lt: new Date(Date.now() - 90 * 24 * 3600_000) } } }).catch(() => undefined);
  return guardados;
}
