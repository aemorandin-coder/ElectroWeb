'use client';

// C-229: una factura registrada. La réplica tal como se escribió, quién la registró y de qué órdenes sale. Una factura
// emitida no se cambia: si se escribió mal, se anula con su motivo (el papel se guarda) y se escribe la siguiente.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import CasillaPorCasilla from '@/components/admin/contabilidad/CasillaPorCasilla';
import ReplicaTalonario from '@/components/admin/contabilidad/ReplicaTalonario';
import { datosReplica } from '@/components/admin/contabilidad/datos';
import { imprimirFactura } from '@/components/admin/contabilidad/imprimir';
import { IconoAdvertencia, IconoCerrar, IconoDocumento, IconoEliminar, IconoFlechaIzquierda, IconoImpresora, IconoOrdenes, IconoVer } from '@/components/iconos';
import {
  adminBadge, adminCard, adminDangerButton, adminDato, adminError, adminLabel, adminModalBody, adminModalFooter, adminModalHeader, adminModalOverlay,
  adminModalPanel, adminModalTitle, adminPageHeader, adminPageTitle, adminSecondaryButton,
} from '@/lib/admin-ui';
import type { FacturaDTO } from '@/lib/dto/contabilidad';
import { formatUSD, formatVES } from '@/lib/currency';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

