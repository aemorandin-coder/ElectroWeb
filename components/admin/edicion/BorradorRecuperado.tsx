import { FiClock } from 'react-icons/fi';
import { adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

// C-169: había un borrador de este formulario en el navegador (se recargó o se cerró la pestaña sin guardar)

const formato = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function BorradorRecuperado({ guardadoEn, que = 'cambios sin guardar', onRecuperar, onDescartar }: {
  guardadoEn: string;
  que?: string;
  onRecuperar: () => void;
  onDescartar: () => void;
}) {
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning-strong">
      <FiClock className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 basis-64">
        <span className="font-semibold">Tienes {que}.</span> Los dejaste guardados en este navegador el {formato.format(new Date(guardadoEn))}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onRecuperar} className={adminPrimaryButton}>Recuperar</button>
        <button type="button" onClick={onDescartar} className={adminSecondaryButton}>Descartar</button>
      </div>
    </div>
  );
}
