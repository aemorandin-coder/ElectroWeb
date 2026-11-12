'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { IconoCargando, IconoEnvio, IconoInfo } from '@/components/iconos';
import { formatUSD, formatVES } from '@/lib/currency';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';

// C-199: "Calcula tu envío" en la ficha y en el carrito (Andrés, 12/11). El cliente elige estado y ciudad de ZOOM y ve
// lo que le cobrará ZOOM al retirar en su oficina, en dólares y bolívares, por cada paquete (la tienda sale de Guanare;
// la ferretería, de La Victoria). El destino se recuerda en su navegador y, si inició sesión, sale de "Mis direcciones".
// Si ZOOM no responde, el servidor da un estimado propio y aquí se dice que es aproximado.

const CLAVE = 'es-envio-destino';

interface Ciudad { codigo: string; nombre: string; estado: string }
interface Destino { estado: string; ciudad: string }
interface Estimado {
  ciudad: Ciudad | null;
  paquetes: Array<{ origen: string | null; origenNombre: string; totalUSD: number; totalBs: number | null; aproximado: boolean }>;
}

function leerGuardado(): Destino | null {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) || 'null') as Destino | null;
    return d && typeof d.estado === 'string' && typeof d.ciudad === 'string' ? d : null;
  } catch {
    return null;
  }
}
function guardar(d: Destino) {
  try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch { /* sin almacenamiento: no se recuerda */ }
}

