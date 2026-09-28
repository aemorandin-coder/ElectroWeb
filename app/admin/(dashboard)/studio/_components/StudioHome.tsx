'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiArchive, FiCheckCircle, FiChevronLeft, FiChevronRight, FiCopy, FiDownload, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import { adminBadge, adminEmpty, adminHint, adminIconButton, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminTab } from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { downloadIssues, flyerChecks, flyerStatus, type CheckKind, type FlyerCheck, type TextIssues } from '@/lib/studio/checks';
import type { ProductSrc } from '@/lib/studio/engine';
import { FORMATS, TEMPLATES, slugify, type StudioFlyer } from '@/lib/studio/schema';
import { makeZip } from '@/lib/studio/zip';
import { downloadBlob, fileBase } from './exporters';
import StudioResults from './StudioResults';
import { useStudioContext } from './StudioContext';
import { smallButton } from './ui';
import { useDownloadGate } from './useDownloadGate';
import { useFlyerRenderer } from './useFlyerRenderer';

type View = 'lista' | 'semana' | 'resultados';
const VIEW_KEY = 'studio-view';
const storeSrc: ProductSrc = (p) => p.imageUrl;
const editHref = (id: string, step?: number) => `/admin/studio/${id}${step ? `?paso=${step}` : ''}`;

/** Lo que se muestra en "Por atender": cada grupo filtra la lista */
const ATTENTION: { kind: CheckKind; blocksOnly?: boolean; one: string; many: string }[] = [
  { kind: 'content', blocksOnly: true, one: '1 incompleta', many: 'incompletas' },
  { kind: 'store', one: '1 con un problema en la tienda', many: 'con problemas en la tienda' },
  { kind: 'photo', one: '1 sin foto', many: 'sin foto' },
  { kind: 'redownload', one: '1 para descargar de nuevo', many: 'para descargar de nuevo' },
];

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

// Miniaturas ya dibujadas: sobreviven al ir y volver del editor. Clave: id y fecha de guardado.
const thumbCache = new Map<string, { key: string; url: string; text: TextIssues }>();
const thumbPending = new Set<string>();

