import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { adminPageHeader, adminPageSubtitle, adminPageTitle } from '@/lib/admin-ui';
import { datosEmpresa, tasaYAlicuota } from '@/lib/contabilidad/servidor';
import AsistenteTalonario from '../_components/AsistenteTalonario';

// C-229: cargar un talonario. Solo el dueño (también lo frena proxy.ts: /admin/contabilidad/talonarios es de PAGINAS_SOLO_DUENO).
export const dynamic = 'force-dynamic';

export default async function PaginaNuevoTalonario() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'VER_CONTABILIDAD')) redirect('/admin/contabilidad/facturas');
  const [empresa, { alicuota }] = await Promise.all([datosEmpresa(), tasaYAlicuota()]);
  return (
    <div className="space-y-4">
      <header className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Cargar un talonario</h1>
          <p className={adminPageSubtitle}>Se copia lo que trae impreso. Se hace una vez por talonario.</p>
        </div>
      </header>
      <AsistenteTalonario empresa={empresa} alicuota={alicuota} />
    </div>
  );
}
