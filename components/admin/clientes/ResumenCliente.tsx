'use client';

// C-213: el resumen del cliente en su ficha (Andrés, 13/11, la idea A). Arriba, lo que hay que atender y cómo compra,
// calculado por el servidor; abajo, a pedido, el resumen de Claude y qué ofrecerle, con productos reales de la tienda.

import { useState } from 'react';
import Link from 'next/link';
import {
  IconoActualizar, IconoDocumento, IconoGarantia, IconoNovedad, IconoOrdenes, IconoPedirProducto, IconoPorcentaje,
} from '@/components/iconos';
import { formatUSD } from '@/lib/currency';
import { adminBadge, adminDato, adminNotice, adminPrimaryButton, adminSecondaryButton, adminSpinner } from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import type { HechosCliente, Pendiente, ResumenIA } from '@/lib/ia/resumen-cliente';

const ICONO_PENDIENTE: Record<Pendiente['tipo'], typeof IconoOrdenes> = {
  orden: IconoOrdenes,
  garantia: IconoGarantia,
  cotizacion: IconoDocumento,
  pedido: IconoPedirProducto,
  descuento: IconoPorcentaje,
};

export default function ResumenCliente({ clienteId }: { clienteId: string }) {
  const [hechos, setHechos] = useState<HechosCliente | null>(null);
  const [iaDisponible, setIaDisponible] = useState(true);
  const [ia, setIa] = useState<ResumenIA | null>(null);
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    const r = await fetch(`/api/admin/clientes/${clienteId}/resumen`);
    if (!r.ok) return;
    const datos = (await r.json()) as { hechos: HechosCliente; iaDisponible: boolean };
    setHechos(datos.hechos);
    setIaDisponible(datos.iaDisponible);
  };
  useCargarAlMontar(cargar, [clienteId]);

  const resumir = async () => {
    setPensando(true);
    setError('');
    try {
      const r = await fetch(`/api/admin/clientes/${clienteId}/resumen`, { method: 'POST' });
      const datos = (await r.json().catch(() => ({}))) as { hechos?: HechosCliente; ia?: ResumenIA; error?: string };
      if (!r.ok || !datos.ia) {
        setError(datos.error || 'No se pudo armar el resumen.');
        return;
      }
      if (datos.hechos) setHechos(datos.hechos);
      setIa(datos.ia);
    } catch {
      setError('Sin conexión con la tienda. Prueba otra vez.');
    } finally {
      setPensando(false);
    }
  };

  if (!hechos) return <div className="flex justify-center py-6"><span className={adminSpinner} aria-label="Cargando" /></div>;

  return (
    <div className="space-y-5">
      <section aria-labelledby="atender-titulo">
        <h4 id="atender-titulo" className="mb-2 text-sm font-bold text-ink">Lo que hay que atender</h4>
        {hechos.pendientes.length === 0 ? (
          <p className="text-sm text-muted">Nada pendiente con la tienda.</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {hechos.pendientes.map((p) => {
              const Icono = ICONO_PENDIENTE[p.tipo];
              return (
                <li key={`${p.tipo}-${p.texto}`} className="flex gap-3 px-3 py-2.5 text-sm">
                  <Icono className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  {/* En el teléfono, la píldora va debajo: el texto usa todo el ancho */}
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <Link href={p.enlace} className="min-w-0 text-ink hover:text-brand-600 hover:underline">{p.texto}</Link>
                    {p.lesToca ? <span className={adminBadge('warning')}>Te toca</span> : <span className={adminBadge('brand')}>Espera al cliente</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="como-compra-titulo">
        <h4 id="como-compra-titulo" className="mb-2 text-sm font-bold text-ink">Cómo compra</h4>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex flex-wrap items-baseline gap-2"><dt className="text-muted">Última compra:</dt><dd className="text-ink">{hechos.ultimaCompra ? `${hechos.ultimaCompra} (hace ${hechos.diasDesdeUltima} ${hechos.diasDesdeUltima === 1 ? 'día' : 'días'})` : 'todavía no compra'}</dd></div>
          <div className="flex flex-wrap items-baseline gap-2"><dt className="text-muted">Por compra, en promedio:</dt><dd className="tabular-nums text-ink">{hechos.compras ? formatUSD(hechos.ticketUSD) : 'sin compras'}</dd></div>
          <div className="flex flex-wrap items-baseline gap-2"><dt className="text-muted">Puntos ES:</dt><dd className="tabular-nums text-ink">{formatUSD(hechos.puntosES)}</dd></div>
          <div className="flex flex-wrap items-baseline gap-2"><dt className="text-muted">Cliente desde:</dt><dd className="text-ink">{hechos.clienteDesde}</dd></div>
          {hechos.metodos.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2"><dt className="text-muted">Paga con:</dt>{hechos.metodos.map((m) => <dd key={m.nombre} className={adminDato}>{m.nombre} · {m.veces}</dd>)}</div>
          )}
          {hechos.entregas.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2"><dt className="text-muted">Recibe por:</dt>{hechos.entregas.map((e) => <dd key={e.nombre} className={adminDato}>{e.nombre} · {e.veces}</dd>)}</div>
          )}
        </dl>
      </section>

      <section aria-labelledby="ia-titulo" className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 id="ia-titulo" className="flex items-center gap-2 text-sm font-bold text-ink">
            <IconoNovedad className="h-4 w-4 text-brand-600" aria-hidden="true" /> El resumen de la IA
          </h4>
          {ia && !pensando && (
            <button type="button" onClick={resumir} className={`${adminSecondaryButton} min-h-11`}>
              <IconoActualizar className="h-4 w-4" aria-hidden="true" /> Volver a resumir
            </button>
          )}
        </div>

        {!iaDisponible ? (
          <p className={`${adminNotice('neutral')} mt-3`}>Falta la clave de Claude en el servidor (ANTHROPIC_API_KEY): sin ella, solo se ven los datos de arriba.</p>
        ) : pensando ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft" role="status"><span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-hidden="true" /> Leyendo sus compras… tarda unos 15 segundos.</p>
        ) : !ia ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-ink-soft">Claude lee lo que compró, cómo paga y lo que tiene pendiente, y te propone qué ofrecerle de la tienda. Solo le llega su primer nombre y su ciudad.</p>
            <button type="button" onClick={resumir} className={`${adminPrimaryButton} min-h-11`}>
              <IconoNovedad className="h-4 w-4" aria-hidden="true" /> Resumir con Claude
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-4 text-sm">
            <p className="leading-relaxed text-ink">{ia.resumen}</p>
            {ia.comoCompra.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-ink-soft">{ia.comoCompra.map((t) => <li key={t}>{t}</li>)}</ul>
            )}
            {ia.siguientePaso && <p className="rounded-xl bg-white p-3 text-ink ring-1 ring-inset ring-line"><span className="font-semibold">Lo que conviene ahora: </span>{ia.siguientePaso}</p>}
            <div>
              <p className="mb-2 font-semibold text-ink">Qué ofrecerle</p>
              {ia.ofrecer.length === 0 ? (
                <p className="text-muted">Nada de la tienda encaja con lo que compra.</p>
              ) : (
                <ul className="space-y-2">
                  {ia.ofrecer.map((o) => (
                    <li key={o.id} className="rounded-xl bg-white p-3 ring-1 ring-inset ring-line">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <a href={`/productos/${o.slug}`} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 hover:underline">{o.nombre}</a>
                        <span className="tabular-nums text-ink">{formatUSD(o.precioUSD)}</span>
                      </div>
                      {o.motivo && <p className="mt-1 text-ink-soft">{o.motivo}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-muted">Redactado por {ia.firma}. Revísalo antes de usarlo con el cliente.</p>
          </div>
        )}
        {error && <p className={`${adminNotice('danger')} mt-3`} role="alert">{error}</p>}
      </section>
    </div>
  );
}
