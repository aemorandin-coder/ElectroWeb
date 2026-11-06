'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { FiArchive, FiBox, FiChevronDown, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import { adminDangerButton, adminSecondaryButton } from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { parseProductImages } from '@/lib/product-utils';

// C-169: la papelera de productos. Un producto movido aquí desaparece de la tienda pero se puede restaurar durante 30 días;
// pasado ese tiempo, o si el dueño lo pide, se borra para siempre.
// C-187: uno con ventas no se puede borrar de la base (sus órdenes lo usan). Antes "quedaba archivado" y volvía a la lista
// del catálogo: el zombi. Ahora queda eliminado: sale de aquí y de la lista, y se ve solo en "Eliminados", abajo.

const DIAS = 30;
const fecha = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const dia = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long' });

interface ProductoPapelera {
  id: string; name: string; sku: string; images: unknown; mainImage: string | null; deletedAt: string;
  deletedByName: string | null; statusAntesDePapelera: string | null; eliminadoAt: string | null;
  _count?: { orderItems?: number };
}

const ESTADO_ANTES: Record<string, string> = { PUBLISHED: 'estaba activo', DRAFT: 'estaba en borrador', ARCHIVED: 'estaba archivado' };
const ordenes = (n: number) => `${n} ${n === 1 ? 'orden' : 'órdenes'}`;
const ventasDe = (p: ProductoPapelera) => p._count?.orderItems ?? 0;

function Miniatura({ p }: { p: ProductoPapelera }) {
  const src = p.mainImage || parseProductImages(p.images)[0];
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
      {src ? <Image src={src} alt="" fill sizes="56px" className="object-contain p-1" unoptimized={!src.startsWith('/')} /> : <div className="flex h-full items-center justify-center text-subtle"><FiBox className="h-5 w-5" aria-hidden="true" /></div>}
    </div>
  );
}

