'use client';

// C-229 y G-76: "Nueva factura fiscal" (Talonario físico, Contingencia 00093, Portal SENIAT asistido o Imprenta Digital).

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Ayuda from '@/components/admin/Ayuda';
import CampoUnidad from '@/components/admin/CampoUnidad';
import Opcion, { OpcionRadio } from '@/components/admin/Opcion';
import Pasos, { type Paso } from '@/components/admin/Pasos';
import CasillaPorCasilla from '@/components/admin/contabilidad/CasillaPorCasilla';
import ReplicaTalonario from '@/components/admin/contabilidad/ReplicaTalonario';
import { datosReplica } from '@/components/admin/contabilidad/datos';
import { imprimirFactura } from '@/components/admin/contabilidad/imprimir';
import {
  IconoAdvertencia, IconoCheck, IconoClientes, IconoDocumento, IconoEditar, IconoEliminar, IconoFlechaDerecha,
  IconoFlechaIzquierda, IconoImpresora, IconoLista, IconoMas, IconoNube, IconoOrdenes, IconoTienda, IconoVer,
} from '@/components/iconos';
import {
  adminBadge, adminCard, adminError, adminHint, adminInput, adminLabel, adminNotice, adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';
import { CAUSALES_CONTINGENCIA } from '@/lib/contabilidad/esquemas';
import { formatearHora12, horaActualVe, normalizarDocumento, tipoComprador } from '@/lib/contabilidad/montos';
import type { Borrador, CompraSinFactura } from '@/lib/contabilidad/servidor';
import { formatUSD, formatVES } from '@/lib/currency';
import type { TalonarioDTO } from '@/lib/dto/contabilidad';
import { precioValido } from '@/lib/pricing';
import { subirArchivoContable } from '../../_components/subirArchivo';
import { etiquetaCanal } from '../../_components/tipos';

interface Manual { cantidad: string; descripcion: string; exento: boolean; precio: string }
interface Comprador { nombre: string; documento: string; domicilio: string; telefono: string }

const PASOS = [
  { titulo: 'Canal y origen', icono: IconoOrdenes },
  { titulo: 'A nombre de quién', icono: IconoClientes },
  { titulo: 'Qué se vendió', icono: IconoLista },
  { titulo: 'Revisar y emitir', icono: IconoDocumento },
];

const fechaCorta = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit' }).format(new Date(iso)) : '';
const textoTasa = (n: number) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);
const vacio: Comprador = { nombre: '', documento: '', domicilio: '', telefono: '' };
const renglonVacio: Manual = { cantidad: '1', descripcion: '', exento: false, precio: '' };

const crearLlaveIdempotencia = (): string => crypto.randomUUID();