export default function StudioHome() {
  const studio = useStudioContext();
  const { loading, flyers, brand, live, coupons, store } = studio;
  const router = useRouter();
  const { confirm } = useConfirm();
  const gate = useDownloadGate();
  const { still, thumbnail } = useFlyerRenderer(brand);

  const [view, setView] = useState<View>(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      return v === 'semana' || v === 'resultados' ? v : 'lista';
    } catch {
      return 'lista';
    }
  });
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // Sin almacenamiento: vuelve a "Historias" la próxima vez
    }
  };
  const [batch, setBatch] = useState<string | null>(null);
  const [attention, setAttention] = useState<CheckKind | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [, setThumbTick] = useState(0);

  // Dibuja las miniaturas que faltan, de a una (la cola del dibujante las ordena)
  useEffect(() => {
    if (loading) return;
    flyers.forEach((f) => {
      const key = `${f.updatedAt}:${f.code ?? ''}`;
      if (thumbCache.get(f.id)?.key === key || thumbPending.has(`${f.id}:${key}`)) return;
      thumbPending.add(`${f.id}:${key}`);
      void thumbnail(f, f.code)
        .then(({ url, text }) => {
          const old = thumbCache.get(f.id);
          if (old?.url) URL.revokeObjectURL(old.url);
          thumbCache.set(f.id, { key, url, text });
          setThumbTick((n) => n + 1);
        })
        .catch(() => undefined)
        .finally(() => thumbPending.delete(`${f.id}:${key}`));
    });
  }, [flyers, loading, thumbnail]);

  const checksFor = (f: StudioFlyer): FlyerCheck[] => flyerChecks(f, { src: storeSrc, live, coupons, store, text: thumbCache.get(f.id)?.text });
  const checks = new Map(flyers.map((f) => [f.id, checksFor(f)]));
  const has = (f: StudioFlyer, kind: CheckKind, blocksOnly?: boolean) =>
    (checks.get(f.id) ?? []).some((c) => c.kind === kind && (blocksOnly ? c.level === 'block' : c.level !== 'ok'));

  const batches = useMemo(() => {
    const map = new Map<string, number>();
    flyers.forEach((f) => map.set(f.batch, (map.get(f.batch) ?? 0) + 1));
    return [...map.entries()].sort(([a], [b]) => Number(a === '') - Number(b === '') || a.localeCompare(b));
  }, [flyers]);

  const askRemove = async (f: StudioFlyer) => {
    const ok = await confirm({ title: 'Eliminar historia', message: `¿Eliminar "${f.name || 'Sin nombre'}"? No se puede deshacer.`, confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
    if (ok) await studio.remove(f.id);
  };

  const download = async (f: StudioFlyer) => {
    if (busy) return;
    if (!(await gate(checksFor(f), (step) => router.push(editHref(f.id, step))))) return;
    setBusy(true);
    try {
      await studio.saveNow();
      // Precios, ofertas y tasa al día antes de dibujar
      const [fresh] = await studio.freshFlyers([f]);
      const { blob } = await still(fresh, fresh.code);
      if (!blob) throw new Error('No se pudo generar la imagen');
      downloadBlob(blob, `${fileBase(fresh)}.png`);
      await studio.markExported([fresh]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo descargar');
    } finally {
      setBusy(false);
    }
  };

  /** Varias juntas en un ZIP: las incompletas se saltan, y lo que tenga avisos se confirma */
  const downloadZip = async (list: StudioFlyer[], name: string) => {
    if (busy || !list.length) return;
    const blocked = list.filter((f) => downloadIssues(checksFor(f)).blocks.length);
    const ready = list.filter((f) => !blocked.includes(f));
    const warned = ready.filter((f) => downloadIssues(checksFor(f)).warns.length);
    const names = (l: StudioFlyer[]) => l.map((f) => f.name || 'Sin nombre').join(', ');
    if (!ready.length) {
      toast.error(`Ninguna está completa: ${names(blocked)}`);
      return;
    }
    if (blocked.length || warned.length) {
      const parts = [
        blocked.length ? `Se saltan ${blocked.length} incompletas: ${names(blocked)}.` : '',
        warned.length ? `${warned.length} tienen avisos (foto, producto agotado, texto largo…): ${names(warned)}.` : '',
      ];
      const go = await confirm({ title: 'Revisa antes de descargar', message: parts.filter(Boolean).join(' '), confirmText: `Descargar ${ready.length}`, cancelText: 'Revisar', type: 'warning' });
      if (!go) return;
    }
    setBusy(true);
    const toastId = toast.loading(`Preparando 1 de ${ready.length}…`);
    try {
      await studio.saveNow();
      const fresh = await studio.freshFlyers(ready);
      const files: { name: string; blob: Blob }[] = [];
      for (let i = 0; i < fresh.length; i++) {
        toast.loading(`Preparando ${i + 1} de ${fresh.length}…`, { id: toastId });
        const { blob } = await still(fresh[i], fresh[i].code);
        if (blob) files.push({ name: `${String(i + 1).padStart(2, '0')}-${fileBase(fresh[i])}.png`, blob });
      }
      if (!files.length) throw new Error('No se pudo generar');
      downloadBlob(await makeZip(files), `${slugify(name)}-historias.zip`);
      await studio.markExported(fresh);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo descargar');
    } finally {
      toast.dismiss(toastId);
      setBusy(false);
    }
  };

  const header = (
    <div className={adminPageHeader}>
      <div>
        <h1 className={adminPageTitle}>ElectroStudio</h1>
        <p className={adminPageSubtitle}>Historias y videos para Instagram con los productos, precios y ofertas de la tienda.</p>
      </div>
      {/* C-116, fase 2: el asistente guarda la historia recién cuando se eligió qué publicar */}
      <Link href="/admin/studio/nueva" className={`${adminPrimaryButton} shrink-0 self-start whitespace-nowrap sm:self-auto`}>
        <FiPlus className="h-4 w-4" aria-hidden="true" />
        Nueva historia
      </Link>
    </div>
  );

  if (loading) {
    return (
      <div>
        {header}
        <div className={adminEmpty} aria-busy="true">
          <p className="text-sm text-muted">Cargando ElectroStudio…</p>
        </div>
      </div>
    );
  }

  const card = (f: StudioFlyer) => {
    const status = flyerStatus(checks.get(f.id) ?? []);
    const thumb = thumbCache.get(f.id);
    const date = f.date ? new Date(`${f.date}T12:00:00`).toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
    const name = f.name || f.products[0]?.title || 'Sin nombre';
    const all = (checks.get(f.id) ?? []).filter((c) => c.level !== 'ok').map((c) => c.text);
    return (
      <li key={f.id} className="relative grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-2xl border border-line bg-white p-3 transition-colors hover:border-brand-200 sm:grid-cols-[5rem_minmax(0,1fr)]">
        <span className={`w-full self-start overflow-hidden rounded-md border border-line bg-surface sm:row-span-2 ${f.format === 'story' ? 'aspect-[9/16]' : f.format === 'post45' ? 'aspect-[4/5]' : 'aspect-square'}`}>
          {thumb?.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- miniatura dibujada en el navegador (URL de objeto)
            <img src={thumb.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="block h-full w-full animate-pulse bg-line" aria-hidden="true" />
          )}
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          {/* Toda la tarjeta abre el editor (enlace estirado); las acciones van encima */}
          <Link href={editHref(f.id)} className="truncate text-sm font-semibold text-ink after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-brand-500">
            {name}
          </Link>
          <p className="text-xs text-muted">
            {TEMPLATES[f.template].label}
            {f.format !== 'story' && ` · ${FORMATS[f.format].short}`}
            {f.batch && ` · ${f.batch}`}
            {date && ` · ${date}`}
          </p>
          <span className={`${adminBadge(status.tone)} max-w-full self-start`} title={all.join(' · ') || undefined}>
            {status.tone === 'success' ? <FiCheckCircle className="h-3 w-3 shrink-0" aria-hidden="true" /> : <FiAlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />}
            <span className="truncate">{status.text}</span>
            {status.more > 0 && <span className="shrink-0">+{status.more}</span>}
          </span>
        </div>
        <div className="relative col-span-2 flex flex-wrap gap-1.5 sm:col-span-1 sm:col-start-2 sm:self-end">
          <Link href={editHref(f.id)} className={`${smallButton} h-11 sm:h-9`}>
            <FiEdit2 className="h-4 w-4" aria-hidden="true" />
            Editar
          </Link>
          <button type="button" onClick={() => void download(f)} disabled={busy} className={`${adminIconButton} h-11 w-11 sm:h-9 sm:w-9`} aria-label={`Descargar ${name}`} title="Descargar imagen">
            <FiDownload className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => void studio.duplicate(f.id, { open: false })} className={`${adminIconButton} h-11 w-11 sm:h-9 sm:w-9`} aria-label={`Duplicar ${name}`} title="Duplicar">
            <FiCopy className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => void askRemove(f)} className={`${adminIconButton} h-11 w-11 text-deal hover:bg-deal-bg sm:h-9 sm:w-9`} aria-label={`Eliminar ${name}`} title="Eliminar">
            <FiTrash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </li>
    );
  };

  const attentionCounts = ATTENTION.map((a) => ({ ...a, count: flyers.filter((f) => has(f, a.kind, a.blocksOnly)).length })).filter((a) => a.count > 0);
  const activeAttention = ATTENTION.find((a) => a.kind === attention);
  const listed = flyers.filter(
    (f) => (batch === null || f.batch === batch) && (!activeAttention || has(f, activeAttention.kind, activeAttention.blocksOnly)),
  );

  const days = weekDays(weekOffset);
  const today = ymd(new Date());
  const inWeek = days.flatMap((d) => flyers.filter((f) => f.date === ymd(d)));

  return (
    <div>
      {header}

      {flyers.length === 0 ? (
        <div className={adminEmpty}>
          <p className="font-semibold text-ink">Aún no hay historias</p>
          <ol className="mt-2 flex flex-col gap-1 text-sm text-muted">
            <li>1. Elige qué quieres publicar: un producto, una oferta, un cupón o un mensaje.</li>
            <li>2. Elige el producto de la tienda: el precio y la oferta se ponen solos.</li>
            <li>3. Descarga la imagen o el video y súbelo a Instagram.</li>
          </ol>
          <p className={adminHint}>Empieza con &quot;Nueva historia&quot;, arriba.</p>
        </div>
      ) : (
        <>
          {attentionCounts.length > 0 && (
            <section aria-label="Por atender" className="-mx-1 mb-4 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
              <span className="shrink-0 text-sm font-semibold text-ink">Por atender:</span>
              {attentionCounts.map((a) => (
                <button
                  key={a.kind}
                  type="button"
                  aria-pressed={attention === a.kind}
                  onClick={() => {
                    setAttention(attention === a.kind ? null : a.kind);
                    changeView('lista');
                  }}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-semibold transition-colors ${
                    attention === a.kind ? 'border-warning-strong bg-warning/15 text-warning-strong' : 'border-warning/40 bg-white text-warning-strong hover:bg-warning/10'
                  }`}
                >
                  <FiAlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {a.count === 1 ? a.one : `${a.count} ${a.many}`}
                </button>
              ))}
              {attention && (
                <button type="button" onClick={() => setAttention(null)} className="h-9 shrink-0 whitespace-nowrap px-1 text-sm font-semibold text-brand-600 hover:underline">
                  Ver todas
                </button>
              )}
            </section>
          )}

          <nav aria-label="Vistas" className="-mx-1 mb-4 overflow-x-auto px-1">
            <div className="flex w-max gap-2">
              {(
                [
                  ['lista', `Historias (${flyers.length})`],
                  ['semana', 'Semana'],
                  ['resultados', 'Resultados'],
                ] as [View, string][]
              ).map(([v, label]) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => changeView(v)} className={adminTab(view === v)}>
                  {label}
                </button>
              ))}
            </div>
          </nav>

          {view === 'resultados' ? (
            <StudioResults onSelect={(id) => router.push(editHref(id))} />
          ) : view === 'semana' ? (
            <div className="flex flex-col gap-3">
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
                  <section key={ds} className={`rounded-2xl border p-3 ${ds === today ? 'border-brand-500' : 'border-line'}`}>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric' })}</h2>
                    {list.length ? <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map(card)}</ul> : <p className="text-xs text-subtle">Sin historia</p>}
                  </section>
                );
              })}
              <div className="flex flex-wrap items-center gap-3">
                {inWeek.length > 0 && (
                  <button type="button" disabled={busy} onClick={() => void downloadZip(inWeek, `semana-${ymd(days[0])}`)} className={smallButton}>
                    <FiArchive className="h-4 w-4" aria-hidden="true" />
                    Descargar la semana (ZIP)
                  </button>
                )}
                <p className="text-xs text-muted">{flyers.filter((f) => !f.date).length} sin fecha. La fecha se pone en el paso Publicar.</p>
              </div>
            </div>
          ) : (
            <>
              {batches.length > 1 && (
                <div className="-mx-1 mb-3 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible" role="group" aria-label="Lotes">
                  <button type="button" aria-pressed={batch === null} onClick={() => setBatch(null)} className={adminTab(batch === null)}>
                    Todos
                  </button>
                  {batches.map(([b, n]) => (
                    <button key={b || '-'} type="button" aria-pressed={batch === b} onClick={() => setBatch(b)} className={adminTab(batch === b)}>
                      {b || 'Sin lote'} ({n})
                    </button>
                  ))}
                  {batch && (
                    <button type="button" disabled={busy} onClick={() => void downloadZip(flyers.filter((f) => f.batch === batch), batch)} className={`${smallButton} shrink-0 whitespace-nowrap`}>
                      <FiArchive className="h-4 w-4" aria-hidden="true" />
                      Descargar el lote (ZIP)
                    </button>
                  )}
                </div>
              )}
              {listed.length ? (
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{listed.map(card)}</ul>
              ) : (
                <p className="text-sm text-muted">Ninguna historia con este filtro.</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
