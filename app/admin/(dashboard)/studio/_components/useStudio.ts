'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { linkedIds, refreshLinked } from '@/lib/studio/live';
import {
  TEMPLATES,
  blankProduct,
  normalizeBrand,
  normalizeFlyer,
  type StudioBrand,
  type StudioFlyer,
  type StudioFlyerData,
  type StudioStoreInfo,
  type StudioStoreProduct,
} from '@/lib/studio/schema';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const FLYER_KEY = 'studio-flyer';
const lsGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // Navegación privada: solo se pierde recordar la última historia abierta
  }
};

async function fetchLive(ids: string[]): Promise<Record<string, StudioStoreProduct>> {
  if (!ids.length) return {};
  const res = await fetch(`/api/admin/studio/products?ids=${ids.map(encodeURIComponent).join(',')}`);
  if (!res.ok) return {};
  const { products } = (await res.json()) as { products: StudioStoreProduct[] };
  return Object.fromEntries(products.map((p) => [p.id, p]));
}

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
  const [status, setStatus] = useState<SaveStatus>('idle');

  // Lo último, para los temporizadores de guardado (no se leen durante el render)
  const latest = useRef({ current, currentId, brand });
  useEffect(() => {
    latest.current = { current, currentId, brand };
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
        const res = await fetch(`/api/admin/studio/flyers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(f),
          keepalive,
        });
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'No se pudo guardar');
        const { flyer } = (await res.json()) as { flyer: StudioFlyer };
        setFlyers((list) => list.map((x) => (x.id === flyer.id ? flyer : x)));
        setStatus(dirty.current ? 'dirty' : 'saved');
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

  /** Cambia la historia abierta y la guarda un momento después */
  const update = useCallback(
    (fn: (f: StudioFlyerData) => StudioFlyerData) => {
      setCurrent((f) => (f ? withSlots(fn(f)) : f));
      dirty.current = true;
      setStatus('dirty');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void saveNow(), 1200);
    },
    [saveNow],
  );

  /** Abre una historia: la normaliza y pone al día los productos de la tienda */
  const openId = useRef<string | null>(null);
  const open = useCallback(
    async (flyer: StudioFlyer) => {
      const data = withSlots(normalizeFlyer(flyer));
      openId.current = flyer.id;
      setCurrentId(flyer.id);
      setCurrent(data);
      setStatus('idle');
      dirty.current = false;
      lsSet(FLYER_KEY, flyer.id);
      const fresh = await fetchLive(linkedIds([data]));
      setLive((prev) => ({ ...prev, ...fresh }));
      // Si cambió un precio u oferta en la tienda, la historia se pone al día y se guarda
      if (openId.current === flyer.id && refreshLinked(data, fresh) !== data) update((f) => refreshLinked(f, fresh));
    },
    [update],
  );

  useCargarAlMontar(async () => {
    try {
      const [fr, br] = await Promise.all([fetch('/api/admin/studio/flyers'), fetch('/api/admin/studio/brand')]);
      if (!fr.ok || !br.ok) throw new Error();
      const { flyers: list } = (await fr.json()) as { flyers: StudioFlyer[] };
      const { brand: b, store: s } = (await br.json()) as { brand: StudioBrand; store: StudioStoreInfo };
      setFlyers(list);
      setBrandState(normalizeBrand(b));
      setStore(s);
      const want = lsGet(FLYER_KEY);
      const pick = list.find((f) => f.id === want) ?? list[0];
      if (pick) await open(pick);
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

  const select = useCallback(
    async (id: string) => {
      if (id === latest.current.currentId) return;
      await saveNow();
      const f = flyers.find((x) => x.id === id);
      if (f) await open(f);
    },
    [flyers, open, saveNow],
  );

  const create = useCallback(
    async (data: Partial<StudioFlyerData> = {}) => {
      await saveNow();
      const res = await fetch('/api/admin/studio/flyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        toast.error('No se pudo crear la historia');
        return;
      }
      const { flyer } = (await res.json()) as { flyer: StudioFlyer };
      setFlyers((list) => [flyer, ...list]);
      await open(flyer);
    },
    [open, saveNow],
  );

  const duplicate = useCallback(async () => {
    const f = latest.current.current;
    if (!f) return;
    await create({ ...f, name: `${f.name || 'Historia'} (copia)`.slice(0, 80) });
  }, [create]);

  const remove = useCallback(async () => {
    const id = latest.current.currentId;
    if (!id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    openId.current = null;
    dirty.current = false;
    const res = await fetch(`/api/admin/studio/flyers/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('No se pudo eliminar');
      return;
    }
    const rest = flyers.filter((f) => f.id !== id);
    setFlyers(rest);
    toast.success('Historia eliminada');
    if (rest[0]) await open(rest[0]);
    else {
      setCurrentId(null);
      setCurrent(null);
    }
  }, [flyers, open]);

  /** Productos de la tienda que otras historias necesitan al exportarlas juntas */
  const liveFor = useCallback(
    async (list: StudioFlyerData[]) => {
      const missing = linkedIds(list);
      const fresh = await fetchLive(missing);
      setLive((prev) => ({ ...prev, ...fresh }));
      return { ...live, ...fresh };
    },
    [live],
  );

  const rememberLive = useCallback((p: StudioStoreProduct) => setLive((prev) => ({ ...prev, [p.id]: p })), []);

  /** La lista con la historia abierta tal como está en pantalla (aunque aún no se haya guardado) */
  const flyersView = useMemo(
    () => flyers.map((f) => (current && f.id === currentId ? { ...f, ...current } : f)),
    [flyers, current, currentId],
  );

  return {
    loading,
    flyers: flyersView,
    current,
    currentId,
    brand,
    store,
    live,
    status,
    update,
    setBrand,
    select,
    create,
    duplicate,
    remove,
    saveNow,
    liveFor,
    rememberLive,
  };
}

export type Studio = ReturnType<typeof useStudio>;
