import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import AsistenteMetodo, { type MetodoPanel } from '../_components/AsistenteMetodo';

// C-249b: cambiar un método de pago, por pasos (PLAN.md §1.9). El último paso dice qué cambia y cuántas recargas y
// órdenes esperan un pago con los datos de antes.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cambiar método de pago' };

export default async function PaginaCambiarMetodo({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_SETTINGS')) redirect('/admin');
  const { id } = await params;
  const m = await prisma.companyPaymentMethod.findUnique({ where: { id } });
  if (!m) notFound();
  const metodo: MetodoPanel = {
    id: m.id, type: m.type, name: m.name, bankName: m.bankName, accountNumber: m.accountNumber, accountType: m.accountType,
    holderName: m.holderName, holderId: m.holderId, phone: m.phone, email: m.email, payId: m.payId, walletAddress: m.walletAddress,
    network: m.network, instructions: m.instructions, logo: m.logo, qrCodeImage: m.qrCodeImage, sortOrder: m.sortOrder,
    minAmount: m.minAmount === null ? null : Number(m.minAmount), maxAmount: m.maxAmount === null ? null : Number(m.maxAmount),
    displayNote: m.displayNote, isActive: m.isActive,
  };
  return <AsistenteMetodo key={m.updatedAt.toISOString()} metodo={metodo} orden={m.sortOrder} />;
}