export default function PapeleraProductos({ puedeBorrarParaSiempre, recargas, eliminados, onCambio }: {
  puedeBorrarParaSiempre: boolean;
  /** Cambia cuando algo se movió a la papelera desde otra parte: vuelve a pedir la lista */
  recargas: number;
  /** C-187: cuántos productos eliminados se conservan por sus ventas */
  eliminados: number;
  /** Se restauró o se borró algo: la lista de productos y el conteo se actualizan */
  onCambio: () => void;
}) {
  const { confirm } = useConfirm();
  const [productos, setProductos] = useState<ProductoPapelera[] | null>(null);
  /** Cuándo se cargó la lista: para decir si ya pasaron los 30 días (sin leer la hora en cada render) */
  const [cargadaEn, setCargadaEn] = useState(0);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [vaciando, setVaciando] = useState(false);
  const [propias, setPropias] = useState(0);
  const [verEliminados, setVerEliminados] = useState(false);
  const [listaEliminados, setListaEliminados] = useState<ProductoPapelera[] | null>(null);

  useEffect(() => {
    let vigente = true;
    fetch('/api/products?papelera=true&all=true')
      .then((r) => (r.ok ? r.json() : null))
      .then((lista) => {
        if (!vigente) return;
        setCargadaEn(Date.now());
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

  // Lo eliminado se pide solo al abrir su sección
  useEffect(() => {
    if (!verEliminados) return;
    let vigente = true;
    fetch('/api/products?papelera=eliminados&all=true')
      .then((r) => (r.ok ? r.json() : null))
      .then((lista) => {
        if (!vigente) return;
        setListaEliminados(Array.isArray(lista) ? (lista as ProductoPapelera[]).sort((a, b) => (b.eliminadoAt ?? '').localeCompare(a.eliminadoAt ?? '')) : []);
      })
      .catch(() => { if (vigente) setListaEliminados([]); });
    return () => { vigente = false; };
  }, [verEliminados, recargas, propias]);

  const restaurar = async (p: ProductoPapelera) => {
    setOcupado(p.id);
    try {
      // Lo de la papelera se restaura solo si sigue en la papelera; lo eliminado se recupera aparte (solo el dueño)
      const r = await fetch(`/api/products/${p.id}/restaurar${p.eliminadoAt ? '' : '?desde=papelera'}`, { method: 'POST' });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(data.error || 'No se pudo restaurar'); return; }
      toast.success(p.eliminadoAt ? `"${p.name}" volvió al catálogo como borrador` : `"${p.name}" volvió al catálogo`);
      setPropias((n) => n + 1);
      onCambio();
    } finally {
      setOcupado(null);
    }
  };

  /** Un "Borrar para siempre". Devuelve si se borró o se conservó por sus ventas (null si falló) */
  const borrarUno = async (p: ProductoPapelera): Promise<'borrado' | 'conservado' | null> => {
    const r = await fetch(`/api/products/${p.id}?definitivo=1`, { method: 'DELETE' });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { toast.error(`"${p.name}": ${data.error || 'no se pudo borrar'}`); return null; }
    return data.conservado ? 'conservado' : 'borrado';
  };

  const borrarParaSiempre = async (p: ProductoPapelera) => {
    const ventas = ventasDe(p);
    const ok = await confirm({
      title: 'Borrar para siempre',
      message: ventas > 0
        ? `¿Borrar "${p.name}" para siempre? Tiene ${ordenes(ventas)}, así que no se borra de la base: sale de la papelera, de la lista y de la tienda, y se conserva oculto para que esas órdenes, sus garantías y sus reseñas sigan completas. No vuelve a aparecer como archivado.`
        : `¿Borrar "${p.name}" para siempre? Esto no se puede deshacer: se pierden también sus reseñas, favoritos y códigos sin vender.`,
      confirmText: 'Borrar para siempre',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (!ok) return;
    setOcupado(p.id);
    try {
      const resultado = await borrarUno(p);
      if (!resultado) return;
      toast.success(resultado === 'conservado' ? `"${p.name}" quedó eliminado. Se conserva oculto por ${ventas === 1 ? 'su orden' : `sus ${ordenes(ventas)}`}.` : `"${p.name}" se borró para siempre`);
      setPropias((n) => n + 1);
      onCambio();
    } finally {
      setOcupado(null);
    }
  };

  /** C-187: vaciar la papelera de una vez (solo el dueño), para sacarse de encima varios productos sin ir de uno en uno */
  const vaciar = async () => {
    if (!productos || productos.length === 0) return;
    const conVentas = productos.filter((p) => ventasDe(p) > 0).length;
    const sinVentas = productos.length - conVentas;
    const partes = [
      sinVentas > 0 ? `${sinVentas} ${sinVentas === 1 ? 'se borra' : 'se borran'} para siempre, con sus reseñas, favoritos y códigos sin vender` : '',
      conVentas > 0 ? `${conVentas} ${conVentas === 1 ? 'tiene ventas: se conserva oculto' : 'tienen ventas: se conservan ocultos'} para que sus órdenes sigan completas` : '',
    ].filter(Boolean);
    const ok = await confirm({
      title: `Vaciar la papelera (${productos.length})`,
      message: `${partes.join('. ')}. Ninguno vuelve a la lista. Esto no se puede deshacer desde aquí.`,
      confirmText: 'Vaciar la papelera',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (!ok) return;
    setVaciando(true);
    let borrados = 0;
    let conservados = 0;
    try {
      for (const p of productos) {
        const resultado = await borrarUno(p);
        if (resultado === 'borrado') borrados++;
        if (resultado === 'conservado') conservados++;
      }
      const texto = [borrados > 0 ? `${borrados} ${borrados === 1 ? 'borrado' : 'borrados'} para siempre` : '', conservados > 0 ? `${conservados} ${conservados === 1 ? 'eliminado y conservado' : 'eliminados y conservados'} por sus ventas` : ''].filter(Boolean).join(' · ');
      if (texto) toast.success(`Papelera vacía: ${texto}`);
    } finally {
      setVaciando(false);
      setPropias((n) => n + 1);
      onCambio();
    }
  };

  if (productos === null) {
    return <div className="flex justify-center py-12" role="status" aria-label="Cargando la papelera"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-3">
      {productos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
          <FiTrash2 className="mx-auto mb-2 h-6 w-6 text-subtle" aria-hidden="true" />
          <p className="font-semibold text-ink">La papelera está vacía</p>
          <p className="mt-1 text-sm text-muted">Lo que muevas aquí se puede restaurar durante {DIAS} días.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 text-sm text-ink-soft sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1">
              Estos productos no se ven en la tienda. Se pueden restaurar durante {DIAS} días; después se borran solos. Los que tienen ventas no se borran de la base: quedan eliminados y ocultos, con sus órdenes completas.
              {puedeBorrarParaSiempre ? '' : ' Solo el dueño puede borrarlos para siempre antes.'}
            </p>
            {puedeBorrarParaSiempre && productos.length > 1 && (
              <button type="button" onClick={() => void vaciar()} disabled={vaciando || ocupado !== null} className={`${adminDangerButton} shrink-0`}>
                <FiTrash2 className="h-4 w-4" aria-hidden="true" /> {vaciando ? 'Vaciando…' : 'Vaciar la papelera'}
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {productos.map((p) => {
              const vence = new Date(new Date(p.deletedAt).getTime() + DIAS * 24 * 3_600_000);
              const ventas = ventasDe(p);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3">
                  <Miniatura p={p} />
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                    <p className="truncate font-mono text-xs text-muted">{p.sku}</p>
                    <p className="text-xs text-muted">
                      {p.deletedByName ?? 'Alguien del equipo'} lo movió el {fecha.format(new Date(p.deletedAt))}
                      {p.statusAntesDePapelera ? ` (${ESTADO_ANTES[p.statusAntesDePapelera] ?? ''})` : ''} · {vence.getTime() > cargadaEn ? `se borra el ${dia.format(vence)}` : 'se borra en la próxima limpieza'}
                    </p>
                    {ventas > 0 && <p className="text-xs font-medium text-ink-soft">Tiene {ordenes(ventas)}: al borrarlo se conserva oculto, sin volver a la lista.</p>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void restaurar(p)} disabled={ocupado === p.id || vaciando} className={adminSecondaryButton}>
                      <FiRotateCcw className="h-4 w-4" aria-hidden="true" /> Restaurar
                    </button>
                    {puedeBorrarParaSiempre && (
                      <button type="button" onClick={() => void borrarParaSiempre(p)} disabled={ocupado === p.id || vaciando} className={adminDangerButton}>
                        <FiTrash2 className="h-4 w-4" aria-hidden="true" /> Borrar para siempre
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* C-187: lo eliminado que se conserva por sus ventas. Fuera de la vista, pero no escondido: se ve y el dueño lo recupera */}
      {eliminados > 0 && (
        <section className="rounded-2xl border border-line bg-white">
          <button type="button" onClick={() => setVerEliminados((v) => !v)} aria-expanded={verEliminados} aria-controls="productos-eliminados"
            className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-sm font-semibold text-ink">
            <FiArchive className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1">Eliminados que se conservan por sus ventas ({eliminados})</span>
            <FiChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${verEliminados ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {verEliminados && (
            <div id="productos-eliminados" className="space-y-2 border-t border-line p-3">
              <p className="text-xs text-muted">No están en la lista ni en la tienda. Se guardan para que sus órdenes, garantías y reseñas sigan completas. {puedeBorrarParaSiempre ? 'Si vuelves a venderlo, recupéralo: vuelve como borrador.' : 'Solo el dueño puede recuperarlos.'}</p>
              {listaEliminados === null ? (
                <div className="flex justify-center py-6" role="status" aria-label="Cargando los eliminados"><div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
              ) : (
                <ul className="space-y-2">
                  {listaEliminados.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                      <Miniatura p={p} />
                      <div className="min-w-0 flex-1 basis-56">
                        <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                        <p className="truncate font-mono text-xs text-muted">{p.sku}</p>
                        <p className="text-xs text-muted">Eliminado el {p.eliminadoAt ? fecha.format(new Date(p.eliminadoAt)) : '—'} · {ordenes(ventasDe(p))}</p>
                      </div>
                      {puedeBorrarParaSiempre && (
                        <button type="button" onClick={() => void restaurar(p)} disabled={ocupado === p.id} className={adminSecondaryButton}>
                          <FiRotateCcw className="h-4 w-4" aria-hidden="true" /> Recuperar como borrador
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
