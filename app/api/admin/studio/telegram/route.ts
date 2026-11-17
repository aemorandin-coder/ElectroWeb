import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getNotificationSettings } from '@/lib/admin-events/settings';
import { authOptions } from '@/lib/auth';
import { esAdminVerificado, hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { sendArchivoToTelegramChats } from '@/lib/telegram/service';

export const dynamic = 'force-dynamic';

// C-286 y C-287: la imagen o el video de una historia de ElectroStudio, a los chats de Telegram del bot (Notificaciones),
// tal como salió (Full HD) y con el texto de la historia. Solo cuando el equipo lo elige al sacarlo ("¿Qué hago con…?").
//   GET  → { disponible, chats, motivo? }: si el bot está conectado y a cuántos chats llega
//   POST multipart: archivo (MP4, WEBM o PNG, hasta 40 MB, el tope de nginx), texto, segundos, ancho, alto
//        → { enviados, total, error? }; { apagado: true } si no hay bot

const MAXIMO = 40 * 1024 * 1024;
const entero = (valor: FormDataEntryValue | null, min: number, max: number) => {
  const n = Math.round(Number(valor));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

async function autorizar() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!esAdminVerificado(session) || !hasPermission(session, 'MANAGE_CONTENT')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  return null;
}

export async function GET() {
  const fuera = await autorizar();
  if (fuera) return fuera;
  const { botToken } = await getNotificationSettings();
  if (!botToken) return NextResponse.json({ disponible: false, chats: 0, motivo: 'El bot de Telegram no está conectado: se conecta en Notificaciones → Telegram.' });
  const chats = await prisma.telegramChat.count({ where: { isActive: true } });
  return NextResponse.json({ disponible: chats > 0, chats, motivo: chats > 0 ? undefined : 'El bot no tiene chats conectados: se agregan en Notificaciones → Telegram.' });
}

export async function POST(request: NextRequest) {
  const fuera = await autorizar();
  if (fuera) return fuera;
  const { botToken } = await getNotificationSettings();
  if (!botToken) return NextResponse.json({ apagado: true, enviados: 0, total: 0 });

  const form = await request.formData().catch(() => null);
  const archivo = form?.get('archivo') ?? form?.get('video');
  if (!form || !(archivo instanceof File) || archivo.size === 0) return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
  if (archivo.size > MAXIMO) return NextResponse.json({ error: 'Pesa más de 40 MB: no se mandó a Telegram' }, { status: 413 });
  // Que sea de verdad un MP4, un WEBM o un PNG (no basta con lo que dice el navegador)
  const cabeza = new Uint8Array(await archivo.slice(0, 12).arrayBuffer());
  const esMp4 = String.fromCharCode(...cabeza.slice(4, 8)) === 'ftyp';
  const esWebm = cabeza[0] === 0x1a && cabeza[1] === 0x45 && cabeza[2] === 0xdf && cabeza[3] === 0xa3;
  const esPng = cabeza[0] === 0x89 && cabeza[1] === 0x50 && cabeza[2] === 0x4e && cabeza[3] === 0x47;
  if (!esMp4 && !esWebm && !esPng) return NextResponse.json({ error: 'Ese archivo no es un video ni una imagen' }, { status: 400 });

  const extension = esPng ? 'png' : esMp4 ? 'mp4' : 'webm';
  const base = (archivo.name || 'historia').replace(/\.[a-z0-9]+$/i, '').replace(/[^\w.\- ]+/g, '').slice(0, 80) || 'historia';
  const entregas = await sendArchivoToTelegramChats({
    tipo: esPng ? 'imagen' : 'video',
    archivo,
    nombre: `${base}.${extension}`,
    texto: String(form.get('texto') ?? '').slice(0, 1000),
    segundos: entero(form.get('segundos'), 1, 120),
    ancho: entero(form.get('ancho'), 16, 4096),
    alto: entero(form.get('alto'), 16, 4096),
  });
  const fallo = entregas.find((e) => !e.ok);
  return NextResponse.json({ enviados: entregas.filter((e) => e.ok).length, total: entregas.length, error: fallo?.error });
}
