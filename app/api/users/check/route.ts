import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Check if user exists by email
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
                id: true,
                name: true,
                email: true,
            }
        });

        if (user) {
            return NextResponse.json({
                exists: true,
                user: {
                    name: user.name,
                    email: user.email,
                }
            });
        }

        return NextResponse.json({
            exists: false,
            email: email.toLowerCase()
        });

    } catch (error) {
        console.error('Error checking user:', error);
        return NextResponse.json({ error: 'Error al verificar usuario' }, { status: 500 });
    }
}

// POST - Send invitation email to non-registered user
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { email, senderName, giftAmount } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return NextResponse.json({
                error: 'El usuario ya está registrado',
                exists: true
            }, { status: 400 });
        }

        // TODO: Send invitation email
        // For now, just log and return success
        console.log(`Sending invitation email to: ${email}`);
        console.log(`Sender: ${senderName || session.user.name}`);
        console.log(`Gift Amount: $${giftAmount}`);

        // In production, you would send an email here with a link like:
        // https://electroshop.com/registro?ref=gift&from=senderEmail&amount=giftAmount

        return NextResponse.json({
            success: true,
            message: `Invitación enviada a ${email}`,
            // In production, you might store this pending gift in the database
        });

    } catch (error) {
        console.error('Error sending invitation:', error);
        return NextResponse.json({ error: 'Error al enviar invitación' }, { status: 500 });
    }
}
