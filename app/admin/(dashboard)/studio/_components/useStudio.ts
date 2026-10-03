'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { combinar } from '@/lib/edicion/combinar';
import { exportSnapshot, linkedIds, refreshCoupon, refreshLinked, refreshRate } from '@/lib/studio/live';
import {
  TEMPLATES,
  blankProduct,
  normalizeBrand,
  normalizeFlyer,
  type StudioBrand,
  type StudioCoupon,
  type StudioFlyer,
  type StudioFlyerData,
  type StudioStoreInfo,
  type StudioStoreProduct,
} from '@/lib/studio/schema';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

async function fetchLive(ids: string[]): Promise<Record<string, StudioStoreProduct>> {
  if (!ids.length) return {};
  const res = await fetch(`/api/admin/studio/products?ids=${ids.map(encodeURIComponent).join(',')}`);
  if (!res.ok) return {};
  const { products } = (await res.json()) as { products: StudioStoreProduct[] };
  return Object.fromEntries(products.map((p) => [p.id, p]));
}

async function fetchCoupons(): Promise<Record<string, StudioCoupon>> {
  const res = await fetch('/api/admin/studio/coupons');
  if (!res.ok) return {};
  const { coupons } = (await res.json()) as { coupons: StudioCoupon[] };
  return Object.fromEntries(coupons.map((c) => [c.code, c]));
}

/** Pone al día lo que viene de la tienda: precios y ofertas, cupón y tasa */
function refreshAll(
  f: StudioFlyerData,
  live: Record<string, StudioStoreProduct>,
  coupons: Record<string, StudioCoupon> | null,
  store: StudioStoreInfo | null,
): StudioFlyerData {
  return refreshRate(refreshCoupon(refreshLinked(f, live), coupons?.[f.coupon.code]), store);
}

const HISTORY_MAX = 60;
/** Cambios más seguidos que esto (escribir una palabra) se deshacen juntos */
const HISTORY_GROUP_MS = 700;

/** Asegura tantos productos como pide la plantilla */
function withSlots(f: StudioFlyerData): StudioFlyerData {
  const n = Math.max(TEMPLATES[f.template].n, 1);
  if (f.products.length >= n) return f;
  return { ...f, products: [...f.products, ...Array.from({ length: n - f.products.length }, blankProduct)] };
}

/**
 * Estado de ElectroStudio (C-112): historias, la que se edita (con guardado automático), la marca y los productos
 * de la tienda vinculados (precio y oferta al día).
 */
