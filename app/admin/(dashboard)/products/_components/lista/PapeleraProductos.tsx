'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { FiBox, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import { adminDangerButton, adminSecondaryButton } from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { parseProductImages } from '@/lib/product-utils';

// C-169: la papelera de productos. Un producto movido aquí desaparece de la tienda pero se puede restaurar durante 30 días;
// pasado ese tiempo, o si el dueño lo pide, se borra para siempre.

const DIAS = 30;
const fecha = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const dia = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long' });

interface ProductoPapelera {
  id: string; name: string; sku: string; images: unknown; mainImage: string | null; deletedAt: string;
  deletedByName: string | null; statusAntesDePapelera: string | null;
}

const ESTADO_ANTES: Record<string, string> = { PUBLISHED: 'estaba activo', DRAFT: 'estaba en borrador', ARCHIVED: 'estaba archivado' };

export default function PapeleraProductos({ puedeBorrarParaSiempre, recargas, onCambio }: {
  puedeBorrarParaSiempre: boolean;
  /** Cambia cuando algo se movió a la papelera desde otra parte: vuelve a pedir la lista */
  recargas: number;
  /** Se restauró o se borró algo: la lista de productos y el conteo se actualizan */
  onCambio: () => void;
}) {
  const { confirm } = useConfirm();
  const [productos, setProductos] = useState<ProductoPapelera[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [propias, setPropias] = useState(0);

  useEffect(() => {
    let vigente = true;
    fetch('/api/products?papelera=true&all=true')
      .then((r) => (r.ok ? r.json() : null))
      .then((lista) => {
        if (!vigente) return;
        if (!Array.isArray(lista)) {
          toast.error('No se pudo cargar la papelera');
          setProductos([]);
        } else {
          setProductos((lista as ProductoPapelera[]).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)));
        }
      })
      .catch(() => { if (vigente) setProductos([]); });
    return () => { vigente = false; };
  }, [recargas, propias]);

  const restaurar = async (p: ProductoPapelera) => {
    setOcupado(p.id);
    try {
      const r = await fetch(`/api/products/${p.id}/restaurar`, { method: 'POST' });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(data.error || 'No se pudo restaurar'); return; }
      toast.success(`"${p.name}" volvió al catálogo`);
      setPropias((n) => n + 1);
      onCambio();
    } finally {
      setOcupado(null);
    }
  };

  const borrarParaSiempre = async (p: ProductoPapelera) => {
    const ok = await confirm({
      title: 'Borrar para siempre',
      message: `¿Borrar "${p.name}" para siempre? Esto no se puede deshacer: se pierden también sus reseñas, favoritos y códigos sin vender. Si ya tiene órdenes, no se borra: queda archivado.`,
      confirmText: 'Borrar para siempre',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (!ok) return;
    setOcupado(p.id);
    try {
      const r = await fetch(`/api/products/${p.id}?definitivo=1`, { method: 'DELETE' });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(data.error || 'No se pudo borrar'); return; }
      toast.success(data.message || 'Borrado');
      setPropias((n) => n + 1);
      onCambio();
    } finally {
      setOcupado(null);
    }
  };

  if (productos === null) {
    return <div className="flex justify-center py-12" role="status" aria-label="Cargando la papelera"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>;
  }

  if (productos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
        <FiTrash2 className="mx-auto mb-2 h-6 w-6 text-subtle" aria-hidden="true" />
        <p className="font-semibold text-ink">La papelera está vacía</p>
        <p className="mt-1 text-sm text-muted">Lo que muevas aquí se puede restaurar durante {DIAS} días.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-line bg-surface p-3 text-sm text-ink-soft">
        Estos productos no se ven en la tienda. Se pueden restaurar durante {DIAS} días; después se borran solos.
        {puedeBorrarParaSiempre ? '' : ' Solo el dueño puede borrarlos para siempre antes.'}
      </p>
      <ul className="space-y-2">
        {productos.map((p) => {
          const src = p.mainImage || parseProductImages(p.images)[0];
          const vence = new Date(new Date(p.deletedAt).getTime() + DIAS * 24 * 3_600_000);
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
                {src ? <Image src={src} alt="" fill sizes="56px" className="object-contain p-1" unoptimized={!src.startsWith('/')} /> : <div className="flex h-full items-center justify-center text-subtle"><FiBox className="h-5 w-5" aria-hidden="true" /></div>}
              </div>
              <div className="min-w-0 flex-1 basis-56">
                <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                <p className="truncate font-mono text-xs text-muted">{p.sku}</p>
                <p className="text-xs text-muted">
                  {p.deletedByName ?? 'Alguien del equipo'} lo movió el {fecha.format(new Date(p.deletedAt))}
                  {p.statusAntesDePapelera ? ` (${ESTADO_ANTES[p.statusAntesDePapelera] ?? ''})` : ''} · se borra el {dia.format(vence)}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => void restaurar(p)} disabled={ocupado === p.id} className={adminSecondaryButton}>
                  <FiRotateCcw className="h-4 w-4" aria-hidden="true" /> Restaurar
                </button>
                {puedeBorrarParaSiempre && (
                  <button type="button" onClick={() => void borrarParaSiempre(p)} disabled={ocupado === p.id} className={adminDangerButton}>
                    <FiTrash2 className="h-4 w-4" aria-hidden="true" /> Borrar para siempre
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
