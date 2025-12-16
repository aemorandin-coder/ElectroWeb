import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
            // return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const methods = await prisma.companyPaymentMethod.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(methods);
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        return NextResponse.json({ error: 'Error al obtener métodos de pago' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const body = await request.json();

        const method = await prisma.companyPaymentMethod.create({
            data: {
                type: body.type,
                name: body.name,
                bankName: body.bankName,
                accountNumber: body.accountNumber,
                accountType: body.accountType,
                holderName: body.holderName,
                holderId: body.holderId,
                phone: body.phone,
                email: body.email,
                walletAddress: body.walletAddress,
                network: body.network,
                instructions: body.instructions,
                logo: body.logo,
                qrCodeImage: body.qrCodeImage,
                sortOrder: body.sortOrder ?? 0,
                minAmount: body.minAmount,
                maxAmount: body.maxAmount,
                displayNote: body.displayNote,
                isActive: body.isActive ?? true,
            }
        });

        return NextResponse.json(method);
    } catch (error) {
        console.error('Error creating payment method:', error);
        return NextResponse.json({ error: 'Error al crear método de pago' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const { id, ...data } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        const method = await prisma.companyPaymentMethod.update({
            where: { id },
            data
        });

        return NextResponse.json(method);
    } catch (error) {
        console.error('Error updating payment method:', error);
        return NextResponse.json({ error: 'Error al actualizar método de pago' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        await prisma.companyPaymentMethod.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting payment method:', error);
        return NextResponse.json({ error: 'Error al eliminar método de pago' }, { status: 500 });
    }
}
