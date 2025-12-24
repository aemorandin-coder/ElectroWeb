import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Seed initial payment methods
export async function POST() {
    try {
        const session = await getServerSession(authOptions);

        // Check if user is admin
        if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // Check if there are already payment methods
        const existingMethods = await prisma.companyPaymentMethod.count();

        if (existingMethods > 0) {
            return NextResponse.json({
                message: 'Ya existen métodos de pago configurados',
                count: existingMethods,
                seeded: false
            });
        }

        // Create initial payment methods
        // Using 'as any' for type field to support new types before Prisma client regeneration
        const methodsData: any[] = [
            {
                type: 'BANK_TRANSFER',
                name: 'Transferencia Bancaria',
                bankName: 'Banco de Venezuela',
                accountNumber: '',
                accountType: 'Corriente',
                holderName: 'Electro Shop Morandin C.A.',
                holderId: 'J-12345678-9',
                instructions: 'Transferencia bancaria nacional',
                displayNote: 'Incluir número de orden en el concepto',
                sortOrder: 1,
                isActive: true,
            },
            {
                type: 'MOBILE_PAYMENT',
                name: 'Pago Móvil',
                bankName: 'Banco de Venezuela',
                phone: '0412-1234567',
                holderId: 'V-12345678',
                instructions: 'Pago móvil venezolano',
                displayNote: 'Enviar captura del pago al WhatsApp',
                sortOrder: 2,
                isActive: true,
            },
            {
                type: 'CRYPTO',
                name: 'Criptomonedas (USDT)',
                walletAddress: '',
                network: 'USDT-TRC20',
                instructions: 'USDT en red TRC20 (Tron)',
                displayNote: 'Solo red TRC20. Verificar dirección antes de enviar.',
                sortOrder: 3,
                isActive: true,
            },
            {
                type: 'MERCANTIL_PANAMA',
                name: 'Mercantil Panamá',
                bankName: 'Banco Mercantil Panamá',
                accountNumber: '',
                accountType: 'Corriente',
                holderName: 'Electro Shop International',
                email: '',
                instructions: 'Transferencia internacional a cuenta en Panamá',
                displayNote: 'Para pagos desde el exterior. Tiempo de acreditación: 24-48h.',
                sortOrder: 4,
                isActive: true,
            },
            {
                type: 'ZELLE',
                name: 'Zelle',
                email: '',
                holderName: '',
                instructions: 'Pago via Zelle (USA)',
                displayNote: 'Solo para clientes con cuenta bancaria en USA',
                sortOrder: 5,
                isActive: false, // Disabled by default
            },
            {
                type: 'ZINLI',
                name: 'Zinli',
                email: '',
                holderName: '',
                instructions: 'Pago via Zinli (Wallet Digital USD)',
                displayNote: 'Recarga tu wallet Zinli y envía el pago al correo indicado',
                sortOrder: 6,
                isActive: false, // Disabled by default
            },
        ];

        // Create all methods
        const createdMethods = await prisma.$transaction(
            methodsData.map(method =>
                prisma.companyPaymentMethod.create({ data: method })
            )
        );

        return NextResponse.json({
            message: 'Métodos de pago creados exitosamente',
            count: createdMethods.length,
            seeded: true,
            methods: createdMethods.map(m => ({ id: m.id, name: m.name, type: m.type }))
        });
    } catch (error) {
        console.error('Error seeding payment methods:', error);
        return NextResponse.json({ error: 'Error al crear métodos de pago' }, { status: 500 });
    }
}
