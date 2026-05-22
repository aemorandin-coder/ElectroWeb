import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// Magic bytes validation
const IMAGE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const sigs = IMAGE_SIGNATURES[mimeType];
  if (!sigs) return false;
  return sigs.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Must be an approved creator
    const creator = await prisma.courseCreator.findUnique({
      where: { userId, status: 'APPROVED' },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Solo los creadores aprobados pueden subir archivos' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Solo se permiten imágenes JPG, PNG, WEBP y GIF' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Archivo demasiado grande. Máximo 5 MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const mimeType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    if (!validateMagicBytes(buffer, mimeType)) {
      return NextResponse.json(
        { error: 'El contenido del archivo no coincide con su tipo. Archivo rechazado.' },
        { status: 400 }
      );
    }

    // Build safe filename: creator-{creatorId}-{timestamp}-{random}.ext
    const ext = (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(
      file.name.split('.').pop()?.toLowerCase() ?? ''
    )
      ? file.name.split('.').pop()!.toLowerCase()
      : 'jpg');
    const filename = `creator-${creator.id.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'creators');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    await writeFile(path.join(uploadDir, filename), buffer);

    // Serve through API route (consistent with the product upload approach)
    const url = `/api/uploads/creators/${filename}`;

    return NextResponse.json({ success: true, url, filename });
  } catch (error) {
    console.error('[Creator upload error]', error);
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 });
  }
}
