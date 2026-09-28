'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiCornerDownRight } from 'react-icons/fi';
import { adminHint, adminNotice, adminPrimaryButton } from '@/lib/admin-ui';
import { formatUSD, formatVES } from '@/lib/currency';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';

interface PagoSinOrden {
  id: string;
  referencia: string;
  montoVES: number;
  montoUSD: number;
  fechaPago: string;
  verificadoEn: string;
  cliente: { id: string; name: string | null; email: string } | null;
  puedeAcreditar: boolean;
}

/**
 * Pagos Móvil de compra que el banco confirmó pero que no llegaron a ser orden (C-114). Normalmente el checkout ya
 * los pasa al saldo; aquí quedan los que el cliente abandonó a medias. No se muestra nada si no hay ninguno.
 */
export default function PagosSinOrden({ onChange }: { onChange?: () => void }) {
  const [pagos, setPagos] = useState<PagoSinOrden[]>([]);
  const [minutos, setMinutos] = useState(30);
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const { confirm } = useConfirm();

  const cargar = async () => {
    const res = await fetch('/api/admin/pagos-sin-orden');
    if (!res.ok) return;
    const data = (await res.json()) as { pagos: PagoSinOrden[]; minutos: number };
    setPagos(data.pagos);
    setMinutos(data.minutos);
  };
  useCargarAlMontar(cargar);

  const acreditar = async (p: PagoSinOrden) => {
    const quien = p.cliente?.name || p.cliente?.email || 'el cliente';
    const ok = await confirm({
      title: 'Pasar el pago a su saldo',
      message: `Se acreditan ${formatUSD(p.montoUSD)} (${formatVES(p.montoVES)} a la tasa de hoy) al saldo de ${quien}. El pago ya no se podrá usar para una orden.`,
      confirmText: 'Pasar a saldo',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    setEnCurso(p.id);
    try {
      const res = await fetch(`/api/admin/pagos-sin-orden/${p.id}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo acreditar');
      toast.success(`${formatUSD(data.montoUSD)} pasaron al saldo de ${quien}`);
      await cargar();
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo acreditar');
    } finally {
      setEnCurso(null);
    }
  };

  if (pagos.length === 0) return null;

  return (
    <section className={adminNotice('danger')} aria-label="Pagos sin orden">
      <p className="flex items-center gap-2 font-semibold">
        <FiAlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {pagos.length === 1 ? '1 Pago Móvil de compra sin orden' : `${pagos.length} Pagos Móvil de compra sin orden`}
      </p>
      <p className="mt-1 text-ink-soft">
        El banco confirmó el pago, pero el pedido no se creó. Pásalo al saldo del cliente para que lo use en su compra.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {pagos.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3 text-ink sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm">
              <p className="font-semibold">
                {formatVES(p.montoVES)} <span className="font-normal text-muted">≈ {formatUSD(p.montoUSD)}</span>
              </p>
              <p className="truncate text-muted">
                Ref. {p.referencia} · {p.cliente ? `${p.cliente.name || 'Sin nombre'} (${p.cliente.email})` : 'Cliente no encontrado'}
              </p>
              <p className="text-xs text-muted">Verificado el {new Date(p.verificadoEn).toLocaleString('es-VE')}</p>
            </div>
            {p.puedeAcreditar ? (
              <button type="button" onClick={() => void acreditar(p)} disabled={enCurso === p.id} className={`${adminPrimaryButton} shrink-0`}>
                <FiCornerDownRight className="h-4 w-4" aria-hidden="true" />
                {enCurso === p.id ? 'Acreditando…' : 'Pasar a su saldo'}
              </button>
            ) : (
              <p className={`${adminHint} shrink-0 sm:max-w-56`}>Pagado hace poco: el cliente puede estar terminando la compra. Se podrá acreditar a los {minutos} minutos.</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
