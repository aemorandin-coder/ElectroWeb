import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { detectFileType } from '@/lib/file-signature';
import { PRIVATE_DOCUMENTS_DIR } from '@/lib/private-uploads';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const formData = await request.formData();
        const companyName = formData.get('companyName') as string;
        const taxId = formData.get('taxId') as string;
        const actaFile = formData.get('actaConstitutiva') as File;
        const rifFile = formData.get('rifDocument') as File;

        if (!companyName || !taxId || !actaFile || !rifFile) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        if (typeof companyName !== 'string' || typeof taxId !== 'string' || companyName.length > 150 || taxId.length > 20
            || !(actaFile instanceof File) || !(rifFile instanceof File)) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
        }

        // Validate file types
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(actaFile.type) || !allowedTypes.includes(rifFile.type)) {
            return NextResponse.json({
                error: 'Tipo de archivo no permitido. Solo se permiten PDF, JPG y PNG'
            }, { status: 400 });
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (actaFile.size > maxSize || rifFile.size > maxSize) {
            return NextResponse.json({
                error: 'Uno de los archivos es demasiado grande. Máximo 5MB'
            }, { status: 400 });
        }

        // SEGURIDAD (C-72): fuera de public/ (antes cualquiera con el enlace veía el acta y el RIF) y con la
        // extensión que dicen los bytes del archivo, no el nombre que manda el navegador
        const readDocument = async (file: File) => {
            const buffer = Buffer.from(await file.arrayBuffer());
            const type = detectFileType(buffer);
            return type === 'pdf' || type === 'png' || type === 'jpg' ? { buffer, type } : null;
        };
        const acta = await readDocument(actaFile);
        const rif = await readDocument(rifFile);
        if (!acta || !rif) {
            return NextResponse.json({
                error: 'Los archivos deben ser PDF, JPG o PNG'
            }, { status: 400 });
        }

        await mkdir(PRIVATE_DOCUMENTS_DIR, { recursive: true });

        const saveFile = async (document: { buffer: Buffer; type: string }, prefix: 'acta' | 'rif') => {
            const randomString = crypto.randomBytes(4).toString('hex');
            const filename = `${prefix}-${session.user.id}-${Date.now()}-${randomString}.${document.type}`;
            await writeFile(path.join(PRIVATE_DOCUMENTS_DIR, filename), document.buffer);
            // Lo sirve /api/uploads/documents solo a administradores y al dueño
            return `/api/uploads/documents/${filename}`;
        };

        // Save files
        const actaUrl = await saveFile(acta, 'acta');
        const rifUrl = await saveFile(rif, 'rif');

        // Update profile
        const updatedProfile = await prisma.profile.update({
            where: { userId: session.user.id },
            data: {
                companyName,
                taxId,
                businessConstitutiveAct: actaUrl,
                businessRIFDocument: rifUrl,
                businessVerificationStatus: 'PENDING',
                isBusinessAccount: true, // Intent to be business
                businessVerified: false,
            },
        });

        return NextResponse.json({
            success: true,
            profile: updatedProfile
        });

    } catch (error) {
        console.error('Error processing verification request:', error);
        return NextResponse.json({
            error: 'Error al procesar la solicitud'
        }, { status: 500 });
    }
}
