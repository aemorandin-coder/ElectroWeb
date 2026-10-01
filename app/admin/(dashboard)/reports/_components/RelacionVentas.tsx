'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiDownload, FiFileText } from 'react-icons/fi';
import { adminCard, adminHint, adminInput, adminLabel, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD, formatVES } from '@/lib/currency';
import { csvRelacionVentas, mesActual, type FilaVenta, type TotalesVentas } from '@/lib/relacion-ventas';

/**
 * Relación de ventas del mes (C-147): descarga para el contador con las órdenes pagadas, su base, su IVA y su factura.
 * Antes de descargar muestra el resumen del mes y cuántas órdenes siguen sin número de factura.
 */
export default function RelacionVentas() {
  const [mes, setMes] = useState(mesActual);
  const [cargando, setCargando] = useState(false);
  const [resumen, setResumen] = useState<{ mes: string; totales: TotalesVentas; cortado: boolean } | null>(null);

  const descargar = async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/reports/ventas?mes=${encodeURIComponent(mes)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'No se pudo armar la relación de ventas');
        return;
      }
      const filas: FilaVenta[] = data.filas ?? [];
      setResumen({ mes, totales: data.totales, cortado: Boolean(data.cortado) });
      if (filas.length === 0) {
        toast('Ese mes no tiene órdenes pagadas.');
        return;
      }
      // BOM para que Excel lea los acentos
      const url = URL.createObjectURL(new Blob(['﻿' + csvRelacionVentas(filas)], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `relacion-de-ventas-${mes}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const t = resumen?.mes === mes ? resumen.totales : null;

  return (
    <section aria-labelledby="relacion-ventas-titulo" className={`${adminCard} p-4`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 id="relacion-ventas-titulo" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FiFileText className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" /> Relación de ventas del mes
          </h2>
          <p className={adminHint}>Para tu contador: cada orden pagada con su base, su IVA, la forma de pago y el número de factura. No es un documento fiscal.</p>
        </div>
        <div className="flex shrink-0 items-end gap-2">
          <div>
            <label htmlFor="relacion-ventas-mes" className={adminLabel}>Mes</label>
            <input id="relacion-ventas-mes" type="month" value={mes} max={mesActual()} onChange={(e) => setMes(e.target.value)} className={`${adminInput()} w-44`} />
          </div>
          <button type="button" onClick={descargar} disabled={cargando || !mes} className={adminSecondaryButton}>
            <FiDownload className="h-4 w-4" aria-hidden="true" /> {cargando ? 'Preparando…' : 'Descargar'}
          </button>
        </div>
      </div>

      {t && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-sm sm:grid-cols-4" aria-live="polite">
          <div><dt className="text-xs text-muted">Órdenes pagadas</dt><dd className="font-semibold tabular-nums text-ink">{t.ordenes}{t.anuladas > 0 && <span className="font-normal text-muted"> · {t.anuladas} anuladas</span>}</dd></div>
          <div><dt className="text-xs text-muted">Base imponible</dt><dd className="font-semibold tabular-nums text-ink">{formatUSD(t.baseUSD)}</dd></div>
          <div><dt className="text-xs text-muted">IVA</dt><dd className="font-semibold tabular-nums text-ink">{formatUSD(t.ivaUSD)}</dd></div>
          <div><dt className="text-xs text-muted">Total</dt><dd className="font-semibold tabular-nums text-ink">{formatUSD(t.totalUSD)}<span className="block text-xs font-normal text-muted">{formatVES(t.totalBs)}</span></dd></div>
          {t.sinFactura > 0 && <p className="col-span-full text-xs text-warning-strong">{t.sinFactura} {t.sinFactura === 1 ? 'orden no tiene' : 'órdenes no tienen'} número de factura anotado.</p>}
          {resumen?.cortado && <p className="col-span-full text-xs text-warning-strong">El mes pasa de 5.000 órdenes: el archivo salió incompleto.</p>}
        </dl>
      )}
    </section>
  );
}
