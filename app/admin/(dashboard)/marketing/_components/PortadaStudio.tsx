'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  IconoAbrirAparte, IconoBuscar, IconoCheck, IconoCerrar, IconoEstrellaLlena, IconoFlechaAbajo, IconoFlechaArriba,
  IconoFlechaDerecha, IconoGuardar, IconoInicio, IconoLista, IconoMas, IconoMenos, IconoMonitor, IconoCelular,
  IconoNovedad, IconoOcultar, IconoPlay, IconoRestablecer, IconoVer, IconoVideo,
} from '@/components/iconos';
import { IconoGorro } from '@/components/navidad/GorroSanta';
import Opcion from '@/components/admin/Opcion';
import ModalDialog from '@/components/ui/ModalDialog';
import { SettingsCard, SwitchRow, TextField } from '@/app/admin/(dashboard)/settings/_components/fields';
import {
  adminBadge, adminDato, adminError, adminHint, adminInput, adminLabel, adminModalBody, adminModalFooter,
  adminModalHeader, adminModalTitle, adminNotice, adminPrimaryButton, adminSecondaryButton, adminSpinner, type AdminTone,
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import {
  DEFAULT_HOME_SECTIONS_CONFIG, extraerYoutubeIdPortada, leerConfigSeccionesPortada, normalizarPosicionVideo,
  SECCIONES_PORTADA, type HomeSectionsConfig, type PosicionVideoPortada, type SeccionPortadaId,
} from '@/lib/portada';
import type { StudioStoreProduct } from '@/lib/studio/schema';

type EstadoCampana = 'apagado' | 'programado' | 'activo' | 'terminado';

interface PortadaForm {
  homeBannerEnabled: boolean;
  homeBannerText: string;
  homeBannerLink: string;
  maxFeaturedProducts: number;
  homeRotateFeatured: boolean;
  showCategories: boolean;
  maxCategoriesDisplay: number;
  homeCategoryShelves: number;
  homeSectionsConfig: HomeSectionsConfig;
  heroVideoEnabled: boolean;
  heroVideoUrl: string;
  heroVideoTitle: string;
  heroVideoDescription: string;
  homeVideoPosition: PosicionVideoPortada;
}

interface DestacadoItem {
  id: string;
  name: string;
  slug: string;
  priceUSD: number;
  image: string | null;
  stock: number;
  productType: string;
  categoryName: string;
}

interface CategoriaPreview {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

interface PortadaDatos {
  destacados: DestacadoItem[];
  estrellaHoyId: string | null;
  categoriasPreview: CategoriaPreview[];
  campanas: {
    lanzamiento: { estado: EstadoCampana; titulo: string };
    navidad: { estado: EstadoCampana };
  };
}

interface DiffItem {
  campo: keyof PortadaForm;
  etiqueta: string;
  antes: string;
  despues: string;
}

const ESTADO_META: Record<EstadoCampana, { etiqueta: string; tono: AdminTone }> = {
  activo: { etiqueta: 'En la tienda', tono: 'success' },
  programado: { etiqueta: 'Programado', tono: 'brand' },
  terminado: { etiqueta: 'Terminó', tono: 'neutral' },
  apagado: { etiqueta: 'Apagado', tono: 'neutral' },
};

const DESTINOS_CINTA = [
  { label: 'Ofertas', href: '/productos?oferta=1' },
  { label: 'Sorteo', href: '/sorteo' },
  { label: 'Catálogo', href: '/productos' },
  { label: 'Sin enlace', href: '' },
] as const;

const UBICACIONES_VIDEO: {
  id: PosicionVideoPortada;
  titulo: string;
  detalle: string;
}[] = [
  { id: 'after-featured', titulo: 'Después de Destacados', detalle: 'Protagonista en la parte alta del inicio.' },
  { id: 'middle', titulo: 'En el medio', detalle: 'Entre las vitrinas de productos.' },
  { id: 'bottom', titulo: 'Al final del inicio', detalle: 'Debajo de Más de Electro Shop.' },
];

const txt = (v: unknown) => (typeof v === 'string' ? v : '');
const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

function leerForm(data: Record<string, unknown>): PortadaForm {
  return {
    homeBannerEnabled: data.homeBannerEnabled === true,
    homeBannerText: txt(data.homeBannerText),
    homeBannerLink: txt(data.homeBannerLink),
    maxFeaturedProducts: clampInt(data.maxFeaturedProducts, 2, 24, 8),
    homeRotateFeatured: data.homeRotateFeatured !== false,
    showCategories: data.showCategories !== false,
    maxCategoriesDisplay: clampInt(data.maxCategoriesDisplay, 1, 12, 6),
    homeCategoryShelves: clampInt(data.homeCategoryShelves, 0, 6, 3),
    homeSectionsConfig: leerConfigSeccionesPortada(data.homeSectionsConfig),
    heroVideoEnabled: data.heroVideoEnabled === true,
    heroVideoUrl: txt(data.heroVideoUrl),
    heroVideoTitle: txt(data.heroVideoTitle),
    heroVideoDescription: txt(data.heroVideoDescription),
    homeVideoPosition: normalizarPosicionVideo(data.homeVideoPosition),
  };
}

function StepperUnidad({
  label,
  value,
  min,
  max,
  unidad,
  onChange,
  hint,
  error,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unidad: string;
  onChange: (next: number) => void;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={adminLabel}>{label}</label>
      <div className="inline-flex h-11 items-stretch overflow-hidden rounded-lg border border-line-strong bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Disminuir ${label}`}
          className="flex w-10 items-center justify-center bg-surface text-ink transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconoMenos className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const raw = Number.parseInt(e.target.value, 10);
            if (!Number.isNaN(raw)) onChange(Math.min(max, Math.max(min, raw)));
          }}
          className="w-12 border-x border-line bg-white text-center text-sm font-bold tabular-nums text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Aumentar ${label}`}
          className="flex w-10 items-center justify-center bg-surface text-ink transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconoMas className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="flex items-center border-l border-line bg-surface px-2.5 text-xs font-medium text-muted" aria-hidden="true">
          {unidad}
        </span>
      </div>
      {error ? <p className={adminError} role="alert">{error}</p> : hint ? <p className={adminHint}>{hint}</p> : null}
    </div>
  );
}

