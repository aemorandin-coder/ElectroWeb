'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import Filtros from '@/components/admin/Filtros';
import {
  IconoAbrirAparte, IconoActualizar, IconoAdvertencia, IconoCargando, IconoConfirmado, IconoCuadricula, IconoEditar, IconoImagen,
  IconoInfo, IconoWeb,
} from '@/components/iconos';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { formatUSD } from '@/lib/currency';
import {
  adminBadge, adminCard, adminHint, adminInput, adminNotice, adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';
import { ETIQUETA_FALTA, type Falta } from '@/lib/proveedores/lista-de-control';
import type { FilaBorrador } from '@/lib/proveedores/borradores';

type Filtro = 'todos' | 'listos' | 'faltan' | 'revisar';
const POR_VISTA = 50;
/** La búsqueda en la web admite 6 por minuto por persona: una cada 10 s no choca con el cupo */
const PAUSA_BUSQUEDA_MS = 10_000;
const PUBLICAR_LOTE = 200;
const miles = (n: number) => n.toLocaleString('es-VE');
const esperar = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

/** Lo que conviene buscar en la web: nunca buscado, y sin descripción o con pocas especificaciones */
const paraBuscar = (f: FilaBorrador) => !f.ficha && (f.revision.faltan.includes('descripcion') || f.especificaciones.length < 3);

async function pedirBorradores(proveedorId: string): Promise<{ filas: FilaBorrador[]; total: number }> {
  const r = await fetch(`/api/admin/proveedores/${proveedorId}/borradores`);
  const d = await r.json().catch(() => null);
  if (!r.ok || !Array.isArray(d?.filas)) throw new Error(d?.error || 'No se pudieron cargar los borradores');
  return { filas: d.filas, total: d.total };
}

async function post<T>(proveedorId: string, cuerpo: Record<string, unknown>): Promise<{ ok: true; datos: T } | { ok: false; status: number; error: string; esperar?: number }> {
  const r = await fetch(`/api/admin/proveedores/${proveedorId}/borradores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const d = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, datos: d as T } : { ok: false, status: r.status, error: d.error || 'No se pudo', esperar: typeof d.esperar === 'number' ? d.esperar : undefined };
}

/**
 * C-204: el paso de terminar los borradores del proveedor y publicarlos (lo eligió Andrés el 12/11). Cada borrador dice
 * qué le falta; "Completar con la web" llena lo vacío con la búsqueda de C-155 (la IA propone, el equipo revisa) y
 * "Publicar los listos" publica solo los completos. El servidor revisa cada uno otra vez.
 */
/** C-205: con `enPaso`, va dentro del paso 5 de la Lista del proveedor, que pone el título (sin tarjeta dentro de otra) */
export default function Borradores({ proveedorId, version, enPaso = false }: { proveedorId: string; version: number; enPaso?: boolean }) {
  const { confirm } = useConfirm();
  const [datos, setDatos] = useState<{ para: string; filas: FilaBorrador[]; total: number } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [cuantos, setCuantos] = useState(POR_VISTA);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const detener = useRef(false);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [textos, setTextos] = useState<Record<string, string>>({});

  /** Volver a pedir la lista (el botón, y después de publicar o de un choque con otra persona) */
  const cargar = useCallback(async (id: string) => {
    setCargando(true);
    try {
      setDatos({ para: id, ...(await pedirBorradores(id)) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudieron cargar los borradores');
    } finally {
      setCargando(false);
    }
  }, []);

  // Al elegir el proveedor y después de crear (cambia `version`)
  useEffect(() => {
    if (!proveedorId) return;
    let vigente = true;
    pedirBorradores(proveedorId)
      .then((d) => { if (vigente) setDatos({ para: proveedorId, ...d }); })
      .catch((e: Error) => { if (vigente) toast.error(e.message); });
    return () => { vigente = false; };
  }, [proveedorId, version]);

  // Si se cambia de proveedor a mitad de una tanda, la tanda se corta
  useEffect(() => () => { detener.current = true; }, [proveedorId]);

  const filas = useMemo(() => (datos?.para === proveedorId ? datos.filas : []), [datos, proveedorId]);
  const conteo = useMemo(() => ({
    todos: filas.length,
    listos: filas.filter((f) => f.revision.listo).length,
    faltan: filas.filter((f) => !f.revision.listo).length,
    revisar: filas.filter((f) => f.revision.faltan.includes('ficha-web')).length,
    buscar: filas.filter(paraBuscar).length,
  }), [filas]);
  const visibles = useMemo(() => filas.filter((f) => (
    filtro === 'todos' || (filtro === 'listos' ? f.revision.listo : filtro === 'faltan' ? !f.revision.listo : f.revision.faltan.includes('ficha-web'))
  )), [filas, filtro]);

  const reemplazar = (fila: FilaBorrador) => setDatos((d) => (d ? { ...d, filas: d.filas.map((f) => (f.id === fila.id ? fila : f)) } : d));

  const completar = async () => {
    const cola = filas.filter(paraBuscar);
    if (cola.length === 0) return;
    detener.current = false;
    let hechos = 0, sinDatos = 0;
    const fallos: string[] = [];
    try {
      for (const [i, f] of cola.entries()) {
        if (detener.current) break;
        const inicio = Date.now();
        setTrabajando(`Buscando en la web ${i + 1} de ${cola.length}: ${f.name}`);
        for (let intento = 0; intento < 4 && !detener.current; intento++) {
          const r = await post<{ llenado: string[]; fila: FilaBorrador }>(proveedorId, { accion: 'completar', id: f.id });
          if (r.ok) {
            reemplazar(r.datos.fila);
            if (r.datos.llenado.length > 0) hechos++; else sinDatos++;
            break;
          }
          if (r.status === 429) {
            // El cupo es compartido con la búsqueda del asistente: se espera lo que pida el servidor
            for (let s = Math.max(5, r.esperar ?? 15); s > 0 && !detener.current; s--) {
              setTrabajando(`El cupo de búsquedas pide esperar ${s} s (van ${i} de ${cola.length})`);
              await esperar(1000);
            }
            continue;
          }
          fallos.push(`${f.codigo ?? f.sku}: ${r.error}`);
          break;
        }
        const resto = PAUSA_BUSQUEDA_MS - (Date.now() - inicio);
        if (i < cola.length - 1 && resto > 0 && !detener.current) await esperar(resto);
      }
    } finally {
      setTrabajando(null);
      if (hechos + sinDatos > 0) toast.success(`${miles(hechos)} con datos de la web para revisar${sinDatos > 0 ? `; en ${miles(sinDatos)} la web no trajo nada` : ''}.`, { duration: 8000 });
      if (fallos.length > 0) toast.error(`${miles(fallos.length)} no se completaron: ${fallos.slice(0, 3).join(' · ')}`, { duration: 10000 });
    }
  };

  const revisado = async (f: FilaBorrador) => {
    const texto = textos[f.id];
    const r = await post<{ fila: FilaBorrador }>(proveedorId, { accion: 'revisado', id: f.id, desde: f.updatedAt, ...(texto !== undefined && texto !== f.descripcion ? { descripcion: texto } : {}) });
    if (!r.ok) { toast.error(r.error); if (r.status === 409) void cargar(proveedorId); return; }
    reemplazar(r.datos.fila);
    setAbiertos((s) => { const n = new Set(s); n.delete(f.id); return n; });
    setTextos((t) => { const n = { ...t }; delete n[f.id]; return n; });
  };

  const publicar = async () => {
    const ids = filas.filter((f) => f.revision.listo).map((f) => f.id);
    if (ids.length === 0) return;
    const ok = await confirm({
      title: `Publicar ${miles(ids.length)} ${ids.length === 1 ? 'producto' : 'productos'}`,
      message: 'Quedan a la venta al instante, con su precio y su existencia. Si este proveedor despacha desde otra ciudad (como la ferretería), espera a que la tienda calcule el envío desde allá.',
      confirmText: 'Publicar', cancelText: 'Cancelar', type: 'warning',
    });
    if (!ok) return;
    setTrabajando(`Publicando ${miles(ids.length)}…`);
    let publicados = 0;
    const noListos: Array<{ name: string; faltan: string[] }> = [];
    try {
      for (let i = 0; i < ids.length; i += PUBLICAR_LOTE) {
        const r = await post<{ publicados: number; noListos: Array<{ name: string; faltan: string[] }> }>(proveedorId, { accion: 'publicar', ids: ids.slice(i, i + PUBLICAR_LOTE) });
        if (!r.ok) throw new Error(r.error);
        publicados += r.datos.publicados;
        noListos.push(...r.datos.noListos);
      }
      toast.success(`${miles(publicados)} ${publicados === 1 ? 'publicado' : 'publicados'}.`);
      if (noListos.length > 0) toast.error(`${miles(noListos.length)} no estaban listos: ${noListos.slice(0, 3).map((x) => x.name).join(', ')}`, { duration: 10000 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo publicar');
    } finally {
      setTrabajando(null);
      void cargar(proveedorId);
    }
  };

  if (!proveedorId) return null;

  return (
    <section className={enPaso ? 'space-y-4' : `${adminCard} space-y-4`} aria-labelledby={enPaso ? undefined : 't-borr'} aria-label={enPaso ? 'Borradores' : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {enPaso
          ? <p className="text-sm text-ink-soft">Foto, descripción, peso y medidas, marca o modelo, y el nombre escrito normal.</p>
          : <h2 id="t-borr" className="text-base font-bold text-ink">Terminar los borradores y publicar</h2>}
        <button type="button" onClick={() => void cargar(proveedorId)} disabled={cargando || Boolean(trabajando)} className={adminSecondaryButton}>
          <IconoActualizar className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" /> Actualizar
        </button>
      </div>
      {!enPaso && (
        <p className={adminHint}>
          Los borradores de este proveedor y lo que le falta a cada uno: foto, descripción, peso y medidas, marca o modelo, y el nombre escrito normal. &quot;Completar con la web&quot; llena lo vacío (lo redacta la IA con lo que encuentra: revísalo antes de publicar). &quot;Publicar los listos&quot; publica solo los completos.
        </p>
      )}

      {datos?.para !== proveedorId ? (
        <p className="flex items-center gap-2 text-sm text-muted"><IconoCargando className="h-4 w-4 animate-spin" aria-hidden="true" /> Cargando los borradores…</p>
      ) : filas.length === 0 ? (
        <p className={adminNotice('neutral')}>Este proveedor no tiene borradores. Los que crees en el paso anterior aparecen aquí.</p>
      ) : (
        <>
          {/* C-205: los filtros con ícono y subtítulo (PLAN.md §1.7) */}
          <Filtros<Filtro>
            etiqueta="Qué borradores ver"
            valor={filtro}
            onCambiar={(v) => { setFiltro(v); setCuantos(POR_VISTA); }}
            filtros={[
              { valor: 'todos', etiqueta: 'Todos', ayuda: 'Los de este proveedor', Icono: IconoCuadricula, cuenta: conteo.todos },
              { valor: 'listos', etiqueta: 'Listos', ayuda: 'Se pueden publicar', Icono: IconoConfirmado, cuenta: conteo.listos },
              { valor: 'faltan', etiqueta: 'Les falta algo', ayuda: 'Foto, descripción, peso…', Icono: IconoAdvertencia, cuenta: conteo.faltan, tono: 'aviso' },
              { valor: 'revisar', etiqueta: 'Por revisar', ayuda: 'Lo completó la web', Icono: IconoEditar, cuenta: conteo.revisar, tono: 'aviso' },
            ]}
          />
          {datos.total > filas.length && <p className={adminHint}>Se muestran los {miles(filas.length)} más nuevos de {miles(datos.total)}.</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void completar()} disabled={Boolean(trabajando) || conteo.buscar === 0} className={adminSecondaryButton}>
              <IconoWeb className="h-4 w-4" aria-hidden="true" /> Completar con la web ({miles(conteo.buscar)})
            </button>
            <button type="button" onClick={() => void publicar()} disabled={Boolean(trabajando) || conteo.listos === 0} className={adminPrimaryButton}>
              Publicar los {miles(conteo.listos)} listos
            </button>
            {trabajando && (
              <button type="button" onClick={() => { detener.current = true; }} className="min-h-11 px-2 text-sm font-semibold text-brand-600 hover:underline">Detener</button>
            )}
          </div>
          {trabajando && <p className="flex items-center gap-2 text-sm font-semibold text-brand-700" role="status"><IconoCargando className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> <span className="min-w-0 break-words">{trabajando}</span></p>}
          {conteo.buscar > 0 && !trabajando && (
            <p className={adminHint}>
              Busca uno cada 10 segundos (el cupo de la búsqueda): {conteo.buscar === 1 ? 'tarda' : `los ${miles(conteo.buscar)} tardan`} cerca de {miles(Math.ceil(conteo.buscar / 6))} {Math.ceil(conteo.buscar / 6) === 1 ? 'minuto' : 'minutos'}. Se puede detener y seguir después.
            </p>
          )}

          <ul className="divide-y divide-line rounded-xl border border-line">
            {visibles.slice(0, cuantos).map((f) => (
              <li key={f.id} className="p-3">
                <div className="flex gap-3">
                  <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
                    {f.foto
                      ? <Image src={f.foto} alt="" fill sizes="56px" className="object-contain" />
                      : <span className="flex h-full w-full items-center justify-center text-muted"><IconoImagen className="h-5 w-5" aria-hidden="true" /></span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${f.id}`} className="block break-words text-sm font-semibold text-ink hover:underline">{f.name}</Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {f.codigo && <span className="font-mono">{f.codigo}</span>}
                      {f.codigo && ' · '}{formatUSD(f.precio)} · existencia {miles(f.existencia)}{f.modelo ? ` · modelo ${f.modelo}` : ''}{f.fotos > 1 ? ` · ${f.fotos} fotos` : ''}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {f.revision.listo
                        ? <span className={adminBadge('success')}><IconoConfirmado className="h-3.5 w-3.5" aria-hidden="true" /> Listo para publicar</span>
                        : f.revision.faltan.map((x: Falta) => (
                          <span key={x} className={adminBadge('warning')}><IconoAdvertencia className="h-3.5 w-3.5" aria-hidden="true" /> {ETIQUETA_FALTA[x]}</span>
                        ))}
                      {f.revision.sinModelo && <span className={adminBadge('neutral')}>Sin modelo</span>}
                    </div>
                    {f.ficha && f.ficha.revisada && f.ficha.llenado.length === 0 && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-muted"><IconoInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> La web no trajo nada nuevo{f.ficha.avisos[0] ? `: ${f.ficha.avisos[0]}` : '.'}</p>
                    )}
                    {f.ficha && !f.ficha.revisada && (
                      <button type="button" aria-expanded={abiertos.has(f.id)} onClick={() => setAbiertos((s) => { const n = new Set(s); if (n.has(f.id)) n.delete(f.id); else n.add(f.id); return n; })}
                        className="mt-1 min-h-11 text-sm font-semibold text-brand-600 hover:underline">
                        {abiertos.has(f.id) ? 'Ocultar lo que trajo la web' : `Revisar lo que trajo la web (${f.ficha.llenado.join(', ')})`}
                      </button>
                    )}
                  </div>
                </div>

                {f.ficha && !f.ficha.revisada && abiertos.has(f.id) && (
                  <div className="mt-3 space-y-3 rounded-xl bg-surface p-3">
                    <div>
                      <label htmlFor={`desc-${f.id}`} className="mb-1 block text-xs font-semibold text-ink-soft">Descripción {f.ficha.redaccion === 'ia' ? `(la redactó ${f.ficha.modeloIA || 'la IA'} con lo que encontró)` : '(armada con lo que encontró)'}</label>
                      <textarea id={`desc-${f.id}`} rows={6} value={textos[f.id] ?? f.descripcion} onChange={(e) => setTextos((t) => ({ ...t, [f.id]: e.target.value }))} className={`${adminInput()} min-h-32 text-sm`} />
                    </div>
                    {f.especificaciones.length > 0 && (
                      <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                        {f.especificaciones.map(([k, v]) => (
                          <div key={k} className="flex min-w-0 gap-1"><dt className="shrink-0 font-semibold text-ink-soft">{k}:</dt><dd className="min-w-0 break-words text-ink">{v}</dd></div>
                        ))}
                      </dl>
                    )}
                    {f.ficha.fuentes.length > 0 && (
                      <p className="text-xs text-muted">
                        De: {f.ficha.fuentes.map((s, i) => (
                          <span key={s.url}>{i > 0 && ', '}<a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-brand-600 hover:underline">{s.dominio || 'página'}<IconoAbrirAparte className="h-3 w-3" aria-hidden="true" /></a></span>
                        ))}
                      </p>
                    )}
                    {f.ficha.avisos.map((a) => <p key={a} className="flex items-start gap-1 text-xs text-muted"><IconoInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {a}</p>)}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void revisado(f)} disabled={Boolean(trabajando)} className={adminPrimaryButton}>
                        <IconoConfirmado className="h-4 w-4" aria-hidden="true" /> {textos[f.id] !== undefined && textos[f.id] !== f.descripcion ? 'Guardar y dar por revisado' : 'Está bien'}
                      </button>
                      <Link href={`/admin/products/${f.id}`} className={adminSecondaryButton}><IconoEditar className="h-4 w-4" aria-hidden="true" /> Abrir en el asistente</Link>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {visibles.length > cuantos && (
            <div className="flex justify-center">
              <button type="button" onClick={() => setCuantos((n) => n + POR_VISTA)} className={adminSecondaryButton}>Ver {miles(Math.min(POR_VISTA, visibles.length - cuantos))} más</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
