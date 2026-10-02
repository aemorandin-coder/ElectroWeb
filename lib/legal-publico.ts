// Páginas legales públicas editables (C-160): /terminos y /privacidad. Solo servidor.
// Son documentos de la tabla `legal_documents` (el mismo sistema de versiones de C-103), pero **no se firman**: se leen.
// Si la base todavía no tiene el documento, se crea la primera vez que se pide con el texto que ya estaba publicado
// (`legal-publico-textos.ts`); desde entonces se edita en Legal → Documentos → "Nueva versión".
// Los datos de contacto y los plazos salen de Configuración y del código con `{{variables}}`: no se escriben a mano.

import type { LegalDocument } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashContenido } from '@/lib/legal-docs';
import { reemplazarVariables } from '@/lib/legal-docs-core';
import { getPublicSettings, type PublicSettings } from '@/lib/site-settings';
import { CONDITION_HELP, DEFAULT_WARRANTY_DAYS, GRADE_DEFINITION } from '@/lib/product-condition';
import { PAGINAS_LEGALES_PUBLICAS, TEXTOS_LEGALES_INICIALES } from '@/lib/legal-publico-textos';

export { esPaginaLegalPublica, PAGINAS_LEGALES_PUBLICAS, SLUG_PRIVACIDAD, SLUG_TERMINOS } from '@/lib/legal-publico-textos';

/** Para el editor del panel: qué `{{variable}}` se puede usar y de dónde sale. */
export const VARIABLES_LEGALES_AYUDA: { nombre: string; origen: string }[] = [
  { nombre: 'correo', origen: 'Correo de contacto (Configuración → Negocio)' },
  { nombre: 'whatsapp', origen: 'WhatsApp (Configuración → Negocio)' },
  { nombre: 'telefono', origen: 'Teléfono (Configuración → Negocio)' },
  { nombre: 'direccion', origen: 'Dirección, ciudad y estado (Configuración → Negocio)' },
  { nombre: 'horario', origen: 'Horario de atención (Configuración → Negocio)' },
  { nombre: 'garantia_nuevo', origen: 'Días de garantía por defecto de un producto nuevo' },
  { nombre: 'garantia_reacondicionado', origen: 'Días de garantía por defecto de un reacondicionado' },
  { nombre: 'garantia_usado', origen: 'Días de garantía por defecto de un usado' },
  { nombre: 'ayuda_caja_abierta', origen: 'Qué significa "caja abierta"' },
  { nombre: 'ayuda_reacondicionado', origen: 'Qué significa "reacondicionado"' },
  { nombre: 'ayuda_usado', origen: 'Qué significa "usado"' },
  { nombre: 'definicion_excelente', origen: 'Estado estético "Excelente"' },
  { nombre: 'definicion_muy_bueno', origen: 'Estado estético "Muy bueno"' },
  { nombre: 'definicion_bueno', origen: 'Estado estético "Bueno"' },
];

const DIAS: [string, string][] = [
  ['monday', 'Lunes'], ['tuesday', 'Martes'], ['wednesday', 'Miércoles'], ['thursday', 'Jueves'],
  ['friday', 'Viernes'], ['saturday', 'Sábado'], ['sunday', 'Domingo'],
];

/** "09:00" → "9:00 AM", "19:00" → "7:00 PM" */
function hora12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** "Lunes a Sábado 9:00 AM - 7:00 PM": los días seguidos con el mismo horario van juntos. Null si no hay horario. */
export function resumenHorario(horarios: PublicSettings['businessHours']): string | null {
  if (!horarios) return null;
  const abiertos = DIAS.filter(([clave]) => horarios[clave]?.enabled && horarios[clave].open && horarios[clave].close);
  if (abiertos.length === 0) return null;
  const grupos: { desde: string; hasta: string; horas: string; ultimo: number }[] = [];
  for (const [clave, nombre] of abiertos) {
    const indice = DIAS.findIndex(([k]) => k === clave);
    const horas = `${hora12(horarios[clave].open)} - ${hora12(horarios[clave].close)}`;
    const g = grupos[grupos.length - 1];
    if (g && g.horas === horas && g.ultimo === indice - 1) { g.hasta = nombre; g.ultimo = indice; }
    else grupos.push({ desde: nombre, hasta: nombre, horas, ultimo: indice });
  }
  return grupos.map((g) => `${g.desde === g.hasta ? g.desde : `${g.desde} a ${g.hasta}`} ${g.horas}`).join('; ');
}

