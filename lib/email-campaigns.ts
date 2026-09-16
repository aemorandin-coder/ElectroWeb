import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getBaseTemplate, sendEmail } from '@/lib/email-service';

/**
 * Campañas de correo de Marketing (C-75, decisión de Andrés del 16/09).
 * - Solo a clientes con correo verificado que aceptaron promociones (`emailPromotions`).
 * - Un correo por persona (antes la API ponía a todos en "Para") con enlace de baja y cabecera List-Unsubscribe.
 * - Envío uno a uno, con pausa entre correos y el límite diario de Configuración → Correo.
 * - Los destinatarios quedan guardados: si el servidor se reinicia a mitad, el envío se reanuda sin repetir.
 */

/* ── Contenido ──────────────────────────────────────────────────────────── */

// Imágenes: las subidas a la tienda (/api/uploads/…) o una dirección https. Los enlaces pueden ser rutas de la tienda.
const rutaImagen = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^\/api\/uploads\/[\w.-]+$/.test(v) || /^https:\/\/[^\s"'<>]+$/i.test(v), 'La imagen debe subirse a la tienda o ser una dirección https');
const enlace = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https?:\/\/[^\s"'<>]+$/i.test(v) || /^\/(?!\/)[^\s"'<>]*$/.test(v), 'Enlace inválido: usa https://… o una ruta de la tienda como /productos');

export const bloqueSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('titulo'), texto: z.string().trim().min(1, 'El título está vacío').max(150) }),
  z.object({ tipo: z.literal('texto'), texto: z.string().trim().min(1, 'Hay un texto vacío').max(4000) }),
  z.object({ tipo: z.literal('imagen'), url: rutaImagen, alt: z.string().trim().max(150).default(''), enlace: enlace.optional().or(z.literal('')) }),
  z.object({ tipo: z.literal('boton'), texto: z.string().trim().min(1, 'El botón necesita un texto').max(40), url: enlace }),
]);

export const campanaSchema = z.object({
  subject: z.string().trim().min(3, 'El asunto es muy corto').max(150),
  preheader: z.string().trim().max(200).nullable().optional(),
  bloques: z.array(bloqueSchema).min(1, 'Agrega al menos un bloque').max(30, 'Máximo 30 bloques'),
});

export type Bloque = z.infer<typeof bloqueSchema>;
export type CampanaContenido = z.infer<typeof campanaSchema>;

