import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getNotificationSettings } from '@/lib/admin-events/settings';
import { authOptions } from '@/lib/auth';
import { esAdminVerificado, hasPermission } from '@/lib/auth-helpers';
import { sendVideoToTelegramChats } from '@/lib/telegram/service';

export const dynamic = 'force-dynamic';

// C-286: el video que se acaba de descargar en ElectroStudio, a los chats de Telegram del bot (Notificaciones), tal como
// salió: Full HD a 60 cuadros, con el texto de la historia. Se apaga en Notificaciones → "Video de ElectroStudio".
//   POST multipart: video (MP4 o WEBM, hasta 40 MB, el tope de nginx), texto, segundos, ancho, alto
//   → { apagado: true } si no hay bot o está apagado; si no, { enviados, total, error? }

const MAXIMO = 40 * 1024 * 1024;
const entero = (valor: FormDataEntryValue | null, min: number, max: number) => {
  const n = Math.round(Number(valor));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!esAdminVerificado(session) || !hasPermission(session, 'MANAGE_CONTENT')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { channels, botToken } = await getNotificationSettings();
  if (!botToken || !channels.STUDIO_VIDEO.telegram) return NextResponse.json({ apagado: true, enviados: 0, total: 0 });

  const form = await request.formData().catch(() => null);
  const video = form?.get('video');
  if (!form || !(video instanceof File) || video.size === 0) return NextResponse.json({ error: 'Falta el video' }, { status: 400 });
  if (video.size > MAXIMO) return NextResponse.json({ error: 'El video pesa más de 40 MB: no se mandó a Telegram' }, { status: 413 });
  // Que sea de verdad un MP4 o un WEBM (no basta con lo que dice el navegador)
  const cabeza = new Uint8Array(await video.slice(0, 12).arrayBuffer());
  const esMp4 = String.fromCharCode(...cabeza.slice(4, 8)) === 'ftyp';
  const esWebm = cabeza[0] === 0x1a && cabeza[1] === 0x45 && cabeza[2] === 0xdf && cabeza[3] === 0xa3;
  if (!esMp4 && !esWebm) return NextResponse.json({ error: 'Ese archivo no es un video' }, { status: 400 });

  const nombre = (video.name || 'historia').replace(/[^\w.\- ]+/g, '').slice(0, 80) || 'historia';
  const entregas = await sendVideoToTelegramChats({
    archivo: video,
    nombre: /\.(mp4|webm)$/i.test(nombre) ? nombre : `${nombre}.${esMp4 ? 'mp4' : 'webm'}`,
    texto: String(form.get('texto') ?? '').slice(0, 1000),
    segundos: entero(form.get('segundos'), 1, 120),
    ancho: entero(form.get('ancho'), 16, 4096),
    alto: entero(form.get('alto'), 16, 4096),
  });
  const fallo = entregas.find((e) => !e.ok);
  return NextResponse.json({ enviados: entregas.filter((e) => e.ok).length, total: entregas.length, error: fallo?.error });
}
