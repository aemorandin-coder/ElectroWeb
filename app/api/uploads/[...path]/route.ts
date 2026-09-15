import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { authOptions } from '@/lib/auth';
import { documentOwner, isInside, PRIVATE_DOCUMENTS_DIR } from '@/lib/private-uploads';

const MIME_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
};

const PUBLIC_UPLOADS = path.join(process.cwd(), 'public', 'uploads');

/**
 * GET /api/uploads/<ruta> — archivos subidos (también llega aquí /uploads/<ruta> por el rewrite).
 * Los documentos de empresa solo los ve un administrador o su dueño.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathSegments } = await params;
        const filename = pathSegments.join('/');
        if (filename.includes('..') || filename.includes('~') || filename.includes('\0')) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        const isDocument = pathSegments[0] === 'documents';
        let filePath: string;
        if (isDocument) {
            const name = pathSegments.slice(1).join('/');
            const session = await getServerSession(authOptions);
            const role = session?.user?.role;
            const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
            // Mismo 404 para "no existe" y "no es tuyo": no se revela qué documentos hay
            if (!session?.user || pathSegments.length !== 2 || (!isAdmin && documentOwner(name) !== session.user.id)) {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }
            const privatePath = path.join(PRIVATE_DOCUMENTS_DIR, name);
            // Documentos anteriores a C-72 que aún no se movieron de public/uploads/documents
            const legacyPath = path.join(PUBLIC_UPLOADS, 'documents', name);
            if (!isInside(PRIVATE_DOCUMENTS_DIR, privatePath) || !isInside(PUBLIC_UPLOADS, legacyPath)) {
                return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
            }
            filePath = existsSync(privatePath) ? privatePath : legacyPath;
        } else {
            filePath = path.join(PUBLIC_UPLOADS, filename);
            if (!isInside(PUBLIC_UPLOADS, filePath)) {
                return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
            }
        }

        if (!existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const buffer = await readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        const headers: Record<string, string> = {
            'Content-Type': contentType,
            'Content-Length': buffer.length.toString(),
            // Sin esto el navegador podía "adivinar" HTML dentro de un archivo con otra extensión
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': isDocument ? 'private, no-store' : 'public, max-age=31536000, immutable',
        };
        // Un SVG abierto directo puede ejecutar scripts: se sirve aislado (en <img> se sigue viendo igual)
        if (ext === '.svg') headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
        if (contentType === 'application/octet-stream') headers['Content-Disposition'] = 'attachment';

        return new NextResponse(new Uint8Array(buffer), { status: 200, headers });
    } catch (error) {
        console.error('[UPLOADS API] Error serving file:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
