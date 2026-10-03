'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiBox, FiCopy, FiEdit2, FiEye, FiMoreHorizontal, FiStar, FiTrash2, FiUsers, FiZap } from 'react-icons/fi';
import { adminBadge, adminIconButton, type AdminTone } from '@/lib/admin-ui';
import { formatUSD, formatVES } from '@/lib/currency';
import { ETIQUETA_ESTADO, type EstadoProducto, type ProductoLista } from './tipos';

const TONO_ESTADO: Record<EstadoProducto, AdminTone> = { PUBLISHED: 'success', DRAFT: 'neutral', ARCHIVED: 'warning' };

export interface CambiosRapidos {
  priceUSD?: string;
  stock?: string;
}

interface Props {
  productos: ProductoLista[];
  seleccion: Set<string>;
  onSeleccionar: (id: string) => void;
  onSeleccionarTodos: () => void;
  tasaVES: number;
  stockBajo: number;
  edicionRapida: boolean;
  cambios: Record<string, CambiosRapidos>;
  onCambio: (id: string, campo: keyof CambiosRapidos, valor: string) => void;
  onVer: (p: ProductoLista) => void;
  onDuplicar: (p: ProductoLista) => void;
  onEstado: (p: ProductoLista) => void;
  onEliminar: (p: ProductoLista) => void;
  duplicando: string | null;
  /** C-169: id del producto → quiénes lo están editando ahora */
  editando?: Record<string, string[]>;
}

function Miniatura({ p, size }: { p: ProductoLista; size: number }) {
  const [fallo, setFallo] = useState(false);
  const src = p.mainImage || p.images[0];
  return (
    <div className="relative shrink-0 overflow-hidden rounded-lg border border-line bg-white" style={{ width: size, height: size }}>
      {src && !fallo ? (
        <Image src={src} alt="" fill sizes={`${size}px`} className="object-contain p-1" onError={() => setFallo(true)} unoptimized={!src.startsWith('/')} />
      ) : (
        <div className="flex h-full items-center justify-center text-subtle"><FiBox className="h-5 w-5" aria-hidden="true" /></div>
      )}
    </div>
  );
}

/** "Destacado" solo si la tienda lo muestra; si está inactivo, se aclara que no se ve (antes decía "Destacado" igual) */
function Etiquetas({ p, editando }: { p: ProductoLista; editando?: string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {editando && editando.length > 0 && <span className={adminBadge('brand')} title="Tiene este producto abierto para editarlo ahora mismo"><FiUsers className="h-3 w-3" aria-hidden="true" />{editando.join(' y ')} {editando.length === 1 ? 'lo edita' : 'lo editan'}</span>}
      {p.productType === 'DIGITAL' && <span className={adminBadge('brand')}><FiZap className="h-3 w-3" aria-hidden="true" />Digital</span>}
      {p.isFeatured && (p.status === 'PUBLISHED'
        ? <span className={adminBadge('warning')}><FiStar className="h-3 w-3" aria-hidden="true" />Destacado</span>
        : <span className="text-xs text-muted" title="Está marcado como destacado, pero la tienda no lo muestra mientras esté inactivo">Destacado (no se ve: inactivo)</span>)}
    </span>
  );
}

function Precio({ p, tasaVES }: { p: ProductoLista; tasaVES: number }) {
  return (
    <span className="block whitespace-nowrap">
      <span className="font-semibold tabular-nums text-ink">{p.hasVariants && <span className="mr-1 text-xs font-normal text-muted">desde</span>}{formatUSD(p.priceUSD)}</span>
      {p.compareAtPriceUSD && p.compareAtPriceUSD > p.priceUSD && <span className="ml-1 text-xs text-muted line-through">{formatUSD(p.compareAtPriceUSD)}</span>}
      {tasaVES > 0 && <span className="block text-xs tabular-nums text-muted">{formatVES(p.priceUSD * tasaVES)}</span>}
    </span>
  );
}

function Stock({ p, stockBajo }: { p: ProductoLista; stockBajo: number }) {
  if (p.productType === 'DIGITAL') return <span className="text-sm text-muted">Digital</span>;
  const tono = p.stock <= 0 ? 'text-deal font-semibold' : p.stock <= stockBajo ? 'text-warning-strong font-semibold' : 'text-ink';
  return <span className={`text-sm tabular-nums ${tono}`}>{p.stock <= 0 ? 'Sin stock' : `${p.stock} u.`}</span>;
}

