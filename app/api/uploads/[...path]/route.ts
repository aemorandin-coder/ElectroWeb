import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// MIME types for common image formats
const MIME_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
};

/**
 * API Route to serve uploaded files
 * This bypasses potential Nginx/Next.js static file serving issues in production
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathSegments } = await params;

        // Security: Prevent directory traversal attacks
        const filename = pathSegments.join('/');
        if (filename.includes('..') || filename.includes('~')) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        // Construct the file path
        const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

        console.log(`[UPLOADS API] Requested: ${filename}`);
        console.log(`[UPLOADS API] Full path: ${filePath}`);

        // Check if file exists
        if (!existsSync(filePath)) {
            console.log(`[UPLOADS API] File not found: ${filePath}`);
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Read the file
        const buffer = await readFile(filePath);

        // Get MIME type from extension
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        console.log(`[UPLOADS API] Serving: ${filename} (${contentType}, ${buffer.length} bytes)`);

        // Return the file with proper headers
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': buffer.length.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
            },
        });
    } catch (error) {
        console.error('[UPLOADS API] Error serving file:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
