import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { detectFileType } from '@/lib/file-signature';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
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
