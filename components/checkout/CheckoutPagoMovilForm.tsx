'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { FiAlertCircle, FiCheck, FiCheckCircle, FiChevronDown, FiCopy, FiEdit2, FiLoader, FiShield, FiX } from 'react-icons/fi';
import { HiOutlineQrcode } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { formatUSD, formatVES } from '@/lib/currency';
import { BANCOS_VENEZUELA } from '@/lib/pago-movil/bancos-venezuela';
import { aCentimos, conciliar, hoyCaracas, leerMontoBs, montoParaCopiar, type Conciliacion } from '@/lib/pago-movil/monto';
import { adminModalBody, adminModalHeader, adminModalOverlay, adminModalPanel, adminModalTitle } from '@/lib/admin-ui';
import { useMontado } from '@/lib/hooks/useMontado';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';

// C-125: Pago Móvil del checkout.
// - Un solo bloque con los datos del comercio y "Copiar todos los datos"; el monto exacto con su propio "Copiar".
// - El cliente solo escribe la referencia: banco recordado, cédula y teléfono de su perfil, fecha de hoy en Venezuela.
// - Suma pagos: si transfirió de menos, paga solo lo que falta; si pagó de más, la diferencia va a su saldo al confirmar.
// El monto en Bs. llega del servidor (cotización firmada): es el mismo que se muestra, se copia y se manda al banco.

export interface PagoMovilVerificado {
  referencia: string;
  pagadoBs: number;
  /** Tasa congelada con la que se cotizó ese pago */
  tasa: number | null;
  bancoOrigen: string;
  telefonoPagador: string;
  cedulaPagador: string;
  fechaPago: string;
}

/** Lo pagado frente al total, con cada pago a su tasa. Null si todavía no hay pagos o no hay tasa. */
export function conciliarPagos(pagos: PagoMovilVerificado[], totalUSD: number, tasa: number): Conciliacion | null {
  if (pagos.length === 0 || !(tasa > 0)) return null;
  const pagadoBs = aCentimos(pagos.reduce((suma, p) => suma + (p.tasa && p.tasa > 0 ? (p.pagadoBs / p.tasa) * tasa : p.pagadoBs), 0)) / 100;
  return conciliar(pagadoBs, totalUSD, tasa);
}

interface CheckoutPagoMovilFormProps {
  /** Total de la compra en USD */
  montoUSD: number;
  /** Monto exacto en Bs. que cotizó el servidor */
  montoBs: number;
  /** Tasa de esa cotización */
  tasa: number;
  /** Cotización firmada: la verificación concilia con esta tasa */
  cotizacion: string | null;
  datosComercio: { telefono?: string; cedula?: string; banco?: string; titular?: string };
  /** Cédula y teléfono del perfil del cliente */
  pagador: { cedula: string; telefono: string };
  pagos: PagoMovilVerificado[];
  onPagosChange: (pagos: PagoMovilVerificado[]) => void;
  className?: string;
}

interface ErrorVerificacion {
  message: string;
  code?: number;
  montoNoCoincide?: boolean;
  duplicateReference?: boolean;
}

const BANCO_GUARDADO = 'electroshop_pm_banco';

function leerBancoGuardado(): string {
  try {
    return window.localStorage.getItem(BANCO_GUARDADO) ?? '';
  } catch {
    return '';
  }
}

function guardarBanco(codigo: string) {
  try {
    window.localStorage.setItem(BANCO_GUARDADO, codigo);
  } catch {
    // Sin almacenamiento (modo privado): la próxima vez se elige de nuevo
  }
}

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    toast.error('No se pudo copiar. Mantén presionado el dato para copiarlo.');
    return false;
  }
}

/** Botón de copiar con "Copiado" durante 2 segundos. */
function BotonCopiar({ texto, etiqueta, principal = false }: { texto: string; etiqueta: string; principal?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = window.setTimeout(() => setCopiado(false), 2000);
    return () => window.clearTimeout(t);
  }, [copiado]);
  const base = 'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors sm:px-4';
  const tono = copiado
    ? 'bg-success-strong text-white'
    : principal ? 'bg-brand-500 text-white hover:bg-brand-600' : 'border border-line bg-white text-ink hover:bg-surface';
  return (
    <button type="button" onClick={async () => setCopiado(await copiar(texto))} className={`${base} ${tono}`} aria-live="polite">
      {copiado ? <FiCheck className="h-4 w-4" aria-hidden="true" /> : <FiCopy className="h-4 w-4" aria-hidden="true" />}
      {copiado ? 'Copiado' : etiqueta}
    </button>
  );
}

