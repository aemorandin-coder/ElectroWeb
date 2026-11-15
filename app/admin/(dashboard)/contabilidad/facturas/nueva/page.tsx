import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { adminPageHeader, adminPageSubtitle, adminPageTitle } from '@/lib/admin-ui';
import { hoyVe, periodoDe } from '@/lib/contabilidad/montos';
import { comprasSinFactura, talonarioActivo, tasaYAlicuota } from '@/lib/contabilidad/servidor';
import { talonarioDTO } from '@/lib/dto/contabilidad';
import { prisma } from '@/lib/prisma';
import AsistenteFactura from '../_components/AsistenteFactura';

// C-229: "Nueva factura de talonario". Llega vacía, o con una compra elegida (?ordenes=id1,id2) desde Facturas o desde Órdenes.
export const dynamic = 'force-dynamic';

export default async function PaginaNuevaFactura({ searchParams }: { searchParams: Promise<{ ordenes?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'FACTURAR')) redirect('/admin');
  const { ordenes } = await searchParams;
  const ids = (ordenes ?? '').split(',').map((s) => s.trim()).filter((s) => /^[a-z0-9]{10,40}$/i.test(s)).slice(0, 4);

  const [activo, compras, { tasa, alicuota }, elegidas] = await Promise.all([
    talonarioActivo(),
    comprasSinFactura(periodoDe(new Date())),
    tasaYAlicuota(),
    ids.length ? prisma.order.findMany({ where: { id: { in: ids } }, select: { id: true, orderNumber: true }, orderBy: { createdAt: 'asc' } }) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <header className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Nueva factura de talonario</h1>
          <p className={adminPageSubtitle}>Tres pasos cortos y, al final, la factura tal como se escribe.</p>
        </div>
      </header>
      <AsistenteFactura
        talonario={activo ? talonarioDTO(activo) : null}
        compras={compras}
        inicial={elegidas.length ? { ordenIds: elegidas.map((o) => o.id), ordenes: elegidas.map((o) => o.orderNumber) } : null}
        tasaHoy={tasa}
        alicuota={alicuota}
        hoy={hoyVe()}
      />
    </div>
  );
}
