'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Ayuda from '@/components/admin/Ayuda';
import { OpcionRadio } from '@/components/admin/Opcion';
import AsiFunciona from '@/components/onboarding/AsiFunciona';
import ModalDialog from '@/components/ui/ModalDialog';
import {
  IconoArchivo, IconoAbrirCandado, IconoCalendario, IconoCandado, IconoChat, IconoCheck,
  IconoConfirmado, IconoDescargar, IconoEditar, IconoEnviar, IconoFlechaDerecha, IconoInfo,
  IconoPorcentaje, IconoVerificado,
} from '@/components/iconos';
import {
  adminBadge, adminCard, adminDato, adminError, adminHint, adminInput, adminLabel, adminModalBody, adminModalFooter,
  adminModalHeader, adminModalTitle, adminNotice, adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';
import { fechaCorta } from '@/lib/contabilidad/libro';
import { nombreMes } from '@/lib/contabilidad/montos';
import { formatUSD, formatVES } from '@/lib/currency';
import type { ObligacionFiscalDTO } from '@/lib/dto/contabilidad';
import FirmaModal from '../mesa/_components/FirmaModal';
import { enlaceArchivoContable, subirArchivoContable } from './subirArchivo';
import { diasHasta2027, etiquetaCanal, fechaCortaVe, fechaHoraCortaVe, type HubDatosProps, type SubTabLibro, type TabHubId } from './tipos';

const badgeObligacion = (ob: ObligacionFiscalDTO) => {
  if (ob.estado === 'PAGADA') return { tone: 'success' as const, texto: 'Pagada' };
  if (ob.estado === 'LISTA_PAGAR') return { tone: 'brand' as const, texto: 'Lista para pagar' };
  return { tone: 'warning' as const, texto: ob.quienToca === 'DUENO' ? 'Toca al dueño' : 'Por calcular' };
};

export default function TabResumenCierre({ datos, onIrTab }: {
  datos: HubDatosProps;
  onIrTab: (tab: TabHubId, subLibro?: SubTabLibro) => void;
}) {
  const router = useRouter();
  const {
    mes, hoy, venceIvaMes, saludo, hoyLargo, yo, resumen, periodo, obligaciones, firma: firmaInicial,
    contadora, notas: notasIniciales, comprasPendientes, comprasGastos, facturas, canalPublico, imprentaAmbientePublico,
    checklistTotal, checklistHechos,
  } = datos;

  const mesTxt = nombreMes(mes);
  const Mes = mesTxt.replace(/^./, (c) => c.toUpperCase());
  const primerNombre = (yo.nombre.replace(/^(Lic|Licda|Dr|Dra)\.?\s+/i, '').split(/\s+/)[0] || '').trim();
  const dias2027 = diasHasta2027(hoy);
  const contingenciasPendientes = facturas.filter((f) => f.estado === 'EMITIDA' && f.estadoTransmision === 'PENDIENTE_REPORTE').length;

  const [firma, setFirma] = useState(firmaInicial);
  const [firmando, setFirmando] = useState(false);

  // Notas del mes
  const [notas, setNotas] = useState(notasIniciales);
  const [textoNota, setTextoNota] = useState('');
  const [enviandoNota, setEnviandoNota] = useState(false);
  const [errorNota, setErrorNota] = useState<string | null>(null);

  // Modal de Obligación fiscal
  const [obActiva, setObActiva] = useState<ObligacionFiscalDTO | null>(null);
  const [obEstado, setObEstado] = useState<'POR_CALCULAR' | 'LISTA_PAGAR' | 'PAGADA'>('POR_CALCULAR');
  const [obMontoBs, setObMontoBs] = useState('');
  const [obPlanilla, setObPlanilla] = useState('');
  const [obIslr, setObIslr] = useState('');
  const [obPlanillaArchivo, setObPlanillaArchivo] = useState('');
  const [obPagoArchivo, setObPagoArchivo] = useState('');
  const [obEmpleados, setObEmpleados] = useState('');
  const [obSalarios, setObSalarios] = useState('');
  const [obBonos, setObBonos] = useState('');
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [guardandoOb, setGuardandoOb] = useState(false);
  const [errorOb, setErrorOb] = useState<string | null>(null);

  // Modal de cierre / reapertura
  const [modalCierre, setModalCierre] = useState<'CERRAR' | 'REABRIR' | null>(null);
  const [procesandoCierre, setProcesandoCierre] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  const abrirObligacion = (ob: ObligacionFiscalDTO) => {
    setObActiva(ob);
    setObEstado(ob.estado);
    setObMontoBs(String(ob.montoBs));
    setObPlanilla(ob.numeroPlanilla ?? '');
    setObIslr(ob.comprobanteIslr ?? '');
    setObPlanillaArchivo(ob.planillaPrivada ?? '');
    setObPagoArchivo(ob.comprobantePagoPrivado ?? '');
    setObEmpleados(ob.nominaEmpleados !== null ? String(ob.nominaEmpleados) : '');
    setObSalarios(ob.nominaSalariosBs !== null ? String(ob.nominaSalariosBs) : '');
    setObBonos(ob.nominaBonosBs !== null ? String(ob.nominaBonosBs) : '');
    setErrorOb(null);
  };

  const subirParaObligacion = async (file: File | undefined, destino: 'planilla' | 'pago') => {
    if (!file) return;
    setSubiendoArchivo(true);
    setErrorOb(null);
    const res = await subirArchivoContable(file, destino === 'planilla' ? 'planilla' : 'pago');
    setSubiendoArchivo(false);
    if (!res.ok) {
      setErrorOb(res.error);
      return;
    }
    if (destino === 'planilla') setObPlanillaArchivo(res.archivo);
    else setObPagoArchivo(res.archivo);
    toast.success('Documento adjuntado');
  };

  const guardarObligacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obActiva) return;
    setGuardandoOb(true);
    setErrorOb(null);
    const parseOptNum = (v: string) => {
      const n = Number(v.replace(',', '.'));
      return v.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : undefined;
    };
    try {
      const r = await fetch('/api/admin/contabilidad/obligaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: obActiva.id,
          estado: obEstado,
          montoBs: parseOptNum(obMontoBs) ?? obActiva.montoBs,
          numeroPlanilla: obPlanilla.trim() || null,
          ...(obActiva.tipo === 'ALQUILER_ISLR' ? { comprobanteIslr: obIslr.trim() || null } : {}),
          ...(obPlanillaArchivo ? { planillaPrivada: obPlanillaArchivo } : {}),
          ...(obPagoArchivo ? { comprobantePagoPrivado: obPagoArchivo } : {}),
          ...(obActiva.tipo === 'PENSIONES'
            ? {
                nominaEmpleados: obEmpleados.trim() ? Math.trunc(Number(obEmpleados)) : null,
                nominaSalariosBs: parseOptNum(obSalarios) ?? null,
                nominaBonosBs: parseOptNum(obBonos) ?? null,
              }
            : {}),
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErrorOb(d?.error ?? 'No se pudo actualizar la obligación.');
        return;
      }
      toast.success('Obligación actualizada');
      setObActiva(null);
      router.refresh();
    } catch {
      setErrorOb('Sin conexión. Intenta de nuevo.');
    } finally {
      setGuardandoOb(false);
    }
  };

  const confirmarCierre = async () => {
    if (!modalCierre) return;
    setProcesandoCierre(true);
    setErrorCierre(null);
    try {
      const r = await fetch('/api/admin/contabilidad/periodo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo: mes, accion: modalCierre }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErrorCierre(d?.error ?? 'No se pudo completar la acción.');
        return;
      }
      toast.success(modalCierre === 'CERRAR' ? `${Mes} quedó cerrado y firmado` : `${Mes} reabierto para ajustes`);
      setModalCierre(null);
      router.refresh();
    } catch {
      setErrorCierre('Sin conexión. Intenta de nuevo.');
    } finally {
      setProcesandoCierre(false);
    }
  };

  const enviarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = textoNota.trim();
    if (t.length < 2) return;
    setEnviandoNota(true);
    setErrorNota(null);
    try {
      const r = await fetch('/api/admin/contabilidad/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes, texto: t }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErrorNota(d?.error ?? 'No se pudo guardar la nota.');
        return;
      }
      setNotas(d.notas);
      setTextoNota('');
    } catch {
      setErrorNota('Sin conexión. Intenta de nuevo.');
    } finally {
      setEnviandoNota(false);
    }
  };

  const pasosCierre = [
    {
      n: 1,
      titulo: 'Facturar cobros del mes',
      detalle: comprasPendientes.length === 0 ? 'Todo lo cobrado ya tiene factura.' : `${comprasPendientes.length} por facturar.`,
      hecho: comprasPendientes.length === 0 && resumen.emitidas > 0,
      accion: () => onIrTab('facturacion'),
    },
    {
      n: 2,
      titulo: 'Cargar compras y gastos',
      detalle: comprasGastos.items.length === 0
        ? 'Sube facturas de proveedores para crédito fiscal.'
        : comprasGastos.pendientesRevision > 0
          ? `${comprasGastos.pendientesRevision} por revisar.`
          : `${comprasGastos.items.length} revisadas.`,
      hecho: comprasGastos.items.length > 0 && comprasGastos.pendientesRevision === 0,
      accion: () => onIrTab('libros', 'compras'),
    },
    {
      n: 3,
      titulo: 'Declarar IVA · Forma 99030',
      detalle: periodo.declaradoEl ? `Declarado el ${fechaCortaVe(periodo.declaradoEl)}.` : `Vence el ${fechaCorta(venceIvaMes)}.`,
      hecho: Boolean(periodo.declaradoEl) || periodo.estado !== 'ABIERTO',
      accion: () => onIrTab('libros', 'iva'),
    },
    {
      n: 4,
      titulo: 'Pagar obligaciones del mes',
      detalle: obligaciones.every((o) => o.estado === 'PAGADA')
        ? 'Alcaldía, IVA, Pensiones y Alquiler pagados.'
        : `${obligaciones.filter((o) => o.estado !== 'PAGADA').length} pendientes del mes.`,
      hecho: obligaciones.length > 0 && obligaciones.every((o) => o.estado === 'PAGADA'),
    },
    {
      n: 5,
      titulo: 'Firmar y cerrar el período',
      detalle: periodo.estado === 'CERRADO' ? `Cerrado con firma de ${periodo.firmaNombre ?? 'contaduría'}.` : 'Bloquea cambios en el mes cerrado.',
      hecho: periodo.estado === 'CERRADO',
    },
  ];

  const hayExcedente = periodo.ivaAPagarBs <= 0 && periodo.nuevoExcedenteBs > 0;

  return (
    <div className="space-y-4">
      {yo.esContadora && (
        <AsiFunciona
          clave="contabilidad-hub-v1"
          titulo="Tu espacio de Contabilidad"
          nota="Todo lo del mes está organizado en cuatro pestañas."
          sinChispa
          pasos={[
            { icono: 'calendario', texto: 'En Resumen y Cierre ves obligaciones, fechas límite y firma del mes.', hecho: Boolean(firma) },
            { icono: 'bolsa', texto: 'En Libros e IVA revisas Ventas, Compras y la Forma 99030.' },
            { icono: 'candado', texto: 'Al terminar, cierras el mes con tu firma y descargas el paquete.' },
          ]}
          boton="Empezar en el mes"
        />
      )}

      {/* Pieza fuerte del Kit 2.0: cabecera del mes + resultado de IVA */}
      <section className="rounded-2xl bg-brand-700 p-5 text-white sm:p-6" aria-labelledby="hub-resumen-iva">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                {etiquetaCanal(canalPublico)}{canalPublico === 'IMPRENTA_DIGITAL' ? ` (${imprentaAmbientePublico})` : ''}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                {periodo.estado === 'CERRADO' ? 'Mes cerrado y firmado' : periodo.estado === 'DECLARADO' ? 'IVA declarado' : 'Mes abierto'}
              </span>
            </div>
            <p className="text-sm text-white/85">
              {saludo}{primerNombre ? `, ${primerNombre}` : ''} · {hoyLargo}
            </p>
            <h2 id="hub-resumen-iva" className="text-xl font-bold sm:text-2xl">
              {hayExcedente ? `Excedente a favor en ${mesTxt}` : `IVA estimado por pagar en ${mesTxt}`}
            </h2>
            <p className="text-3xl font-bold tabular-nums sm:text-4xl">
              {formatVES(hayExcedente ? periodo.nuevoExcedenteBs : periodo.ivaAPagarBs)}
            </p>
            <p className="text-xs text-white/80 tabular-nums">
              Débito {formatVES(periodo.debitoFiscalBs)} − Crédito {formatVES(periodo.creditoFiscalBs)} − Excedente ant. {formatVES(periodo.excedenteAnteriorBs)} − Retenciones {formatVES(periodo.retencionesIvaBs)} · Vence el <strong className="text-white">{fechaCorta(venceIvaMes)}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/admin/contabilidad/paquete?mes=${mes}`}
              download
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              <IconoDescargar className="h-4 w-4" aria-hidden="true" /> Descargar paquete (.xlsx)
            </a>
            <button
              type="button"
              onClick={() => onIrTab('libros', 'iva')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              <IconoPorcentaje className="h-4 w-4" aria-hidden="true" /> Hoja Forma 99030
            </button>
          </div>
        </div>
      </section>

      {/* Aviso transición SNAT/2026/00093 en azul del kit (nunca ámbar) */}
      <div className={`${adminNotice('warning')} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-start gap-3">
          <IconoCalendario aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold text-ink">
              Providencia SNAT/2026/00093 · Faltan <span className="tabular-nums">{dias2027}</span> días para facturación digital obligatoria (19/04/2027)
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              Canal activo: <strong>{etiquetaCanal(canalPublico)}</strong> · Hoja de ruta: {checklistHechos} de {checklistTotal} hitos listos.
            </p>
          </div>
        </div>
        {yo.esDueno && (
          <button type="button" onClick={() => onIrTab('ajustes')} className={`${adminSecondaryButton} shrink-0`}>
            Abrir Ajustes 2027 <IconoFlechaDerecha className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* 4 tarjetas KPI neutras */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <button type="button" onClick={() => onIrTab('facturacion')} className={`${adminCard} p-4! text-left transition-colors hover:border-brand-300`}>
          <p className="text-xs font-semibold text-muted">Facturado en {mesTxt.split(' de ')[0]}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-ink sm:text-2xl">{formatVES(resumen.totalBs)}</p>
          <p className="mt-1 text-xs text-muted">{resumen.emitidas} {resumen.emitidas === 1 ? 'documento' : 'documentos'}{resumen.anuladas ? ` · ${resumen.anuladas} anul.` : ''}</p>
        </button>

        <button type="button" onClick={() => onIrTab('facturacion')} className={`${adminCard} p-4! text-left transition-colors hover:border-brand-300`}>
          <p className="text-xs font-semibold text-muted">Cobros por facturar</p>
          <p className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${comprasPendientes.length > 0 ? 'text-brand-700' : 'text-ink'}`}>
            {comprasPendientes.length}
          </p>
          <p className="mt-1 text-xs text-muted">{comprasPendientes.length === 0 ? 'Al día con la tienda' : 'Órdenes pagadas esperando factura'}</p>
        </button>

        <button type="button" onClick={() => onIrTab('libros', 'compras')} className={`${adminCard} p-4! text-left transition-colors hover:border-brand-300`}>
          <p className="text-xs font-semibold text-muted">Crédito fiscal (Compras)</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-ink sm:text-2xl">{formatVES(comprasGastos.creditoFiscalBs)}</p>
          <p className="mt-1 text-xs text-muted">{comprasGastos.items.length} {comprasGastos.items.length === 1 ? 'compra cargada' : 'compras cargadas'}</p>
        </button>

        <button type="button" onClick={() => onIrTab('facturacion')} className={`${adminCard} p-4! text-left transition-colors hover:border-brand-300`}>
          <p className="text-xs font-semibold text-muted">Contingencias pendientes</p>
          <p className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${contingenciasPendientes > 0 ? 'text-deal' : 'text-ink'}`}>
            {contingenciasPendientes}
          </p>
          <p className="mt-1 text-xs text-muted">{contingenciasPendientes === 0 ? 'Sin reportes atrasados' : 'Reportar al día siguiente (art. 7)'}</p>
        </button>
      </div>

      {/* Cuerpo: Obligaciones a la izquierda, Cierre + Firma + Notas a la derecha */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)] lg:items-start">
        <section className={adminCard} aria-labelledby="hub-obligaciones">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 id="hub-obligaciones" className="flex items-center gap-2 text-lg font-semibold text-ink">
                <IconoCalendario className="h-5 w-5 text-brand-600" aria-hidden="true" />
                Obligaciones de {mesTxt}
              </h3>
              <p className="mt-0.5 text-xs text-muted">Vencimientos ajustados a días hábiles bancarios de Venezuela (COT art. 10).</p>
            </div>
            <Ayuda etiqueta="Turnos de cada obligación">
              La contadora calcula y sube la planilla (pasa a Lista para pagar); el dueño paga y adjunta el comprobante (pasa a Pagada).
            </Ayuda>
          </div>

          <ul className="mt-4 space-y-2.5">
            {obligaciones.map((ob) => {
              const badge = badgeObligacion(ob);
              const linkPlanilla = enlaceArchivoContable(ob.planillaPrivada);
              const linkPago = enlaceArchivoContable(ob.comprobantePagoPrivado);
              return (
                <li key={ob.id} className="rounded-xl border border-line bg-surface p-3.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={adminBadge(badge.tone)}>{badge.texto}</span>
                        <span className={adminDato}>Vence {fechaCortaVe(ob.venceEl)}</span>
                      </div>
                      <p className="mt-1.5 font-semibold text-ink">{ob.titulo}</p>
                      {ob.detalle && <p className="mt-0.5 text-xs text-muted">{ob.detalle}</p>}
                      {(ob.numeroPlanilla || ob.comprobanteIslr || linkPlanilla || linkPago) && (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          {ob.numeroPlanilla && <span className="text-ink-soft tabular-nums">Planilla: <strong>{ob.numeroPlanilla}</strong></span>}
                          {ob.comprobanteIslr && <span className="text-ink-soft tabular-nums">ISLR: <strong>{ob.comprobanteIslr}</strong></span>}
                          {linkPlanilla && (
                            <a href={linkPlanilla} target="_blank" rel="noreferrer" className="font-semibold text-brand-600 hover:underline">
                              Ver planilla
                            </a>
                          )}
                          {linkPago && (
                            <a href={linkPago} target="_blank" rel="noreferrer" className="font-semibold text-brand-600 hover:underline">
                              Ver pago
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <div className="text-right">
                        <p className="text-base font-bold tabular-nums text-ink">{formatVES(ob.montoBs)}</p>
                        {ob.montoUSD !== null && <p className="text-xs tabular-nums text-muted">{formatUSD(ob.montoUSD)}</p>}
                      </div>
                      <button type="button" onClick={() => abrirObligacion(ob)} className={adminSecondaryButton}>
                        <IconoEditar className="h-4 w-4" aria-hidden="true" /> Actualizar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-4">
          {/* Cierre del mes y candado */}
          <section className={adminCard} aria-labelledby="hub-cierre">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="hub-cierre" className="flex items-center gap-2 text-base font-semibold text-ink">
                {periodo.estado === 'CERRADO'
                  ? <IconoCandado className="h-5 w-5 text-brand-600" aria-hidden="true" />
                  : <IconoAbrirCandado className="h-5 w-5 text-brand-600" aria-hidden="true" />}
                Cierre del mes · {Mes}
              </h3>
              <span className={adminBadge(periodo.estado === 'CERRADO' ? 'success' : periodo.estado === 'DECLARADO' ? 'brand' : 'warning')}>
                {periodo.estado === 'CERRADO' ? 'Cerrado' : periodo.estado === 'DECLARADO' ? 'Declarado' : 'Abierto'}
              </span>
            </div>

            <ol className="mt-3 space-y-2">
              {pasosCierre.map((p) => (
                <li key={p.n} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        p.hecho ? 'bg-success-strong text-white' : 'bg-white text-muted ring-1 ring-line-strong'
                      }`}
                      aria-hidden="true"
                    >
                      {p.hecho ? <IconoCheck className="h-3.5 w-3.5" /> : p.n}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{p.titulo}</p>
                      <p className="text-xs text-muted">{p.detalle}</p>
                    </div>
                  </div>
                  {p.accion && (
                    <button type="button" onClick={p.accion} className="shrink-0 text-xs font-semibold text-brand-600 hover:underline">
                      Ir
                    </button>
                  )}
                </li>
              ))}
            </ol>

            <div className="mt-4 flex flex-wrap gap-2">
              {periodo.estado !== 'CERRADO' && (yo.puedeDeclarar || yo.esDueno) && (
                <button type="button" onClick={() => { setErrorCierre(null); setModalCierre('CERRAR'); }} className={`${adminPrimaryButton} w-full sm:w-auto`}>
                  <IconoCandado className="h-4 w-4" aria-hidden="true" /> Firmar y cerrar {mesTxt.split(' de ')[0]}
                </button>
              )}
              {periodo.estado === 'CERRADO' && yo.esDueno && (
                <button type="button" onClick={() => { setErrorCierre(null); setModalCierre('REABRIR'); }} className={`${adminSecondaryButton} w-full sm:w-auto`}>
                  <IconoAbrirCandado className="h-4 w-4" aria-hidden="true" /> Reabrir mes (solo Dueño)
                </button>
              )}
            </div>
          </section>

          {/* Firma y sello */}
          <section className={adminCard} aria-labelledby="hub-firma">
            <div className="flex items-center justify-between gap-2">
              <h3 id="hub-firma" className="flex items-center gap-2 text-base font-semibold text-ink">
                <IconoVerificado className="h-5 w-5 text-brand-600" aria-hidden="true" />
                {yo.esContadora ? 'Mi firma y sello' : 'Firma de contaduría'}
              </h3>
              {yo.puedeDeclarar && (
                <button type="button" onClick={() => setFirmando(true)} className={adminSecondaryButton}>
                  <IconoEditar className="h-4 w-4" aria-hidden="true" /> {firma ? 'Cambiar' : 'Dibujar firma'}
                </button>
              )}
            </div>
            {firma ? (
              <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={firma.imagen} alt={`Firma de ${firma.nombre}`} className="h-14 max-w-44 rounded-lg border border-line bg-white p-1.5 object-contain" />
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-ink">{firma.nombre}</p>
                  <p className="text-xs text-muted">{firma.titulo} · C.P.C. <span className="tabular-nums">{firma.cpc}</span></p>
                </div>
              </div>
            ) : (
              <div className={`${adminNotice('warning')} mt-3 flex items-start gap-2.5 text-xs`}>
                <IconoInfo aria-hidden="true" />
                <span>
                  {yo.esContadora
                    ? 'Dibuja tu firma y número de C.P.C. una sola vez para firmar cierres y Excel.'
                    : contadora
                      ? `${contadora.nombre} aún no ha cargado su firma y sello.`
                      : 'Aún no hay una contadora con firma registrada.'}
                </span>
              </div>
            )}
          </section>

          {/* Notas del mes */}
          <section className={adminCard} aria-labelledby="hub-notas">
            <h3 id="hub-notas" className="flex items-center gap-2 text-base font-semibold text-ink">
              <IconoChat className="h-5 w-5 text-brand-600" aria-hidden="true" />
              Notas entre Dirección y Contadora
            </h3>
            {notas.length === 0 ? (
              <p className="mt-2 text-xs text-muted">Sin notas en {mesTxt}.</p>
            ) : (
              <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                {notas.map((n) => (
                  <li key={n.id} className={`rounded-xl border p-3 text-sm ${n.mia ? 'border-brand-200 bg-brand-50' : 'border-line bg-surface'}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-ink">{n.autor}</span>
                      <span className="text-xs text-muted">{fechaHoraCortaVe(n.fecha)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-ink-soft">{n.texto}</p>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={enviarNota} className="mt-3 flex gap-2">
              <label htmlFor="hub-nota-txt" className="sr-only">Escribir nota</label>
              <input
                id="hub-nota-txt"
                value={textoNota}
                maxLength={500}
                placeholder="Dejar nota sobre este mes…"
                onChange={(e) => setTextoNota(e.target.value)}
                className={adminInput()}
              />
              <button type="submit" disabled={enviandoNota || textoNota.trim().length < 2} className={adminPrimaryButton}>
                <IconoEnviar className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
            {errorNota && <p role="alert" className={`${adminError} mt-2`}>{errorNota}</p>}
          </section>
        </div>
      </div>

      {/* Modal Actualizar Obligación */}
      <ModalDialog open={Boolean(obActiva)} onClose={() => !guardandoOb && setObActiva(null)} ariaLabelledBy="ob-modal-titulo" size="md">
        {obActiva && (
          <form onSubmit={guardarObligacion}>
            <div className={adminModalHeader}>
              <h2 id="ob-modal-titulo" className={adminModalTitle}>{obActiva.titulo}</h2>
            </div>
            <div className={`${adminModalBody} space-y-4`}>
              <p className="text-xs text-muted">Vence el {fechaCortaVe(obActiva.venceEl)}.</p>

              {obActiva.tipo === 'PENSIONES' && (
                <div className="grid gap-3 rounded-xl border border-line bg-surface p-3.5 sm:grid-cols-3">
                  <div>
                    <label htmlFor="ob-emp" className={adminLabel}>Empleados</label>
                    <input id="ob-emp" type="number" min={0} value={obEmpleados} onChange={(e) => setObEmpleados(e.target.value)} className={adminInput()} />
                  </div>
                  <div>
                    <label htmlFor="ob-sal" className={adminLabel}>Salarios (Bs.)</label>
                    <input id="ob-sal" inputMode="decimal" value={obSalarios} onChange={(e) => setObSalarios(e.target.value)} className={`${adminInput()} tabular-nums`} />
                  </div>
                  <div>
                    <label htmlFor="ob-bon" className={adminLabel}>Bonos (Bs.)</label>
                    <input id="ob-bon" inputMode="decimal" value={obBonos} onChange={(e) => setObBonos(e.target.value)} className={`${adminInput()} tabular-nums`} />
                  </div>
                  <p className="sm:col-span-3 text-xs text-muted">Al guardar con salarios y bonos, el servidor recalcula el aporte automáticamente.</p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="ob-monto" className={adminLabel}>Monto (Bs.)</label>
                  <input id="ob-monto" inputMode="decimal" value={obMontoBs} onChange={(e) => setObMontoBs(e.target.value)} className={`${adminInput()} tabular-nums`} />
                </div>
                <div>
                  <label htmlFor="ob-planilla" className={adminLabel}>N.º de planilla</label>
                  <input id="ob-planilla" value={obPlanilla} maxLength={50} onChange={(e) => setObPlanilla(e.target.value)} placeholder="Ej. 20261199030" className={adminInput()} />
                </div>
                {obActiva.tipo === 'ALQUILER_ISLR' && (
                  <div className="sm:col-span-2">
                    <label htmlFor="ob-islr" className={adminLabel}>Comprobante retención ISLR (14 dígitos)</label>
                    <input id="ob-islr" value={obIslr} maxLength={14} inputMode="numeric" onChange={(e) => setObIslr(e.target.value)} placeholder="20261100000001" className={`${adminInput()} tabular-nums`} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className={adminLabel}>Estado</span>
                <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Estado de obligación">
                  <OpcionRadio name="ob-estado" tamano="chica" elegida={obEstado === 'POR_CALCULAR'} onElegir={() => setObEstado('POR_CALCULAR')} titulo="Por calcular" />
                  <OpcionRadio name="ob-estado" tamano="chica" elegida={obEstado === 'LISTA_PAGAR'} onElegir={() => setObEstado('LISTA_PAGAR')} titulo="Lista para pagar" />
                  <OpcionRadio name="ob-estado" tamano="chica" elegida={obEstado === 'PAGADA'} onElegir={() => setObEstado('PAGADA')} titulo="Pagada" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="ob-up-planilla" className={adminLabel}>Adjuntar planilla (PDF o foto)</label>
                  <input
                    id="ob-up-planilla"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    disabled={subiendoArchivo}
                    onChange={(e) => void subirParaObligacion(e.target.files?.[0], 'planilla')}
                    className="block w-full text-xs text-muted file:mr-2 file:rounded-lg file:border file:border-line-strong file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink"
                  />
                  {obPlanillaArchivo && <p className={adminHint}>Planilla adjunta lista.</p>}
                </div>
                <div>
                  <label htmlFor="ob-up-pago" className={adminLabel}>Comprobante de pago</label>
                  <input
                    id="ob-up-pago"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    disabled={subiendoArchivo}
                    onChange={(e) => void subirParaObligacion(e.target.files?.[0], 'pago')}
                    className="block w-full text-xs text-muted file:mr-2 file:rounded-lg file:border file:border-line-strong file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink"
                  />
                  {obPagoArchivo && <p className={adminHint}>Pago adjunto listo.</p>}
                </div>
              </div>

              {errorOb && <p role="alert" className={adminError}>{errorOb}</p>}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setObActiva(null)} disabled={guardandoOb} className={adminSecondaryButton}>Cancelar</button>
              <button type="submit" disabled={guardandoOb || subiendoArchivo} className={adminPrimaryButton}>
                <IconoConfirmado className="h-4 w-4" aria-hidden="true" /> {guardandoOb ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Modal Confirmar Cierre / Reapertura */}
      <ModalDialog open={Boolean(modalCierre)} onClose={() => !procesandoCierre && setModalCierre(null)} ariaLabelledBy="cierre-modal-titulo" size="sm">
        <div className={adminModalHeader}>
          <h2 id="cierre-modal-titulo" className={adminModalTitle}>
            {modalCierre === 'CERRAR' ? `Cerrar y firmar ${Mes}` : `Reabrir ${Mes}`}
          </h2>
        </div>
        <div className={`${adminModalBody} space-y-3 text-sm text-ink-soft`}>
          {modalCierre === 'CERRAR' ? (
            <>
              <p>Al cerrar <strong>{Mes}</strong>, ninguna factura, compra, retención o anulación podrá modificarse en este período.</p>
              <p>Si aparece un ajuste posterior, se emite una Nota de Crédito o Débito en el mes en curso.</p>
            </>
          ) : (
            <p>Reabrir el mes desbloquea el período para corregir o cargar documentos pendientes antes de volverlo a cerrar.</p>
          )}
          {errorCierre && <p role="alert" className={adminError}>{errorCierre}</p>}
        </div>
        <div className={adminModalFooter}>
          <button type="button" onClick={() => setModalCierre(null)} disabled={procesandoCierre} className={adminSecondaryButton}>Cancelar</button>
          <button type="button" onClick={() => void confirmarCierre()} disabled={procesandoCierre} className={adminPrimaryButton}>
            <IconoArchivo className="h-4 w-4" aria-hidden="true" /> {procesandoCierre ? 'Procesando…' : modalCierre === 'CERRAR' ? 'Confirmar cierre' : 'Reabrir mes'}
          </button>
        </div>
      </ModalDialog>

      {firmando && (
        <FirmaModal
          actual={firma}
          nombreSugerido={yo.nombre}
          onCerrar={() => setFirmando(false)}
          onGuardada={(f) => {
            setFirma(f);
            setFirmando(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