function CampoRapido({ p, campo, cambios, onCambio }: { p: ProductoLista; campo: keyof CambiosRapidos; cambios: Record<string, CambiosRapidos>; onCambio: Props['onCambio'] }) {
  const valor = cambios[p.id]?.[campo] ?? String(campo === 'priceUSD' ? p.priceUSD : p.stock);
  const cambiado = cambios[p.id]?.[campo] !== undefined;
  return (
    <input
      aria-label={`${campo === 'priceUSD' ? 'Precio' : 'Stock'} de ${p.name}`}
      inputMode={campo === 'priceUSD' ? 'decimal' : 'numeric'}
      value={valor}
      onChange={(e) => onCambio(p.id, campo, campo === 'priceUSD' ? e.target.value.replace(/[^0-9.,]/g, '') : e.target.value.replace(/\D/g, ''))}
      className={`h-11 w-24 rounded-lg border px-2 text-sm tabular-nums ${cambiado ? 'border-brand-500 bg-brand-50' : 'border-line bg-white'}`}
    />
  );
}

export default function ListaProductos(props: Props) {
  const { productos, seleccion, onSeleccionar, onSeleccionarTodos, tasaVES, stockBajo, edicionRapida, cambios, onCambio, onVer, onDuplicar, onEstado, onEliminar, duplicando, editando } = props;
  const [abierto, setAbierto] = useState<string | null>(null);
  const todos = productos.length > 0 && productos.every((p) => seleccion.has(p.id));
  const algunos = !todos && productos.some((p) => seleccion.has(p.id));

  return (
    <>
      {/* Teléfono y tableta: tarjetas */}
      <ul className="space-y-2 lg:hidden">
        <li className="flex items-center gap-2 px-1">
          <label className="flex min-h-11 items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" className="h-5 w-5" checked={todos} ref={(el) => { if (el) el.indeterminate = algunos; }} onChange={onSeleccionarTodos} />
            Seleccionar {productos.length === 1 ? 'el producto' : `los ${productos.length}`}
          </label>
        </li>
        {productos.map((p) => (
          <li key={p.id} className={`rounded-2xl border bg-white p-3 ${seleccion.has(p.id) ? 'border-brand-500' : 'border-line'}`}>
            <div className="flex gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={seleccion.has(p.id)} onChange={() => onSeleccionar(p.id)} aria-label={`Seleccionar ${p.name}`} />
              <Miniatura p={p} size={64} />
              <div className="min-w-0 flex-1 space-y-1">
                <Link href={`/admin/products/${p.id}`} className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand-600">{p.name}</Link>
                <p className="truncate font-mono text-xs text-muted">{p.sku}{p.category ? ` · ${p.category.name}` : ''}</p>
                <Etiquetas p={p} editando={editando?.[p.id]} />
                <div className="flex flex-wrap items-end justify-between gap-2 pt-1">
                  {edicionRapida && p.productType !== 'DIGITAL' ? <CampoRapido p={p} campo="priceUSD" cambios={cambios} onCambio={onCambio} /> : <Precio p={p} tasaVES={tasaVES} />}
                  {edicionRapida && p.productType !== 'DIGITAL' ? <CampoRapido p={p} campo="stock" cambios={cambios} onCambio={onCambio} /> : <Stock p={p} stockBajo={stockBajo} />}
                  <button type="button" onClick={() => onEstado(p)} className={`${adminBadge(TONO_ESTADO[p.status])} min-h-8`} title="Cambiar estado">{ETIQUETA_ESTADO[p.status]}</button>
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2 border-t border-line pt-2">
              <Link href={`/admin/products/${p.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg text-sm font-semibold text-brand-600 hover:bg-brand-50">
                <FiEdit2 className="h-4 w-4" aria-hidden="true" /> Editar
              </Link>
              <button type="button" onClick={() => onVer(p)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg text-sm font-semibold text-ink-soft hover:bg-surface">
                <FiEye className="h-4 w-4" aria-hidden="true" /> Ver
              </button>
              <button type="button" onClick={() => setAbierto(abierto === p.id ? null : p.id)} aria-expanded={abierto === p.id}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg text-sm font-semibold text-ink-soft hover:bg-surface">
                <FiMoreHorizontal className="h-4 w-4" aria-hidden="true" /> Más
              </button>
            </div>
            {abierto === p.id && (
              <div className="mt-1 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => onDuplicar(p)} disabled={duplicando === p.id} className="min-h-11 rounded-lg border border-line text-sm text-ink hover:bg-surface">{duplicando === p.id ? 'Duplicando…' : 'Duplicar'}</button>
                <button type="button" onClick={() => onEstado(p)} className="min-h-11 rounded-lg border border-line text-sm text-ink hover:bg-surface">{p.status === 'PUBLISHED' ? 'Desactivar' : 'Activar'}</button>
                <button type="button" onClick={() => onEliminar(p)} className="min-h-11 rounded-lg border border-deal/30 text-sm text-deal hover:bg-deal-bg">A la papelera</button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla */}
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-white lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="w-12 px-4 py-3">
                <input type="checkbox" className="h-4 w-4" checked={todos} ref={(el) => { if (el) el.indeterminate = algunos; }} onChange={onSeleccionarTodos} aria-label="Seleccionar todos los productos de la lista" />
              </th>
              <th className="px-3 py-3">Producto</th>
              <th className="px-3 py-3">Categoría</th>
              <th className="px-3 py-3">Precio</th>
              <th className="px-3 py-3">Stock</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className={`border-t border-line ${seleccion.has(p.id) ? 'bg-brand-50' : 'hover:bg-surface'}`}>
                <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4" checked={seleccion.has(p.id)} onChange={() => onSeleccionar(p.id)} aria-label={`Seleccionar ${p.name}`} /></td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Miniatura p={p} size={44} />
                    <div className="min-w-0">
                      <Link href={`/admin/products/${p.id}`} className="line-clamp-1 max-w-80 font-medium text-ink hover:text-brand-600" title={p.name}>{p.name}</Link>
                      <p className="font-mono text-xs text-muted">{p.sku}</p>
                      <Etiquetas p={p} editando={editando?.[p.id]} />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-ink-soft">{p.category?.name ?? '—'}</td>
                <td className="px-3 py-3">
                  {edicionRapida && p.productType !== 'DIGITAL' ? <CampoRapido p={p} campo="priceUSD" cambios={cambios} onCambio={onCambio} /> : <Precio p={p} tasaVES={tasaVES} />}
                </td>
                <td className="px-3 py-3">
                  {edicionRapida && p.productType !== 'DIGITAL' ? <CampoRapido p={p} campo="stock" cambios={cambios} onCambio={onCambio} /> : <Stock p={p} stockBajo={stockBajo} />}
                </td>
                <td className="px-3 py-3">
                  <button type="button" onClick={() => onEstado(p)} className={`${adminBadge(TONO_ESTADO[p.status])} min-h-8`} title={p.status === 'PUBLISHED' ? 'Desactivar' : 'Activar'}>
                    {ETIQUETA_ESTADO[p.status]}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => onVer(p)} className={`${adminIconButton} h-11 w-11`} aria-label={`Vista rápida de ${p.name}`} title="Vista rápida"><FiEye className="h-4 w-4" aria-hidden="true" /></button>
                    <Link href={`/admin/products/${p.id}`} className={`${adminIconButton} h-11 w-11`} aria-label={`Editar ${p.name}`} title="Editar"><FiEdit2 className="h-4 w-4" aria-hidden="true" /></Link>
                    <button type="button" onClick={() => onDuplicar(p)} disabled={duplicando === p.id} className={`${adminIconButton} h-11 w-11`} aria-label={`Duplicar ${p.name}`} title="Duplicar"><FiCopy className="h-4 w-4" aria-hidden="true" /></button>
                    <button type="button" onClick={() => onEliminar(p)} className={`${adminIconButton} h-11 w-11 hover:text-deal`} aria-label={`Mover ${p.name} a la papelera`} title="Mover a la papelera"><FiTrash2 className="h-4 w-4" aria-hidden="true" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
