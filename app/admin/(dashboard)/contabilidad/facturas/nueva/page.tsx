import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { adminPageHeader, adminPageSubtitle, adminPageTitle } from '@/lib/admin-ui';
import { obtenerConfigContable } from '@/lib/contabilidad/hub';
import { hoyVe, periodoDe } from '@/lib/contabilidad/montos';
import { comprasSinFactura, talonarioActivo, tasaYAlicuota } from '@/lib/contabilidad/servidor';
import { talonarioDTO } from '@/lib/dto/contabilidad';
import { prisma } from '@/lib/prisma';
import AsistenteFactura from '../_components/AsistenteFactura';

export const dynamic = 'force-dynamic';

export default async function PaginaNuevaFactura({ searchParams }: { searchParams: Promise<{ ordenes?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'FACTURAR')) redirect('/admin');
  const { ordenes } = await searchParams;
  const ids = (ordenes ?? '').split(',').map((s) => s.trim()).filter((s) => /^[a-z0-9]{10,40}$/i.test(s)).slice(0, 4);

  const [tNormal, tCont, compras, { tasa, alicuota }, cfg, elegidas] = await Promise.all([
    talonarioActivo(undefined, 'NORMAL'),
    talonarioActivo(undefined, 'CONTINGENCIA'),
    comprasSinFactura(periodoDe(new Date())),
    tasaYAlicuota(),
    obtenerConfigContable(),
    ids.length ? prisma.order.findMany({ where: { id: { in: ids } }, select: { id: true, orderNumber: true }, orderBy: { createdAt: 'asc' } }) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <header className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Nueva factura fiscal</h1>
          <p className={adminPageSubtitle}>Prepara los datos, revisa los montos en bolívares y registra o timbra la factura.</p>
        </div>
      </header>
      <AsistenteFactura
        talonario={tNormal ? talonarioDTO(tNormal) : null}
        talonarioContingencia={tCont ? talonarioDTO(tCont) : null}
        canalActivo={cfg.canalEmision}
        imprentaAmbiente={cfg.imprentaAmbiente}
        compras={compras}
        inicial={elegidas.length ? { ordenIds: elegidas.map((o) => o.id), ordenes: elegidas.map((o) => o.orderNumber) } : null}
        tasaHoy={tasa}
        alicuota={alicuota}
        hoy={hoyVe()}
      />
    </div>
  );
}
