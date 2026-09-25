'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { FiAlertCircle, FiBox, FiCheckCircle, FiDownload, FiExternalLink, FiStar, FiUpload, FiX, FiZap, FiPackage } from 'react-icons/fi';
import {
  adminBadge, adminError, adminHint, adminIconButton, adminInput, adminLabel, adminModalBody, adminModalFooter, adminModalHeader,
  adminModalOverlay, adminModalPanel, adminModalTitle, adminNotice, adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';
import { formatUSD, formatVES } from '@/lib/currency';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { ETIQUETA_ESTADO, type CampoMasivo, type Categoria, type ProductoLista } from './tipos';

function Modal({ titulo, onClose, children, pie, ancho = 'max-w-lg' }: { titulo: string; onClose: () => void; children: React.ReactNode; pie?: React.ReactNode; ancho?: string }) {
  useBodyScrollLock(true);
  return createPortal(
    <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-label={titulo} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className={`${adminModalPanel} ${ancho}`}>
        <div className={adminModalHeader}>
          <h2 className={adminModalTitle}>{titulo}</h2>
          <button type="button" onClick={onClose} className={`${adminIconButton} h-11 w-11`} aria-label="Cerrar"><FiX className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <div className={adminModalBody}>{children}</div>
        {pie && <div className={adminModalFooter}>{pie}</div>}
      </div>
    </div>,
    document.body
  );
}

export function VistaRapida({ p, tasaVES, onClose, onEstado }: { p: ProductoLista; tasaVES: number; onClose: () => void; onEstado: (p: ProductoLista) => void }) {
  const src = p.mainImage || p.images[0];
  return (
    <Modal titulo="Vista rápida" onClose={onClose} ancho="max-w-2xl" pie={
      <>
        <button type="button" onClick={() => { onEstado(p); onClose(); }} className={adminSecondaryButton}>{p.status === 'PUBLISHED' ? 'Desactivar' : 'Activar'}</button>
        <a href={`/productos/${p.slug || p.id}`} target="_blank" rel="noopener noreferrer" className={adminSecondaryButton}><FiExternalLink className="h-4 w-4" aria-hidden="true" /> Ver en tienda</a>
        <Link href={`/admin/products/${p.id}`} className={adminPrimaryButton}>Editar producto</Link>
      </>
    }>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[12rem_1fr]">
        <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-white">
          {src ? <Image src={src} alt={p.name} fill sizes="192px" className="object-contain p-2" unoptimized={!src.startsWith('/')} /> : (
            <div className="flex h-full items-center justify-center text-subtle"><FiBox className="h-10 w-10" aria-hidden="true" /></div>
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-ink">{p.name}</span>
              <span className={adminBadge(p.status === 'PUBLISHED' ? 'success' : p.status === 'ARCHIVED' ? 'warning' : 'neutral')}>{ETIQUETA_ESTADO[p.status]}</span>
            </p>
            <p className="font-mono text-sm text-muted">SKU: {p.sku}</p>
            {p.isFeatured && (
              <p className="mt-1 flex items-center gap-1 text-sm text-warning-strong">
                <FiStar className="h-4 w-4" aria-hidden="true" /> Destacado{p.status !== 'PUBLISHED' && ' (no se ve mientras esté inactivo)'}
              </p>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-surface p-2"><dt className="text-xs text-muted">Precio</dt><dd className="font-semibold text-ink">{p.hasVariants && 'desde '}{formatUSD(p.priceUSD)}{tasaVES > 0 && <span className="block text-xs font-normal text-muted">{formatVES(p.priceUSD * tasaVES)}</span>}</dd></div>
            <div className="rounded-lg bg-surface p-2"><dt className="text-xs text-muted">Stock</dt><dd className="font-semibold text-ink">{p.productType === 'DIGITAL' ? 'Digital' : `${p.stock} u.`}</dd></div>
            <div className="rounded-lg bg-surface p-2"><dt className="text-xs text-muted">Categoría</dt><dd className="text-ink">{p.category?.name ?? '—'}</dd></div>
            <div className="rounded-lg bg-surface p-2"><dt className="text-xs text-muted">Tipo</dt><dd className="flex items-center gap-1 text-ink">{p.productType === 'DIGITAL' ? <><FiZap className="h-4 w-4" aria-hidden="true" />Digital</> : <><FiPackage className="h-4 w-4" aria-hidden="true" />Físico</>}</dd></div>
          </dl>
          {p.description && <p className="line-clamp-6 whitespace-pre-line text-sm text-ink-soft">{p.description}</p>}
        </div>
      </div>
    </Modal>
  );
}

const OPERACIONES: Array<{ value: CampoMasivo; label: string }> = [
  { value: 'status', label: 'Cambiar estado' },
  { value: 'pricePercent', label: 'Subir o bajar el precio en %' },
  { value: 'price', label: 'Poner un precio fijo (USD)' },
  { value: 'stock', label: 'Poner un stock fijo' },
  { value: 'category', label: 'Mover a otra categoría' },
];

export function EdicionMasiva({ cantidad, digitales, campoInicial, valorInicial, categorias, onClose, onAplicar }: {
  cantidad: number; digitales: number; campoInicial: CampoMasivo; valorInicial: string; categorias: Categoria[];
  onClose: () => void; onAplicar: (campo: CampoMasivo, valor: string) => Promise<boolean>;
}) {
  const [campo, setCampo] = useState<CampoMasivo>(campoInicial);
  const [valor, setValor] = useState(valorInicial);
  const [enviando, setEnviando] = useState(false);
  const esPrecio = campo === 'price' || campo === 'pricePercent';
  const invalido = campo !== 'status' && !valor.trim();
  return (
    <Modal titulo={`Cambiar ${cantidad} producto${cantidad === 1 ? '' : 's'}`} onClose={onClose} pie={
      <>
        <button type="button" onClick={onClose} className={adminSecondaryButton}>Cancelar</button>
        <button type="button" disabled={invalido || enviando} onClick={async () => { setEnviando(true); const ok = await onAplicar(campo, valor || 'PUBLISHED'); setEnviando(false); if (ok) onClose(); }} className={adminPrimaryButton}>
          {enviando ? 'Aplicando…' : `Aplicar a ${cantidad}`}
        </button>
      </>
    }>
      <div className="space-y-4">
        <div>
          <label htmlFor="masivo-op" className={adminLabel}>Qué cambiar</label>
          <select id="masivo-op" className={adminInput()} value={campo} onChange={(e) => { setCampo(e.target.value as CampoMasivo); setValor(e.target.value === 'status' ? 'PUBLISHED' : ''); }}>
            {OPERACIONES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {campo === 'status' && (
          <div>
            <label htmlFor="masivo-estado" className={adminLabel}>Nuevo estado</label>
            <select id="masivo-estado" className={adminInput()} value={valor} onChange={(e) => setValor(e.target.value)}>
              <option value="PUBLISHED">Activo (se ve en la tienda)</option>
              <option value="DRAFT">Borrador (no se ve)</option>
              <option value="ARCHIVED">Archivado</option>
            </select>
          </div>
        )}
        {campo === 'category' && (
          <div>
            <label htmlFor="masivo-cat" className={adminLabel}>Categoría</label>
            <select id="masivo-cat" className={adminInput()} value={valor} onChange={(e) => setValor(e.target.value)}>
              <option value="">Elige una categoría</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        {(campo === 'price' || campo === 'pricePercent' || campo === 'stock') && (
          <div>
            <label htmlFor="masivo-valor" className={adminLabel}>{campo === 'pricePercent' ? 'Porcentaje' : campo === 'price' ? 'Precio en USD' : 'Unidades'}</label>
            <input id="masivo-valor" inputMode={campo === 'stock' ? 'numeric' : 'decimal'} className={adminInput()} value={valor}
              onChange={(e) => setValor(e.target.value.replace(campo === 'pricePercent' ? /[^0-9.,-]/g : campo === 'stock' ? /\D/g : /[^0-9.,]/g, ''))}
              placeholder={campo === 'pricePercent' ? '10 para +10 %, -5 para -5 %' : campo === 'price' ? '0,00' : '0'} />
            {campo === 'pricePercent' && <p className={adminHint}>Positivo sube el precio; negativo lo baja.</p>}
          </div>
        )}
        {esPrecio && digitales > 0 && (
          <p className={adminNotice('warning')}>{digitales} {digitales === 1 ? 'digital no cambia' : 'digitales no cambian'} de precio: su precio sale de sus montos (edítalos en el producto).</p>
        )}
      </div>
    </Modal>
  );
}

/** CSV con comillas: "a, b" es una sola celda y "" es una comilla (antes se partía en cada coma) */
export function leerCSV(texto: string): Record<string, string>[] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = '';
  let comillas = false;
  const limpio = texto.replace(/^﻿/, '');
  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i];
    if (comillas) {
      if (ch === '"' && limpio[i + 1] === '"') { celda += '"'; i++; }
      else if (ch === '"') comillas = false;
      else celda += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === ',') { fila.push(celda.trim()); celda = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && limpio[i + 1] === '\n') i++;
      fila.push(celda.trim()); celda = '';
      if (fila.some((c) => c !== '')) filas.push(fila);
      fila = [];
    } else celda += ch;
  }
  fila.push(celda.trim());
  if (fila.some((c) => c !== '')) filas.push(fila);
  if (filas.length < 2) return [];
  const [cabecera, ...resto] = filas;
  return resto.map((f) => Object.fromEntries(cabecera.map((h, i) => [h, f[i] ?? ''])));
}

export function CargaMasiva({ onClose, onCargada }: { onClose: () => void; onCargada: () => void }) {
  const [filas, setFilas] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; message: string; details?: string } | null>(null);

  const plantilla = async () => {
    const r = await fetch('/api/products/bulk/template');
    if (!r.ok) { setError('No se pudo descargar la plantilla'); return; }
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_productos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const procesar = async () => {
    setEnviando(true);
    try {
      const r = await fetch('/api/products/bulk/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csvData: filas }) });
      const data = await r.json().catch(() => ({}));
      // Antes un error del servidor dejaba el modal igual, sin decir nada
      setResultado({ ok: r.ok && !data.error, message: data.message || data.error || (r.ok ? 'Carga lista' : 'No se pudo cargar'), details: data.details });
      if (r.ok) onCargada();
    } catch {
      setResultado({ ok: false, message: 'Error de conexión' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Carga masiva" onClose={onClose} ancho="max-w-2xl" pie={resultado ? (
      <button type="button" onClick={onClose} className={adminPrimaryButton}>Cerrar</button>
    ) : filas.length > 0 ? (
      <>
        <button type="button" onClick={() => setFilas([])} className={adminSecondaryButton}>Descartar</button>
        <button type="button" onClick={procesar} disabled={enviando} className={adminPrimaryButton}>{enviando ? 'Procesando…' : `Cargar ${filas.length} productos`}</button>
      </>
    ) : undefined}>
      {resultado ? (
        <div className={`flex items-start gap-3 ${adminNotice(resultado.ok ? 'success' : 'danger')}`}>
          {resultado.ok ? <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
          <div><p className="font-semibold">{resultado.message}</p>{resultado.details && <p className="mt-1 whitespace-pre-line text-sm">{resultado.details}</p>}</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={adminNotice('brand')}>
            <ul className="list-disc space-y-1 pl-5">
              <li>Usa la plantilla CSV (se abre con Excel).</li>
              <li>Las imágenes van como enlaces públicos o rutas que ya estén en el servidor.</li>
              <li>El SKU no se puede repetir.</li>
            </ul>
            <button type="button" onClick={plantilla} className={`${adminSecondaryButton} mt-3`}><FiDownload className="h-4 w-4" aria-hidden="true" /> Descargar plantilla</button>
          </div>
          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-6 text-center hover:border-brand-500">
            <FiUpload className="h-8 w-8 text-subtle" aria-hidden="true" />
            <span className="text-sm font-semibold text-ink">Elegir archivo CSV</span>
            <span className="text-xs text-muted">Solo archivos .csv</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              file.text().then((t) => {
                const datos = leerCSV(t);
                setError(datos.length === 0 ? 'El archivo no tiene filas de productos' : '');
                setFilas(datos);
              });
            }} />
          </label>
          {error && <p className={adminError}>{error}</p>}
          {filas.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Vista previa ({filas.length} productos)</p>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-xs">
                  <thead><tr className="bg-surface">{Object.keys(filas[0]).slice(0, 5).map((k) => <th key={k} className="px-2 py-1.5 text-left font-semibold text-muted">{k}</th>)}</tr></thead>
                  <tbody>
                    {filas.slice(0, 5).map((f, i) => <tr key={i} className="border-t border-line">{Object.values(f).slice(0, 5).map((v, j) => <td key={j} className="max-w-40 truncate px-2 py-1.5 text-ink">{v}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
              {filas.length > 5 && <p className="mt-1 text-xs text-muted">… y {filas.length - 5} más</p>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
