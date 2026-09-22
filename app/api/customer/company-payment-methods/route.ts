import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DTO seguro para clientes: expone datos necesarios para pagar sin filtrar notas internas (C-101 / P5)
const customerPaymentMethodSelect = {
  id: true,
  type: true,
  name: true,
  bankName: true,
  accountNumber: true,
  accountType: true,
  holderName: true,
  holderId: true,
  phone: true,
  email: true,
  payId: true,
  walletAddress: true,
  network: true,
  logo: true,
  qrCodeImage: true,
  sortOrder: true,
  minAmount: true,
  maxAmount: true,
  displayNote: true,
};

export async function GET() {
  try {
    const methods = await prisma.companyPaymentMethod.findMany({
      where: {
        isActive: true,
      },
      select: customerPaymentMethodSelect,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json(methods);
  } catch (error) {
    console.error('Error fetching company payment methods:', error);
    return NextResponse.json({ error: 'Error al obtener métodos de pago de la empresa' }, { status: 500 });
  }
}
