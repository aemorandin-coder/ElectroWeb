import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename } = await params;

        // Ruta absoluta al archivo en el sistema de archivos
        // Intentamos buscar en public/uploads/products
        const filePath = path.join(process.cwd(), 'public', 'uploads', 'products', filename);

        if (!existsSync(filePath)) {
            console.error(`File not found at: ${filePath}`);
            return new NextResponse('File not found', { status: 404 });
        }

        const fileBuffer = await readFile(filePath);
        const ext = path.extname(filename).toLowerCase();

        let contentType = 'application/octet-stream';
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        if (ext === '.png') contentType = 'image/png';
        if (ext === '.webp') contentType = 'image/webp';
        if (ext === '.gif') contentType = 'image/gif';
        if (ext === '.svg') contentType = 'image/svg+xml';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error serving file:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