export function useStudio() {
  const [loading, setLoading] = useState(true);
  const [flyers, setFlyers] = useState<StudioFlyer[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [current, setCurrent] = useState<StudioFlyerData | null>(null);
  const [brand, setBrandState] = useState<StudioBrand>(() => normalizeBrand({}));
  const [store, setStore] = useState<StudioStoreInfo | null>(null);
  const [live, setLive] = useState<Record<string, StudioStoreProduct>>({});
  const [coupons, setCoupons] = useState<Record<string, StudioCoupon> | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  // Deshacer y rehacer de la historia abierta (C-113)
  const past = useRef<StudioFlyerData[]>([]);
  const future = useRef<StudioFlyerData[]>([]);
  const lastPush = useRef(0);
  const [historySize, setHistorySize] = useState({ undo: 0, redo: 0 });
  const syncHistory = () => setHistorySize({ undo: past.current.length, redo: future.current.length });
  // Cupones y tasa de la tienda: se leen al abrir cada historia (y al cambiarla) para ponerla al día
  const latestStore = useRef<{ coupons: Record<string, StudioCoupon> | null; store: StudioStoreInfo | null }>({ coupons: null, store: null });

  // Lo último, para los temporizadores de guardado (no se leen durante el render)
  // `flyers` es lo último que se sabe del servidor de cada historia (con su `updatedAt`): la base para el guardado con versión (C-170)
  const latest = useRef({ current, currentId, brand, flyers });
  useEffect(() => {
    latest.current = { current, currentId, brand, flyers };
  });
  // La confirmación cambia en cada render: se lee por referencia para no rehacer `remove`
  const { confirm } = useConfirm();
  const confirmar = useRef(confirm);
  useEffect(() => {
    confirmar.current = confirm;
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const brandDirty = useRef(false);
  const saving = useRef<Promise<void> | null>(null);

  const saveNow = useCallback(async (keepalive = false): Promise<void> => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (saving.current) await saving.current;
    const { current: f, currentId: id } = latest.current;
    if (!dirty.current || !f || !id) return;
    dirty.current = false;
    setStatus('saving');
    const run = (async () => {
      try {
        // C-170: el guardado lleva la versión con que se conoce la historia. Si otra persona guardó antes (409), se juntan los
        // cambios de las dos: lo que solo cambió ella entra, lo que solo cambié yo se queda y, en lo que tocamos las dos, queda
        // lo mío (es un guardado automático: no se interrumpe con una pregunta, se avisa). Hasta 3 intentos.
        let datos = f;
        for (let intento = 0; intento < 3; intento++) {
          const conocida = latest.current.flyers.find((x) => x.id === id);
          const res = await fetch(`/api/admin/studio/flyers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...datos, baseUpdatedAt: conocida?.updatedAt }),
            keepalive,
          });
          if (res.status === 409) {
            const cuerpo = (await res.json().catch(() => null)) as { conflicto?: string; por?: { nombre: string } | null; actual?: { flyer: StudioFlyer } } | null;
            const suya = cuerpo?.conflicto === 'cambiado' ? cuerpo.actual?.flyer : undefined;
            if (suya && conocida) {
              const r = combinar(normalizeFlyer(conocida), datos, normalizeFlyer(suya));
              datos = r.combinado;
              const lista = latest.current.flyers.map((x) => (x.id === suya.id ? suya : x));
              latest.current = { ...latest.current, flyers: lista, current: datos };
              setFlyers(lista);
              setCurrent(datos);
              toast(`${cuerpo?.por?.nombre ?? 'Otra persona'} también cambió esta historia. ${r.conflictos.length > 0 ? 'Se juntaron los cambios; en lo que tocaron las dos quedó lo tuyo.' : 'Sus cambios se sumaron a los tuyos.'}`, { id: `studio-conflicto-${id}` });
              continue;
            }
          }
          if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'No se pudo guardar');
          const { flyer } = (await res.json()) as { flyer: StudioFlyer };
          const lista = latest.current.flyers.map((x) => (x.id === flyer.id ? flyer : x));
          latest.current = { ...latest.current, flyers: lista };
          setFlyers(lista);
          setStatus(dirty.current ? 'dirty' : 'saved');
          return;
        }
        throw new Error('Otra persona sigue cambiando esta historia. Se vuelve a intentar con tu próximo cambio.');
      } catch (e) {
        dirty.current = true;
        setStatus('error');
        toast.error(e instanceof Error ? e.message : 'No se pudo guardar');
      }
    })();
    saving.current = run;
    await run;
    saving.current = null;
  }, []);

  const saveBrandNow = useCallback(async (keepalive = false) => {
    if (brandTimer.current) clearTimeout(brandTimer.current);
    brandTimer.current = null;
    if (!brandDirty.current) return;
    brandDirty.current = false;
    const res = await fetch('/api/admin/studio/brand', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latest.current.brand),
      keepalive,
    }).catch(() => null);
    if (!res?.ok) {
      brandDirty.current = true;
      toast.error('No se pudieron guardar los ajustes de marca');
    }
  }, []);

  // Al salir del estudio se guarda lo pendiente
  useEffect(() => {
    const flush = () => {
      if (dirty.current) void saveNow(true);
      if (brandDirty.current) void saveBrandNow(true);
    };
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current || brandDirty.current) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      flush();
    };
  }, [saveNow, saveBrandNow]);

  const scheduleSave = useCallback(() => {
    dirty.current = true;
    setStatus('dirty');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveNow(), 1200);
  }, [saveNow]);

  /**
   * Cambia la historia abierta y la guarda un momento después. Lo que hace la persona se puede deshacer;
   * lo que pone al día la tienda (precios, tasa) no entra en el historial (history: false).
   */
  const update = useCallback(
    (fn: (f: StudioFlyerData) => StudioFlyerData, opts: { history?: boolean } = {}) => {
      const before = latest.current.current;
      if (!before) return;
      if (opts.history !== false) {
        const now = Date.now();
        // Solo se agrupa lo que se escribe o se arrastra en un campo; cada botón es un paso aparte
        const el = document.activeElement;
        const typing = el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type !== 'checkbox' && el.type !== 'file');
        if (!typing || now - lastPush.current > HISTORY_GROUP_MS || !past.current.length) {
          past.current = [...past.current, before].slice(-HISTORY_MAX);
        }
        lastPush.current = typing ? now : 0;
        future.current = [];
        syncHistory();
      }
      // La tasa siempre es la de la tienda: también al pasar a la plantilla "Tasa BCV"
      setCurrent((f) => (f ? withSlots(refreshRate(fn(f), latestStore.current.store)) : f));
      scheduleSave();
    },
    [scheduleSave],
  );

  const undo = useCallback(() => {
    const prev = past.current.at(-1);
    const now = latest.current.current;
    if (!prev || !now) return;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, now];
    lastPush.current = 0;
    syncHistory();
    setCurrent(prev);
    scheduleSave();
  }, [scheduleSave]);

  const redo = useCallback(() => {
    const next = future.current.at(-1);
    const now = latest.current.current;
    if (!next || !now) return;
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, now];
    lastPush.current = 0;
    syncHistory();
    setCurrent(next);
    scheduleSave();
  }, [scheduleSave]);

  /** Abre una historia: la normaliza y pone al día los productos de la tienda */
  const openId = useRef<string | null>(null);
  const open = useCallback(
    async (flyer: StudioFlyer) => {
      const data = withSlots(normalizeFlyer(flyer));
      openId.current = flyer.id;
      latest.current = { ...latest.current, current: data, currentId: flyer.id };
      setCurrentId(flyer.id);
      setCurrent(data);
      setStatus('idle');
      dirty.current = false;
      past.current = [];
      future.current = [];
      syncHistory();
      const fresh = await fetchLive(linkedIds([data]));
      setLive((prev) => ({ ...prev, ...fresh }));
      // Si cambió un precio, una oferta, el cupón o la tasa en la tienda, la historia se pone al día y se guarda
      const { coupons: cp, store: st } = latestStore.current;
      if (openId.current === flyer.id && refreshAll(data, fresh, cp, st) !== data) update((f) => refreshAll(f, fresh, cp, st), { history: false });
    },
    [update],
  );

  useCargarAlMontar(async () => {
    try {
      const [fr, br] = await Promise.all([fetch('/api/admin/studio/flyers'), fetch('/api/admin/studio/brand')]);
      if (!fr.ok || !br.ok) throw new Error();
      const { flyers: list } = (await fr.json()) as { flyers: StudioFlyer[] };
      const { brand: b, store: s } = (await br.json()) as { brand: StudioBrand; store: StudioStoreInfo };
      // Cupones y productos de todas las historias: para avisar en la lista cuáles quedaron viejas
      const [cp, allLive] = await Promise.all([fetchCoupons(), fetchLive(linkedIds(list.map((f) => normalizeFlyer(f))))]);
      latestStore.current = { coupons: cp, store: s };
      setFlyers(list);
      setBrandState(normalizeBrand(b));
      setStore(s);
      setCoupons(cp);
      setLive(allLive);
      // C-116: el estudio abre en el inicio (la lista); el editor abre la historia de su dirección
    } catch {
      toast.error('No se pudo cargar ElectroStudio');
    } finally {
      setLoading(false);
    }
  });

  const setBrand = useCallback(
    (fn: (b: StudioBrand) => StudioBrand) => {
      setBrandState((b) => fn(b));
      brandDirty.current = true;
      if (brandTimer.current) clearTimeout(brandTimer.current);
      brandTimer.current = setTimeout(() => void saveBrandNow(), 1200);
    },
    [saveBrandNow],
  );

  /** Abre una historia por su id. Devuelve false si no existe (borrada, o de otro enlace). */
  const select = useCallback(
    async (id: string): Promise<boolean> => {
      if (id === latest.current.currentId) return true;
      await saveNow();
      const f = flyers.find((x) => x.id === id);
      if (!f) return false;
      await open(f);
      return true;
    },
    [flyers, open, saveNow],
  );

  /** Crea una historia y la abre (o no, si se duplica desde la lista). Devuelve la nueva, o null si falló. */
  const create = useCallback(
    async (data: Partial<StudioFlyerData> = {}, opts: { open?: boolean } = {}): Promise<StudioFlyer | null> => {
      await saveNow();
      const res = await fetch('/api/admin/studio/flyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        toast.error('No se pudo crear la historia');
        return null;
      }
      const { flyer } = (await res.json()) as { flyer: StudioFlyer };
      setFlyers((list) => [flyer, ...list]);
      if (opts.open !== false) await open(flyer);
      return flyer;
    },
    [open, saveNow],
  );

  /** Copia de una historia (la abierta si no se dice cuál), tal como se ve en pantalla */
  const duplicate = useCallback(
    async (id?: string, opts: { open?: boolean } = {}): Promise<StudioFlyer | null> => {
      const { current: cur, currentId: curId } = latest.current;
      const source = !id || id === curId ? cur : flyers.find((f) => f.id === id);
      if (!source) return null;
      const data = normalizeFlyer(source);
      const copy = await create({ ...data, name: `${data.name || 'Historia'} (copia)`.slice(0, 80) }, opts);
      if (copy) toast.success('Historia duplicada');
      return copy;
    },
    [create, flyers],
  );

  /** Borra una historia (la abierta si no se dice cuál). Devuelve true si se borró. */
  const remove = useCallback(
    async (id?: string): Promise<boolean> => {
      const target = id ?? latest.current.currentId;
      if (!target) return false;
      const isOpen = target === latest.current.currentId;
      let res = await fetch(`/api/admin/studio/flyers/${target}`, { method: 'DELETE' });
      // C-170: otra persona la tiene abierta ahora: se pregunta antes de eliminarla
      if (res.status === 409) {
        const aviso = (await res.clone().json().catch(() => null)) as { conflicto?: string; error?: string } | null;
        if (aviso?.conflicto === 'en_edicion') {
          const seguir = await confirmar.current({ title: 'La están editando ahora', message: `${aviso.error}. Si la eliminas, verá un aviso. ¿Eliminarla igual?`, confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'warning' });
          if (!seguir) return false;
          res = await fetch(`/api/admin/studio/flyers/${target}?forzar=1`, { method: 'DELETE' });
        }
      }
      if (res.ok && isOpen) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        openId.current = null;
        dirty.current = false;
      }
      if (!res.ok) {
        toast.error('No se pudo eliminar');
        return false;
      }
      setFlyers((list) => list.filter((f) => f.id !== target));
      toast.success('Historia eliminada');
      if (isOpen) {
        latest.current = { ...latest.current, current: null, currentId: null };
        setCurrentId(null);
        setCurrent(null);
      }
      return true;
    },
    [],
  );

  /** Historias de un lote o semana puestas al día con la tienda, para descargarlas juntas */
  const freshFlyers = useCallback(async (list: StudioFlyer[]): Promise<StudioFlyer[]> => {
    const fresh = await fetchLive(linkedIds(list.map((f) => normalizeFlyer(f))));
    setLive((prev) => ({ ...prev, ...fresh }));
    const { coupons: cp, store: st } = latestStore.current;
    return list.map((f) => ({ ...f, ...withSlots(refreshAll(normalizeFlyer(f), fresh, cp, st)) }));
  }, []);

  /**
   * Anota lo que salió en la descarga (precios, tasa, cupón): si la tienda cambia después, la lista avisa.
   * La abierta se guarda como siempre; las demás (descarga de un lote) se guardan aquí.
   */
  const markExported = useCallback(
    async (list: StudioFlyer[]) => {
      const openNow = latest.current.currentId;
      const others = list.filter((f) => f.id !== openNow);
      if (list.some((f) => f.id === openNow)) update((f) => ({ ...f, exported: exportSnapshot(f) }), { history: false });
      const saved = await Promise.all(
        others.map(async (f) => {
          const { id, ...rest } = f;
          const data = { ...normalizeFlyer(rest), exported: exportSnapshot(normalizeFlyer(rest)) };
          const res = await fetch(`/api/admin/studio/flyers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, baseUpdatedAt: f.updatedAt }) }).catch(() => null);
          return res?.ok ? ((await res.json()) as { flyer: StudioFlyer }).flyer : null;
        }),
      );
      const byId = new Map(saved.filter((f): f is StudioFlyer => !!f).map((f) => [f.id, f]));
      if (byId.size) setFlyers((all) => all.map((f) => byId.get(f.id) ?? f));
    },
    [update],
  );

  const rememberLive = useCallback((p: StudioStoreProduct) => setLive((prev) => ({ ...prev, [p.id]: p })), []);

  /** Aplica un estilo guardado a la historia abierta */
  const applyStyle = useCallback(
    (style: StudioBrand['styles'][number]) =>
      update((f) => ({ ...f, bg: style.bg, anim: style.anim, fx: { ...style.fx }, accent: style.accent, accent2: style.accent2 })),
    [update],
  );

  /** La lista con la historia abierta tal como está en pantalla (aunque aún no se haya guardado) */
  const flyersView = useMemo(
    () => flyers.map((f) => (current && f.id === currentId ? { ...f, ...current } : f)),
    [flyers, current, currentId],
  );

  const currentCode = flyers.find((f) => f.id === currentId)?.code ?? null;

  return {
    loading,
    flyers: flyersView,
    current,
    currentId,
    currentCode,
    brand,
    store,
    live,
    coupons,
    status,
    canUndo: historySize.undo > 0,
    canRedo: historySize.redo > 0,
    undo,
    redo,
    applyStyle,
    markExported,
    freshFlyers,
    update,
    setBrand,
    select,
    create,
    duplicate,
    remove,
    saveNow,
    rememberLive,
  };
}

export type Studio = ReturnType<typeof useStudio>;
