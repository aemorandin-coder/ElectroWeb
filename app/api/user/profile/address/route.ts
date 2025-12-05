import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { address, city, state } = await request.json();

        if (!address || !city || !state) {
            return NextResponse.json(
                { error: 'Dirección, ciudad y estado son requeridos' },
                { status: 400 }
            );
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true },
        });

        if (!user || !user.profile) {
            return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
        }

        // Get current saved addresses or initialize empty array
        let currentAddresses: any[] = [];
        try {
            currentAddresses = user.profile.savedAddresses
                ? JSON.parse(user.profile.savedAddresses as string)
                : [];
        } catch {
            currentAddresses = [];
        }

        // Check if address already exists
        const addressExists = currentAddresses.some(
            (addr: any) =>
                addr.address === address &&
                addr.city === city &&
                addr.state === state
        );

        if (addressExists) {
            return NextResponse.json({
                message: 'Dirección ya guardada',
                savedAddresses: currentAddresses,
            });
        }

        // Add new address
        const newAddress = {
            address,
            city,
            state,
            createdAt: new Date().toISOString(),
        };

        const updatedAddresses = [...currentAddresses, newAddress];

        // Update profile with new addresses (store as JSON string)
        const updatedProfile = await prisma.profile.update({
            where: { userId: user.id },
            data: {
                savedAddresses: JSON.stringify(updatedAddresses),
            },
        });

        return NextResponse.json({
            message: 'Dirección guardada exitosamente',
            savedAddresses: updatedAddresses,
        });
    } catch (error) {
        console.error('Error saving address:', error);
        return NextResponse.json(
            { error: 'Error al guardar la dirección' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const index = searchParams.get('index');

        if (index === null) {
            return NextResponse.json(
                { error: 'Índice de dirección requerido' },
                { status: 400 }
            );
        }

        const addressIndex = parseInt(index);

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true },
        });

        if (!user || !user.profile) {
            return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
        }

        // Get current saved addresses
        let currentAddresses: any[] = [];
        try {
            currentAddresses = user.profile.savedAddresses
                ? JSON.parse(user.profile.savedAddresses as string)
                : [];
        } catch {
            currentAddresses = [];
        }

        if (addressIndex < 0 || addressIndex >= currentAddresses.length) {
            return NextResponse.json(
                { error: 'Índice de dirección inválido' },
                { status: 400 }
            );
        }

        // Remove address at index
        const updatedAddresses = currentAddresses.filter((_, i) => i !== addressIndex);

        // Update profile
        await prisma.profile.update({
            where: { userId: user.id },
            data: {
                savedAddresses: JSON.stringify(updatedAddresses),
            },
        });

        return NextResponse.json({
            message: 'Dirección eliminada exitosamente',
            savedAddresses: updatedAddresses,
        });
    } catch (error) {
        console.error('Error deleting address:', error);
        return NextResponse.json(
            { error: 'Error al eliminar la dirección' },
            { status: 500 }
        );
    }
}
