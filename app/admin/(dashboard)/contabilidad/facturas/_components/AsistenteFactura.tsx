'use client';

// C-229: "Nueva factura de talonario" (docs/plan/CONTABILIDAD.md §6), la maqueta B que eligió el equipo el 14/11.
// Tres pasos cortos y "Revisar y emitir" con la factura tal como se escribe (PLAN.md §1.9): en la computadora, la réplica
// con cada casilla numerada; en el teléfono, casilla por casilla. La web no emite la factura: el equipo la escribe en el
// papel y aquí la registra. Los montos, el número y el control los calcula el servidor (/preparar y, al registrar, otra vez).

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Ayuda from '@/components/admin/Ayuda';
import Opcion, { OpcionRadio } from '@/components/admin/Opcion';
import Pasos, { type Paso } from '@/components/admin/Pasos';
import CasillaPorCasilla from '@/components/admin/contabilidad/CasillaPorCasilla';
import ReplicaTalonario from '@/components/admin/contabilidad/ReplicaTalonario';
import { datosReplica } from '@/components/admin/contabilidad/datos';
import { imprimirFactura } from '@/components/admin/contabilidad/imprimir';
import {
  IconoAdvertencia, IconoCheck, IconoClientes, IconoDocumento, IconoEditar, IconoEliminar, IconoFlechaDerecha, IconoFlechaIzquierda,
  IconoImpresora, IconoLista, IconoMas, IconoOrdenes, IconoTienda, IconoVer,
} from '@/components/iconos';
import {
  adminCard, adminError, adminHint, adminInput, adminLabel, adminNotice, adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';
import type { CompraSinFactura, Borrador } from '@/lib/contabilidad/servidor';
import { normalizarDocumento, tipoComprador } from '@/lib/contabilidad/montos';
import type { TalonarioDTO } from '@/lib/dto/contabilidad';
import { formatUSD, formatVES } from '@/lib/currency';
import { precioValido } from '@/lib/pricing';

interface Manual { cantidad: string; descripcion: string; exento: boolean; precio: string }
interface Comprador { nombre: string; documento: string; domicilio: string; telefono: string }

const PASOS = [
  { titulo: 'De dónde sale', icono: IconoOrdenes },
  { titulo: 'A nombre de quién', icono: IconoClientes },
  { titulo: 'Qué se vendió', icono: IconoLista },
  { titulo: 'Revisar y emitir', icono: IconoDocumento },
];

const fechaCorta = (iso: string | null) => (iso ? new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit' }).format(new Date(iso)) : '');
const vacio: Comprador = { nombre: '', documento: '', domicilio: '', telefono: '' };
const renglonVacio: Manual = { cantidad: '1', descripcion: '', exento: false, precio: '' };

export default function AsistenteFactura({ talonario, compras, inicial, tasaHoy, alicuota, hoy }: {
  talonario: TalonarioDTO | null;
  /** Lo cobrado este mes que no tiene factura, por compra */
  compras: CompraSinFactura[];
  /** Si se llegó desde una orden (Órdenes → "Facturar en el talonario") */
  inicial: { ordenIds: string[]; ordenes: string[] } | null;
  tasaHoy: number | null;
  alicuota: number;
  hoy: string;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [alcanzado, setAlcanzado] = useState(0);
  const [origen, setOrigen] = useState<'ORDEN' | 'TIENDA'>(inicial || compras.length ? 'ORDEN' : 'TIENDA');
  const [ordenIds, setOrdenIds] = useState<string[]>(inicial?.ordenIds ?? []);
  const [condicion, setCondicion] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [fecha, setFecha] = useState(hoy);
  const [comprador, setComprador] = useState<Comprador>(vacio);
  const [manuales, setManuales] = useState<Manual[]>([{ ...renglonVacio }]);
  const [tasa, setTasa] = useState(tasaHoy ? String(tasaHoy).replace('.', ',') : '');
  const [descripciones, setDescripciones] = useState<string[] | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emitiendo, setEmitiendo] = useState(false);
  const [verCompleta, setVerCompleta] = useState(false);

  // Las compras para elegir: las del mes y, si se llegó desde una orden de otro mes, esa también
  const opciones = useMemo(() => {
    if (!inicial || compras.some((c) => c.ordenIds.join() === inicial.ordenIds.join())) return compras;
    return [{ ordenIds: inicial.ordenIds, ordenes: inicial.ordenes, cliente: 'La orden que abriste', documento: '', totalUSD: 0, totalBs: 0, pagadaEl: null, metodo: null, productos: 0, digital: false }, ...compras];
  }, [compras, inicial]);

  const tasaNumero = precioValido(tasa);
  const filas = manuales.map((m) => ({
    cantidad: Number.parseInt(m.cantidad, 10),
    descripcion: m.descripcion.trim(),
    exento: m.exento,
    precioUSD: precioValido(m.precio),
  }));
  const manualesBien = filas.length > 0 && filas.every((f) => f.cantidad >= 1 && f.descripcion.length >= 2 && f.precioUSD !== null && f.precioUSD > 0);
  const documento = normalizarDocumento(comprador.documento);
  const empresa = documento ? tipoComprador(documento) === 'EMPRESA' : false;

  const problemas = [
    origen === 'ORDEN' && !ordenIds.length ? 'Elige la compra que vas a facturar.' : !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoy ? 'La fecha de emisión no puede ser de un día que no ha llegado.' : null,
    comprador.nombre.trim().length < 2 ? 'Escribe el nombre o la razón social.' : !documento ? 'Escribe el RIF o la cédula: una letra (V, E, J, G o P) y sus números.' : empresa && comprador.domicilio.trim().length < 10 ? 'Una empresa lleva su domicilio fiscal.' : null,
    origen === 'TIENDA' && (!manualesBien || !(tasaNumero && tasaNumero > 0)) ? 'Completa cada renglón (cantidad, descripción y precio) y la tasa BCV.' : null,
  ];
  const listoHasta = (i: number) => problemas.slice(0, i).every((p) => p === null);

  const pedido = (conNumero?: number) => {
    const base = { condicionPago: condicion, fecha, ...(conNumero ? { numeroEsperado: conNumero } : {}) };
    const c = { nombre: comprador.nombre.trim(), documento: comprador.documento.trim(), domicilio: comprador.domicilio.trim(), telefono: comprador.telefono.trim() };
    return origen === 'ORDEN'
      ? { origen, ordenIds, ...(descripciones ? { descripciones } : {}), ...(comprador.nombre || comprador.documento ? { comprador: c } : {}), ...base }
      : { origen, renglones: filas.map((f) => ({ ...f, precioUSD: f.precioUSD ?? 0 })), tasa: tasaNumero ?? 0, comprador: c, ...base };
  };

  /** Lo pide al servidor: los renglones, los totales, el número que toca y lo que falta */
  const preparar = async (cuerpo: object): Promise<Borrador | null> => {
    setCargando(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/contabilidad/facturas/preparar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setError(d?.error ?? 'No se pudo preparar la factura.');
        return null;
      }
      setBorrador(d.borrador);
      return d.borrador as Borrador;
    } catch {
      setError('Sin conexión. Intenta de nuevo.');
      return null;
    } finally {
      setCargando(false);
    }
  };

  const ir = async (i: number) => {
    // Al dejar el paso 1 con una compra de la web: sus datos llenan el comprador y los renglones
    if (paso === 0 && i > 0 && origen === 'ORDEN') {
      const b = await preparar({ origen, ordenIds, condicionPago: condicion, fecha });
      if (!b) return;
      if (!comprador.nombre && !comprador.documento && b.compradorDeLaOrden) {
        const o = b.compradorDeLaOrden;
        setComprador({ nombre: o.nombre, documento: o.documento, domicilio: o.domicilio, telefono: o.telefono });
      }
      if (!descripciones || descripciones.length !== b.renglones.length) setDescripciones(b.renglones.map((r) => r.descripcion));
    }
    if (i === 3 && !(await preparar(pedido()))) return;
    setPaso(i);
    setAlcanzado((a) => Math.max(a, i));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const registrar = async () => {
    if (!borrador?.numero) return;
    setEmitiendo(true);
    try {
      const r = await fetch('/api/admin/contabilidad/facturas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido(borrador.numero)) });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        toast.error(d?.error ?? 'No se pudo registrar la factura.');
        // Otro registró ese número mientras tanto: se vuelve a preparar con el que toca ahora
        if (r.status === 409) await preparar(pedido());
        return;
      }
      toast.success(`Factura ${d.factura.etiqueta} registrada`);
      router.push(`/admin/contabilidad/facturas/${d.factura.id}`);
      router.refresh();
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setEmitiendo(false);
    }
  };

  const compra = opciones.find((c) => c.ordenIds.join() === ordenIds.join());
  const pasos: Paso[] = PASOS.map((p, i) => ({
    titulo: p.titulo,
    icono: p.icono,
    hecho: i < 3 && i < alcanzado && problemas[i] === null,
    disponible: listoHasta(i),
    resumen: i === 0 ? (origen === 'TIENDA' ? 'Venta en la tienda' : compra ? compra.ordenes.join(' y ') : 'Una compra de la web')
      : i === 1 ? (comprador.nombre.trim() || 'Nombre, RIF o cédula')
        : i === 2 ? (borrador && origen === 'ORDEN' ? `${borrador.renglones.length} renglones` : origen === 'TIENDA' ? `${manuales.length} renglones` : 'Los renglones')
          : borrador?.numeroTexto ? `La ${borrador.numeroTexto}` : 'Cómo se escribe',
  }));

  const replica = borrador && talonario && borrador.numeroTexto && borrador.numeroControl
    ? datosReplica(borrador.talonario ?? talonario, {
        numeroTexto: borrador.numeroTexto,
        numeroControl: borrador.numeroControl,
        fecha: borrador.fecha,
        comprador: borrador.comprador,
        condicionPago: borrador.condicionPago,
        renglones: borrador.renglones,
        totales: borrador.totales,
        alicuota: borrador.alicuota,
      })
    : null;

  const botonesPie = (siguiente: number, texto: string) => (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
      {paso > 0 ? (
        <button type="button" onClick={() => void ir(paso - 1)} className={adminSecondaryButton}>
          <IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /> Atrás
        </button>
      ) : <span />}
      <button type="button" onClick={() => void ir(siguiente)} disabled={!listoHasta(siguiente) || cargando} className={adminPrimaryButton}>
        {cargando ? 'Preparando…' : texto} <IconoFlechaDerecha className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );

  if (!talonario) {
    return (
      <div className={adminNotice('warning')}>
        <IconoAdvertencia aria-hidden="true" />
        <p className="mt-2 font-semibold">No hay un talonario con facturas por usar.</p>
        <p className="mt-1">El dueño lo carga en Contabilidad → Facturas → &ldquo;Cargar el talonario&rdquo;. Después vuelve aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Pasos pasos={pasos} actual={paso} onIr={(i) => void ir(i)} etiqueta="Pasos de la factura" />
      {error && <p role="alert" className={adminError}>{error}</p>}

      {paso === 0 && (
        <section className={`${adminCard} max-w-3xl`} aria-labelledby="paso-origen">
          <h2 id="paso-origen" className="text-lg font-semibold text-ink">De dónde sale</h2>
          <p className="mt-1 text-sm text-muted">Una compra de la web, o una venta en la tienda sin orden.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Opcion elegida={origen === 'ORDEN'} aria-pressed={origen === 'ORDEN'} onClick={() => setOrigen('ORDEN')}
              icono={IconoOrdenes} titulo="Una compra de la web" detalle="Los montos salen de la orden" />
            <Opcion elegida={origen === 'TIENDA'} aria-pressed={origen === 'TIENDA'} onClick={() => { setOrigen('TIENDA'); setOrdenIds([]); }}
              icono={IconoTienda} titulo="Una venta en la tienda" detalle="Escribes los renglones" />
          </div>

          {origen === 'ORDEN' && (
            <fieldset className="mt-5">
              <legend className={adminLabel}>La compra</legend>
              {opciones.length === 0 ? (
                <p className="text-sm text-muted">No hay compras cobradas sin factura este mes. Para una de otro mes, ábrela en Órdenes y toca &ldquo;Facturar en el talonario&rdquo;.</p>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {opciones.map((c) => {
                    const elegida = c.ordenIds.join() === ordenIds.join();
                    return (
                      <li key={c.ordenIds.join()}>
                        <OpcionRadio
                          name="compra"
                          elegida={elegida}
                          onElegir={() => { setOrdenIds(c.ordenIds); setDescripciones(null); setComprador(vacio); }}
                          titulo={<span className="block truncate">{c.ordenes.join(' y ')} · {c.cliente}</span>}
                          detalle={<>
                            {c.pagadaEl ? `Pagada el ${fechaCorta(c.pagadaEl)}` : 'Orden elegida'}
                            {c.productos ? ` · ${c.productos} ${c.productos === 1 ? 'producto' : 'productos'}` : ''}
                            {c.digital ? ' · sin IVA' : ''}
                          </>}
                          extra={c.totalUSD > 0 ? <span className="shrink-0 text-right text-sm font-semibold tabular-nums">{formatUSD(c.totalUSD)}</span> : undefined}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="factura-fecha" className={adminLabel}>Fecha de emisión</label>
              <input id="factura-fecha" type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} className={`${adminInput()} sm:max-w-48`} />
              <p className={adminHint}>La que escribes en la factura. Hoy, salvo que la escribas otro día.</p>
            </div>
            <div>
              <span className={adminLabel}>Condiciones de pago</span>
              <div className="flex gap-2" role="radiogroup" aria-label="Condiciones de pago">
                {(['CONTADO', 'CREDITO'] as const).map((c) => (
                  <Opcion key={c} tamano="chica" role="radio" aria-checked={condicion === c} elegida={condicion === c} onClick={() => setCondicion(c)}
                    titulo={c === 'CONTADO' ? 'Contado' : 'Crédito'} className="flex-1" />
                ))}
              </div>
            </div>
          </div>
          {problemas[0] && <p className={`${adminHint} mt-3`}>{problemas[0]}</p>}
          {botonesPie(1, 'Siguiente: a nombre de quién')}
        </section>
      )}

      {paso === 1 && (
        <section className={`${adminCard} max-w-3xl`} aria-labelledby="paso-comprador">
          <h2 id="paso-comprador" className="text-lg font-semibold text-ink">A nombre de quién</h2>
          <p className="mt-1 text-sm text-muted">Como lo vas a escribir en la factura.</p>
          {borrador?.compradorDeLaOrden && origen === 'ORDEN' && (
            <p className={`${adminHint} mt-1`}>Viene de la orden. Si lo cambias, queda anotado en la bitácora.</p>
          )}
          <div className="mt-4 grid gap-4">
            <div>
              <label htmlFor="c-nombre" className={adminLabel}>Nombre y apellido o razón social</label>
              <input id="c-nombre" value={comprador.nombre} maxLength={120} onChange={(e) => setComprador({ ...comprador, nombre: e.target.value })} className={`${adminInput()} sm:max-w-md`} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="c-doc" className={adminLabel}>RIF, cédula o pasaporte</label>
              <input id="c-doc" value={comprador.documento} maxLength={14} onChange={(e) => setComprador({ ...comprador, documento: e.target.value })} className={`${adminInput(Boolean(comprador.documento) && !documento)} tabular-nums sm:max-w-56`} placeholder="V-12345678 o J-40590333-3" autoComplete="off" />
              <p className={adminHint}>{documento ? `${empresa ? 'Empresa' : 'Persona'}: ${documento}` : 'Una letra (V, E, J, G o P) y sus números.'}</p>
            </div>
            <div>
              <label htmlFor="c-dom" className={adminLabel}>Domicilio fiscal {empresa ? '' : <span className="font-normal text-muted">(si lo da)</span>}</label>
              <input id="c-dom" value={comprador.domicilio} maxLength={200} onChange={(e) => setComprador({ ...comprador, domicilio: e.target.value })} className={adminInput(empresa && comprador.domicilio.trim().length > 0 && comprador.domicilio.trim().length < 10)} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="c-tel" className={adminLabel}>Teléfono <span className="font-normal text-muted">(si lo da)</span></label>
              <input id="c-tel" value={comprador.telefono} maxLength={30} inputMode="tel" onChange={(e) => setComprador({ ...comprador, telefono: e.target.value })} className={`${adminInput()} tabular-nums sm:max-w-56`} autoComplete="off" />
            </div>
          </div>
          {problemas[1] && <p className={`${adminHint} mt-3`}>{problemas[1]}</p>}
          {botonesPie(2, 'Siguiente: qué se vendió')}
        </section>
      )}

      {paso === 2 && (
        <section className={`${adminCard} ${origen === 'TIENDA' ? '' : 'max-w-3xl'}`} aria-labelledby="paso-renglones">
          <h2 id="paso-renglones" className="text-lg font-semibold text-ink">Qué se vendió</h2>
          {origen === 'ORDEN' && borrador ? (
            <>
              <p className="mt-1 text-sm text-muted">
                Los montos salen de la orden, a su tasa ({formatVES(borrador.tasa).replace('Bs. ', 'Bs ')}). Puedes acortar una descripción o agregarle el serial.
              </p>
              <ul className="mt-4 divide-y divide-line">
                {borrador.renglones.map((r, i) => (
                  <li key={i} className="grid gap-2 py-3 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center">
                    <span className="text-sm font-semibold tabular-nums text-ink">{r.cantidad} ×</span>
                    <input
                      aria-label={`Descripción del renglón ${i + 1}`}
                      value={descripciones?.[i] ?? r.descripcion}
                      maxLength={90}
                      onChange={(e) => setDescripciones((d) => (d ?? borrador.renglones.map((x) => x.descripcion)).map((x, j) => (j === i ? e.target.value : x)))}
                      className={adminInput()}
                    />
                    {(descripciones?.[i] ?? r.descripcion).length > 45 && (
                      <p className={`${adminHint} sm:col-start-2 sm:row-start-2 sm:mt-0`}>Larga para un renglón: en el papel puede ocupar dos.</p>
                    )}
                    <span className="text-right text-sm tabular-nums sm:col-start-3 sm:row-start-1">
                      <span className="block font-semibold text-ink">{formatVES(r.montoBs)}</span>
                      <span className="block text-xs text-muted">{r.exento ? 'exento (E)' : 'sin IVA'}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">El precio de cada producto en dólares, como en la tienda: con el IVA ({alicuota} %) adentro.</p>
              <div className="mt-4 hidden grid-cols-[4.5rem_minmax(0,1fr)_8rem_8rem_2.75rem] gap-2 text-xs font-semibold uppercase tracking-wide text-muted lg:grid">
                <span>Cant.</span><span>Descripción</span><span>(E)</span><span>Precio $</span><span />
              </div>
              <ul className="mt-2 space-y-3 lg:space-y-2">
                {manuales.map((m, i) => (
                  <li key={i} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 rounded-xl border border-line p-3 lg:grid-cols-[4.5rem_minmax(0,1fr)_8rem_8rem_2.75rem] lg:items-center lg:border-0 lg:p-0">
                    <input aria-label={`Cantidad del renglón ${i + 1}`} value={m.cantidad} inputMode="numeric" maxLength={4} onChange={(e) => setManuales(manuales.map((x, j) => (j === i ? { ...x, cantidad: e.target.value.replace(/\D/g, '') } : x)))} className={`${adminInput()} text-center tabular-nums`} />
                    <input aria-label={`Descripción del renglón ${i + 1}`} value={m.descripcion} maxLength={90} placeholder="Control PlayStation 5" onChange={(e) => setManuales(manuales.map((x, j) => (j === i ? { ...x, descripcion: e.target.value } : x)))} className={adminInput()} />
                    <Opcion tamano="chica" aria-pressed={m.exento} elegida={m.exento} onClick={() => setManuales(manuales.map((x, j) => (j === i ? { ...x, exento: !x.exento } : x)))}
                      titulo={m.exento ? '(E) exento' : 'Con IVA'} className="whitespace-nowrap" />
                    <input aria-label={`Precio en dólares del renglón ${i + 1}`} value={m.precio} inputMode="decimal" placeholder="0,00" onChange={(e) => setManuales(manuales.map((x, j) => (j === i ? { ...x, precio: e.target.value } : x)))} className={`${adminInput()} text-right tabular-nums`} />
                    <button type="button" aria-label={`Quitar el renglón ${i + 1}`} disabled={manuales.length === 1} onClick={() => setManuales(manuales.filter((_, j) => j !== i))} className={`${adminSecondaryButton} px-0`}>
                      <IconoEliminar className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setManuales([...manuales, { ...renglonVacio }])} disabled={manuales.length >= 12} className={`${adminSecondaryButton} mt-3`}>
                <IconoMas className="h-4 w-4" aria-hidden="true" /> Agregar renglón
              </button>
              <div className="mt-5">
                <label htmlFor="factura-tasa" className={`${adminLabel} inline-flex items-center gap-1`}>
                  Tasa BCV del día
                  <Ayuda etiqueta="Qué tasa va">La del día de la venta (Ley del IVA, art. 25). Viene la de Configuración: cámbiala si la venta fue otro día.</Ayuda>
                </label>
                <input id="factura-tasa" value={tasa} inputMode="decimal" onChange={(e) => setTasa(e.target.value)} className={`${adminInput(Boolean(tasa) && !tasaNumero)} text-right tabular-nums sm:max-w-40`} />
              </div>
            </>
          )}
          {problemas[2] && <p className={`${adminHint} mt-3`}>{problemas[2]}</p>}
          {botonesPie(3, 'Siguiente: revisar')}
        </section>
      )}

      {paso === 3 && borrador && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
          <div className="space-y-4">
            <section className={adminCard} aria-labelledby="paso-revisar">
              <h2 id="paso-revisar" className="text-lg font-semibold text-ink">Revisar y emitir</h2>
              <p className="mt-1 text-sm text-muted">
                Copia esto en la factura <strong className="tabular-nums text-ink">{borrador.numeroTexto}</strong> del talonario (control <span className="whitespace-nowrap tabular-nums">{borrador.numeroControl}</span>).
              </p>
              <ul className="mt-3 divide-y divide-line text-sm">
                {[
                  { i: 0, icono: IconoOrdenes, titulo: origen === 'TIENDA' ? 'Venta en la tienda' : `Órdenes ${borrador.ordenes.map((o) => o.orderNumber).join(' y ')}`, detalle: `${borrador.condicionPago === 'CREDITO' ? 'Crédito' : 'Contado'} · fecha ${borrador.fecha.split('-').reverse().join('/')}` },
                  { i: 1, icono: IconoClientes, titulo: `${borrador.comprador.nombre} · ${borrador.comprador.documento}`, detalle: [borrador.comprador.domicilio, borrador.comprador.telefono].filter(Boolean).join(' · ') || 'Sin domicilio ni teléfono' },
                  { i: 2, icono: IconoLista, titulo: `${borrador.renglones.length} ${borrador.renglones.length === 1 ? 'renglón' : 'renglones'} · ${formatVES(borrador.totales.totalBs)}`, detalle: `Base ${formatVES(borrador.totales.baseBs)} · IVA ${formatVES(borrador.totales.ivaBs)}${borrador.totales.exentoBs ? ` · exento ${formatVES(borrador.totales.exentoBs)}` : ''}` },
                ].map((r) => (
                  <li key={r.i} className="flex items-start gap-3 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><r.icono className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                      <span className="block font-semibold text-ink">{r.titulo}</span>
                      <span className="block text-xs text-muted">{r.detalle}</span>
                    </span>
                    <button type="button" onClick={() => void ir(r.i)} className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700">Cambiar</button>
                  </li>
                ))}
              </ul>
            </section>

            {borrador.falta.length > 0 && (
              <div className={adminNotice('warning')} role="alert">
                <IconoAdvertencia aria-hidden="true" />
                <p className="mt-2 font-semibold">Falta: {borrador.falta.join(', ').toLowerCase()}.</p>
              </div>
            )}
            {borrador.avisos.map((a) => (
              <div key={a} className={adminNotice('warning')}>
                <IconoAdvertencia aria-hidden="true" />
                <p className="mt-2">{a}</p>
              </div>
            ))}

            <section className={adminCard} aria-labelledby="como-llenarla">
              <h2 id="como-llenarla" className="flex items-center gap-2 text-base font-semibold text-ink"><IconoEditar className="h-4 w-4" aria-hidden="true" /> Cómo llenarla</h2>
              <ol className="mt-3 space-y-2 text-sm">
                {[
                  `La fecha: ${borrador.fecha.split('-').reverse().join(' · ')}.`,
                  'El nombre, el domicilio, el RIF o la cédula y el teléfono, como están.',
                  `Marca "${borrador.condicionPago === 'CREDITO' ? 'Crédito' : 'Contado'}".`,
                  `Los renglones con el precio sin IVA.${borrador.renglones.some((r) => r.exento) ? ' Los exentos llevan (E).' : ''}`,
                  'Tacha los renglones vacíos con una raya.',
                  `Abajo, la base, lo exento, el IVA del ${borrador.alicuota} % y el total.`,
                ].map((t, i) => (
                  <li key={t} className="flex gap-2.5">
                    <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-950 text-xs font-bold text-white">{i + 1}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
              <p className={`${adminHint} mt-3`}>Si te equivocas, no la corrijas: anúlala y usa la siguiente. El original va al cliente; la copia se queda.</p>
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" onClick={() => void registrar()} disabled={emitiendo || borrador.falta.length > 0 || !borrador.numero} className={adminPrimaryButton}>
                  <IconoCheck className="h-4 w-4" aria-hidden="true" />
                  {emitiendo ? 'Registrando…' : `Ya la escribí: registrar la ${borrador.numeroTexto}`}
                </button>
                <button type="button" onClick={imprimirFactura} className={adminSecondaryButton}>
                  <IconoImpresora className="h-4 w-4" aria-hidden="true" /> Imprimir borrador
                </button>
                <Link href="/admin/contabilidad/facturas" className="text-center text-sm font-semibold text-brand-600 hover:text-brand-700">
                  ¿Se dañó el papel? Anúlalo en Facturas
                </Link>
              </div>
            </section>
          </div>

          {replica && (
            <div>
              {/* Teléfono: casilla por casilla (la réplica no se lee a 360 px) */}
              <section className={`${adminCard} lg:hidden`} aria-labelledby="casillas">
                <h2 id="casillas" className="flex items-center gap-2 text-base font-semibold text-ink"><IconoDocumento className="h-4 w-4" aria-hidden="true" /> Casilla por casilla</h2>
                <p className="mt-1 text-sm text-muted">Lo que va en cada casilla de la {borrador.numeroTexto}.</p>
                <CasillaPorCasilla datos={replica} />
                <button type="button" onClick={() => setVerCompleta((v) => !v)} aria-expanded={verCompleta} className={`${adminSecondaryButton} mt-3 w-full`}>
                  <IconoVer className="h-4 w-4" aria-hidden="true" /> {verCompleta ? 'Ocultar la factura completa' : 'Ver la factura completa'}
                </button>
              </section>
              <div className={`factura-imprimible ${verCompleta ? 'mt-4 overflow-x-auto' : 'hidden'} lg:mt-0 lg:block`}>
                <div className="min-w-[40rem]">
                  <ReplicaTalonario datos={replica} marcas />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