const inputClass =
  'h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-base text-ink placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-surface';

export default function CheckoutPagoMovilForm({
  montoUSD,
  montoBs,
  tasa,
  cotizacion,
  datosComercio,
  pagador,
  pagos,
  onPagosChange,
  className = '',
}: CheckoutPagoMovilFormProps) {
  const mounted = useMontado();
  const [referencia, setReferencia] = useState('');
  const [banco, setBanco] = useState('');
  // Lo que el cliente escribió; sin escribir nada, vale lo de su perfil (que llega después del primer render)
  const [cedulaEscrita, setCedula] = useState<string | null>(null);
  const [telefonoEscrito, setTelefono] = useState<string | null>(null);
  const cedula = cedulaEscrita ?? pagador.cedula;
  const telefono = telefonoEscrito ?? pagador.telefono;
  const [fecha, setFecha] = useState(() => hoyCaracas());
  const [otroMonto, setOtroMonto] = useState('');
  const [abrirPagador, setEditarPagador] = useState(false);
  const editarPagador = abrirPagador || !pagador.cedula || !pagador.telefono;
  const [mostrarOtroMonto, setMostrarOtroMonto] = useState(false);
  const [bancosAbiertos, setBancosAbiertos] = useState(false);
  const [buscarBanco, setBuscarBanco] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<ErrorVerificacion | null>(null);
  const [verQR, setVerQR] = useState(false);
  useBodyScrollLock(verQR);

  // El último banco usado queda elegido (por navegador). Se lee al montar: en el servidor no hay localStorage
  useCargarAlMontar(() => {
    const guardado = leerBancoGuardado();
    if (guardado && BANCOS_VENEZUELA.some((b) => b.codigo === guardado)) setBanco((actual) => actual || guardado);
  });

  const conciliacion = useMemo(() => conciliarPagos(pagos, montoUSD, tasa), [pagos, montoUSD, tasa]);
  const cubierto = conciliacion !== null && conciliacion.estado !== 'FALTA';
  /** Lo que hay que transferir ahora: el total o, si ya hubo un pago, lo que falta */
  const aPagarBs = conciliacion?.estado === 'FALTA' ? -conciliacion.diferenciaBs : montoBs;

  const bancoComercio = BANCOS_VENEZUELA.find((b) => b.nombre === datosComercio.banco || datosComercio.banco?.includes(b.nombre));
  const bancoTexto = datosComercio.banco ? `${datosComercio.banco}${bancoComercio ? ` (${bancoComercio.codigo})` : ''}` : 'Banco de Venezuela (0102)';
  const textoTodo = [
    'Pago Móvil Electro Shop',
    `Banco: ${bancoTexto}`,
    `Teléfono: ${datosComercio.telefono ?? ''}`,
    `RIF/Cédula: ${datosComercio.cedula ?? ''}`,
    `Monto: ${montoParaCopiar(aPagarBs)}`,
  ].join('\n');

  const bancoElegido = BANCOS_VENEZUELA.find((b) => b.codigo === banco);
  const bancosFiltrados = useMemo(() => {
    const t = buscarBanco.trim().toLowerCase();
    return t ? BANCOS_VENEZUELA.filter((b) => b.nombre.toLowerCase().includes(t) || b.nombreCorto.toLowerCase().includes(t) || b.codigo.includes(t)) : BANCOS_VENEZUELA;
  }, [buscarBanco]);

  const refLimpia = referencia.replace(/\D/g, '');
  const montoDeclarado = mostrarOtroMonto && otroMonto.trim() ? leerMontoBs(otroMonto) : null;
  const puedeVerificar = !verificando && refLimpia.length >= 4 && Boolean(banco) && Boolean(cedula.trim()) && Boolean(telefono.trim()) && Boolean(fecha)
    && (!mostrarOtroMonto || !otroMonto.trim() || montoDeclarado !== null);

  const verificar = async () => {
    if (pagos.some((p) => p.referencia === refLimpia)) {
      setError({ message: 'Ya verificaste esta referencia en esta compra.' });
      return;
    }
    setVerificando(true);
    setError(null);
    const importe = montoDeclarado ?? aPagarBs;
    try {
      const response = await fetch('/api/pago-movil/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefonoPagador: telefono.replace(/\D/g, ''),
          bancoOrigen: banco,
          referencia: refLimpia,
          fechaPago: fecha,
          cedulaPagador: cedula.trim().toUpperCase().replace(/[.\-\s]/g, ''),
          importe: montoParaCopiar(importe),
          contexto: 'ORDER',
          reqCed: true,
          cotizacion,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.verified) {
        setError({
          message: data.error || data.message || 'No se pudo verificar el pago.',
          code: data.code,
          montoNoCoincide: Boolean(data.montoNoCoincide),
          duplicateReference: Boolean(data.duplicateReference),
        });
        if (data.montoNoCoincide) setMostrarOtroMonto(true);
        return;
      }
      guardarBanco(banco);
      const pagadoBs = typeof data.pagadoBs === 'number' && data.pagadoBs > 0 ? data.pagadoBs : importe;
      const nuevos = [...pagos, {
        referencia: refLimpia,
        pagadoBs,
        tasa: typeof data.tasa === 'number' && data.tasa > 0 ? data.tasa : null,
        bancoOrigen: banco,
        telefonoPagador: telefono.replace(/\D/g, ''),
        cedulaPagador: cedula.trim().toUpperCase(),
        fechaPago: fecha,
      }];
      onPagosChange(nuevos);
      setReferencia('');
      setOtroMonto('');
      setMostrarOtroMonto(false);
      const resultado = conciliarPagos(nuevos, montoUSD, tasa);
      if (resultado?.estado === 'FALTA') toast(`Recibimos tu pago. Te faltan ${formatVES(-resultado.diferenciaBs)}.`, { icon: <FiAlertCircle className="h-5 w-5 text-warning-strong" aria-hidden="true" /> });
      else toast.success('Pago Móvil verificado');
    } catch {
      setError({ message: 'Sin conexión. Revisa tu internet e intenta de nuevo.' });
    } finally {
      setVerificando(false);
    }
  };

  if (!(montoBs > 0) || !(tasa > 0)) {
    return (
      <div className={`rounded-2xl border border-line bg-white p-4 text-sm text-ink-soft ${className}`}>
        Calculando el monto exacto en bolívares…
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Pagos ya verificados */}
      {pagos.length > 0 && conciliacion && (
        <div className={`rounded-2xl border p-4 ${cubierto ? 'border-success/40 bg-success/5' : 'border-warning/40 bg-warning/10'}`} role="status">
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${cubierto ? 'bg-success-strong' : 'bg-warning-strong'}`}>
              {cubierto ? <FiCheck className="h-5 w-5" aria-hidden="true" /> : <FiAlertCircle className="h-5 w-5" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className={`font-semibold ${cubierto ? 'text-success-strong' : 'text-warning-strong'}`}>
                {cubierto ? 'Pago verificado' : `Te faltan ${formatVES(-conciliacion.diferenciaBs)}`}
              </p>
              <p className="text-sm text-ink-soft">
                {conciliacion.estado === 'EXACTO' && 'El banco confirmó el monto exacto. Ya puedes confirmar tu pedido.'}
                {conciliacion.estado === 'REDONDEO' && `Hay una diferencia de ${formatVES(Math.abs(conciliacion.diferenciaBs))}: es muy pequeña, no tienes que hacer nada.`}
                {conciliacion.estado === 'SOBREPAGO' && `Pagaste ${formatVES(conciliacion.diferenciaBs)} de más. Al confirmar tu pedido pasamos ${formatUSD(conciliacion.diferenciaUSD)} a tu saldo.`}
                {conciliacion.estado === 'FALTA' && `Recibimos ${formatVES(conciliacion.pagadoBs)} de ${formatVES(conciliacion.esperadoBs)}. Haz otro Pago Móvil solo por la diferencia; lo que ya pagaste queda registrado.`}
              </p>
              <ul className="space-y-0.5 pt-1 text-xs text-muted">
                {pagos.map((p) => (
                  <li key={p.referencia} className="flex items-center gap-1.5">
                    <FiCheckCircle className="h-3.5 w-3.5 shrink-0 text-success-strong" aria-hidden="true" />
                    Ref. {p.referencia} · {formatVES(p.pagadoBs)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {!cubierto && (
        <>
          {/* Paso 1: los datos para pagar, en un solo bloque */}
          <section className="overflow-hidden rounded-2xl border border-brand-200 bg-white" aria-labelledby="pm-paso-1">
            <div className="bg-brand-50 px-3 py-3 sm:px-4">
              <h3 id="pm-paso-1" className="text-sm font-semibold text-ink">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs text-white">1</span>
                {pagos.length > 0 ? 'Transfiere lo que falta' : 'Haz el Pago Móvil desde tu banco'}
              </h3>
            </div>
            <div className="space-y-4 p-3 sm:p-4">
              <div>
                <p className="text-xs font-medium text-muted">Monto exacto</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-3xl font-bold tabular-nums tracking-tight text-ink">{formatVES(aPagarBs)}</p>
                  <BotonCopiar texto={montoParaCopiar(aPagarBs)} etiqueta="Copiar monto" />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {pagos.length > 0 ? `De un total de ${formatVES(montoBs)}` : `${formatUSD(montoUSD)} a ${formatVES(tasa)} por dólar`}
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 border-t border-line pt-3 text-sm sm:grid-cols-3">
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-muted">Banco</dt>
                  <dd className="font-semibold text-ink">{bancoTexto}</dd>
                </div>
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-muted">Teléfono</dt>
                  <dd className="font-semibold tabular-nums text-ink">{datosComercio.telefono || '-'}</dd>
                </div>
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-muted">RIF o cédula</dt>
                  <dd className="font-semibold text-ink">{datosComercio.cedula || '-'}</dd>
                </div>
              </dl>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex-1 [&>button]:w-full">
                  <BotonCopiar texto={textoTodo} etiqueta="Copiar todos los datos" principal />
                </div>
                <button
                  type="button"
                  onClick={() => setVerQR(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-surface"
                >
                  <HiOutlineQrcode className="h-4 w-4" aria-hidden="true" /> Ver QR
                </button>
              </div>
              <p className="text-xs text-muted">Transfiere el monto exacto: el banco busca tu pago por referencia y monto.</p>
            </div>
          </section>

          {/* Paso 2: confirmar con la referencia */}
          <section className="rounded-2xl border border-line bg-white" aria-labelledby="pm-paso-2">
            <div className="border-b border-line px-3 py-3 sm:px-4">
              <h3 id="pm-paso-2" className="text-sm font-semibold text-ink">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs text-white">2</span>
                Escribe la referencia de tu pago
              </h3>
            </div>
            <div className="space-y-4 p-3 sm:p-4">
              <div>
                <label htmlFor="pm-referencia" className="mb-1.5 block text-sm font-semibold text-ink">Número de referencia</label>
                <input
                  id="pm-referencia"
                  value={referencia}
                  onChange={(e) => { setReferencia(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(null); }}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ej: 123456"
                  disabled={verificando}
                  className={`${inputClass} h-12 text-lg tracking-widest`}
                />
                <p className="mt-1 text-xs text-muted">Está en el SMS o el comprobante de tu banco (4 a 8 dígitos).</p>
              </div>

              <div className="relative">
                <p className="mb-1.5 text-sm font-semibold text-ink" id="pm-banco-label">Banco desde el que pagaste</p>
                <button
                  type="button"
                  onClick={() => setBancosAbiertos((v) => !v)}
                  disabled={verificando}
                  aria-labelledby="pm-banco-label"
                  aria-expanded={bancosAbiertos}
                  className={`${inputClass} flex items-center justify-between text-left`}
                >
                  <span className={bancoElegido ? 'text-ink' : 'text-subtle'}>{bancoElegido ? `${bancoElegido.nombre} (${bancoElegido.codigo})` : 'Elige tu banco'}</span>
                  <FiChevronDown className={`h-4 w-4 text-muted transition-transform ${bancosAbiertos ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {bancosAbiertos && (
                  <div className="absolute z-[var(--z-dropdown)] mt-1 w-full overflow-hidden rounded-xl border border-line bg-white shadow-lg">
                    <div className="border-b border-line p-2">
                      <input value={buscarBanco} onChange={(e) => setBuscarBanco(e.target.value)} placeholder="Buscar banco" aria-label="Buscar banco" className={inputClass} />
                    </div>
                    <ul className="max-h-56 overflow-y-auto" role="listbox" aria-label="Bancos">
                      {bancosFiltrados.map((b) => (
                        <li key={b.codigo}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={banco === b.codigo}
                            onClick={() => { setBanco(b.codigo); setBancosAbiertos(false); setBuscarBanco(''); setError(null); }}
                            className={`flex min-h-11 w-full items-center justify-between px-4 text-left text-sm hover:bg-brand-50 ${banco === b.codigo ? 'bg-brand-50 font-semibold text-brand-600' : 'text-ink'}`}
                          >
                            {b.nombre}
                            <span className="text-xs text-muted">{b.codigo}</span>
                          </button>
                        </li>
                      ))}
                      {bancosFiltrados.length === 0 && <li className="px-4 py-3 text-sm text-muted">No hay bancos con ese nombre</li>}
                    </ul>
                  </div>
                )}
              </div>

              {/* Datos del pagador: vienen del perfil; se cambian solo si pagó otra persona u otro día */}
              {editarPagador ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="pm-cedula" className="mb-1.5 block text-sm font-semibold text-ink">Cédula del titular</label>
                    <input id="pm-cedula" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="V12345678" maxLength={11} autoCapitalize="characters" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="pm-telefono" className="mb-1.5 block text-sm font-semibold text-ink">Teléfono que pagó</label>
                    <input id="pm-telefono" value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/[^\d]/g, '').slice(0, 11))} inputMode="tel" placeholder="04121234567" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="pm-fecha" className="mb-1.5 block text-sm font-semibold text-ink">Fecha del pago</label>
                    <input id="pm-fecha" type="date" value={fecha} max={hoyCaracas()} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2 text-sm">
                  <p className="min-w-0 text-ink-soft">
                    Pagaste desde <span className="font-semibold text-ink">{cedula}</span> · <span className="font-semibold tabular-nums text-ink">{telefono}</span>
                    {fecha === hoyCaracas() ? ' · hoy' : ` · ${fecha}`}
                  </p>
                  <button type="button" onClick={() => setEditarPagador(true)} className="inline-flex h-11 shrink-0 items-center gap-1.5 px-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    <FiEdit2 className="h-4 w-4" aria-hidden="true" /> Cambiar
                  </button>
                </div>
              )}

              {mostrarOtroMonto ? (
                <div>
                  <label htmlFor="pm-otro-monto" className="mb-1.5 block text-sm font-semibold text-ink">Monto que transferiste (Bs.)</label>
                  <input
                    id="pm-otro-monto"
                    value={otroMonto}
                    onChange={(e) => setOtroMonto(e.target.value)}
                    inputMode="decimal"
                    placeholder={montoParaCopiar(aPagarBs)}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-muted">
                    Escríbelo exacto, como sale en tu comprobante. Si pagaste de más, la diferencia va a tu saldo; si falta algo, pagas solo eso.
                  </p>
                </div>
              ) : (
                <button type="button" onClick={() => setMostrarOtroMonto(true)} className="h-11 text-sm font-semibold text-brand-600 hover:text-brand-700">
                  ¿Transferiste otro monto?
                </button>
              )}

              {error && (
                <div className={`rounded-xl border p-3 text-sm ${error.duplicateReference ? 'border-warning/40 bg-warning/10 text-warning-strong' : 'border-deal/30 bg-deal-bg text-deal'}`} role="alert">
                  <p className="font-semibold">{error.duplicateReference ? 'Referencia ya usada' : 'No pudimos verificar el pago'}</p>
                  <p className="mt-1">{error.message}</p>
                  {error.montoNoCoincide && (
                    <p className="mt-2 text-ink-soft">
                      Buscamos un pago de {formatVES(montoDeclarado ?? aPagarBs)}. Si en tu comprobante sale otro monto, escríbelo arriba en &quot;Monto que transferiste&quot;.
                    </p>
                  )}
                  {typeof error.code === 'number' && <p className="mt-1 text-xs text-muted">Código del banco: {error.code}</p>}
                </div>
              )}

              <button
                type="button"
                onClick={verificar}
                disabled={!puedeVerificar}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verificando ? <FiLoader className="h-5 w-5 animate-spin" aria-hidden="true" /> : <FiShield className="h-5 w-5" aria-hidden="true" />}
                {verificando ? 'Consultando al Banco de Venezuela…' : 'Verificar pago'}
              </button>
            </div>
          </section>
        </>
      )}

      {verQR && mounted && createPortal(
        <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setVerQR(false); }}>
          <div className={`${adminModalPanel} sm:max-w-sm`} role="dialog" aria-modal="true" aria-labelledby="pm-qr-titulo">
            <div className={adminModalHeader}>
              <h3 id="pm-qr-titulo" className={adminModalTitle}>Código QR Pago Móvil</h3>
              <button type="button" onClick={() => setVerQR(false)} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-surface hover:text-ink" aria-label="Cerrar">
                <FiX className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className={`${adminModalBody} flex flex-col items-center gap-3 text-center`}>
              <Image src="/images/qrbdv.png" alt="Código QR de Pago Móvil del Banco de Venezuela" width={280} height={280} className="rounded-lg border border-line" />
              <p className="text-sm text-ink-soft">Escanéalo con tu app bancaria. Si el QR no trae el monto, escribe {formatVES(aPagarBs)}.</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
