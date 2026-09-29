'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { FiBox, FiExternalLink, FiStar, FiX, FiZap, FiPackage } from 'react-icons/fi';
import {
  adminBadge, adminHint, adminIconButton, adminInput, adminLabel, adminModalBody, adminModalFooter, adminModalHeader,
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
