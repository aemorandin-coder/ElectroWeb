import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Check if user has accepted terms
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = (session.user as any).id;

        const acceptance = await prisma.balanceTermsAcceptance.findUnique({
            where: { userId },
        });

        return NextResponse.json({
            hasAccepted: !!acceptance,
            acceptedAt: acceptance?.acceptedAt || null,
            termsVersion: acceptance?.termsVersion || null,
        });
    } catch (error) {
        console.error('Error checking terms acceptance:', error);
        return NextResponse.json({ error: 'Error al verificar términos' }, { status: 500 });
    }
}

// POST - Accept terms and conditions
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const userName = session.user.name || 'Usuario';
        const userEmail = session.user.email || '';

        const body = await req.json();
        const {
            idNumber,
            phone,
            address,
            signatureData,
            termsVersion = '1.0'
        } = body;

        // Validate required fields
        if (!idNumber || !signatureData) {
            return NextResponse.json({
                error: 'Se requiere cédula y firma para aceptar los términos'
            }, { status: 400 });
        }

        // Get IP and User Agent
        const ipAddress = req.headers.get('x-forwarded-for') ||
            req.headers.get('x-real-ip') ||
            'unknown';
        const userAgent = req.headers.get('user-agent') || 'unknown';

        // Check if already accepted
        const existing = await prisma.balanceTermsAcceptance.findUnique({
            where: { userId },
        });

        if (existing) {
            return NextResponse.json({
                success: true,
                message: 'Ya has aceptado los términos y condiciones',
                acceptance: existing,
            });
        }

        // Create acceptance record
        const acceptance = await prisma.balanceTermsAcceptance.create({
            data: {
                userId,
                userName,
                userEmail,
                userIdNumber: idNumber,
                userPhone: phone,
                userAddress: address,
                ipAddress: ipAddress.toString(),
                userAgent: userAgent.substring(0, 500), // Limit length
                termsVersion,
                signatureData,
                documentPath: null, // Will be generated later
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Términos y condiciones aceptados exitosamente',
            acceptance: {
                id: acceptance.id,
                acceptedAt: acceptance.acceptedAt,
                termsVersion: acceptance.termsVersion,
            },
        });
    } catch (error) {
        console.error('Error accepting terms:', error);
        return NextResponse.json({ error: 'Error al aceptar términos' }, { status: 500 });
    }
}
