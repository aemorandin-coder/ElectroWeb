import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

// Rate limit for uploads
const UPLOAD_RATE_LIMIT = {
  maxRequests: 20,
  windowSeconds: 60, // 20 uploads per minute
};

// Magic bytes for image validation
const IMAGE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header, WEBP follows at offset 8
};

/**
 * Validate file content by checking magic bytes
 */
function validateMagicBytes(buffer: Buffer, expectedType: string): boolean {
  const signatures = IMAGE_SIGNATURES[expectedType];
  if (!signatures) return false;

  return signatures.some(signature => {
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) return false;
    }
    return true;
  });
}

/**
 * Sanitize filename to prevent directory traversal and special characters
 */
function sanitizeFilename(filename: string): string {
  // Remove path components and special characters
  const sanitized = filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 100);

  // Ensure it has a valid extension
  const ext = sanitized.split('.').pop()?.toLowerCase();
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

  if (!ext || !validExtensions.includes(ext)) {
    return `image_${Date.now()}.jpg`;
  }

  return sanitized;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const userId = (session?.user as any)?.id || 'unknown';

    // Rate limiting
    const rateLimit = checkRateLimit(userId, 'upload:image', UPLOAD_RATE_LIMIT);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Has subido demasiados archivos. Espera un momento.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit, UPLOAD_RATE_LIMIT) }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Validate file type by MIME
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Tipo de archivo no permitido. Solo se permiten imágenes JPG, PNG, WEBP y GIF'
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'El archivo es demasiado grande. Máximo 5MB'
      }, { status: 400 });
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // SECURITY: Validate magic bytes to prevent disguised malicious files
    const mimeType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    if (!validateMagicBytes(buffer, mimeType)) {
      console.warn(`[UPLOAD] Magic bytes validation failed for file claiming to be ${file.type}`);
      return NextResponse.json({
        error: 'El contenido del archivo no coincide con su tipo. Archivo rechazado por seguridad.'
      }, { status: 400 });
    }

    // Create safe filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExtension = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension) ? extension : 'jpg';
    const filename = `product-${timestamp}-${randomString}.${safeExtension}`;

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Save file
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // Return public URL - Use API route to serve files (bypasses Nginx static file issues)
    const publicUrl = `/api/uploads/products/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({
      error: 'Error al subir archivo'
    }, { status: 500 });
  }
}
