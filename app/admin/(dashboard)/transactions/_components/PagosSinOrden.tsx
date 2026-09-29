'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiArchive, FiCornerDownRight, FiLink } from 'react-icons/fi';
import { adminError, adminHint, adminInput, adminNotice, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD, formatVES } from '@/lib/currency';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';

interface OrdenCandidata {
  id: string;
  orderNumber: string;
  totalUSD: number;
  totalVES: number;
  estado: string;
  pago: string;
  metodoPago: string;
  montoCoincide: boolean;
  createdAt: string;
}

interface PagoSinOrden {
  id: string;
  referencia: string;
  montoVES: number;
  montoUSD: number;
  fechaPago: string;
  verificadoEn: string;
  cliente: { id: string; name: string | null; email: string } | null;
  puedeAcreditar: boolean;
  diasDesdePago: number;
  candidatas: OrdenCandidata[];
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Pagos Móvil de compra que el banco confirmó pero que no llegaron a ser orden (C-114). Normalmente el checkout ya
 * los pasa al saldo; aquí quedan los que el cliente abandonó a medias. No se muestra nada si no hay ninguno.
 * C-123: los viejos casi siempre se atendieron a mano (orden hecha o confirmada en el panel): se vinculan a su
 * orden o se archivan con una nota. Pasarlos al saldo le daría al cliente otra vez lo que ya recibió.
 */
export default function PagosSinOrden({ onChange }: { onChange?: () => void }) {
  const [pagos, setPagos] = useState<PagoSinOrden[]>([]);
  const [minutos, setMinutos] = useState(30);
  const [diasViejo, setDiasViejo] = useState(3);
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [archivando, setArchivando] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [errorNota, setErrorNota] = useState('');
  const { confirm } = useConfirm();

  const cargar = async () => {
    const res = await fetch('/api/admin/pagos-sin-orden');
    if (!res.ok) return;
    const data = (await res.json()) as { pagos: PagoSinOrden[]; minutos: number; diasViejo: number };
    setPagos(data.pagos);
    setMinutos(data.minutos);
    setDiasViejo(data.diasViejo);
  };
  useCargarAlMontar(cargar);

  const enviar = async (p: PagoSinOrden, cuerpo: Record<string, string>, exito: (data: { montoUSD?: number; orderNumber?: string }) => string) => {
    setEnCurso(p.id);
    try {
      const res = await fetch(`/api/admin/pagos-sin-orden/${p.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo completar');
      toast.success(exito(data));
      setArchivando(null);
      setNota('');
      await cargar();
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo completar');
    } finally {
      setEnCurso(null);
    }
  };

  const acreditar = async (p: PagoSinOrden) => {
    const quien = p.cliente?.name || p.cliente?.email || 'el cliente';
    const ok = await confirm({
      title: 'Pasar el pago a su saldo',
      message: `Se acreditan ${formatUSD(p.montoUSD)} (${formatVES(p.montoVES)} a la tasa de hoy) al saldo de ${quien}. El pago ya no se podrá usar para una orden.${
        p.diasDesdePago >= diasViejo ? ` Es un pago de hace ${p.diasDesdePago} días: hazlo solo si el cliente no recibió su pedido.` : ''
      }`,
      confirmText: 'Pasar a saldo',
      cancelText: 'Cancelar',
    });
    if (ok) await enviar(p, { accion: 'saldo' }, (d) => `${formatUSD(d.montoUSD ?? 0)} pasaron al saldo de ${quien}`);
  };

  const vincular = async (p: PagoSinOrden, o: OrdenCandidata) => {
    const ok = await confirm({
      title: `Vincular a la orden #${o.orderNumber}`,
      message: `El pago ref. ${p.referencia} queda registrado como el de esa orden. No cambia la orden ni el saldo del cliente.`,
      confirmText: 'Vincular',
      cancelText: 'Cancelar',
    });
    if (ok) await enviar(p, { accion: 'vincular', orderId: o.id }, (d) => `Pago vinculado a la orden #${d.orderNumber ?? o.orderNumber}`);
  };

  const archivar = async (p: PagoSinOrden) => {
    if (nota.trim().length < 10) { setErrorNota('Escribe qué pasó con este pago (mínimo 10 caracteres)'); return; }
    await enviar(p, { accion: 'archivar', nota: nota.trim() }, () => 'Pago archivado');
  };

  if (pagos.length === 0) return null;

  return (
    <section className={adminNotice('danger')} aria-label="Pagos sin orden">
      <p className="flex items-center gap-2 font-semibold">
        <FiAlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {pagos.length === 1 ? '1 Pago Móvil de compra sin orden' : `${pagos.length} Pagos Móvil de compra sin orden`}
      </p>
      <p className="mt-1 text-ink-soft">
        El banco confirmó el pago, pero no quedó enlazado a un pedido. Si el pedido se hizo o se entregó por otro camino, vincúlalo a su orden o archívalo.
        Pásalo al saldo solo si el cliente no recibió nada.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {pagos.map((p) => {
          const viejo = p.diasDesdePago >= diasViejo;
          const ocupado = enCurso === p.id;
          return (
            <li key={p.id} className="rounded-xl border border-line bg-white p-3 text-ink">
              <div className="min-w-0 text-sm">
                <p className="font-semibold">
                  {formatVES(p.montoVES)} <span className="font-normal text-muted">≈ {formatUSD(p.montoUSD)} a la tasa de hoy</span>
                </p>
                <p className="truncate text-muted">
                  Ref. {p.referencia} · {p.cliente ? `${p.cliente.name || 'Sin nombre'} (${p.cliente.email})` : 'Cliente no encontrado'}
                </p>
                <p className="text-xs text-muted">
                  Verificado el {new Date(p.verificadoEn).toLocaleString('es-VE')}{p.diasDesdePago > 0 ? ` · hace ${p.diasDesdePago} ${p.diasDesdePago === 1 ? 'día' : 'días'}` : ''}
                </p>
                {viejo && (
                  <p className="mt-1 text-xs font-semibold text-warning-strong">
                    Pago viejo: revisa si ya se atendió antes de pasarlo al saldo.
                  </p>
                )}
              </div>

              {p.candidatas.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-ink-soft">¿Es de una de estas órdenes del cliente?</p>
                  <ul className="mt-1 flex flex-col gap-1.5">
                    {p.candidatas.map((o) => (
                      <li key={o.id} className="flex flex-col gap-2 rounded-lg bg-surface px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <span className="min-w-0">
                          <span className="font-semibold">#{o.orderNumber}</span>
                          <span className="text-muted"> · {fecha(o.createdAt)} · {formatUSD(o.totalUSD)}{o.totalVES > 0 ? ` (${formatVES(o.totalVES)})` : ''} · {o.metodoPago} · {o.estado}, {o.pago}</span>
                          {o.montoCoincide && <span className="ml-1 font-semibold text-success-strong">· mismo monto</span>}
                        </span>
                        <button type="button" onClick={() => void vincular(p, o)} disabled={ocupado} className={`${adminSecondaryButton} shrink-0`}>
                          <FiLink className="h-4 w-4" aria-hidden="true" /> Es esta orden
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {archivando === p.id ? (
                <div className="mt-3">
                  <label htmlFor={`nota-${p.id}`} className="text-xs font-semibold text-ink-soft">Qué pasó con este pago</label>
                  <textarea id={`nota-${p.id}`} rows={2} value={nota} maxLength={500}
                    onChange={(e) => { setNota(e.target.value); setErrorNota(''); }}
                    placeholder="Ej.: pagado y entregado en diciembre; la orden se hizo a mano"
                    className={`${adminInput(!!errorNota)} mt-1 h-auto py-2`} aria-invalid={!!errorNota} />
                  {errorNota && <p className={adminError} role="alert">{errorNota}</p>}
                  <p className={adminHint}>Queda en la bitácora. El pago deja de aparecer aquí y no se puede usar ni acreditar.</p>
                  <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => { setArchivando(null); setNota(''); setErrorNota(''); }} className={adminSecondaryButton}>Cancelar</button>
                    <button type="button" onClick={() => void archivar(p)} disabled={ocupado} className={adminPrimaryButton}>
                      <FiArchive className="h-4 w-4" aria-hidden="true" /> {ocupado ? 'Archivando…' : 'Archivar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => { setArchivando(p.id); setNota(''); setErrorNota(''); }} disabled={ocupado} className={adminSecondaryButton}>
                    <FiArchive className="h-4 w-4" aria-hidden="true" /> Ya se atendió
                  </button>
                  {p.puedeAcreditar ? (
                    <button type="button" onClick={() => void acreditar(p)} disabled={ocupado} className={viejo ? adminSecondaryButton : adminPrimaryButton}>
                      <FiCornerDownRight className="h-4 w-4" aria-hidden="true" />
                      {ocupado ? 'Acreditando…' : 'Pasar a su saldo'}
                    </button>
                  ) : (
                    <p className={`${adminHint} sm:max-w-56`}>Pagado hace poco: el cliente puede estar terminando la compra. Se podrá acreditar a los {minutos} minutos.</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