const labelVideoPos = (pos: PosicionVideoPortada) =>
  UBICACIONES_VIDEO.find((u) => u.id === pos)?.titulo ?? 'Al final del inicio';

function resumirSecciones(cfg: HomeSectionsConfig): string {
  const ocultas = cfg.ocultas.length;
  return ocultas === 0 ? 'Todas visibles' : `${10 - ocultas} visibles · ${ocultas} ocultas`;
}

export default function PortadaStudio({ onIrSeccion }: { onIrSeccion?: (seccion: 'lanzamiento' | 'navidad') => void }) {
  const [form, setForm] = useState<PortadaForm | null>(null);
  const [initial, setInitial] = useState<PortadaForm | null>(null);
  const [datos, setDatos] = useState<PortadaDatos | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desk' | 'mob'>('desk');
  const [ytFallbackThumb, setYtFallbackThumb] = useState(false);

  // Curaduría en vivo de destacados
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<StudioStoreProduct[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  const cargarTodo = useCallback(async (signal?: { cancelado: boolean }) => {
    try {
      const [resSettings, resPortada] = await Promise.all([
        fetch('/api/settings', { cache: 'no-store' }),
        fetch('/api/admin/marketing/portada', { cache: 'no-store' }),
      ]);
      if (!resSettings.ok) throw new Error('settings');
      const sJson = (await resSettings.json()) as Record<string, unknown>;
      const pJson = resPortada.ok ? ((await resPortada.json()) as PortadaDatos) : null;
      if (signal?.cancelado) return;
      const f = leerForm(sJson);
      setLoadError('');
      setForm(f);
      setInitial(f);
      if (pJson) setDatos(pJson);
    } catch {
      if (!signal?.cancelado) setLoadError('No se pudo cargar el editor de portada. Recarga la página.');
    }
  }, []);

  useEffect(() => {
    const signal = { cancelado: false };
    void Promise.resolve().then(() => cargarTodo(signal));
    return () => { signal.cancelado = true; };
  }, [cargarTodo]);

  useEffect(() => {
    if (!buscadorAbierto) return;
    let cancelado = false;
    const timer = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/admin/studio/products?q=${encodeURIComponent(busqueda.trim())}`);
        if (!res.ok) return;
        const data = (await res.json()) as { products?: StudioStoreProduct[] };
        if (!cancelado) setResultados(data.products ?? []);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    }, 220);
    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [buscadorAbierto, busqueda]);

  const setField = useCallback(<K extends keyof PortadaForm>(key: K, value: PortadaForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (key === 'heroVideoUrl') setYtFallbackThumb(false);
  }, []);

  const ejecutarDestacado = async (accion: 'agregar' | 'quitar' | 'estrella_primero', productId: string) => {
    setBusyProductId(productId);
    try {
      const res = await fetch('/api/admin/marketing/portada', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, productId }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(payload?.error || 'No se pudo actualizar el destacado');
        return;
      }
      setDatos((prev) => (prev ? { ...prev, destacados: payload.destacados, estrellaHoyId: payload.estrellaHoyId } : prev));
      toast.success(
        accion === 'agregar'
          ? 'Producto agregado a Destacados'
          : accion === 'quitar'
            ? 'Producto quitado de Destacados'
            : 'Producto movido al principio de Destacados'
      );
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setBusyProductId(null);
    }
  };

  const moverSeccion = (index: number, delta: -1 | 1) => {
    if (!form) return;
    const destino = index + delta;
    if (destino < 0 || destino >= form.homeSectionsConfig.orden.length) return;
    const orden = [...form.homeSectionsConfig.orden];
    const [movida] = orden.splice(index, 1);
    orden.splice(destino, 0, movida);
    setField('homeSectionsConfig', { ...form.homeSectionsConfig, orden });
  };

  const toggleSeccionVisible = (id: SeccionPortadaId) => {
    if (!form) return;
    const ocultas = new Set(form.homeSectionsConfig.ocultas);
    if (ocultas.has(id)) ocultas.delete(id);
    else ocultas.add(id);
    setField('homeSectionsConfig', { ...form.homeSectionsConfig, ocultas: [...ocultas] });
  };

  const cambios = useMemo<DiffItem[]>(() => {
    if (!form || !initial) return [];
    const list: DiffItem[] = [];
    const add = (campo: keyof PortadaForm, etiqueta: string, antes: string, despues: string) => {
      if (JSON.stringify(form[campo]) !== JSON.stringify(initial[campo])) {
        list.push({ campo, etiqueta, antes, despues });
      }
    };
    add('homeBannerEnabled', 'Cinta superior de anuncio', initial.homeBannerEnabled ? 'Activa' : 'Apagada', form.homeBannerEnabled ? 'Activa' : 'Apagada');
    add('homeBannerText', 'Mensaje de la cinta', initial.homeBannerText || 'Sin texto', form.homeBannerText || 'Sin texto');
    add('homeBannerLink', 'Enlace de la cinta', initial.homeBannerLink || 'Sin enlace', form.homeBannerLink || 'Sin enlace');
    add('maxFeaturedProducts', 'Máximo de destacados', `${initial.maxFeaturedProducts} productos`, `${form.maxFeaturedProducts} productos`);
    add('homeRotateFeatured', 'Rotar destacado estrella (7 s)', initial.homeRotateFeatured ? 'Sí' : 'Fijo', form.homeRotateFeatured ? 'Sí' : 'Fijo');
    add('showCategories', 'Mostrar categorías', initial.showCategories ? 'Sí' : 'No', form.showCategories ? 'Sí' : 'No');
    add('maxCategoriesDisplay', 'Categorías en chips/casillas', `${initial.maxCategoriesDisplay}`, `${form.maxCategoriesDisplay}`);
    add('homeCategoryShelves', 'Estantes por categoría', `${initial.homeCategoryShelves} filas`, `${form.homeCategoryShelves} filas`);
    add('homeSectionsConfig', 'Orden o visibilidad de bloques', resumirSecciones(initial.homeSectionsConfig), resumirSecciones(form.homeSectionsConfig));
    add('heroVideoEnabled', 'Video de portada', initial.heroVideoEnabled ? 'Activo' : 'Apagado', form.heroVideoEnabled ? 'Activo' : 'Apagado');
    add('heroVideoUrl', 'Enlace de YouTube', initial.heroVideoUrl || 'Sin video', form.heroVideoUrl || 'Sin video');
    add('homeVideoPosition', 'Ubicación del video', labelVideoPos(initial.homeVideoPosition), labelVideoPos(form.homeVideoPosition));
    add('heroVideoTitle', 'Título del video', initial.heroVideoTitle || 'Reviews y novedades', form.heroVideoTitle || 'Reviews y novedades');
    add('heroVideoDescription', 'Subtítulo del video', initial.heroVideoDescription || 'Sin subtítulo', form.heroVideoDescription || 'Sin subtítulo');
    return list;
  }, [form, initial]);

  const youtubeId = form ? extraerYoutubeIdPortada(form.heroVideoUrl) : null;
  const videoUrlInvalida = Boolean(form && form.heroVideoEnabled && form.heroVideoUrl.trim() && !youtubeId);

  const publicarCambios = async () => {
    if (!form || !initial || cambios.length === 0) return;
    if (videoUrlInvalida) {
      setConfirmOpen(false);
      setErrors({ heroVideoUrl: 'Pega un enlace válido de YouTube (video o short)' });
      toast.error('Corrige el enlace de YouTube antes de publicar');
      return;
    }

    const patch: Record<string, unknown> = {};
    for (const item of cambios) {
      patch[item.campo] = form[item.campo];
    }

    setSaving(true);
    setErrors({});
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields && typeof data.fields === 'object') setErrors(data.fields);
        setConfirmOpen(false);
        toast.error(data.error || 'No se pudieron publicar los cambios');
        return;
      }
      const next = leerForm(data as Record<string, unknown>);
      setForm(next);
      setInitial(next);
      setConfirmOpen(false);
      toast.success('Portada publicada: se ve en el inicio en un momento');
    } catch {
      toast.error('Sin conexión. Tus cambios siguen aquí; intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className={`${adminNotice('danger')} flex flex-wrap items-center justify-between gap-3`} role="alert">
        <span>{loadError}</span>
        <button type="button" onClick={() => void cargarTodo()} className={adminSecondaryButton}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!form || !initial) {
    return (
      <div className="flex justify-center py-16">
        <span className={adminSpinner} aria-label="Cargando editor de portada" />
      </div>
    );
  }

  const seccionPorId = new Map(SECCIONES_PORTADA.map((s) => [s.id, s]));
  const ocultasSet = new Set(form.homeSectionsConfig.ocultas);
  const destacados = datos?.destacados ?? [];
  const featuredIds = new Set(destacados.map((d) => d.id));
  const categoriasPreview = (datos?.categoriasPreview ?? []).slice(0, form.maxCategoriesDisplay);

  const bloquesActivosPreview = form.homeSectionsConfig.orden.filter(
    (id) => !ocultasSet.has(id) && !(id === 'categories' && !form.showCategories)
  );
  const vidActive = form.heroVideoEnabled && Boolean(youtubeId);
  const previewBloques: Array<{ id: string; label: string; meta: string; esDestacado?: boolean; esVideo?: boolean }> =
    bloquesActivosPreview.map((id) => {
      const def = seccionPorId.get(id);
      let meta = 'Visible';
      if (id === 'featured') meta = `Tope ${form.maxFeaturedProducts} · ${form.homeRotateFeatured ? 'Rota 7 s' : 'Fijo'}`;
      else if (id === 'categories') meta = `${form.maxCategoriesDisplay} casillas`;
      else if (id === 'shelves') meta = form.homeCategoryShelves === 0 ? '0 filas' : `${form.homeCategoryShelves} filas`;
      return { id, label: def?.titulo ?? id, meta, esDestacado: id === 'featured' };
    });

  if (vidActive) {
    const vidItem = {
      id: 'video',
      label: `Video: ${form.heroVideoTitle.trim() || 'Reviews y novedades'}`,
      meta: 'Kit 2.0',
      esVideo: true,
    };
    if (form.homeVideoPosition === 'after-featured') {
      const idx = previewBloques.findIndex((b) => b.id === 'featured');
      previewBloques.splice(idx >= 0 ? idx + 1 : 0, 0, vidItem);
    } else if (form.homeVideoPosition === 'middle') {
      previewBloques.splice(Math.ceil(previewBloques.length / 2), 0, vidItem);
    } else {
      previewBloques.push(vidItem);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-start">
        {/* Columna izquierda: Controles */}
        <div className="min-w-0 space-y-5">
          {/* Estado de campañas automáticas que conviven arriba de la portada */}
          {datos?.campanas && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-ink">
                  <IconoNovedad className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
                  <span>{datos.campanas.lanzamiento.titulo}</span>
                  <span className={adminBadge(ESTADO_META[datos.campanas.lanzamiento.estado].tono)}>
                    {ESTADO_META[datos.campanas.lanzamiento.estado].etiqueta}
                  </span>
                  {onIrSeccion && (
                    <button type="button" onClick={() => onIrSeccion('lanzamiento')} className="ml-1 text-brand-600 hover:underline">
                      Editar
                    </button>
                  )}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-ink">
                  <IconoGorro className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Navidad</span>
                  <span className={adminBadge(ESTADO_META[datos.campanas.navidad.estado].tono)}>
                    {ESTADO_META[datos.campanas.navidad.estado].etiqueta}
                  </span>
                  {onIrSeccion && (
                    <button type="button" onClick={() => onIrSeccion('navidad')} className="ml-1 text-brand-600 hover:underline">
                      Editar
                    </button>
                  )}
                </span>
              </div>
              <p className="text-xs text-brand-900">Cuando están activas aparecen encima de Destacados.</p>
            </div>
          )}

          {/* 1. Cinta superior */}
          <SettingsCard
            title="Cinta de anuncio superior"
            description="Franja discreta sobre la barra azul del inicio para avisos del día."
          >
            <div className="space-y-4">
              <SwitchRow
                label="Mostrar cinta superior"
                description="Ideal para avisar envíos, promociones o el sorteo sin tapar los productos."
                checked={form.homeBannerEnabled}
                onChange={(v) => setField('homeBannerEnabled', v)}
                error={errors.homeBannerEnabled}
              />
              {form.homeBannerEnabled && (
                <div className="space-y-4 border-t border-line pt-4">
                  <TextField
                    ancho="largo"
                    label="Mensaje corto"
                    maxLength={90}
                    counter
                    value={form.homeBannerText}
                    onChange={(v) => setField('homeBannerText', v)}
                    error={errors.homeBannerText}
                    placeholder="Ej. Envíos a toda Venezuela por ZOOM y MRW · Pago Móvil verificado"
                  />
                  <div className="space-y-2">
                    <p className={adminLabel}>Destino rápido al tocar la cinta</p>
                    <div className="flex flex-wrap gap-2">
                      {DESTINOS_CINTA.map((d) => {
                        const activa = form.homeBannerLink === d.href;
                        return (
                          <button
                            key={d.label}
                            type="button"
                            aria-pressed={activa}
                            onClick={() => setField('homeBannerLink', d.href)}
                            className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-xs font-semibold transition-colors ${
                              activa
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-line-strong bg-white text-ink-soft hover:border-brand-200 hover:bg-brand-50'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <TextField
                    ancho="nombre"
                    label="Ruta o enlace"
                    value={form.homeBannerLink}
                    onChange={(v) => setField('homeBannerLink', v)}
                    error={errors.homeBannerLink}
                    placeholder="/productos?oferta=1"
                    hint="Usa una ruta propia (/sorteo) o un enlace https://."
                  />
                </div>
              )}
            </div>
          </SettingsCard>

          {/* 2. Destacados de la semana */}
          <SettingsCard
            title="Destacados de la semana"
            description="Ajusta cuántos caben y elige directo qué productos salen en la estrella."
            action={
              <span className={adminDato}>
                <IconoEstrellaLlena className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
                {destacados.length} destacados
              </span>
            }
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-start gap-6">
                <StepperUnidad
                  label="Máximo visible"
                  value={form.maxFeaturedProducts}
                  min={2}
                  max={24}
                  unidad="prod."
                  onChange={(n) => setField('maxFeaturedProducts', n)}
                  hint="Entre 2 y 24."
                  error={errors.maxFeaturedProducts}
                />
                <div className="min-w-[14rem] flex-1 pt-1">
                  <SwitchRow
                    label="Rotar estrella en PC (cada 7 s)"
                    description="En escritorio gira una sola vuelta entre los destacados."
                    checked={form.homeRotateFeatured}
                    onChange={(v) => setField('homeRotateFeatured', v)}
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-line pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">Productos destacados ahora</p>
                    <p className="text-xs text-muted">Los cambios sobre esta lista se guardan al instante en el catálogo.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBuscadorAbierto((v) => !v)}
                    className={`${adminSecondaryButton} min-h-9 px-3 text-xs`}
                  >
                    <IconoMas className="h-4 w-4" aria-hidden="true" />
                    {buscadorAbierto ? 'Cerrar buscador' : 'Agregar destacado'}
                  </button>
                </div>

                {destacados.length === 0 ? (
                  <p className={adminNotice('warning')}>
                    Ningún producto tiene marcada la estrella todavía. Agrega uno desde el botón de arriba.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {destacados.map((p, idx) => {
                      const ocupado = busyProductId === p.id;
                      const sinStock = p.stock <= 0 && p.productType === 'PHYSICAL';
                      const esEstrellaHoy = p.id === datos?.estrellaHoyId;
                      return (
                        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-2.5">
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold tabular-nums text-ink-soft ring-1 ring-inset ring-line">
                              {idx + 1}
                            </span>
                            {p.image ? (
                              <Image src={p.image} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg border border-line bg-white object-contain p-0.5" />
                            ) : (
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-muted">
                                <IconoInicio className="h-4 w-4" aria-hidden="true" />
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                                {esEstrellaHoy && <span className={adminBadge('brand')}>Estrella hoy</span>}
                                {sinStock && <span className={adminDato}>Sin stock</span>}
                              </div>
                              <p className="text-xs tabular-nums text-muted">
                                {formatUSD(p.priceUSD)} · {p.categoryName}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {idx > 0 && (
                              <button
                                type="button"
                                disabled={ocupado}
                                onClick={() => void ejecutarDestacado('estrella_primero', p.id)}
                                className={`${adminSecondaryButton} min-h-9 px-2.5 py-1 text-xs`}
                              >
                                Subir al #1
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={ocupado}
                              onClick={() => void ejecutarDestacado('quitar', p.id)}
                              aria-label={`Quitar ${p.name} de destacados`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-white text-deal transition-colors hover:bg-deal-bg disabled:opacity-40"
                            >
                              <IconoCerrar className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {buscadorAbierto && (
                  <div className="mt-3 space-y-2 rounded-xl border border-brand-200 bg-brand-50 p-3">
                    <label htmlFor="buscar-destacados-portada" className={adminLabel}>
                      Buscar producto publicado para destacar
                    </label>
                    <div className="relative sm:max-w-sm">
                      <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                      <input
                        id="buscar-destacados-portada"
                        type="search"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Ej. PS5, taladro, SSD…"
                        className={`${adminInput()} pl-9`}
                      />
                    </div>
                    <div className="max-h-56 space-y-1.5 overflow-y-auto pt-1">
                      {buscando ? (
                        <p className="py-3 text-center text-xs text-muted">Buscando…</p>
                      ) : resultados.length === 0 ? (
                        <p className="py-3 text-center text-xs text-muted">Sin resultados publicados para esa búsqueda.</p>
                      ) : (
                        resultados.map((p) => {
                          const ya = featuredIds.has(p.id);
                          return (
                            <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white px-2.5 py-2">
                              <div className="flex min-w-0 items-center gap-2">
                                {p.image && <Image src={p.image} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded object-contain" />}
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-ink">{p.name}</p>
                                  <p className="text-xs tabular-nums text-muted">{formatUSD(p.priceUSD)} · {p.categoryName}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={ya || busyProductId === p.id}
                                onClick={() => void ejecutarDestacado('agregar', p.id)}
                                className={`${adminSecondaryButton} min-h-9 shrink-0 px-3 py-1 text-xs`}
                              >
                                {ya ? 'Ya destacado' : '+ Destacar'}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SettingsCard>

          {/* 3. Categorías y estantes */}
          <SettingsCard
            title="Categorías y estantes"
            description="Controla los chips rápidos, «Compra por categoría» y los estantes por categoría abajo."
          >
            <div className="space-y-5">
              <SwitchRow
                label="Mostrar categorías en el inicio"
                description="Si lo apagas, solo se ven las categorías en el menú."
                checked={form.showCategories}
                onChange={(v) => setField('showCategories', v)}
              />
              <div className="flex flex-wrap items-start gap-6">
                {form.showCategories && (
                  <StepperUnidad
                    label="Chips y casillas"
                    value={form.maxCategoriesDisplay}
                    min={1}
                    max={12}
                    unidad="categ."
                    onChange={(n) => setField('maxCategoriesDisplay', n)}
                    hint="Entre 1 y 12."
                    error={errors.maxCategoriesDisplay}
                  />
                )}
                <StepperUnidad
                  label="Estantes abajo"
                  value={form.homeCategoryShelves}
                  min={0}
                  max={6}
                  unidad="filas"
                  onChange={(n) => setField('homeCategoryShelves', n)}
                  hint="Entre 0 y 6 filas."
                  error={errors.homeCategoryShelves}
                />
              </div>

              {form.showCategories && categoriasPreview.length > 0 && (
                <div className="border-t border-line pt-3">
                  <p className="mb-2 text-xs font-semibold text-muted">Primeras categorías visibles hoy</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categoriasPreview.map((c) => (
                      <span key={c.id} className={adminDato}>
                        {c.name} ({c.productCount})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SettingsCard>

          {/* 4. Orden y visibilidad de bloques */}
          <SettingsCard
            title="Orden y visibilidad de bloques"
            description="Elige el orden en que aparecen las vitrinas en el inicio o apaga las que no necesites."
            action={
              <button
                type="button"
                onClick={() => setField('homeSectionsConfig', { orden: [...DEFAULT_HOME_SECTIONS_CONFIG.orden], ocultas: [] })}
                className={`${adminSecondaryButton} min-h-9 px-3 text-xs`}
              >
                <IconoRestablecer className="h-3.5 w-3.5" aria-hidden="true" />
                Orden original
              </button>
            }
          >
            <ul className="space-y-2">
              {form.homeSectionsConfig.orden.map((secId, idx) => {
                const def = seccionPorId.get(secId);
                if (!def) return null;
                const visible = !ocultasSet.has(secId);
                const apagadaPorCat = secId === 'categories' && !form.showCategories;
                return (
                  <li
                    key={secId}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 transition-colors ${
                      visible && !apagadaPorCat ? 'border-line-strong bg-white' : 'border-line bg-surface opacity-70'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold tabular-nums text-brand-700">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-ink">{def.titulo}</p>
                          {apagadaPorCat && <span className={adminDato}>Categorías apagadas</span>}
                        </div>
                        <p className="truncate text-xs text-muted">{def.detalle}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moverSeccion(idx, -1)}
                        disabled={idx === 0}
                        aria-label={`Subir ${def.titulo}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-white text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-35"
                      >
                        <IconoFlechaArriba className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moverSeccion(idx, 1)}
                        disabled={idx === form.homeSectionsConfig.orden.length - 1}
                        aria-label={`Bajar ${def.titulo}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-white text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-35"
                      >
                        <IconoFlechaAbajo className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={visible}
                        aria-label={`Mostrar ${def.titulo}`}
                        onClick={() => toggleSeccionVisible(secId)}
                        className={`ml-1 inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                          visible
                            ? 'border-brand-200 bg-brand-50 text-brand-700'
                            : 'border-line-strong bg-white text-muted'
                        }`}
                      >
                        {visible ? <IconoVer className="h-4 w-4" aria-hidden="true" /> : <IconoOcultar className="h-4 w-4" aria-hidden="true" />}
                        <span className="hidden sm:inline">{visible ? 'Visible' : 'Oculto'}</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </SettingsCard>

          {/* 5. Video de portada */}
          <SettingsCard
            title="Video de la portada"
            description="Muestra un video de YouTube con el reproductor renovado de la marca."
          >
            <div className="space-y-5">
              <SwitchRow
                label="Mostrar video en el inicio"
                checked={form.heroVideoEnabled}
                onChange={(v) => setField('heroVideoEnabled', v)}
              />
              {form.heroVideoEnabled && (
                <div className="space-y-4 border-t border-line pt-4">
                  <TextField
                    ancho="largo"
                    label="Enlace de YouTube"
                    type="url"
                    value={form.heroVideoUrl}
                    onChange={(v) => setField('heroVideoUrl', v)}
                    error={errors.heroVideoUrl || (videoUrlInvalida ? 'Pega un enlace válido de YouTube (video o short)' : undefined)}
                    placeholder="https://www.youtube.com/watch?v=…"
                  />

                  {youtubeId && (
                    <div className="overflow-hidden rounded-xl border border-line-strong bg-brand-700 sm:max-w-md">
                      <div className="relative aspect-video w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de YouTube por ID */}
                        <img
                          src={ytFallbackThumb ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                          alt="Vista previa de YouTube"
                          onError={() => {
                            if (!ytFallbackThumb) setYtFallbackThumb(true);
                          }}
                          className="h-full w-full object-cover opacity-85"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-brand-700/30 p-3">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white ring-4 ring-white/30">
                            <IconoPlay lleno className="ml-0.5 h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className="rounded-full border border-white/25 bg-brand-700/85 px-3 py-0.5 text-xs font-semibold text-white">
                            YouTube · {youtubeId}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className={adminLabel}>Ubicación en el inicio</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Ubicación del video en el inicio">
                      {UBICACIONES_VIDEO.map((u) => (
                        <Opcion
                          key={u.id}
                          role="radio"
                          aria-checked={form.homeVideoPosition === u.id}
                          elegida={form.homeVideoPosition === u.id}
                          titulo={u.titulo}
                          detalle={u.detalle}
                          icono={u.id === 'after-featured' ? IconoNovedad : u.id === 'middle' ? IconoLista : IconoVideo}
                          onClick={() => setField('homeVideoPosition', u.id)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField
                      ancho="largo"
                      label="Título de la sección"
                      value={form.heroVideoTitle}
                      onChange={(v) => setField('heroVideoTitle', v)}
                      error={errors.heroVideoTitle}
                      maxLength={80}
                      placeholder="Reviews y novedades"
                    />
                    <TextField
                      ancho="largo"
                      label="Subtítulo"
                      value={form.heroVideoDescription}
                      onChange={(v) => setField('heroVideoDescription', v)}
                      error={errors.heroVideoDescription}
                      maxLength={200}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              )}
            </div>
          </SettingsCard>
        </div>

        {/* Columna derecha: Vista previa viva */}
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-20" aria-label="Vista previa del inicio">
          <div className="rounded-2xl border border-line-strong bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-ink">Vista previa del inicio (/)</h2>
                <p className="text-xs text-muted">Orden real que ven los clientes.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-line-strong bg-surface p-0.5" role="group" aria-label="Tamaño de vista previa">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('desk')}
                    aria-pressed={previewMode === 'desk'}
                    className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold ${previewMode === 'desk' ? 'bg-brand-500 text-white' : 'text-ink-soft hover:text-ink'}`}
                  >
                    <IconoMonitor className="h-3.5 w-3.5" aria-hidden="true" /> PC
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('mob')}
                    aria-pressed={previewMode === 'mob'}
                    className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold ${previewMode === 'mob' ? 'bg-brand-500 text-white' : 'text-ink-soft hover:text-ink'}`}
                  >
                    <IconoCelular className="h-3.5 w-3.5" aria-hidden="true" /> 360 px
                  </button>
                </div>
                <Link href="/" target="_blank" className="inline-flex h-8 items-center gap-1 rounded-lg border border-line-strong px-2.5 text-xs font-semibold text-brand-600 hover:bg-brand-50">
                  Ver <IconoAbrirAparte className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className={`mx-auto w-full overflow-hidden rounded-xl border border-line-strong bg-surface transition-all ${previewMode === 'mob' ? 'max-w-[320px]' : ''}`}>
              {form.homeBannerEnabled && form.homeBannerText.trim() && (
                <div className="bg-brand-700 px-3 py-1.5 text-center text-xs font-semibold text-white">
                  <span className="inline-flex items-center gap-1">
                    <span className="truncate">{form.homeBannerText.trim()}</span>
                    {form.homeBannerLink && <IconoFlechaDerecha className="h-3 w-3 shrink-0" aria-hidden="true" />}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between bg-brand-500 px-3 py-2 text-xs font-bold text-white">
                <span>ELECTRO SHOP</span>
                <span className="font-medium text-white/85">Buscador · Carrito</span>
              </div>

              {form.showCategories && categoriasPreview.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto border-b border-line bg-white px-2.5 py-2 scrollbar-hide">
                  {categoriasPreview.map((c) => (
                    <span key={c.id} className="shrink-0 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                      {c.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-2 p-2.5">
                {datos?.campanas.lanzamiento.estado === 'activo' && (
                  <div className="flex items-center justify-between rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white">
                    <span>{datos.campanas.lanzamiento.titulo}</span>
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">Activo</span>
                  </div>
                )}

                {previewBloques.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      b.esDestacado
                        ? 'border-brand-200 bg-brand-100'
                        : b.esVideo
                          ? 'border-brand-200 bg-brand-50'
                          : 'border-line bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-ink">{b.label}</span>
                      <span className={b.esVideo ? adminBadge('brand') : adminDato}>{b.meta}</span>
                    </div>
                    {b.esDestacado && destacados[0] && (
                      <p className="mt-1 truncate text-xs text-ink-soft">
                        Estrella hoy: {(destacados.find((d) => d.id === datos?.estrellaHoyId) ?? destacados[0]).name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Barra pegajosa de publicación */}
      {cambios.length > 0 && (
        <div className="sticky bottom-0 z-[var(--z-sticky)] -mx-3 px-3 pb-3 pt-2 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0" aria-live="polite">
          <div className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-white p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:pl-5">
            <p className="text-sm text-ink">
              <strong className="tabular-nums">{cambios.length}</strong> {cambios.length === 1 ? 'cambio listo para revisar' : 'cambios listos para revisar'}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                disabled={saving}
                onClick={() => { setForm(initial); setErrors({}); }}
                className={adminSecondaryButton}
              >
                <IconoRestablecer className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                Descartar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmOpen(true)}
                className={adminPrimaryButton}
              >
                <IconoCheck className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                Revisar y publicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nativo Antes -> Después */}
      <ModalDialog open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} ariaLabelledBy="portada-review-title" size="lg">
        <div className={adminModalHeader}>
          <h2 id="portada-review-title" className={adminModalTitle}>Revisar cambios de la portada</h2>
          <button
            type="button"
            disabled={saving}
            onClick={() => setConfirmOpen(false)}
            aria-label="Cerrar resumen"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
          >
            <IconoCerrar className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className={`${adminModalBody} space-y-3`}>
          <p className="text-sm text-muted">
            Esto es lo que va a cambiar en el inicio de la tienda al publicar:
          </p>
          <ul className="space-y-2">
            {cambios.map((c) => (
              <li key={c.campo} className="rounded-xl border border-line bg-surface p-3 text-sm">
                <p className="font-semibold text-ink">{c.etiqueta}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                  <span className="rounded bg-white px-2 py-0.5 ring-1 ring-inset ring-line">{c.antes}</span>
                  <span aria-hidden="true">→</span>
                  <span className="rounded bg-brand-50 px-2 py-0.5 font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">{c.despues}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className={adminModalFooter}>
          <button type="button" disabled={saving} onClick={() => setConfirmOpen(false)} className={adminSecondaryButton}>
            Seguir editando
          </button>
          <button type="button" disabled={saving} onClick={() => void publicarCambios()} className={adminPrimaryButton}>
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" /> : <IconoGuardar className="h-4 w-4" aria-hidden="true" />}
            {saving ? 'Publicando…' : 'Publicar en portada'}
          </button>
        </div>
      </ModalDialog>
    </div>
  );
}
