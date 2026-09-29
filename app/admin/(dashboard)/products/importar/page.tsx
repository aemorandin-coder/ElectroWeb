'use client';

// Carga masiva con plantilla .json (C-118). Andrés descarga la plantilla, Claude en la nube la llena desde las
// fotos (el precio lo pone Andrés) y aquí se importa con las fotos: vista previa con errores por fila y todo en borrador.

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  FiAlertCircle, FiAlertTriangle, FiArrowLeft, FiCheckCircle, FiDownload, FiFileText, FiImage, FiLoader, FiUpload,
} from 'react-icons/fi';
import {
  adminBadge, adminCard, adminError, adminHint, adminInput, adminLabel, adminNotice, adminPageHeader, adminPageSubtitle,
  adminPageTitle, adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { conditionBadge } from '@/lib/product-condition';
import {
  IMPORT_MAX_ITEMS, IMPORT_MAX_PHOTOS, parseImportFile, photoCountError, photoKey, priceError, reviewImportItem, stockError,
} from '@/lib/product-import';
import type { ImportRowCheck } from '@/lib/product-import-server';
import { uploadProductPhoto } from '@/lib/product-photo-upload';

type Estado = { tipo: 'pendiente' } | { tipo: 'subiendo'; detalle: string } | { tipo: 'creado'; id: string; sku: string } | { tipo: 'fallo'; mensaje: string };

interface Fila {
  raw: Record<string, unknown>;
  precio: string;
  stock: string;
  /** Fotos elegidas a mano para esta fila; null = las del .json, por nombre */
  fotosPropias: Foto[] | null;
  servidor: ImportRowCheck | null;
  estado: Estado;
}

/** Foto elegida, con su vista previa (se crea al elegirla y se libera al cambiarla o al salir) */
interface Foto { file: File; url: string }
const nuevaFoto = (file: File): Foto => ({ file, url: URL.createObjectURL(file) });
const liberar = (lista: Foto[]) => lista.forEach((f) => URL.revokeObjectURL(f.url));

const esImagen = (f: File) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(f.name);
const numero = (v: string): number | null => (v.trim() === '' ? null : Number(v.trim().replace(',', '.')));

/** Lo que se manda a la API: el producto del .json con el precio y el stock de la vista previa */
function productoFinal(f: Fila): Record<string, unknown> {
  return { ...f.raw, precioUSD: numero(f.precio), stock: numero(f.stock) };
}

async function descargarPlantilla(): Promise<string | null> {
  const r = await fetch('/api/products/import/template');
  if (!r.ok) return 'No se pudo descargar la plantilla';
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'plantilla-productos.json';
  a.click();
  URL.revokeObjectURL(url);
  return null;
}

export default function ImportarProductosPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [archivo, setArchivo] = useState('');
  const [error, setError] = useState('');
  const [revisando, setRevisando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Salir a mitad de la importación deja productos sin crear
  useEffect(() => {
    if (!importando) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [importando]);

  // Las vistas previas vivas, para liberarlas al salir de la página
  const vivas = useRef<Foto[]>([]);
  useEffect(() => { vivas.current = [...fotos, ...filas.flatMap((f) => f.fotosPropias ?? [])]; }, [fotos, filas]);
  useEffect(() => () => liberar(vivas.current), []);

  const porNombre = useMemo(() => new Map(fotos.map((f) => [photoKey(f.file.name), f])), [fotos]);

  /** Cada fila con sus fotos y sus problemas, recalculado al cambiar precio, stock o fotos */
  const vista = useMemo(() => filas.map((f) => {
    const { draft, errors, warnings } = reviewImportItem(productoFinal(f));
    const faltan = f.fotosPropias ? [] : draft.photos.filter((n) => !porNombre.has(photoKey(n)));
    const archivos = f.fotosPropias ?? draft.photos.map((n) => porNombre.get(photoKey(n))).filter((x): x is Foto => !!x);
    const errores = [...errors.filter((e) => e !== priceError(draft.priceUSD) && e !== stockError(draft.stock)), ...(f.servidor?.errors ?? [])];
    if (faltan.length > 0) errores.push(`No elegiste ${faltan.length === 1 ? 'la foto' : 'las fotos'} ${faltan.map((n) => `"${n}"`).join(', ')}`);
    const problemaFotos = draft.condition ? photoCountError(archivos.length, draft.condition.condition) : null;
    if (problemaFotos && faltan.length === 0) errores.push(problemaFotos);
    return {
      draft,
      archivos,
      errores,
      avisos: [...warnings, ...(f.servidor?.warnings ?? [])],
      errorPrecio: priceError(draft.priceUSD),
      errorStock: stockError(draft.stock),
    };
  }), [filas, porNombre]);

  const lista = (v: (typeof vista)[number]) => v.errores.length === 0 && !v.errorPrecio && !v.errorStock;
  const listas = vista.filter((v, i) => lista(v) && filas[i].estado.tipo !== 'creado').length;
  const usadas = new Set(vista.flatMap((v) => v.archivos));
  const sobrantes = fotos.filter((f) => !usadas.has(f));
  const creados = filas.filter((f) => f.estado.tipo === 'creado').length;
  const pendientes = filas.length - creados;

  const elegirArchivos = async (seleccion: FileList | null) => {
    if (!seleccion?.length) return;
    const todos = Array.from(seleccion);
    const jsons = todos.filter((f) => /\.json$/i.test(f.name) || f.type === 'application/json');
    const imagenes = todos.filter(esImagen);
    setError('');
    if (jsons.length > 1) { setError('Elige un solo archivo .json'); return; }
    // Solo fotos: se suman a las ya elegidas (por si faltaba alguna)
    if (jsons.length === 0) {
      if (filas.length === 0) { setError('Falta el archivo .json con los productos'); return; }
      const nuevas = new Set(imagenes.map((i) => photoKey(i.name)));
      liberar(fotos.filter((p) => nuevas.has(photoKey(p.file.name))));
      setFotos([...fotos.filter((p) => !nuevas.has(photoKey(p.file.name))), ...imagenes.map(nuevaFoto)]);
      return;
    }
    const { items, error: problema } = parseImportFile(await jsons[0].text());
    if (problema) { setError(problema); return; }
    setArchivo(jsons[0].name);
    liberar(vivas.current);
    setFotos(imagenes.map(nuevaFoto));
    setTerminado(false);
    setRevisando(true);
    const base: Fila[] = items.map((it) => {
      const raw = it && typeof it === 'object' && !Array.isArray(it) ? (it as Record<string, unknown>) : {};
      const precio = typeof raw.precioUSD === 'number' || typeof raw.precioUSD === 'string' ? String(raw.precioUSD) : '';
      // Sin stock en el .json: 1 si es un usado (una unidad), 0 si es nuevo. Se ve y se puede cambiar
      return { raw, precio, stock: String(reviewImportItem(raw).draft.stock), fotosPropias: null, servidor: null, estado: { tipo: 'pendiente' } };
    });
    setFilas(base);
    try {
      const r = await fetch('/api/products/import/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productos: items }) });
      const data = (await r.json().catch(() => null)) as { filas?: ImportRowCheck[]; error?: string } | null;
      if (!r.ok || !data?.filas) throw new Error(data?.error || 'No se pudo revisar el archivo');
      setFilas(base.map((f, i) => ({ ...f, servidor: data.filas?.[i] ?? null })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo revisar el archivo');
      setFilas([]);
    } finally {
      setRevisando(false);
    }
  };

  const cambiarFila = (i: number, cambios: Partial<Fila>) => setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, ...cambios } : f)));

  const importar = async () => {
    setImportando(true);
    for (let i = 0; i < filas.length; i++) {
      const v = vista[i];
      if (filas[i].estado.tipo === 'creado' || !lista(v)) continue;
      const badge = v.draft.condition?.condition === 'NEW';
      try {
        const urls: string[] = [];
        for (const [n, foto] of v.archivos.entries()) {
          cambiarFila(i, { estado: { tipo: 'subiendo', detalle: `Subiendo foto ${n + 1} de ${v.archivos.length}` } });
          const subida = await uploadProductPhoto(foto.file, {
            badge,
            onWait: (s) => cambiarFila(i, { estado: { tipo: 'subiendo', detalle: `Esperando ${s} s: el servidor recibe 20 fotos por minuto` } }),
          });
          urls.push(subida.url);
        }
        cambiarFila(i, { estado: { tipo: 'subiendo', detalle: 'Creando el producto' } });
        const r = await fetch('/api/products/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ producto: productoFinal(filas[i]), imagenes: urls }),
        });
        const data = (await r.json().catch(() => null)) as { id?: string; sku?: string; error?: string } | null;
        if (!r.ok || !data?.id) throw new Error(data?.error || 'No se pudo crear');
        cambiarFila(i, { estado: { tipo: 'creado', id: data.id, sku: data.sku ?? '' } });
      } catch (e) {
        cambiarFila(i, { estado: { tipo: 'fallo', mensaje: e instanceof Error ? e.message : 'Error de conexión' } });
      }
    }
    setImportando(false);
    setTerminado(true);
  };

  const reiniciar = () => {
    liberar(vivas.current);
    setFilas([]);
    setFotos([]);
    setArchivo('');
    setError('');
    setTerminado(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className={adminPageHeader}>
        <div>
          <Link href="/admin/products" className="mb-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
            <FiArrowLeft className="h-4 w-4" aria-hidden="true" /> Productos
          </Link>
          <h1 className={adminPageTitle}>Importar productos</h1>
          <p className={adminPageSubtitle}>Con la plantilla .json y las fotos. Todo se crea en borrador.</p>
        </div>
      </div>

      {filas.length === 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={adminCard} aria-labelledby="paso-1">
            <h2 id="paso-1" className="text-base font-semibold text-ink">1. Prepara el archivo con Claude</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
              <li>Quita el fondo de las fotos de los productos nuevos en el teléfono (iPhone: mantén el dedo sobre el producto; Samsung: &quot;Extraer objeto&quot;). La tienda pone el fondo blanco y la cinta ES.</li>
              <li>Los usados van con fotos reales de la unidad, al menos 3, sin quitar el fondo.</li>
              <li>Descarga la plantilla: trae las instrucciones, las categorías y las marcas de hoy.</li>
              <li>En claude.ai, adjunta la plantilla y las fotos, y pide: &quot;Llena la plantilla con estos productos&quot;. Dale los precios, o ponlos aquí en la vista previa.</li>
              <li>Descarga el .json que te devuelva.</li>
            </ol>
            <button type="button" onClick={async () => setError((await descargarPlantilla()) ?? '')} className={`${adminSecondaryButton} mt-4`}>
              <FiDownload className="h-4 w-4" aria-hidden="true" /> Descargar plantilla
            </button>
          </section>

          <section className={adminCard} aria-labelledby="paso-2">
            <h2 id="paso-2" className="text-base font-semibold text-ink">2. Elige el .json y las fotos</h2>
            <p className={adminHint}>Juntos, en una sola selección. Hasta {IMPORT_MAX_ITEMS} productos y {IMPORT_MAX_PHOTOS} fotos por producto.</p>
            <label className="mt-3 flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-6 text-center hover:border-brand-500 focus-within:border-brand-500">
              {revisando ? <FiLoader className="h-8 w-8 animate-spin text-brand-500" aria-hidden="true" /> : <FiUpload className="h-8 w-8 text-subtle" aria-hidden="true" />}
              <span className="text-sm font-semibold text-ink">{revisando ? 'Revisando…' : 'Elegir archivos'}</span>
              <span className="text-xs text-muted">Un .json y las fotos (PNG, JPG o WebP)</span>
              <input ref={inputRef} type="file" multiple accept=".json,application/json,image/png,image/jpeg,image/webp" className="sr-only" disabled={revisando}
                onChange={(e) => { void elegirArchivos(e.target.files); e.target.value = ''; }} />
            </label>
            {error && <p className={adminError} role="alert">{error}</p>}
          </section>
        </div>
      )}

      {filas.length > 0 && (
        <>
          <div className={`${adminCard} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink"><FiFileText className="h-4 w-4 shrink-0" aria-hidden="true" /> {archivo}</p>
              <p className="mt-1 text-sm text-muted">
                {terminado
                  ? `${creados} ${creados === 1 ? 'creado' : 'creados'} en borrador${pendientes ? ` · ${pendientes} sin crear` : ''}`
                  : `${filas.length} productos · ${listas} ${listas === 1 ? 'listo' : 'listos'}${filas.length - listas ? ` · ${filas.length - listas} por corregir` : ''} · ${fotos.length} fotos`}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {!importando && (
                <button type="button" onClick={reiniciar} className={adminSecondaryButton}>{terminado ? 'Importar otro archivo' : 'Cambiar archivo'}</button>
              )}
              {pendientes > 0 && (
                <>
                  <label className={`${adminSecondaryButton} cursor-pointer focus-within:outline-2 focus-within:outline-brand-500 ${importando ? 'pointer-events-none opacity-50' : ''}`}>
                    <FiImage className="h-4 w-4" aria-hidden="true" /> Sumar fotos
                    <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={importando}
                      onChange={(e) => { void elegirArchivos(e.target.files); e.target.value = ''; }} />
                  </label>
                  {(!terminado || listas > 0) && (
                    <button type="button" onClick={importar} disabled={importando || revisando || listas === 0} className={adminPrimaryButton}>
                      {importando ? 'Importando…' : terminado ? `Reintentar ${listas}` : `Crear ${listas} en borrador`}
                    </button>
                  )}
                </>
              )}
              {terminado && creados > 0 && <Link href="/admin/products" className={listas > 0 ? adminSecondaryButton : adminPrimaryButton}>Ver productos</Link>}
            </div>
          </div>

          {error && <p className={adminNotice('danger')} role="alert">{error}</p>}
          {!terminado && sobrantes.length > 0 && (
            <p className={adminNotice('warning')}>
              {sobrantes.length === 1 ? 'Una foto no es' : `${sobrantes.length} fotos no son`} de ningún producto: {sobrantes.slice(0, 6).map((f) => f.file.name).join(', ')}{sobrantes.length > 6 ? '…' : ''}
            </p>
          )}

          <ul className="space-y-3">
            {filas.map((f, i) => {
              const v = vista[i];
              const etiqueta = v.draft.condition ? conditionBadge(v.draft.condition.condition, v.draft.condition.conditionGrade) : null;
              const bloqueada = importando || f.estado.tipo === 'creado';
              return (
                <li key={i} className={adminCard}>
                  <div className="flex gap-3">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
                      {v.archivos[0] ? (
                        <Image src={v.archivos[0].url} alt="" fill sizes="80px" className="object-contain" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center text-subtle"><FiImage className="h-6 w-6" aria-hidden="true" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted tabular-nums">Fila {i + 1}</span>
                        {etiqueta && <span className={adminBadge('neutral')}>{etiqueta}</span>}
                        <EstadoFila estado={f.estado} listo={lista(v)} />
                      </p>
                      <p className="mt-1 font-semibold text-ink">{v.draft.name || 'Sin nombre'}</p>
                      <p className="text-sm text-muted">
                        {[f.servidor?.category ?? v.draft.category, f.servidor?.brand, f.estado.tipo === 'creado' ? `SKU ${f.estado.sku}` : v.draft.sku ? `SKU ${v.draft.sku}` : 'SKU automático']
                          .filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[10rem_8rem_1fr]">
                    <div>
                      <label htmlFor={`precio-${i}`} className={adminLabel}>Precio USD</label>
                      <input id={`precio-${i}`} inputMode="decimal" className={adminInput(!!v.errorPrecio)} value={f.precio} disabled={bloqueada} placeholder="0,00"
                        onChange={(e) => cambiarFila(i, { precio: e.target.value.replace(/[^0-9.,]/g, '') })} aria-invalid={!!v.errorPrecio} aria-describedby={v.errorPrecio ? `precio-${i}-error` : undefined} />
                      {v.errorPrecio ? <p id={`precio-${i}-error`} className={adminError}>{v.errorPrecio}</p> : v.draft.priceUSD ? <p className={adminHint}>{formatUSD(v.draft.priceUSD)}</p> : null}
                    </div>
                    <div>
                      <label htmlFor={`stock-${i}`} className={adminLabel}>Stock</label>
                      <input id={`stock-${i}`} inputMode="numeric" className={adminInput(!!v.errorStock)} value={f.stock} disabled={bloqueada} placeholder="0"
                        onChange={(e) => cambiarFila(i, { stock: e.target.value.replace(/\D/g, '') })} aria-invalid={!!v.errorStock} />
                      {v.errorStock && <p className={adminError}>{v.errorStock}</p>}
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className={adminLabel}>Fotos ({v.archivos.length})</p>
                      <label className={`${adminSecondaryButton} cursor-pointer focus-within:outline-2 focus-within:outline-brand-500 ${bloqueada ? 'pointer-events-none opacity-50' : ''}`}>
                        <FiImage className="h-4 w-4" aria-hidden="true" /> {f.fotosPropias ? 'Cambiar fotos' : 'Elegir fotos'}
                        <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={bloqueada}
                          onChange={(e) => {
                            const l = Array.from(e.target.files ?? []).filter(esImagen);
                            if (l.length) { liberar(f.fotosPropias ?? []); cambiarFila(i, { fotosPropias: l.map(nuevaFoto) }); }
                            e.target.value = '';
                          }} />
                      </label>
                      <p className={adminHint}>{f.fotosPropias ? 'Elegidas aquí, en ese orden' : 'Las del .json, por nombre'}. La primera es la principal.</p>
                    </div>
                  </div>

                  {f.estado.tipo === 'creado' && (
                    <Link href={`/admin/products/${f.estado.id}`} className={`${adminSecondaryButton} mt-3`}>Abrir para revisar y publicar</Link>
                  )}
                  {f.estado.tipo === 'fallo' && <p className={`${adminNotice('danger')} mt-3`} role="alert">{f.estado.mensaje}</p>}
                  {f.estado.tipo !== 'creado' && v.errores.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-deal">
                      {v.errores.map((e) => <li key={e} className="flex gap-2"><FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{e}</li>)}
                    </ul>
                  )}
                  {f.estado.tipo !== 'creado' && v.avisos.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-warning-strong">
                      {v.avisos.map((a) => <li key={a} className="flex gap-2"><FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{a}</li>)}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function EstadoFila({ estado, listo }: { estado: Estado; listo: boolean }) {
  if (estado.tipo === 'creado') {
    return <span className={adminBadge('success')}><FiCheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> Creado en borrador</span>;
  }
  if (estado.tipo === 'subiendo') {
    return <span className={adminBadge('brand')} role="status"><FiLoader className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> {estado.detalle}</span>;
  }
  if (estado.tipo === 'fallo') return <span className={adminBadge('danger')}>No se creó</span>;
  return listo ? <span className={adminBadge('success')}>Listo</span> : <span className={adminBadge('danger')}>Por corregir</span>;
}