export default function CalculaTuEnvio({ items, paquetes, className = '' }: {
  /** Lo que se manda: el servidor saca el peso, las medidas y el valor de la base */
  items: Array<{ productId: string; quantity: number }>;
  /** Los paquetes como los ve la página: su origen y si la tienda paga su envío */
  paquetes: Array<{ origen: string | null; origenNombre: string; gratis: boolean }>;
  className?: string;
}) {
  const { status } = useSession();
  const [lista, setLista] = useState<{ estados: string[]; ciudades: Ciudad[] } | null>(null);
  const [errorLista, setErrorLista] = useState(false);
  const [destino, setDestino] = useState<Destino>({ estado: '', ciudad: '' });
  const [estimado, setEstimado] = useState<{ para: string; datos: Estimado } | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [errorCalculo, setErrorCalculo] = useState('');
  const pedido = useRef(0);
  const clave = useMemo(() => JSON.stringify(items), [items]);
  const porPagar = paquetes.filter((p) => !p.gratis);

  // La lista de ciudades de ZOOM y el destino de la última vez
  useCargarAlMontar(async () => {
    const guardado = leerGuardado();
    if (guardado) setDestino(guardado);
    try {
      const r = await fetch('/api/public/envio/destinos');
      const d = r.ok ? await r.json() : null;
      if (Array.isArray(d?.ciudades)) setLista(d); else setErrorLista(true);
    } catch {
      setErrorLista(true);
    }
  });

  // Sin destino guardado y con sesión: la agencia de ZOOM de "Mis direcciones" (la predeterminada primero)
  useCargarAlMontar(async () => {
    if (status !== 'authenticated' || leerGuardado()) return;
    try {
      const r = await fetch('/api/customer/addresses');
      const d = r.ok ? await r.json() : null;
      const direcciones: Array<Record<string, unknown>> = Array.isArray(d?.addresses) ? d.addresses : [];
      const deZoom = direcciones.filter((x) => x.type === 'ZOOM' && typeof x.cityCode === 'string' && x.cityCode && typeof x.state === 'string');
      const elegida = deZoom.find((x) => x.isDefault === true) ?? deZoom[0];
      if (elegida) setDestino({ estado: String(elegida.state), ciudad: String(elegida.cityCode) });
    } catch {
      // Sin direcciones: elige a mano
    }
  }, [status]);

  // Con la ciudad elegida, se calcula (y otra vez si cambia el carrito)
  useEffect(() => {
    if (!destino.ciudad || porPagar.length === 0 || items.length === 0) return;
    const id = ++pedido.current;
    const para = `${destino.ciudad}|${clave}`;
    const t = setTimeout(async () => {
      setCalculando(true);
      setErrorCalculo('');
      try {
        const r = await fetch('/api/public/envio/estimado', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, ciudad: destino.ciudad }),
        });
        const d = await r.json().catch(() => null);
        if (id !== pedido.current) return;
        if (!r.ok || !Array.isArray(d?.paquetes)) { setErrorCalculo(d?.error || 'No se pudo calcular ahora.'); return; }
        setEstimado({ para, datos: d });
      } catch {
        if (id === pedido.current) setErrorCalculo('No se pudo calcular ahora.');
      } finally {
        if (id === pedido.current) setCalculando(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // `items` cambia con `clave`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino.ciudad, clave, porPagar.length]);

  if (porPagar.length === 0) return null;
  const ciudadesDelEstado = lista?.ciudades.filter((c) => c.estado === destino.estado) ?? [];
  const vigente = estimado && estimado.para === `${destino.ciudad}|${clave}` ? estimado.datos : null;
  const ciudadNombre = vigente?.ciudad?.nombre ?? lista?.ciudades.find((c) => c.codigo === destino.ciudad)?.nombre ?? '';
  const aproximado = vigente?.paquetes.some((p) => p.aproximado) ?? false;
  const varios = paquetes.length > 1;

  const elegir = (d: Destino) => {
    setDestino(d);
    if (d.ciudad) guardar(d);
  };

  return (
    <section aria-labelledby="calcula-envio" className={`rounded-xl border border-line bg-surface p-3 ${className}`}>
      <h3 id="calcula-envio" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <IconoEnvio className="h-4 w-4 text-brand-600" aria-hidden="true" /> Calcula tu envío
      </h3>
      {errorLista ? (
        <p className="mt-2 text-xs text-muted">Ahora no pudimos cargar las ciudades de ZOOM. Al pagar verás la tarifa de tu oficina.</p>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="sr-only">Estado</span>
            <select
              value={destino.estado}
              onChange={(e) => elegir({ estado: e.target.value, ciudad: '' })}
              disabled={!lista}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              <option value="">{lista ? 'Tu estado' : 'Cargando…'}</option>
              {lista?.estados.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Ciudad</span>
            <select
              value={destino.ciudad}
              onChange={(e) => elegir({ estado: destino.estado, ciudad: e.target.value })}
              disabled={!destino.estado}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-60"
            >
              <option value="">Tu ciudad</option>
              {ciudadesDelEstado.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
            </select>
          </label>
        </div>
      )}

      <div aria-live="polite" className="mt-2 text-sm">
        {calculando && <p className="flex items-center gap-2 text-muted"><IconoCargando className="h-4 w-4 animate-spin" aria-hidden="true" /> Calculando…</p>}
        {!calculando && errorCalculo && <p className="text-muted">{errorCalculo}</p>}
        {!calculando && !errorCalculo && vigente && vigente.paquetes.length > 0 && (
          <div className="space-y-1.5">
            {varios && <p className="text-xs font-semibold text-ink-soft">Llega en {paquetes.length} paquetes:</p>}
            <ul className="space-y-1">
              {paquetes.map((p) => {
                const e = vigente.paquetes.find((x) => x.origen === p.origen);
                return (
                  <li key={p.origen ?? 'tienda'} className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-ink-soft">{varios ? `Desde ${p.origenNombre}` : `A ${ciudadNombre}`}</span>
                    {p.gratis
                      ? <span className="font-semibold text-success-strong">Envío gratis</span>
                      : e
                        ? <span className="tabular-nums text-ink"><strong>{aproximado ? 'unos ' : ''}{formatUSD(e.totalUSD)}</strong>{e.totalBs ? <span className="text-muted"> ({formatVES(e.totalBs)})</span> : null}</span>
                        : <span className="text-muted">sin dato</span>}
                  </li>
                );
              })}
            </ul>
            <p className="flex items-start gap-1 text-xs text-muted">
              <IconoInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {varios ? `A ${ciudadNombre}, ` : ''}retirando en una oficina de ZOOM. Lo pagas al retirar (cobro a destino). MRW cobra parecido.
                {aproximado ? ' Aproximado: ZOOM no respondió ahora.' : ' Es una referencia de ZOOM.'}
              </span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
