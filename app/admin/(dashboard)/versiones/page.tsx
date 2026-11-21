import { adminPageHeader, adminPageSubtitle, adminPageTitle } from '@/lib/admin-ui';
import HistorialVersiones from '@/components/admin/version/HistorialVersiones';

// C-168: qué versión corre y qué cambió en cada módulo (mantenido para la Contadora y enlaces directos).
export const dynamic = 'force-dynamic';

export default function PaginaVersiones() {
  return (
    <div className="min-w-0 space-y-5">
      <header className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Sistema y versiones</h1>
          <p className={adminPageSubtitle}>Qué versión corre ahora y qué cambió en cada módulo del panel.</p>
        </div>
      </header>
      <HistorialVersiones />
    </div>
  );
}