/** Dirección completa, sin repetir la ciudad o el estado si la dirección ya los trae. */
function direccionCompleta(s: PublicSettings): string | null {
  const direccion = s.address ?? '';
  const extra = [s.city, s.state, 'Venezuela'].filter((p): p is string => Boolean(p) && !direccion.toLowerCase().includes(String(p).toLowerCase()));
  const completa = [direccion, ...extra].filter(Boolean).join(', ');
  return completa || null;
}

/** Los datos que el texto puede usar con `{{nombre}}`. */
export function variablesLegales(s: PublicSettings): Record<string, string | null> {
  return {
    correo: s.email,
    whatsapp: s.whatsapp,
    telefono: s.phone,
    direccion: direccionCompleta(s),
    horario: resumenHorario(s.businessHours),
    garantia_nuevo: String(DEFAULT_WARRANTY_DAYS.NEW),
    garantia_reacondicionado: String(DEFAULT_WARRANTY_DAYS.REFURBISHED),
    garantia_usado: String(DEFAULT_WARRANTY_DAYS.USED),
    ayuda_caja_abierta: CONDITION_HELP.OPEN_BOX,
    ayuda_reacondicionado: CONDITION_HELP.REFURBISHED,
    ayuda_usado: CONDITION_HELP.USED,
    definicion_excelente: GRADE_DEFINITION.EXCELLENT,
    definicion_muy_bueno: GRADE_DEFINITION.VERY_GOOD,
    definicion_bueno: GRADE_DEFINITION.GOOD,
  };
}

/**
 * La versión vigente de una página legal. Si la base no la tiene, la crea con el texto inicial (la versión que ya
 * estaba publicada). Dos peticiones a la vez chocan en slug + versión (único): la segunda lee la que creó la primera.
 */
export async function paginaLegalVigente(slug: string): Promise<LegalDocument | null> {
  const inicial = TEXTOS_LEGALES_INICIALES[slug];
  if (!inicial) return null;
  const actual = await prisma.legalDocument.findFirst({ where: { slug, isCurrent: true }, orderBy: { version: 'desc' } });
  if (actual) return actual;
  try {
    return await prisma.legalDocument.create({
      data: {
        slug,
        version: inicial.version,
        title: inicial.title,
        content: inicial.content,
        contentHash: hashContenido(inicial.title, inicial.content),
        requiredFor: null,
        publishedAt: inicial.publishedAt,
      },
    });
  } catch {
    return prisma.legalDocument.findFirst({ where: { slug, isCurrent: true }, orderBy: { version: 'desc' } });
  }
}

/** Para el panel: asegura que las dos páginas existan para poder editarlas. */
export async function asegurarPaginasLegales(): Promise<void> {
  await Promise.all(PAGINAS_LEGALES_PUBLICAS.map((slug) => paginaLegalVigente(slug)));
}

export interface PaginaLegal {
  title: string;
  version: number;
  publishedAt: Date;
  /** El texto con los datos de Configuración ya puestos */
  contenido: string;
}

/**
 * Lo que muestra /terminos o /privacidad: la versión vigente con sus `{{variables}}` resueltas. Si la base no
 * responde, el texto que ya estaba publicado: estas páginas no se caen (antes eran estáticas).
 */
export async function paginaLegal(slug: string): Promise<PaginaLegal | null> {
  const inicial = TEXTOS_LEGALES_INICIALES[slug];
  if (!inicial) return null;
  const settings = await getPublicSettings();
  let doc: { title: string; version: number; publishedAt: Date; content: string } = inicial;
  try {
    doc = (await paginaLegalVigente(slug)) ?? inicial;
  } catch (error) {
    console.error('Error leyendo la página legal:', error);
  }
  return { title: doc.title, version: doc.version, publishedAt: doc.publishedAt, contenido: reemplazarVariables(doc.content, variablesLegales(settings)) };
}
