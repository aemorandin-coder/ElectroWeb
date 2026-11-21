'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import {
  IconoBuscar, IconoCerrar, IconoCheck, IconoFlechaAbajo, IconoFlechaArriba, IconoGuardar, IconoImagen,
  IconoNovedad, IconoPlay, IconoRestablecer, IconoSubir,
} from '@/components/iconos';
import { Field, SettingsCard, SwitchRow, TextAreaField, TextField } from '@/app/admin/(dashboard)/settings/_components/fields';
import Opcion from '@/components/admin/Opcion';
import {
  adminBadge, adminHint, adminInput, adminLabel, adminNotice, adminPrimaryButton, adminSecondaryButton, adminSpinner, type AdminTone,
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import {
  estadoLanzamiento, extraerYoutubeId, LOGO_GTA_VI_POR_DEFECTO, paletaLanzamiento, PLANTILLA_GTA_VI,
  type EstadoLanzamiento, type PaletaLanzamiento,
} from '@/lib/lanzamiento';
import { comoDia, diaEnCaracas } from '@/lib/navidad';
import type { StudioStoreProduct } from '@/lib/studio/schema';

interface LanzamientoForm {
  launchThemeEnabled: boolean;
  launchThemeFrom: string;
  launchThemeUntil: string;
  launchThemePalette: PaletaLanzamiento;
  launchThemePillText: string;
  launchThemeEyebrow: string;
  launchThemeTitle: string;
  launchThemeSubtitle: string;
  launchThemeLogo: string;
  launchThemeTrailerUrl: string;
  launchThemeShelfTitle: string;
  launchThemeProductId: string;
  launchThemeProductIds: string[];
}

const INICIAL: LanzamientoForm = {
  launchThemeEnabled: false,
  launchThemeFrom: '',
  launchThemeUntil: '',
  launchThemePalette: 'vice',
  launchThemePillText: '',
  launchThemeEyebrow: '',
  launchThemeTitle: '',
  launchThemeSubtitle: '',
  launchThemeLogo: '',
  launchThemeTrailerUrl: '',
  launchThemeShelfTitle: '',
  launchThemeProductId: '',
  launchThemeProductIds: [],
};

const ESTADO: Record<EstadoLanzamiento, { etiqueta: string; tono: AdminTone }> = {
  activo: { etiqueta: 'En la tienda', tono: 'success' },
  programado: { etiqueta: 'Programado', tono: 'brand' },
  terminado: { etiqueta: 'Terminó', tono: 'neutral' },
  apagado: { etiqueta: 'Apagado', tono: 'neutral' },
};

const texto = (valor: unknown) => (typeof valor === 'string' ? valor : '');

function leer(data: Record<string, unknown>): LanzamientoForm {
  const lista = Array.isArray(data.launchThemeProductIds)
    ? data.launchThemeProductIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  return {
    launchThemeEnabled: data.launchThemeEnabled === true,
    launchThemeFrom: comoDia(texto(data.launchThemeFrom)) ?? '',
    launchThemeUntil: comoDia(texto(data.launchThemeUntil)) ?? '',
    launchThemePalette: paletaLanzamiento(data.launchThemePalette),
    launchThemePillText: texto(data.launchThemePillText),
    launchThemeEyebrow: texto(data.launchThemeEyebrow),
    launchThemeTitle: texto(data.launchThemeTitle),
    launchThemeSubtitle: texto(data.launchThemeSubtitle),
    launchThemeLogo: texto(data.launchThemeLogo),
    launchThemeTrailerUrl: texto(data.launchThemeTrailerUrl),
    launchThemeShelfTitle: texto(data.launchThemeShelfTitle),
    launchThemeProductId: texto(data.launchThemeProductId),
    launchThemeProductIds: lista,
  };
}

function fechaLarga(dia: string): string {
  const otroAno = dia.slice(0, 4) !== diaEnCaracas().slice(0, 4);
  return new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', ...(otroAno ? { year: 'numeric' } : {}), timeZone: 'UTC' })
    .format(new Date(`${dia}T12:00:00Z`));
}

function resumen(estado: EstadoLanzamiento, desde: string, hasta: string): string {
  switch (estado) {
    case 'apagado':
      return 'Apagado: la tienda inicia directo en Destacados de la semana.';
    case 'programado':
      return `Se enciende solo el ${fechaLarga(desde)}${hasta ? ` y se apaga al terminar el ${fechaLarga(hasta)}` : ''}.`;
    case 'terminado':
      return `Terminó el ${fechaLarga(hasta)}. Cambia las fechas o quítalas para volver a mostrarlo.`;
    case 'activo':
      return hasta ? `Visible en el inicio hasta el ${fechaLarga(hasta)} incluido.` : 'Visible arriba del inicio hasta que lo apagues.';
  }
}

export default function Lanzamiento() {
  const [form, setForm] = useState<LanzamientoForm>(INICIAL);
  const [guardado, setGuardado] = useState<LanzamientoForm>(INICIAL);
  const [productosPorId, setProductosPorId] = useState<Record<string, StudioStoreProduct>>({});
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<StudioStoreProduct[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const archivoRef = useRef<HTMLInputElement>(null);

  const hayCambios = JSON.stringify(form) !== JSON.stringify(guardado);

  const cargarProductosPorIds = useCallback(async (ids: string[]) => {
    const unicos = [...new Set(ids.filter(Boolean))];
    if (unicos.length === 0) return;
    try {
      const res = await fetch(`/api/admin/studio/products?ids=${encodeURIComponent(unicos.join(','))}`);
      if (!res.ok) return;
      const data = (await res.json()) as { products?: StudioStoreProduct[] };
      if (!data.products) return;
      setProductosPorId((prev) => {
        const next = { ...prev };
        for (const p of data.products ?? []) next[p.id] = p;
        return next;
      });
    } catch {
      // Silencioso: no bloquea la pantalla si falla el detalle auxiliar
    }
  }, []);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Record<string, unknown>) => {
        const leido = leer(data);
        setForm(leido);
        setGuardado(leido);
        void cargarProductosPorIds([leido.launchThemeProductId, ...leido.launchThemeProductIds]);
      })
      .catch(() => toast.error('No se pudo cargar el tema de lanzamiento'))
      .finally(() => setCargando(false));
  }, [cargarProductosPorIds]);

  useEffect(() => {
    const q = busqueda.trim();
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/admin/studio/products?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { products?: StudioStoreProduct[] };
        const lista = data.products ?? [];
        setResultados(lista);
        setProductosPorId((prev) => {
          const next = { ...prev };
          for (const p of lista) next[p.id] = p;
          return next;
        });
      } finally {
        setBuscando(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const set = <K extends keyof LanzamientoForm>(clave: K, valor: LanzamientoForm[K]) => {
    setForm((prev) => ({ ...prev, [clave]: valor }));
    setErrores((prev) => {
      if (!prev[clave]) return prev;
      const next = { ...prev };
      delete next[clave];
      return next;
    });
  };

  const subirLogo = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error('La imagen pesa más de 5 MB');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'lanzamiento');
    setSubiendo(true);
    try {
      const res = await fetch('/api/upload/settings', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error || 'No se pudo subir la imagen');
      set('launchThemeLogo', data.url);
    } catch {
      toast.error('Error de conexión al subir el logo');
    } finally {
      setSubiendo(false);
      if (archivoRef.current) archivoRef.current.value = '';
    }
  };

  const aplicarPlantillaGta = () => {
    setForm((prev) => ({
      ...prev,
      ...PLANTILLA_GTA_VI,
    }));
    setErrores({});
    toast.success('Plantilla GTA VI cargada (elige tus productos y guarda)');
  };

  const agregarAFila = (id: string) => {
    setForm((prev) => {
      if (prev.launchThemeProductIds.includes(id)) return prev;
      if (prev.launchThemeProductIds.length >= 4) {
        toast.error('La fila muestra máximo 4 productos');
        return prev;
      }
      return { ...prev, launchThemeProductIds: [...prev.launchThemeProductIds, id] };
    });
  };

  const moverEnFila = (idx: number, dir: -1 | 1) => {
    setForm((prev) => {
      const destino = idx + dir;
      if (destino < 0 || destino >= prev.launchThemeProductIds.length) return prev;
      const copia = [...prev.launchThemeProductIds];
      [copia[idx], copia[destino]] = [copia[destino], copia[idx]];
      return { ...prev, launchThemeProductIds: copia };
    });
  };

  const quitarDeFila = (id: string) => {
    setForm((prev) => ({
      ...prev,
      launchThemeProductIds: prev.launchThemeProductIds.filter((item) => item !== id),
    }));
  };

  const guardar = async () => {
    if (form.launchThemeFrom && form.launchThemeUntil && form.launchThemeUntil < form.launchThemeFrom) {
      setErrores({ launchThemeUntil: 'El último día no puede ser antes del primero' });
      return;
    }
    if (form.launchThemeTrailerUrl.trim() && !extraerYoutubeId(form.launchThemeTrailerUrl)) {
      setErrores({ launchThemeTrailerUrl: 'Pega un enlace válido de YouTube' });
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          launchThemeEnabled: form.launchThemeEnabled,
          launchThemeFrom: form.launchThemeFrom || null,
          launchThemeUntil: form.launchThemeUntil || null,
          launchThemePalette: form.launchThemePalette,
          launchThemePillText: form.launchThemePillText || null,
          launchThemeEyebrow: form.launchThemeEyebrow || null,
          launchThemeTitle: form.launchThemeTitle || null,
          launchThemeSubtitle: form.launchThemeSubtitle || null,
          launchThemeLogo: form.launchThemeLogo || null,
          launchThemeTrailerUrl: form.launchThemeTrailerUrl || null,
          launchThemeShelfTitle: form.launchThemeShelfTitle || null,
          launchThemeProductId: form.launchThemeProductId || null,
          launchThemeProductIds: form.launchThemeProductIds,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.fields) setErrores(data.fields);
        toast.error(data?.error || 'No se pudo guardar');
        return;
      }
      const leido = leer(data);
      setForm(leido);
      setGuardado(leido);
      setErrores({});
      toast.success('Tema de lanzamiento guardado');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="flex justify-center py-16"><span className={adminSpinner} aria-label="Cargando" /></div>;

  const estado = estadoLanzamiento({
    launchThemeEnabled: guardado.launchThemeEnabled,
    launchThemeFrom: guardado.launchThemeFrom || null,
    launchThemeUntil: guardado.launchThemeUntil || null,
  });
  const youtubeId = extraerYoutubeId(form.launchThemeTrailerUrl);
  const protagonista = form.launchThemeProductId ? productosPorId[form.launchThemeProductId] : null;

  return (
    <div className="max-w-4xl space-y-5">
      <div className={adminNotice('brand')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-prose text-sm">
            Destaca un estreno grande arriba de la portada con su logo, precio directo, tráiler oficial y hasta 4 productos relacionados.
          </p>
          <button type="button" onClick={aplicarPlantillaGta} className={`${adminSecondaryButton} h-9 px-3 text-xs`}>
            <IconoNovedad className="h-4 w-4" aria-hidden="true" />
            Cargar plantilla GTA VI
          </button>
        </div>
      </div>

      <SettingsCard
        title="Encendido y estilo"
        description="Enciende o programa el bloque arriba del inicio y la píldora destacada en la barra de navegación."
        action={<span className={adminBadge(ESTADO[estado].tono)}>{ESTADO[estado].etiqueta}</span>}
      >
        <div className="space-y-5">
          <SwitchRow
            label="Mostrar tema de lanzamiento en el inicio"
            description={resumen(estado, guardado.launchThemeFrom, guardado.launchThemeUntil)}
            checked={form.launchThemeEnabled}
            onChange={(valor) => set('launchThemeEnabled', valor)}
          />

          <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
            <Field label="Primer día (opcional)" htmlFor="lanzamiento-desde">
              <input
                id="lanzamiento-desde"
                type="date"
                value={form.launchThemeFrom}
                onChange={(e) => set('launchThemeFrom', e.target.value)}
                className={adminInput()}
              />
            </Field>
            <Field label="Último día (opcional)" htmlFor="lanzamiento-hasta" error={errores.launchThemeUntil}>
              <input
                id="lanzamiento-hasta"
                type="date"
                min={form.launchThemeFrom || undefined}
                value={form.launchThemeUntil}
                onChange={(e) => set('launchThemeUntil', e.target.value)}
                aria-invalid={errores.launchThemeUntil ? true : undefined}
                className={adminInput(Boolean(errores.launchThemeUntil))}
              />
            </Field>
          </div>

          <fieldset className="border-t border-line pt-4">
            <legend className={adminLabel}>Ambiente de color</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Opcion
                elegida={form.launchThemePalette === 'vice'}
                onClick={() => set('launchThemePalette', 'vice')}
                aria-pressed={form.launchThemePalette === 'vice'}
                titulo="Atardecer Vice"
                detalle="Degradado especial del estreno con botón protagonista de alto contraste."
              />
              <Opcion
                elegida={form.launchThemePalette === 'brand'}
                onClick={() => set('launchThemePalette', 'brand')}
                aria-pressed={form.launchThemePalette === 'brand'}
                titulo="Azul Electro Shop"
                detalle="Usa el azul oficial de la tienda para lanzamientos de hardware o tienda."
              />
            </div>
          </fieldset>
        </div>
      </SettingsCard>

      <SettingsCard title="Textos, logo y tráiler" description="Encabezado directo y video oficial que se abre sin sacar al cliente de tu tienda.">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Botón en la barra (píldora)"
              value={form.launchThemePillText}
              onChange={(v) => set('launchThemePillText', v)}
              placeholder="Ej. GTA VI"
              maxLength={20}
              counter
              ancho="corto"
              error={errores.launchThemePillText}
            />
            <TextField
              label="Etiqueta superior"
              value={form.launchThemeEyebrow}
              onChange={(v) => set('launchThemeEyebrow', v)}
              placeholder="Ej. YA DISPONIBLE · PS5 Y XBOX SERIES X|S"
              maxLength={60}
              counter
              error={errores.launchThemeEyebrow}
            />
          </div>

          <TextField
            label="Título principal"
            value={form.launchThemeTitle}
            onChange={(v) => set('launchThemeTitle', v)}
            placeholder="Ej. Ya llegó a Electro Shop"
            maxLength={60}
            counter
            ancho="largo"
            className="max-w-3xl"
            hint="Si incluyes «Electro Shop», en el inicio se muestra el wordmark oficial en blanco."
            error={errores.launchThemeTitle}
          />

          <TextAreaField
            label="Frase corta debajo del título"
            value={form.launchThemeSubtitle}
            onChange={(v) => set('launchThemeSubtitle', v)}
            placeholder="Sin esperas ni envíos físicos. Recibe tu código digital original con soporte real en Venezuela."
            maxLength={200}
            counter
            rows={2}
            error={errores.launchThemeSubtitle}
          />

          <div className="border-t border-line pt-4">
            <p className={adminLabel}>Logo del lanzamiento (opcional)</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className={`flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line p-2 ${form.launchThemePalette === 'vice' ? 'tema-vice-zona' : 'tema-brand-zona'}`}>
                {form.launchThemeLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.launchThemeLogo} alt="Vista previa del logo" className="relative z-10 max-h-20 w-auto object-contain" />
                ) : (
                  <IconoImagen className="relative z-10 h-7 w-7 text-white/75" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={archivoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void subirLogo(f);
                  }}
                />
                <button type="button" disabled={subiendo} onClick={() => archivoRef.current?.click()} className={`${adminSecondaryButton} h-10 px-3 text-xs`}>
                  <IconoSubir className="h-4 w-4" aria-hidden="true" />
                  {subiendo ? 'Subiendo…' : 'Subir logo'}
                </button>
                <button type="button" onClick={() => set('launchThemeLogo', LOGO_GTA_VI_POR_DEFECTO)} className={`${adminSecondaryButton} h-10 px-3 text-xs`}>
                  Usar logo GTA VI incluido
                </button>
                {form.launchThemeLogo && (
                  <button type="button" onClick={() => set('launchThemeLogo', '')} className={`${adminSecondaryButton} h-10 px-3 text-xs text-deal!`}>
                    Quitar logo
                  </button>
                )}
              </div>
            </div>
            <p className={adminHint}>Preferible PNG o WebP con fondo transparente.</p>
          </div>

          <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <TextField
              label="Enlace del tráiler (YouTube)"
              type="url"
              value={form.launchThemeTrailerUrl}
              onChange={(v) => set('launchThemeTrailerUrl', v)}
              placeholder="https://www.youtube.com/watch?v=..."
              maxLength={300}
              error={errores.launchThemeTrailerUrl}
              hint={youtubeId ? 'Video detectado: se abrirá dentro de la tienda al pulsar Play.' : 'Opcional: si lo dejas vacío se muestra la portada del producto.'}
            />
            <TextField
              label="Título de la fila de productos"
              value={form.launchThemeShelfTitle}
              onChange={(v) => set('launchThemeShelfTitle', v)}
              placeholder="Ej. Todo para jugar GTA VI"
              maxLength={60}
              error={errores.launchThemeShelfTitle}
            />
          </div>

          {youtubeId && (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`} alt="Miniatura del tráiler" className="h-14 w-24 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <IconoPlay lleno className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
                  Tráiler conectado ({youtubeId})
                </p>
                <p className="text-xs text-muted">Se reproduce en modal sin salir del inicio.</p>
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Productos del lanzamiento"
        description="El protagonista muestra su precio y botón Comprar ahora en el banner. Si agregas la edición Xbox en la fila inferior, el banner ofrece cambiar entre PS5 y Xbox ahí mismo."
      >
        <div className="space-y-5">
          <div>
            <p className={adminLabel}>Producto protagonista del banner</p>
            {protagonista ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {protagonista.image && (
                    <Image src={protagonista.image} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-lg border border-line bg-white object-contain p-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{protagonista.name}</p>
                    <p className="text-xs text-muted">{formatUSD(protagonista.priceUSD)} · {protagonista.categoryName}</p>
                  </div>
                </div>
                <button type="button" onClick={() => set('launchThemeProductId', '')} className={`${adminSecondaryButton} h-9 px-3 text-xs`}>
                  Quitar
                </button>
              </div>
            ) : (
              <p className={adminHint}>Ninguno elegido todavía: usa el buscador de abajo y pulsa «Protagonista».</p>
            )}
          </div>

          <div className="border-t border-line pt-4">
            <p className={adminLabel}>Productos de la fila inferior ({form.launchThemeProductIds.length}/4)</p>
            {form.launchThemeProductIds.length === 0 ? (
              <p className={adminHint}>Agrega hasta 4 productos relacionados (por ejemplo GTA VI PS5, GTA VI Xbox, PlayStation Fondos y GTA V PS5).</p>
            ) : (
              <ul className="space-y-2">
                {form.launchThemeProductIds.map((id, idx) => {
                  const p = productosPorId[id];
                  return (
                    <li key={id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{idx + 1}</span>
                        {p?.image && <Image src={p.image} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-md border border-line object-contain" />}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{p ? p.name : `Producto ${id}`}</p>
                          {p && <p className="text-xs text-muted">{formatUSD(p.priceUSD)} · {p.categoryName}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => moverEnFila(idx, -1)} disabled={idx === 0} aria-label="Subir" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft hover:bg-surface disabled:opacity-40">
                          <IconoFlechaArriba className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => moverEnFila(idx, 1)} disabled={idx === form.launchThemeProductIds.length - 1} aria-label="Bajar" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft hover:bg-surface disabled:opacity-40">
                          <IconoFlechaAbajo className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => quitarDeFila(id)} aria-label="Quitar de la fila" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-deal hover:bg-deal-bg">
                          <IconoCerrar className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-line pt-4">
            <label htmlFor="buscar-lanzamiento" className={adminLabel}>Buscar productos publicados para asignar</label>
            <div className="relative sm:max-w-md">
              <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="buscar-lanzamiento"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej. Grand Theft Auto, PlayStation, Xbox…"
                className={`${adminInput()} pl-9`}
              />
            </div>

            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-line bg-surface p-2">
              {buscando ? (
                <p className="py-4 text-center text-xs text-muted">Buscando productos…</p>
              ) : resultados.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">No se encontraron productos publicados con esa búsqueda.</p>
              ) : (
                resultados.map((p) => {
                  const esPrincipal = form.launchThemeProductId === p.id;
                  const enFila = form.launchThemeProductIds.includes(p.id);
                  return (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        {p.image && <Image src={p.image} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded object-contain" />}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                          <p className="text-xs text-muted">{formatUSD(p.priceUSD)} · {p.categoryName}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => set('launchThemeProductId', p.id)}
                          disabled={esPrincipal}
                          className={`${adminSecondaryButton} h-8 px-2.5 text-xs`}
                        >
                          {esPrincipal ? <><IconoCheck className="h-3.5 w-3.5 text-success-strong" aria-hidden="true" /> Protagonista</> : 'Protagonista'}
                        </button>
                        <button
                          type="button"
                          onClick={() => agregarAFila(p.id)}
                          disabled={enFila || form.launchThemeProductIds.length >= 4}
                          className={`${adminSecondaryButton} h-8 px-2.5 text-xs`}
                        >
                          {enFila ? 'En fila' : '+ A la fila'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </SettingsCard>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
        <p className="text-sm text-muted">
          {hayCambios ? 'Tienes cambios sin guardar.' : 'Todo guardado en la tienda.'}
        </p>
        <div className="flex items-center gap-2">
          {hayCambios && (
            <button type="button" onClick={() => { setForm(guardado); setErrores({}); }} className={`${adminSecondaryButton} h-11 px-4 text-sm`}>
              <IconoRestablecer className="h-4 w-4" aria-hidden="true" />
              Descartar
            </button>
          )}
          <button type="button" disabled={guardando || !hayCambios} onClick={guardar} className={`${adminPrimaryButton} h-11 px-5 text-sm`}>
            <IconoGuardar className="h-4 w-4" aria-hidden="true" />
            {guardando ? 'Guardando…' : 'Guardar tema'}
          </button>
        </div>
      </div>
    </div>
  );
}
