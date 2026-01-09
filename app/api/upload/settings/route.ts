import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

// Rate limit for settings uploads
const UPLOAD_RATE_LIMIT = {
    maxRequests: 10,
    windowSeconds: 60, // 10 uploads per minute
};

// Magic bytes for image validation
const IMAGE_SIGNATURES: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
    'image/x-icon': [], // ICO files have variable headers
    'image/vnd.microsoft.icon': [],
};

/**
 * Validate file content by checking magic bytes
 */
function validateMagicBytes(buffer: Buffer, expectedType: string): boolean {
    // ICO files have variable headers, skip validation
    if (expectedType === 'image/x-icon' || expectedType === 'image/vnd.microsoft.icon') {
        return true;
    }

    const signatures = IMAGE_SIGNATURES[expectedType];
    if (!signatures || signatures.length === 0) return true;

    return signatures.some(signature => {
        for (let i = 0; i < signature.length; i++) {
            if (buffer[i] !== signature[i]) return false;
        }
        return true;
    });
}

/**
 * Upload handler for system settings assets (logo, favicon, etc.)
 * Saves files to /public/uploads/ with appropriate naming
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Only allow users with MANAGE_SETTINGS permission
        if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const userId = (session?.user as any)?.id || 'unknown';

        // Rate limiting
        const rateLimit = checkRateLimit(userId, 'upload:settings', UPLOAD_RATE_LIMIT);
        if (!rateLimit.success) {
            return NextResponse.json(
                { error: 'Has subido demasiados archivos. Espera un momento.' },
                { status: 429, headers: getRateLimitHeaders(rateLimit, UPLOAD_RATE_LIMIT) }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string; // 'logo' | 'favicon' | 'heroBackground' | 'hotAd'

        if (!file) {
            return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
        }

        if (!type || !['logo', 'favicon', 'heroBackground', 'hotAd'].includes(type)) {
            return NextResponse.json({ error: 'Tipo de asset no válido' }, { status: 400 });
        }

        // Validate file type by MIME
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
            'image/x-icon', 'image/vnd.microsoft.icon'
        ];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({
                error: 'Tipo de archivo no permitido. Solo se permiten imágenes JPG, PNG, WEBP, GIF e ICO'
            }, { status: 400 });
        }

        // Validate file size (max 2MB for logos/favicons, 5MB for backgrounds)
        const maxSize = (type === 'heroBackground' || type === 'hotAd') ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json({
                error: `El archivo es demasiado grande. Máximo ${maxSize / (1024 * 1024)}MB`
            }, { status: 400 });
        }

        // Read file content
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // SECURITY: Validate magic bytes
        const mimeType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
        if (!validateMagicBytes(buffer, mimeType)) {
            console.warn(`[UPLOAD] Magic bytes validation failed for file claiming to be ${file.type}`);
            return NextResponse.json({
                error: 'El contenido del archivo no coincide con su tipo. Archivo rechazado por seguridad.'
            }, { status: 400 });
        }

        // Determine file extension
        let extension = file.name.split('.').pop()?.toLowerCase() || 'png';
        const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'ico'];
        if (!validExtensions.includes(extension)) {
            extension = 'png';
        }

        // Create unique filename with type prefix
        const timestamp = Date.now();
        const filename = `${type}-${timestamp}.${extension}`;

        // Ensure upload directory exists - use process.cwd() which should be the project root
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');

        console.log(`[UPLOAD] process.cwd(): ${process.cwd()}`);
        console.log(`[UPLOAD] Target upload directory: ${uploadDir}`);

        if (!existsSync(uploadDir)) {
            console.log(`[UPLOAD] Creating directory: ${uploadDir}`);
            await mkdir(uploadDir, { recursive: true });
        }

        // Save the file
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);

        // Verify the file was written successfully
        const fileExists = existsSync(filepath);
        console.log(`[UPLOAD] File written to: ${filepath}`);
        console.log(`[UPLOAD] File exists after write: ${fileExists}`);

        // Return public URL - Use API route to serve files (bypasses Nginx static file issues)
        const publicUrl = `/api/uploads/${filename}`;

        console.log(`[UPLOAD] Settings asset uploaded: ${publicUrl} (${file.size} bytes)`);

        return NextResponse.json({
            success: true,
            url: publicUrl,
            filename,
            size: file.size,
            type: file.type,
        });

    } catch (error) {
        console.error('[UPLOAD] Error uploading settings asset:', error);
        return NextResponse.json({
            error: 'Error al subir archivo'
        }, { status: 500 });
    }
}
