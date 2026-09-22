import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { isAuthorized } from '@/lib/auth-helpers';

// POST - Seed initial payment methods
export async function POST() {
    try {
        const session = await getServerSession(authOptions);

        if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
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
        const methodsData: Prisma.CompanyPaymentMethodCreateInput[] = [
            {
                type: 'MOBILE_PAYMENT',
                name: 'Pago Móvil BDV',
                bankName: 'Banco de Venezuela',
                phone: '0412-1234567',
                holderId: 'V-12345678',
                holderName: 'ElectroShop Morandin C.A.',
                instructions: 'Pago móvil venezolano con conciliación automática',
                displayNote: 'Verificación automática al instante con el BDV',
                sortOrder: 1,
                isActive: true,
            },
            {
                type: 'BANK_TRANSFER',
                name: 'Transferencia Bancaria',
                bankName: 'Banco de Venezuela',
                accountNumber: '01020123456789012345',
                accountType: 'Corriente',
                holderName: 'ElectroShop Morandin C.A.',
                holderId: 'J-12345678-9',
                instructions: 'Transferencia bancaria nacional',
                displayNote: 'Indicar número de orden en el concepto de la transferencia',
                sortOrder: 2,
                isActive: true,
            },
            {
                type: 'BINANCE_PAY',
                name: 'Binance Pay',
                email: 'pagos@electroshop.com',
                payId: '123456789',
                holderName: 'ElectroShop VE',
                instructions: 'Binance Pay USDT sin comisión',
                displayNote: 'Envía USDT vía Binance Pay a nuestro correo o Pay ID',
                sortOrder: 3,
                isActive: true,
            },
            {
                type: 'CRYPTO',
                name: 'Criptomonedas (USDT-TRC20)',
                walletAddress: 'TYDzsYUE28N4e5g6h7j8k9l0m1n2o3p4q5',
                network: 'USDT-TRC20',
                instructions: 'USDT en red TRC20 (Tron)',
                displayNote: 'Solo red TRC20. Verifica la dirección antes de enviar.',
                sortOrder: 4,
                isActive: true,
            },
            {
                type: 'MERCANTIL_PANAMA',
                name: 'Mercantil Panamá',
                bankName: 'Banco Mercantil Panamá',
                accountNumber: '0123456789',
                accountType: 'Corriente',
                holderName: 'ElectroShop International Inc.',
                email: 'internacional@electroshop.com',
                instructions: 'Transferencia internacional a cuenta en Panamá',
                displayNote: 'Para clientes en el exterior. Acreditación en 24-48h hábiles.',
                sortOrder: 5,
                isActive: true,
            },
            {
                type: 'ZELLE',
                name: 'Zelle',
                email: 'zelle@electroshop.com',
                holderName: 'ElectroShop LLC',
                instructions: 'Pago vía Zelle (USA)',
                displayNote: 'Solo para clientes con cuenta bancaria en USA',
                sortOrder: 6,
                isActive: false, // Inactivo por defecto
            },
            {
                type: 'ZINLI',
                name: 'Zinli',
                email: 'zinli@electroshop.com',
                phone: '0412-1234567',
                holderName: 'ElectroShop Zinli',
                instructions: 'Pago vía Zinli (Billetera Digital USD)',
                displayNote: 'Envía el pago al correo o teléfono Zinli indicado',
                sortOrder: 7,
                isActive: false, // Inactivo por defecto
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
