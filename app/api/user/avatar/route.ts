import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { avatar } = await request.json();

    if (!avatar || !avatar.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Formato de imagen inválido' },
        { status: 400 }
      );
    }

    // Extract base64 data
    const matches = avatar.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json(
        { error: 'Formato de imagen inválido' },
        { status: 400 }
      );
    }

    const ext = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Generate unique filename
    const fileName = `${session.user.email.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${ext}`;
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
