'use client';

import { useMemo, useState } from 'react';
import { FiAlertTriangle, FiArchive, FiChevronLeft, FiChevronRight, FiPlus } from 'react-icons/fi';
import { adminBadge, adminIconButton, adminPrimaryButton } from '@/lib/admin-ui';
import { staleWarnings } from '@/lib/studio/live';
import { FORMATS, requiredPhotos, TEMPLATES, type StudioFlyer } from '@/lib/studio/schema';
import StudioResults from './StudioResults';
import { smallButton, toggleButton } from './ui';
import type { Studio } from './useStudio';

type View = 'lista' | 'semana' | 'resultados';
const VIEW_KEY = 'studio-view';

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekDays(offset: number): Date[] {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function missingPhotos(f: StudioFlyer): number {
  return f.products.slice(0, requiredPhotos(f.template)).filter((p) => !p.imageUrl).length;
}

interface Props {
  studio: Studio;
  busy: boolean;
  onZip: (list: StudioFlyer[], name: string) => void;
}

export default function FlyerList({ studio, busy, onZip }: Props) {
  const { flyers, currentId, live, coupons, store } = studio;
  const onSelect = (id: string) => void studio.select(id);
  const onNew = () => void studio.create();
  const [view, setView] = useState<View>(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      return v === 'semana' || v === 'resultados' ? v : 'lista';
    } catch {
      return 'lista';
    }
  });
  const [weekOffset, setWeekOffset] = useState(0);
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // Sin almacenamiento: la vista vuelve a "Lista" la próxima vez
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, StudioFlyer[]>();
    flyers.forEach((f) => {
      const k = f.batch || '';
      map.set(k, [...(map.get(k) ?? []), f]);
    });
    return [...map.entries()].sort(([a], [b]) => Number(a === '') - Number(b === ''));
  }, [flyers]);

  const item = (f: StudioFlyer) => {
    const miss = missingPhotos(f);
    const warnings = staleWarnings(f, live, coupons, store);
    const worst = warnings.find((w) => w.tone === 'danger') ?? warnings[0];
    const thumb = f.products[0]?.imageUrl;
    const date = f.date ? new Date(`${f.date}T12:00:00`).toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
    return (
      <button
        key={f.id}
        type="button"
        onClick={() => onSelect(f.id)}
        aria-current={f.id === currentId ? 'true' : undefined}
        className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 ${
          f.id === currentId ? 'border-brand-500 bg-brand-50' : 'border-transparent hover:bg-surface'
        }`}
      >
        <span className="flex h-16 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-brand-500 text-xs font-bold text-white">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element -- miniatura de 36 px
            <img src={thumb} alt="" className="h-full w-full bg-white object-contain" />
          ) : (
            'ES'
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold text-ink">{f.name || f.products[0]?.title || 'Sin nombre'}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {TEMPLATES[f.template].label}
            {f.format !== 'story' && ` · ${FORMATS[f.format].short}`}
            {date && ` · ${date}`}
            {worst ? (
              <span className={adminBadge(worst.tone)} title={warnings.map((w) => w.text).join(' · ')}>
                <FiAlertTriangle className="h-3 w-3" aria-hidden="true" />
                {worst.text}
                {warnings.length > 1 && ` (+${warnings.length - 1})`}
              </span>
            ) : (
              <span className={adminBadge(miss ? 'warning' : 'success')}>{miss ? 'Falta foto' : 'Lista'}</span>
            )}
          </span>
        </span>
      </button>
    );
  };

  const days = weekDays(weekOffset);
  const today = ymd(new Date());
  const inWeek = days.flatMap((d) => flyers.filter((f) => f.date === ymd(d)));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-ink">Historias</h2>
        <button type="button" onClick={onNew} className={`${adminPrimaryButton} h-9 px-3`}>
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Nueva
        </button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Vista">
        <button type="button" aria-pressed={view === 'lista'} onClick={() => changeView('lista')} className={toggleButton(view === 'lista')}>
          Por lote
        </button>
        <button type="button" aria-pressed={view === 'semana'} onClick={() => changeView('semana')} className={toggleButton(view === 'semana')}>
          Semana
        </button>
        <button type="button" aria-pressed={view === 'resultados'} onClick={() => changeView('resultados')} className={toggleButton(view === 'resultados')}>
          Resultados
        </button>
      </div>

      {view === 'resultados' ? (
        <StudioResults onSelect={onSelect} />
      ) : flyers.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay historias. Toca &quot;Nueva&quot; para hacer la primera.</p>
      ) : view === 'semana' ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setWeekOffset((w) => w - 1)} className={adminIconButton} aria-label="Semana anterior">
              <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="text-sm font-semibold text-ink">
              {days[0].toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })} – {days[6].toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
            </span>
            <button type="button" onClick={() => setWeekOffset((w) => w + 1)} className={adminIconButton} aria-label="Semana siguiente">
              <FiChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {days.map((d) => {
            const ds = ymd(d);
            const list = flyers.filter((f) => f.date === ds);
            return (
              <div key={ds} className={`rounded-lg border p-2 ${ds === today ? 'border-brand-500' : 'border-line'}`}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric' })}</p>
                {list.length ? list.map(item) : <p className="text-xs text-subtle">Sin historia</p>}
              </div>
            );
          })}
          {inWeek.length > 0 && (
            <button type="button" disabled={busy} onClick={() => onZip(inWeek, `semana-${ymd(days[0])}`)} className={smallButton}>
              <FiArchive className="h-4 w-4" aria-hidden="true" />
              Descargar la semana (ZIP)
            </button>
          )}
          <p className="text-xs text-muted">{flyers.filter((f) => !f.date).length} sin fecha. La fecha se pone en el paso Publicar.</p>
        </div>
      ) : (
        <div className="flex max-h-[70dvh] flex-col gap-3 overflow-y-auto">
          {groups.map(([batch, list]) => (
            <div key={batch || '-'} className="flex flex-col gap-1">
              {(batch || groups.length > 1) && (
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {batch || 'Sin lote'} · {list.length}
                  </span>
                  {batch && (
                    <button type="button" disabled={busy} onClick={() => onZip(list, batch)} className={`${smallButton} h-8`}>
                      <FiArchive className="h-4 w-4" aria-hidden="true" />
                      ZIP
                    </button>
                  )}
                </div>
              )}
              {list.map(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