const cuando = (iso: string) => new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export default function FichaFactura({ factura, puedeAnular }: { factura: FacturaDTO; /** C-235: la contadora la ve, pero no anula */ puedeAnular: boolean }) {
  const router = useRouter();
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verCompleta, setVerCompleta] = useState(false);
  useBodyScrollLock(anulando);

  const anulada = factura.estado === 'ANULADA';
  const replica = factura.talonario
    ? datosReplica(factura.talonario, {
        numeroTexto: factura.numeroTexto,
        numeroControl: factura.numeroControl,
        fecha: factura.origen === 'EN_BLANCO' ? null : factura.emitidaEl.slice(0, 10),
        comprador: factura.comprador,
        condicionPago: factura.origen === 'EN_BLANCO' ? null : factura.condicionPago,
        renglones: factura.renglones,
        totales: factura.origen === 'EN_BLANCO' ? null : { descuentoBs: factura.descuentoBs, baseBs: factura.baseBs, ivaBs: factura.ivaBs, exentoBs: factura.exentoBs, totalBs: factura.totalBs },
        alicuota: factura.alicuota,
        anulada,
      })
    : null;

  const anular = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/contabilidad/facturas/${factura.id}/anular`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motivo: motivo.trim() }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setError(d?.error ?? 'No se pudo anular.');
        return;
      }
      toast.success(`Factura ${factura.etiqueta} anulada`);
      setAnulando(false);
      router.refresh();
    } catch {
      setError('Sin conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link href={`/admin/contabilidad/facturas?mes=${factura.periodo}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
        <IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /> Facturas
      </Link>
      <header className={adminPageHeader}>
        <div>
          <h1 className={`${adminPageTitle} flex flex-wrap items-center gap-3`}>
            Factura {factura.etiqueta}
            {anulada
              ? <span className={adminBadge('danger')}><IconoCerrar className="h-3.5 w-3.5" aria-hidden="true" /> Anulada</span>
              : <span className={adminBadge('success')}><IconoDocumento className="h-3.5 w-3.5" aria-hidden="true" /> Emitida</span>}
          </h1>
          <p className="mt-1 text-sm text-muted tabular-nums">Control {factura.numeroControl} · {factura.origen === 'EN_BLANCO' ? 'papel anulado sin usar' : formatVES(factura.totalBs)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {replica && factura.origen !== 'EN_BLANCO' && (
            <button type="button" onClick={imprimirFactura} className={adminSecondaryButton}><IconoImpresora className="h-4 w-4" aria-hidden="true" /> Imprimir</button>
          )}
          {!anulada && puedeAnular && (
            <button type="button" onClick={() => { setAnulando(true); setError(null); }} className={adminSecondaryButton}>
              <IconoEliminar className="h-4 w-4" aria-hidden="true" /> Anular
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-start">
        <section className={adminCard} aria-labelledby="datos-factura">
          <h2 id="datos-factura" className="text-base font-semibold text-ink">Datos</h2>
          <dl className="mt-3 grid gap-3 text-sm">
            {anulada && (
              <div className="rounded-xl border border-deal/30 bg-deal-bg p-3 text-deal">
                <dt className="font-semibold">Anulada{factura.anuladaEl ? ` el ${cuando(factura.anuladaEl)}` : ''}{factura.anuladaPor ? ` por ${factura.anuladaPor}` : ''}</dt>
                <dd className="mt-1">{factura.motivoAnulacion}</dd>
              </div>
            )}
            <div><dt className="text-xs text-muted">Registrada</dt><dd className="font-semibold text-ink">{cuando(factura.registradaEl)}{factura.creadoPor ? ` · ${factura.creadoPor}` : ''}</dd></div>
            {factura.origen !== 'EN_BLANCO' && (
              <>
                <div><dt className="text-xs text-muted">De dónde sale</dt><dd className="font-semibold text-ink">{factura.origen === 'ORDEN' ? 'Una compra de la web' : 'Una venta en la tienda'}</dd></div>
                {factura.ordenes.length > 0 && (
                  <div>
                    <dt className="text-xs text-muted">Órdenes</dt>
                    <dd className="mt-1 flex flex-wrap gap-2">
                      {factura.ordenes.map((o) => (
                        <span key={o.id} className={adminDato}>
                          <IconoOrdenes className="h-3.5 w-3.5" aria-hidden="true" /> {o.orderNumber}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {factura.totalUSD !== null && factura.tasa !== null && (
                  <div><dt className="text-xs text-muted">Cobrado</dt><dd className="font-semibold tabular-nums text-ink">{formatUSD(factura.totalUSD)} a {formatVES(factura.tasa)}</dd></div>
                )}
              </>
            )}
          </dl>
        </section>

        {replica && (
          <div>
            {factura.origen !== 'EN_BLANCO' && (
              <section className={`${adminCard} lg:hidden`} aria-labelledby="casillas">
                <h2 id="casillas" className="text-base font-semibold text-ink">Casilla por casilla</h2>
                <CasillaPorCasilla datos={replica} />
                <button type="button" onClick={() => setVerCompleta((v) => !v)} aria-expanded={verCompleta} className={`${adminSecondaryButton} mt-3 w-full`}>
                  <IconoVer className="h-4 w-4" aria-hidden="true" /> {verCompleta ? 'Ocultar la factura completa' : 'Ver la factura completa'}
                </button>
              </section>
            )}
            <div className={`factura-imprimible ${verCompleta || factura.origen === 'EN_BLANCO' ? 'mt-4 block overflow-x-auto' : 'hidden'} lg:mt-0 lg:block`}>
              <div className="min-w-[40rem]"><ReplicaTalonario datos={replica} /></div>
            </div>
          </div>
        )}
      </div>

      {anulando && (
        <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="anular-titulo" onClick={(e) => { if (e.target === e.currentTarget && !enviando) setAnulando(false); }}>
          <div className={`${adminModalPanel} sm:max-w-md`}>
            <div className={adminModalHeader}>
              <h2 id="anular-titulo" className={adminModalTitle}>Anular la factura {factura.etiqueta}</h2>
              <button type="button" onClick={() => setAnulando(false)} disabled={enviando} aria-label="Cerrar" className="rounded-lg p-2 text-muted hover:bg-surface"><IconoCerrar className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <div className={adminModalBody}>
              <p className="text-sm text-ink-soft">
                Queda en el libro como anulada y {factura.ordenes.length ? 'la orden vuelve a quedar sin factura. ' : ''}<strong>Guarda el papel: el original y la copia</strong>. Si había que corregir algo, escribe la siguiente.
              </p>
              <label htmlFor="anular-motivo" className={`${adminLabel} mt-4`}>Motivo</label>
              <textarea id="anular-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} rows={3} placeholder="El RIF quedó mal escrito" className="w-full rounded-lg border border-line-strong p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              {error && <p role="alert" className={`${adminError} mt-2`}><IconoAdvertencia className="mr-1 inline h-4 w-4" aria-hidden="true" />{error}</p>}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setAnulando(false)} disabled={enviando} className={adminSecondaryButton}>Cancelar</button>
              <button type="button" onClick={() => void anular()} disabled={enviando || motivo.trim().length < 5} className={adminDangerButton}>
                {enviando ? 'Anulando…' : 'Anular la factura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
