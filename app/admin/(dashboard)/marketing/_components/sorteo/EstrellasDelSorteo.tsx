'use client';

// C-297: el producto estrella de cada semana del sorteo, en su tablero (Andrés, 18/11: "Producto estrella con pack de
// boletos; seleccionamos uno a la semana", y "puedo hacer que sea cualquier producto"). Una fila por semana, de lunes a
// domingo: el producto con su foto, sus boletos por unidad y cuántos se vendieron. Elegirlo es un formulario corto de dos
// campos (el producto y sus boletos, PLAN.md §1.9), con cómo se verá su sello antes de guardar.
// Una semana que empezó y ya vendió su producto queda trabada (lo dice con su candado): solo se le suben los boletos.
import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import Ayuda from '@/components/admin/Ayuda';
import CampoUnidad from '@/components/admin/CampoUnidad';
import { IconoCandado, IconoCupon, IconoEditar, IconoEliminar, IconoEstrella, IconoMas } from '@/components/iconos';
import ProductPicker from '@/app/admin/(dashboard)/studio/_components/ProductPicker';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { adminBadge, adminCard, adminDato, adminError, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { numero } from './tipos';

interface EstrellaSemana {
  productId: string;
  nombre: string;
  slug: string;
  imagen: string | null;
  precioUSD: number;
  publicado: boolean;
  boletos: number;
  vendidas: number;
}
interface SemanaPanel {
  desde: string;
  hasta: string;
  cuando: 'paso' | 'ahora' | 'viene';
  estrella: EstrellaSemana | null;
  trabada: boolean;
}

const POR_DEFECTO = 10;
const ZONA = 'America/Caracas';
/** "lun 16 – dom 22/11" */
function rango(desde: string, hasta: string): string {
  const f = (dia: string, mes: boolean) => new Intl.DateTimeFormat('es-VE', { weekday: 'short', day: 'numeric', ...(mes ? { month: 'numeric' } : {}), timeZone: ZONA })
    .format(new Date(`${dia}T12:00:00-04:00`)).replace(',', '').replace('.', '');
  return desde === hasta ? f(desde, true) : `${f(desde, false)} – ${f(hasta, true)}`;
}

function Foto({ src, alt }: { src: string | null; alt: string }) {
  return (
    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
      {src && <Image src={src} alt={alt} fill sizes="2.75rem" className="object-contain" />}
    </span>
  );
}

export default function EstrellasDelSorteo() {
  const { confirm } = useConfirm();
  const [semanas, setSemanas] = useState<SemanaPanel[] | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [elegido, setElegido] = useState<{ id: string; nombre: string; imagen: string | null; precioUSD: number } | null>(null);
  const [buscar, setBuscar] = useState(false);
  const [boletos, setBoletos] = useState(String(POR_DEFECTO));
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useCargarAlMontar(async () => {
    const r = await fetch('/api/admin/sorteo/estrellas');
    if (r.ok) setSemanas(((await r.json()) as { semanas: SemanaPanel[] }).semanas);
  });

  const abrir = (s: SemanaPanel) => {
    setEditando(s.desde);
    setElegido(s.estrella ? { id: s.estrella.productId, nombre: s.estrella.nombre, imagen: s.estrella.imagen, precioUSD: s.estrella.precioUSD } : null);
    setBuscar(!s.estrella);
    setBoletos(String(s.estrella?.boletos ?? POR_DEFECTO));
    setError('');
  };

  const guardar = async (s: SemanaPanel) => {
    const n = numero(boletos);
    if (!elegido) { setError('Elige el producto.'); return; }
    if (n === null || !Number.isInteger(n) || n < 1 || n > 100) { setError('Los boletos van de 1 a 100.'); return; }
    if (s.trabada && s.estrella && n < s.estrella.boletos) { setError(`Ya vendió: sus boletos no bajan de ${s.estrella.boletos}.`); return; }
    setOcupado(true);
    try {
      const r = await fetch('/api/admin/sorteo/estrellas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ semana: s.desde, productId: elegido.id, boletos: n }) });
      const d = (await r.json().catch(() => ({}))) as { semanas?: SemanaPanel[]; error?: string };
      if (!r.ok || !d.semanas) { setError(d.error ?? 'No se pudo guardar. Inténtalo de nuevo.'); return; }
      setSemanas(d.semanas);
      setEditando(null);
      toast.success(s.cuando === 'ahora' ? 'Listo: ya sale en la tienda' : 'Listo: sale en la tienda cuando empiece su semana');
    } finally {
      setOcupado(false);
    }
  };

  const quitar = async (s: SemanaPanel) => {
    if (!s.estrella) return;
    const ok = await confirm({ title: 'Quitar el producto estrella', message: `${s.estrella.nombre} deja de ser el producto estrella de la semana ${rango(s.desde, s.hasta)}.`, confirmText: 'Quitar', variant: 'danger' });
    if (!ok) return;
    setOcupado(true);
    try {
      const r = await fetch(`/api/admin/sorteo/estrellas?semana=${s.desde}`, { method: 'DELETE' });
      const d = (await r.json().catch(() => ({}))) as { semanas?: SemanaPanel[]; error?: string };
      if (!r.ok || !d.semanas) { toast.error(d.error ?? 'No se pudo quitar.'); return; }
      setSemanas(d.semanas);
      toast.success('Quitado');
    } finally {
      setOcupado(false);
    }
  };

  if (!semanas || semanas.length === 0) return null;
  const sinElegir = semanas.filter((s) => s.cuando !== 'paso' && !s.estrella).length;

  return (
    <section aria-labelledby="sorteo-estrellas" className={adminCard}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="sorteo-estrellas" className="iconos-marca flex items-center gap-1.5 text-base font-semibold text-ink">
            <IconoEstrella className="h-5 w-5 text-brand-600" aria-hidden="true" /> Producto estrella de cada semana
            <Ayuda>Cada unidad que se compre en su semana da esos boletos, además de los de la compra. Sale en /sorteo, en su ficha y con su sello en el catálogo. Cambia solo el lunes.</Ayuda>
          </h3>
          <p className="mt-0.5 text-sm text-ink-soft">Uno por semana, de lunes a domingo. Puede ser cualquier producto publicado.</p>
        </div>
        {sinElegir > 0 && <span className={adminBadge('warning')}>{sinElegir} {sinElegir === 1 ? 'semana sin elegir' : 'semanas sin elegir'}</span>}
      </div>

      <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
        {semanas.map((s) => {
          const e = s.estrella;
          const abierta = editando === s.desde;
          return (
            <li key={s.desde} className={`p-3 ${s.cuando === 'paso' ? 'bg-surface' : ''}`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-40">
                  <p className="text-sm font-semibold text-ink">{rango(s.desde, s.hasta)}</p>
                  {s.cuando === 'ahora' ? <span className={`${adminBadge('brand')} mt-1`}>Esta semana</span>
                    : <span className={`${adminDato} mt-1`}>{s.cuando === 'paso' ? 'Ya pasó' : 'Próxima'}</span>}
                </div>
                {e ? (
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Foto src={e.imagen} alt={e.nombre} />
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-medium text-ink">{e.nombre}</p>
                      <p className="text-xs text-muted">
                        {formatUSD(e.precioUSD)} · {e.vendidas} {e.vendidas === 1 ? 'vendido' : 'vendidos'}{!e.publicado && ' · sin publicar: no sale en la tienda'}
                      </p>
                    </div>
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-500 px-2.5 py-1 text-xs font-bold text-white">
                      <IconoCupon className="h-3.5 w-3.5" aria-hidden="true" /> +{e.boletos}
                    </span>
                  </div>
                ) : (
                  <p className="min-w-0 flex-1 text-sm text-muted">{s.cuando === 'paso' ? 'No tuvo producto estrella.' : 'Sin producto estrella.'}</p>
                )}
                {s.cuando !== 'paso' && !abierta && (
                  <div className="flex shrink-0 gap-2">
                    {e ? (
                      <button type="button" onClick={() => abrir(s)} className={`${adminSecondaryButton} h-9 px-3`}>
                        <IconoEditar className="h-4 w-4" aria-hidden="true" /> {s.trabada ? 'Subir boletos' : 'Cambiar'}
                      </button>
                    ) : (
                      <button type="button" onClick={() => abrir(s)} className={`${adminPrimaryButton} h-9 px-3`}>
                        <IconoMas className="h-4 w-4" aria-hidden="true" /> Elegir producto
                      </button>
                    )}
                    {e && !s.trabada && (
                      <button type="button" onClick={() => void quitar(s)} disabled={ocupado} className={`${adminSecondaryButton} h-9 px-3`} aria-label={`Quitar ${e.nombre}`}>
                        <IconoEliminar className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {s.trabada && !abierta && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft sm:pl-[10.75rem]">
                  <IconoCandado className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Ya vendió: el producto queda fijo para que nadie pierda sus boletos. Solo puedes subirle los boletos.
                </p>
              )}

              {abierta && (
                <div className="mt-3 space-y-3 rounded-xl bg-brand-50 p-3 sm:ml-[10.75rem]">
                  <div>
                    <p className="text-sm font-semibold text-ink">El producto</p>
                    {elegido && !buscar ? (
                      <div className="mt-1.5 flex items-center gap-3">
                        <Foto src={elegido.imagen} alt={elegido.nombre} />
                        <p className="min-w-0 flex-1 text-sm text-ink"><span className="line-clamp-1 font-medium">{elegido.nombre}</span><span className="text-xs text-muted">{formatUSD(elegido.precioUSD)}</span></p>
                        {!s.trabada && <button type="button" onClick={() => setBuscar(true)} className={`${adminSecondaryButton} h-9 px-3`}>Cambiar</button>}
                      </div>
                    ) : (
                      <div className="mt-1.5 sm:max-w-lg">
                        <ProductPicker
                          onCancel={elegido ? () => setBuscar(false) : undefined}
                          onPick={(p) => { setElegido({ id: p.id, nombre: p.name, imagen: p.image, precioUSD: p.priceUSD }); setBuscar(false); setError(''); }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
                    <label htmlFor={`estrella-boletos-${s.desde}`}>Da por cada uno</label>
                    <CampoUnidad id={`estrella-boletos-${s.desde}`} unidad="boletos" inputMode="numeric" value={boletos} onChange={(ev) => setBoletos(ev.target.value)} invalido={Boolean(error)} className="w-36" />
                    <Ayuda>Se suman a los de la compra. Con 10, una compra de $87 con uno da 5 por el monto y 10 por el producto: 15.</Ayuda>
                  </div>
                  {elegido && (
                    <p className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                      Así sale en su tarjeta:
                      <span className="inline-flex items-center gap-0.5 rounded bg-brand-500 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">
                        <IconoCupon className="h-3 w-3" aria-hidden="true" /> +{numero(boletos) ?? POR_DEFECTO} boletos
                      </span>
                    </p>
                  )}
                  {error && <p className={adminError} role="alert">{error}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void guardar(s)} disabled={ocupado || !elegido} className={`${adminPrimaryButton} h-10 px-4`}>Guardar</button>
                    <button type="button" onClick={() => setEditando(null)} className={`${adminSecondaryButton} h-10 px-4`}>Cancelar</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