export function leerBloques(content: string): Bloque[] {
  try {
    const parsed = z.array(bloqueSchema).safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/* ── Utilidades ─────────────────────────────────────────────────────────── */

export function urlBase(): string {
  return (process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/** Los clientes de correo no resuelven rutas relativas: /api/uploads/x.png → https://tienda/api/uploads/x.png */
export function urlAbsoluta(ruta: string): string {
  return /^https?:\/\//i.test(ruta) ? ruta : `${urlBase()}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
}

export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function secreto(): string {
  const valor = process.env.NEXTAUTH_SECRET;
  if (!valor) throw new Error('NEXTAUTH_SECRET no está configurado');
  return valor;
}

/** Enlace de baja firmado: no hace falta iniciar sesión y no se puede dar de baja a otra persona. */
export function firmaBaja(userId: string): string {
  return createHmac('sha256', secreto()).update(`baja-promociones:${userId}`).digest('base64url');
}

export function firmaBajaValida(userId: string, firma: string): boolean {
  const esperada = Buffer.from(firmaBaja(userId));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

export function enlaceBaja(userId: string): string {
  return `${urlBase()}/api/public/email/baja?u=${encodeURIComponent(userId)}&t=${firmaBaja(userId)}`;
}

/* ── Render ─────────────────────────────────────────────────────────────── */

function renderBloque(bloque: Bloque, nombre: string): string {
  // {nombre} se reemplaza por el primer nombre del cliente
  const personalizar = (texto: string) => escaparHtml(texto.replace(/\{nombre\}/gi, nombre));

  switch (bloque.tipo) {
    case 'titulo':
      return `<h2 style="margin:0 0 16px;color:#212529;font-size:24px;line-height:1.3;font-weight:700;">${personalizar(bloque.texto)}</h2>`;
    case 'texto':
      return bloque.texto
        .split(/\n{2,}/)
        .map((parrafo) => `<p style="margin:0 0 16px;color:#495057;font-size:16px;line-height:1.6;">${personalizar(parrafo).replace(/\n/g, '<br>')}</p>`)
        .join('');
    case 'imagen': {
      const img = `<img src="${escaparHtml(urlAbsoluta(bloque.url))}" alt="${escaparHtml(bloque.alt)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:12px;margin:0 auto;">`;
      const contenido = bloque.enlace ? `<a href="${escaparHtml(urlAbsoluta(bloque.enlace))}" style="text-decoration:none;">${img}</a>` : img;
      return `<div style="margin:0 0 20px;text-align:center;">${contenido}</div>`;
    }
    case 'boton':
      // Botón en tabla con color sólido: Outlook no pinta degradados ni botones hechos solo con CSS
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 24px;"><tr><td bgcolor="#2a63cd" style="border-radius:8px;"><a href="${escaparHtml(urlAbsoluta(bloque.url))}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">${escaparHtml(bloque.texto)}</a></td></tr></table>`;
  }
}

export async function renderCampana(
  campana: { subject: string; preheader?: string | null; bloques: Bloque[] },
  destinatario: { nombre?: string | null; enlaceBaja?: string | null; prueba?: boolean }
): Promise<string> {
  const nombre = (destinatario.nombre || '').trim().split(/\s+/)[0] || 'cliente';
  const aviso = destinatario.prueba
    ? `<div style="margin:0 0 20px;padding:10px 14px;border-radius:8px;background:#fff7ed;color:#b45309;font-size:13px;font-weight:600;">Correo de prueba: así lo verán los clientes.</div>`
    : '';
  const baja = `<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e9ecef;color:#6a6c6b;font-size:12px;line-height:1.5;text-align:center;">Recibes este correo porque aceptaste recibir promociones.${
    destinatario.enlaceBaja ? ` <a href="${escaparHtml(destinatario.enlaceBaja)}" style="color:#2a63cd;">Darme de baja</a>` : ''
  }</p>`;
  const cuerpo = aviso + campana.bloques.map((b) => renderBloque(b, nombre)).join('') + baja;
  return getBaseTemplate(cuerpo, campana.preheader || undefined);
}

/* ── Destinatarios y envío ──────────────────────────────────────────────── */

export const destinatariosWhere = {
  role: 'USER' as const,
  email: { not: null },
  emailVerified: { not: null },
  notificationPreferences: { is: { emailPromotions: true } },
};

export async function contarDestinatarios(): Promise<number> {
  return prisma.user.count({ where: destinatariosWhere });
}

const PAUSA_ENTRE_CORREOS_MS = Number(process.env.CAMPAIGN_DELAY_MS ?? 1500);
const enCurso = new Set<string>();
const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function enviando(campaignId: string): boolean {
  return enCurso.has(campaignId);
}

/** Arranca (o reanuda) el envío en este proceso. No hace nada si ya está corriendo. */
export function iniciarEnvio(campaignId: string): void {
  if (enCurso.has(campaignId)) return;
  enCurso.add(campaignId);
  void procesar(campaignId)
    .catch(async (error) => {
      console.error('[CAMPAÑA] Error enviando', campaignId, error);
      await prisma.emailCampaign
        .update({ where: { id: campaignId }, data: { status: 'PAUSED', lastError: 'El envío se detuvo por un error. Puedes reanudarlo.' } })
        .catch(() => {});
    })
    .finally(() => enCurso.delete(campaignId));
}

async function enviadosHoy(): Promise<number> {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  return prisma.emailCampaignRecipient.count({ where: { status: 'SENT', sentAt: { gte: inicio } } });
}

async function procesar(campaignId: string): Promise<void> {
  for (;;) {
    const campana = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!campana || campana.status !== 'SENDING') return;

    const ajustes = await prisma.emailSettings.findUnique({ where: { id: 'default' }, select: { dailyLimit: true } });
    const limite = ajustes?.dailyLimit ?? 500;
    if ((await enviadosHoy()) >= limite) {
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: 'PAUSED', lastError: `Se alcanzó el límite diario de ${limite} correos. Reanuda la campaña mañana.` },
      });
      return;
    }

    const siguiente = await prisma.emailCampaignRecipient.findFirst({
      where: { campaignId, status: 'PENDING' },
      orderBy: { id: 'asc' },
    });
    if (!siguiente) {
      await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: 'SENT', finishedAt: new Date(), lastError: null } });
      return;
    }

    // Si se dio de baja mientras la campaña estaba en cola, no se le envía
    const usuario = await prisma.user.findFirst({
      where: { id: siguiente.userId, ...destinatariosWhere },
      select: { name: true, email: true },
    });
    if (!usuario?.email) {
      await prisma.emailCampaignRecipient.update({ where: { id: siguiente.id }, data: { status: 'SKIPPED', error: 'Ya no acepta promociones' } });
      continue;
    }

    const baja = enlaceBaja(siguiente.userId);
    const html = await renderCampana(
      { subject: campana.subject, preheader: campana.preheader, bloques: leerBloques(campana.content) },
      { nombre: usuario.name, enlaceBaja: baja }
    );
    const resultado = await sendEmail({
      to: usuario.email,
      subject: campana.subject,
      html,
      headers: { 'List-Unsubscribe': `<${baja}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });

    if (resultado.success) {
      await prisma.$transaction([
        prisma.emailCampaignRecipient.update({ where: { id: siguiente.id }, data: { status: 'SENT', sentAt: new Date(), error: null } }),
        prisma.emailCampaign.update({ where: { id: campaignId }, data: { sentCount: { increment: 1 } } }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.emailCampaignRecipient.update({ where: { id: siguiente.id }, data: { status: 'FAILED', error: (resultado.error || 'Error al enviar').slice(0, 300) } }),
        prisma.emailCampaign.update({ where: { id: campaignId }, data: { failedCount: { increment: 1 }, lastError: (resultado.error || 'Error al enviar').slice(0, 300) } }),
      ]);
    }

    await esperar(PAUSA_ENTRE_CORREOS_MS);
  }
}