export default function AsistenteFactura({
  talonario,
  talonarioContingencia = null,
  canalActivo = 'TALONARIO',
  imprentaAmbiente = 'SANDBOX',
  compras,
  inicial,
  tasaHoy,
  alicuota,
  hoy,
}: {
  talonario: TalonarioDTO | null;
  talonarioContingencia?: TalonarioDTO | null;
  canalActivo?: 'TALONARIO' | 'PORTAL_SENIAT' | 'IMPRENTA_DIGITAL';
  imprentaAmbiente?: 'SANDBOX' | 'PRODUCCION';
  compras: CompraSinFactura[];
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
  const [monedaOperacion, setMonedaOperacion] = useState<'VES' | 'USD'>('VES');
  const [fecha, setFecha] = useState(hoy);
  const [horaEmision, setHoraEmision] = useState(() => horaActualVe());
  const [usarContingencia, setUsarContingencia] = useState(false);
  const [contingenciaCausal, setContingenciaCausal] = useState<string>(CAUSALES_CONTINGENCIA[0]);
  const [comprador, setComprador] = useState<Comprador>(vacio);
  const [manuales, setManuales] = useState<Manual[]>([{ ...renglonVacio }]);
  const [tasa, setTasa] = useState(tasaHoy ? String(tasaHoy).replace('.', ',') : '');
  const [descripciones, setDescripciones] = useState<string[] | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);

  // Campos exclusivos para Portal SENIAT asistido
  const [numeroExterno, setNumeroExterno] = useState('');
  const [numeroControlExterno, setNumeroControlExterno] = useState('');
  const [pdfPrivadoRuta, setPdfPrivadoRuta] = useState('');
  const [subiendoPdf, setSubiendoPdf] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emitiendo, setEmitiendo] = useState(false);
  const [verCompleta, setVerCompleta] = useState(false);

  const medioEfectivo: 'TALONARIO' | 'PORTAL_SENIAT' | 'IMPRENTA_DIGITAL' = usarContingencia ? 'TALONARIO' : canalActivo;
  const talonarioEfectivo = usarContingencia ? (talonarioContingencia ?? talonario) : talonario;
  const maxRenglones = medioEfectivo === 'TALONARIO' ? 12 : 60;

  const opciones = useMemo(() => {
    if (!inicial || compras.some((c) => c.ordenIds.join() === inicial.ordenIds.join())) return compras;
    return [
      { ordenIds: inicial.ordenIds, ordenes: inicial.ordenes, cliente: 'La orden que abriste', documento: '', totalUSD: 0, totalBs: 0, pagadaEl: null, metodo: null, productos: 0, digital: false },
      ...compras,
    ];
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
    origen === 'ORDEN' && !ordenIds.length ? 'Elige la compra que vas a facturar.'
      : !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoy ? 'La fecha de emisión no puede ser de un día que no ha llegado.'
        : !(tasaNumero && tasaNumero > 0) ? 'Escribe la tasa BCV del día de la factura.' : null,
    comprador.nombre.trim().length < 2 ? 'Escribe el nombre o la razón social.'
      : !documento ? 'Escribe el RIF o la cédula: una letra (V, E, J, G o P) y sus números.'
        : empresa && comprador.domicilio.trim().length < 10 ? 'Una empresa lleva su domicilio fiscal.' : null,
    origen === 'TIENDA' && !manualesBien ? 'Completa cada renglón: cantidad, descripción y precio.' : null,
  ];
  const listoHasta = (i: number) => problemas.slice(0, i).every((p) => p === null);

  const pedido = (conNumero?: number, incluirIdempotencia = false) => {
    const base = {
      condicionPago: condicion,
      monedaOperacion,
      fecha,
      horaEmision: /^\d{2}:\d{2}:\d{2}$/.test(horaEmision) ? horaEmision : horaActualVe(),
      tasa: tasaNumero ?? 0,
      medio: medioEfectivo,
      ...(usarContingencia ? { contingenciaCausal } : {}),
      ...(medioEfectivo === 'PORTAL_SENIAT' && numeroExterno.trim() ? { numeroExterno: Math.trunc(Number(numeroExterno)) } : {}),
      ...(medioEfectivo === 'PORTAL_SENIAT' && numeroControlExterno.trim() ? { numeroControlExterno: numeroControlExterno.trim() } : {}),
      ...(pdfPrivadoRuta ? { pdfPrivadoRuta } : {}),
      ...(conNumero ? { numeroEsperado: conNumero } : {}),
      ...(incluirIdempotencia ? { llaveIdempotencia: crearLlaveIdempotencia() } : {}),
    };
    const c = { nombre: comprador.nombre.trim(), documento: comprador.documento.trim(), domicilio: comprador.domicilio.trim(), telefono: comprador.telefono.trim() };
    return origen === 'ORDEN'
      ? { origen, ordenIds, ...(descripciones ? { descripciones } : {}), ...(comprador.nombre || comprador.documento ? { comprador: c } : {}), ...base }
      : { origen, renglones: filas.map((f) => ({ ...f, precioUSD: f.precioUSD ?? 0 })), comprador: c, ...base };
  };

  const preparar = async (cuerpo: object): Promise<Borrador | null> => {
    setCargando(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/contabilidad/facturas/preparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
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
    if (paso === 0 && i > 0 && origen === 'ORDEN') {
      const b = await preparar({
        origen,
        ordenIds,
        condicionPago: condicion,
        monedaOperacion,
        fecha,
        horaEmision,
        tasa: tasaNumero ?? 0,
        medio: medioEfectivo,
        ...(usarContingencia ? { contingenciaCausal } : {}),
      });
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
    if (!borrador) return;
    setEmitiendo(true);
    setError(null);
    try {
      const numEsperado = medioEfectivo === 'TALONARIO' ? (borrador.numero ?? undefined) : undefined;
      const r = await fetch('/api/admin/contabilidad/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido(numEsperado, true)),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        const msg = d?.error ?? 'No se pudo registrar la factura.';
        setError(msg);
        toast.error(msg);
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

  const subirPdfSeniat = async (file: File | undefined) => {
    if (!file) return;
    setSubiendoPdf(true);
    const res = await subirArchivoContable(file, 'seniat-pdf');
    setSubiendoPdf(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPdfPrivadoRuta(res.archivo);
    toast.success('PDF adjunto');
  };

  const compra = opciones.find((c) => c.ordenIds.join() === ordenIds.join());
  const pasos: Paso[] = PASOS.map((p, i) => ({
    titulo: p.titulo,
    icono: p.icono,
    hecho: i < 3 && i < alcanzado && problemas[i] === null,
    disponible: listoHasta(i),
    resumen: i === 0 ? `${etiquetaCanal(medioEfectivo)} · ${origen === 'TIENDA' ? 'Tienda' : compra ? compra.ordenes.join(' y ') : 'Web'}`
      : i === 1 ? (comprador.nombre.trim() || 'Nombre, RIF o cédula')
        : i === 2 ? (borrador && origen === 'ORDEN' ? `${borrador.renglones.length} renglones` : origen === 'TIENDA' ? `${manuales.length} renglones` : 'Los renglones')
          : borrador?.numeroTexto ? `La ${borrador.numeroTexto}` : 'Confirmar y emitir',
  }));

  const replica = borrador && medioEfectivo === 'TALONARIO' && talonarioEfectivo && borrador.numeroTexto && borrador.numeroControl
    ? datosReplica(borrador.talonario ?? talonarioEfectivo, {
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

  if (medioEfectivo === 'TALONARIO' && !talonarioEfectivo) {
    return (
      <div className={adminNotice('warning')}>
        <IconoAdvertencia aria-hidden="true" />
        <p className="mt-2 font-semibold">No hay un talonario físico con facturas disponibles.</p>
        <p className="mt-1">El dueño puede cargar un talonario o activar Portal SENIAT / Imprenta Digital en Contabilidad → Ajustes 2027.</p>
      </div>
    );
  }

  const listoEmitir = borrador !== null && borrador.falta.length === 0 && (
    medioEfectivo === 'IMPRENTA_DIGITAL'
    || (medioEfectivo === 'TALONARIO' && Boolean(borrador.numero))
    || (medioEfectivo === 'PORTAL_SENIAT' && Number(numeroExterno) > 0 && numeroControlExterno.trim().length >= 4)
  );

  return (
    <div className="space-y-4">
      <Pasos pasos={pasos} actual={paso} onIr={(i) => void ir(i)} etiqueta="Pasos de la factura" />
      {error && <p role="alert" className={adminError}>{error}</p>}

      {paso === 0 && (
        <section className={`${adminCard} max-w-3xl`} aria-labelledby="paso-origen">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="paso-origen" className="text-lg font-semibold text-ink">Canal y origen</h2>
              <p className="mt-1 text-sm text-muted">Una compra de la web, o una venta en la tienda sin orden.</p>
            </div>
            <span className={adminBadge('brand')}>
              {etiquetaCanal(medioEfectivo)}{medioEfectivo === 'IMPRENTA_DIGITAL' ? ` · ${imprentaAmbiente}` : ''}
            </span>
          </div>

          {canalActivo !== 'TALONARIO' && (
            <div className="mt-4 rounded-xl border border-line bg-surface p-3.5">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={usarContingencia}
                  onChange={(e) => setUsarContingencia(e.target.checked)}
                  className="h-4 w-4 rounded border-line-strong text-brand-600"
                />
                Emitir por talonario de contingencia (Providencia 00093 art. 7)
              </label>
              {usarContingencia && (
                <div className="mt-3">
                  <label htmlFor="f-causal" className={adminLabel}>Causal de contingencia</label>
                  <select id="f-causal" value={contingenciaCausal} onChange={(e) => setContingenciaCausal(e.target.value)} className={adminInput()}>
                    {CAUSALES_CONTINGENCIA.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

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
                <p className="text-sm text-muted">No hay compras cobradas sin factura este mes.</p>
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
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
              <input
                id="factura-fecha"
                type="date"
                value={fecha}
                max={hoy}
                onChange={(e) => {
                  setFecha(e.target.value);
                  setTasa(e.target.value === hoy && tasaHoy ? String(tasaHoy).replace('.', ',') : '');
                }}
                className={`${adminInput()} sm:max-w-48`}
              />
            </div>
            <div>
              <label htmlFor="factura-hora" className={adminLabel}>Hora exacta (art. 8 num. 5)</label>
              <input
                id="factura-hora"
                type="time"
                step="1"
                value={horaEmision}
                onChange={(e) => setHoraEmision(e.target.value.length === 5 ? `${e.target.value}:00` : e.target.value)}
                className={`${adminInput()} tabular-nums sm:max-w-44`}
              />
              <p className={adminHint}>{formatearHora12(horaEmision)}</p>
            </div>
            <div>
              <label htmlFor="factura-tasa" className={`${adminLabel} inline-flex items-center gap-1`}>
                Tasa BCV del día
                <Ayuda etiqueta="Qué tasa va">La del BCV del día en que emites la factura.</Ayuda>
              </label>
              <CampoUnidad id="factura-tasa" unidad="Bs por $" value={tasa} inputMode="decimal" onChange={(e) => setTasa(e.target.value)} invalido={Boolean(tasa) && !tasaNumero} className="w-48" />
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
            <div className="sm:col-span-2">
              <span className={adminLabel}>Moneda de operación (art. 8 · Ley de Impuesto Grandes Transacciones)</span>
              <div className="flex gap-2 max-w-md" role="radiogroup" aria-label="Moneda de operación">
                <Opcion tamano="chica" role="radio" aria-checked={monedaOperacion === 'VES'} elegida={monedaOperacion === 'VES'} onClick={() => setMonedaOperacion('VES')} titulo="Bolívares (Bs.)" className="flex-1" />
                <Opcion tamano="chica" role="radio" aria-checked={monedaOperacion === 'USD'} elegida={monedaOperacion === 'USD'} onClick={() => setMonedaOperacion('USD')} titulo="Divisas (USD + equiv. Bs.)" className="flex-1" />
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
          <p className="mt-1 text-sm text-muted">Datos fiscales del comprador.</p>
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
                Los montos salen de la orden a la tasa del día ({textoTasa(borrador.tasa)}).
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
              <p className="mt-1 text-sm text-muted">Precio de cada producto en dólares (con IVA del {alicuota} % incluido si es gravado). Hasta {maxRenglones} renglones.</p>
              <div className="mt-4 hidden grid-cols-[4.5rem_minmax(0,1fr)_8rem_8rem_2.75rem] gap-2 text-xs font-semibold uppercase tracking-wide text-muted lg:grid">
                <span>Cant.</span><span>Descripción</span><span>(E)</span><span>Precio $</span><span />
              </div>
              <ul className="mt-2 space-y-3 lg:space-y-2">
                {manuales.map((m, i) => (
                  <li key={i} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 rounded-xl border border-line p-3 lg:grid-cols-[4.5rem_minmax(0,1fr)_8rem_8rem_2.75rem] lg:items-center lg:border-0 lg:p-0">
                    <input aria-label={`Cantidad del renglón ${i + 1}`} value={m.cantidad} inputMode="numeric" maxLength={4} onChange={(e) => setManuales(manuales.map((x, j) => (j === i ? { ...x, cantidad: e.target.value.replace(/\D/g, '') } : x)))} className={`${adminInput()} text-center tabular-nums`} />
                    <input aria-label={`Descripción del renglón ${i + 1}`} value={m.descripcion} maxLength={90} placeholder="Producto o servicio" onChange={(e) => setManuales(manuales.map((x, j) => (j === i ? { ...x, descripcion: e.target.value } : x)))} className={adminInput()} />
                    <Opcion tamano="chica" aria-pressed={m.exento} elegida={m.exento} onClick={() => setManuales(manuales.map((x, j) => (j === i ? { ...x, exento: !x.exento } : x)))}
                      titulo={m.exento ? '(E) exento' : 'Con IVA'} className="whitespace-nowrap" />
                    <input aria-label={`Precio en dólares del renglón ${i + 1}`} value={m.precio} inputMode="decimal" placeholder="0,00" onChange={(e) => setManuales(manuales.map((x, j) => (j === i ? { ...x, precio: e.target.value } : x)))} className={`${adminInput()} text-right tabular-nums`} />
                    <button type="button" aria-label={`Quitar el renglón ${i + 1}`} disabled={manuales.length === 1} onClick={() => setManuales(manuales.filter((_, j) => j !== i))} className={`${adminSecondaryButton} px-0!`}>
                      <IconoEliminar className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setManuales([...manuales, { ...renglonVacio }])} disabled={manuales.length >= maxRenglones} className={`${adminSecondaryButton} mt-3`}>
                <IconoMas className="h-4 w-4" aria-hidden="true" /> Agregar renglón
              </button>
            </>
          )}
          {problemas[2] && <p className={`${adminHint} mt-3`}>{problemas[2]}</p>}
          {botonesPie(3, 'Siguiente: revisar')}
        </section>
      )}

      {paso === 3 && borrador && (
        <div className={`grid gap-4 ${replica ? 'lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start' : 'max-w-3xl'}`}>
          <div className="space-y-4">
            <section className={adminCard} aria-labelledby="paso-revisar">
              <h2 id="paso-revisar" className="text-lg font-semibold text-ink">Revisar y emitir</h2>
              <p className="mt-1 text-sm text-muted">
                Canal: <strong>{etiquetaCanal(medioEfectivo)}</strong> · Hora <span className="tabular-nums">{formatearHora12(borrador.hora)}</span>.
              </p>
              <ul className="mt-3 divide-y divide-line text-sm">
                {[
                  { i: 0, icono: IconoOrdenes, titulo: origen === 'TIENDA' ? 'Venta en la tienda' : `Órdenes ${borrador.ordenes.map((o) => o.orderNumber).join(' y ')}`, detalle: `${borrador.condicionPago === 'CREDITO' ? 'Crédito' : 'Contado'} · ${monedaOperacion} · fecha ${borrador.fecha.split('-').reverse().join('/')} · tasa ${textoTasa(borrador.tasa)}` },
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

            {medioEfectivo === 'PORTAL_SENIAT' && (
              <section className={adminCard} aria-labelledby="seniat-datos">
                <h3 id="seniat-datos" className="text-base font-semibold text-ink">Datos asignados por el Portal SENIAT</h3>
                <p className="mt-0.5 text-xs text-muted">Copia los montos de arriba en el portal y registra aquí el número y control que emitió.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="seniat-num" className={adminLabel}>N.º de factura</label>
                    <input id="seniat-num" type="number" min={1} value={numeroExterno} onChange={(e) => setNumeroExterno(e.target.value)} className={adminInput()} required />
                  </div>
                  <div>
                    <label htmlFor="seniat-ctrl" className={adminLabel}>N.º de control</label>
                    <input id="seniat-ctrl" value={numeroControlExterno} onChange={(e) => setNumeroControlExterno(e.target.value)} placeholder="00-000001" className={adminInput()} required />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="seniat-pdf" className={adminLabel}>PDF descargado del Portal SENIAT (opcional)</label>
                    <input id="seniat-pdf" type="file" accept=".pdf" disabled={subiendoPdf} onChange={(e) => void subirPdfSeniat(e.target.files?.[0])} className="block w-full text-xs text-muted" />
                    {pdfPrivadoRuta && <p className={adminHint}>PDF adjunto listo.</p>}
                  </div>
                </div>
              </section>
            )}

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
              <h2 id="como-llenarla" className="flex items-center gap-2 text-base font-semibold text-ink"><IconoEditar className="h-4 w-4" aria-hidden="true" /> Confirmación</h2>
              <div className="mt-3 flex flex-col gap-2">
                <button type="button" onClick={() => void registrar()} disabled={emitiendo || subiendoPdf || !listoEmitir} className={adminPrimaryButton}>
                  {medioEfectivo === 'IMPRENTA_DIGITAL' ? <IconoNube className="h-4 w-4" aria-hidden="true" /> : <IconoCheck className="h-4 w-4" aria-hidden="true" />}
                  {emitiendo
                    ? 'Procesando…'
                    : medioEfectivo === 'IMPRENTA_DIGITAL'
                      ? `Timbrar factura digital (${imprentaAmbiente})`
                      : medioEfectivo === 'PORTAL_SENIAT'
                        ? 'Guardar factura del Portal SENIAT'
                        : `Ya la escribí: registrar la ${borrador.numeroTexto}`}
                </button>
                {replica && (
                  <button type="button" onClick={imprimirFactura} className={adminSecondaryButton}>
                    <IconoImpresora className="h-4 w-4" aria-hidden="true" /> Imprimir borrador
                  </button>
                )}
                <Link href="/admin/contabilidad/facturas" className="text-center text-sm font-semibold text-brand-600 hover:text-brand-700">
                  Volver a Facturas
                </Link>
              </div>
            </section>
          </div>

          {replica && (
            <div>
              <section className={`${adminCard} lg:hidden`} aria-labelledby="casillas">
                <h2 id="casillas" className="flex items-center gap-2 text-base font-semibold text-ink"><IconoDocumento className="h-4 w-4" aria-hidden="true" /> Casilla por casilla</h2>
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
