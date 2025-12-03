import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

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

        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Helper function to save file
        const saveFile = async (file: File, prefix: string) => {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 8);
            const extension = file.name.split('.').pop();
            const filename = `${prefix}-${session.user.id}-${timestamp}-${randomString}.${extension}`;
            const filepath = path.join(uploadDir, filename);
            await writeFile(filepath, buffer);
            return `/uploads/documents/${filename}`;
        };

        // Save files
        const actaUrl = await saveFile(actaFile, 'acta');
        const rifUrl = await saveFile(rifFile, 'rif');

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
