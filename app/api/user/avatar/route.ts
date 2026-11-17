import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { detectFileType } from '@/lib/file-signature';
import { isInside } from '@/lib/private-uploads';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
// S-14: cada cambio de foto guarda un archivo nuevo: 10 por hora por cuenta
const LIMITE_AVATAR = { maxRequests: 10, windowSeconds: 3600 };

/**
 * El nombre del archivo de un avatar anterior de ESTA cuenta (avatar-<userId>-<marca de tiempo>.<ext>) a partir de lo
 * guardado en la base ("/api/uploads/avatars/<archivo>" o la ruta vieja "/uploads/avatars/<archivo>"). Null si es la foto de
 * Google, una dirección de otro sitio o cualquier cosa que no sea un avatar propio: de esas no se borra nada.
 */
function avatarPropio(guardado: string | null | undefined, userId: string): string | null {
  const nombre = /^\/(?:api\/)?uploads\/avatars\/([^/?#]+)$/.exec(guardado ?? '')?.[1];
  const prefijo = `avatar-${userId}-`;
  if (!nombre || !nombre.startsWith(prefijo)) return null;
  return /^\d+\.(?:png|jpg|webp)$/.test(nombre.slice(prefijo.length)) ? nombre : null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // S-14: límite por cuenta, antes de leer el cuerpo
    const limite = checkRateLimit(session.user.id, 'avatar:subir', LIMITE_AVATAR);
    if (!limite.success) {
      return NextResponse.json(
        { error: 'Cambiaste tu foto muchas veces seguidas. Espera un rato y vuelve a probar.', retryAfter: limite.resetIn },
        { status: 429, headers: getRateLimitHeaders(limite, LIMITE_AVATAR) }
      );
    }

    // 2 MB en base64 ocupan ~2,7 MB: se corta antes de leer cuerpos enormes
    if (Number(request.headers.get('content-length') || 0) > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen pesa más de 2 MB' }, { status: 413 });
    }
    const body = await request.json().catch(() => null);
    const avatar = typeof body?.avatar === 'string' ? body.avatar : '';

    // SEGURIDAD (C-72): solo PNG, JPG o WEBP comprobados por sus bytes y hasta 2 MB.
    // Antes la extensión salía del data URI: "data:image/svg;base64,…" guardaba un SVG con scripts en el dominio.
    const matches = avatar.match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: 'Formato de imagen inválido. Usa PNG, JPG o WEBP.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(matches[2], 'base64');
    if (buffer.length > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: 'La imagen pesa más de 2 MB' }, { status: 400 });
    }
    const detected = detectFileType(buffer);
    if (detected !== 'png' && detected !== 'jpg' && detected !== 'webp') {
      return NextResponse.json({ error: 'El archivo no es una imagen PNG, JPG o WEBP' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    await mkdir(uploadsDir, { recursive: true });

    // Nombre sin el correo del cliente (antes quedaba expuesto en la URL pública)
    const fileName = `avatar-${session.user.id}-${Date.now()}.${detected}`;
    const filePath = path.join(uploadsDir, fileName);
    // Use API route to serve files (bypasses Nginx static file issues)
    const publicPath = `/api/uploads/avatars/${fileName}`;

    // Save file
    await writeFile(filePath, buffer);

    // Update user profile
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { profile: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Update user image (for header display)
    await prisma.user.update({
      where: { id: user.id },
      data: { image: publicPath }
    });

    // Update or create profile avatar
    if (user.profile) {
      await prisma.profile.update({
        where: { userId: user.id },
        data: { avatar: publicPath }
      });
    } else {
      await prisma.profile.create({
        data: {
          userId: user.id,
          avatar: publicPath
        }
      });
    }

    // S-14: el avatar anterior de esta cuenta se borra (antes cada cambio dejaba un archivo más en el disco y en el
    // respaldo). Solo uno que sea suyo y esté dentro de la carpeta de avatares; si falla, la subida no falla.
    const anteriores = new Set([avatarPropio(user.profile?.avatar, user.id), avatarPropio(user.image, user.id)]);
    for (const anterior of anteriores) {
      if (!anterior || anterior === fileName) continue;
      const rutaAnterior = path.join(uploadsDir, anterior);
      if (!isInside(uploadsDir, rutaAnterior)) continue;
      await unlink(rutaAnterior).catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar actualizado exitosamente',
      avatar: publicPath,
      image: publicPath
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Error al subir avatar' },
      { status: 500 }
    );
  }
}
