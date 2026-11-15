// C-229: la réplica de la factura del talonario, llena como se escribe. Es la maqueta B que eligió el equipo el 14/11,
// con la alineación que pidió ("algunos ítems se deben alinear mejor"): cada número va sobre el borde izquierdo de su
// casilla, los valores en la letra del panel y centrados en su fila, las cifras a la derecha y todas las filas de la
// misma altura. La usan "Revisar y emitir" y la ficha de una factura. Sin estado: sirve en el servidor y en el cliente.

import type { ReactNode } from 'react';
import { IconoCheck } from '@/components/iconos';
import type { Renglon, TotalesFactura } from '@/lib/contabilidad/montos';
import { formatAmount } from '@/lib/currency';

export interface DatosReplica {
  emisor: { nombre: string; rif: string; domicilio: string; telefono: string | null };
  imprenta: { nombre: string; rif: string; autorizacion: string; elaboradoEl: string | null };
  rango: { serie: string; desdeTexto: string; hastaTexto: string; controlDesde: string; controlHasta: string; documentos: number };
  numeroTexto: string;
  numeroControl: string;
  fecha: { dia: string; mes: string; anio: string } | null;
  comprador: { nombre: string; documento: string; domicilio: string; telefono: string } | null;
  condicionPago: 'CONTADO' | 'CREDITO' | null;
  renglones: Renglon[];
  totales: TotalesFactura | null;
  alicuota: number;
  anulada?: boolean;
}

/** Renglones del talonario (la Serie A trae 12) */
export const RENGLONES_TALONARIO = 12;

const monto = (n: number | null | undefined) => (n ? formatAmount(n) : '');

/** El número de la casilla, sobre su borde izquierdo */
function Marca({ n, activa }: { n: number; activa: boolean }) {
  if (!activa) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -left-2.5 top-1/2 z-[1] grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white ring-2 ring-white"
    >
      {n}
    </span>
  );
}

function Valor({ children, className = '', envolver = false }: { children: ReactNode; className?: string; envolver?: boolean }) {
  // Una descripción larga pasa a una segunda línea: quien la copia necesita el texto completo
  return <span className={`flex min-w-0 items-center px-2 font-semibold text-ink ${envolver ? 'py-1 leading-tight [overflow-wrap:anywhere]' : 'truncate'} ${className}`}>{children}</span>;
}

const etiqueta = 'flex items-center whitespace-nowrap px-2 text-[11px] font-bold uppercase tracking-wide';
const fila = 'relative grid h-8 border-b border-brand-700 last:border-b-0';
/** El renglón crece si la descripción no cabe en una línea */
const filaRenglon = 'relative grid min-h-8 border-b border-brand-700 last:border-b-0';

export default function ReplicaTalonario({ datos, marcas = false }: { datos: DatosReplica; marcas?: boolean }) {
  const { emisor, imprenta, rango, comprador, totales } = datos;
  const vacias = Math.max(0, RENGLONES_TALONARIO - datos.renglones.length);
  const tabla = 'grid-cols-[8%_minmax(0,1fr)_7%_18%_18%]';

  return (
    <div className="relative overflow-hidden rounded-lg border border-brand-200 bg-white p-4 pl-5 font-sans text-brand-700 shadow-sm" aria-label={`Factura ${rango.serie} ${datos.numeroTexto}`}>
      {datos.anulada && (
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-lg border-4 border-deal px-6 py-2 text-3xl font-bold tracking-widest text-deal opacity-80">
          ANULADA
        </span>
      )}

      {/* Cabecera: el emisor a la izquierda; la fecha y el número a la derecha */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,42%)] items-start gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight">{emisor.nombre}</p>
          <p className="mt-0.5 text-sm font-bold">RIF. {emisor.rif}</p>
          <p className="mt-1 text-[11px] leading-snug">
            {emisor.domicilio}
            {emisor.telefono ? ` · Teléfono: ${emisor.telefono}` : ''}
          </p>
        </div>
        <div className="grid gap-2">
          <div className="relative grid grid-cols-[auto_repeat(3,minmax(0,1fr))] rounded border-[1.5px] border-brand-700">
            <Marca n={1} activa={marcas} />
            <span className="flex items-center border-r-[1.5px] border-brand-700 py-1 pl-4 pr-2 text-[11px] font-bold leading-tight">FECHA DE<br />EMISIÓN</span>
            {(['DÍA', 'MES', 'AÑO'] as const).map((t, i) => (
              <span key={t} className={`grid grid-rows-[auto_2rem] ${i > 0 ? 'border-l border-brand-700' : ''}`}>
                <span className="border-b border-brand-700 text-center text-[11px] font-bold">{t}</span>
                <Valor className="justify-center tabular-nums">{datos.fecha ? [datos.fecha.dia, datos.fecha.mes, datos.fecha.anio][i] : ''}</Valor>
              </span>
            ))}
          </div>
          <div className="rounded border-[1.5px] border-brand-700 py-1 text-center">
            <p className="text-base font-bold tracking-wider">FACTURA</p>
            <p className="text-[11px] font-bold tracking-wide">SERIE {rango.serie}</p>
            <p className="text-lg font-bold tabular-nums text-deal">Nº {datos.numeroTexto}</p>
          </div>
        </div>
      </div>

      {/* El cliente */}
      <div className="mt-3 rounded border-[1.5px] border-brand-700">
        <div className={`${fila} grid-cols-[auto_minmax(0,1fr)]`}>
          <Marca n={2} activa={marcas} />
          <span className={`${etiqueta} pl-4 normal-case`}>Nombre y Apellido o Razón Social:</span>
          <Valor>{comprador?.nombre}</Valor>
        </div>
        <div className={`${fila} grid-cols-[auto_minmax(0,1fr)]`}>
          <Marca n={3} activa={marcas} />
          <span className={`${etiqueta} pl-4 normal-case`}>Domicilio Fiscal:</span>
          <Valor>{comprador?.domicilio}</Valor>
        </div>
        <div className="grid grid-cols-[1.15fr_1fr_1.15fr]">
          {[
            { n: 4, t: 'Nº de RIF / C.I. o Pasaporte', v: <Valor className="pl-4 tabular-nums">{comprador?.documento}</Valor> },
            { n: 5, t: 'Teléfono', v: <Valor className="pl-4 tabular-nums">{comprador?.telefono}</Valor> },
            {
              n: 6,
              t: 'Condiciones de pago',
              v: (
                <span className="flex items-center justify-center gap-4 text-[11px] font-semibold">
                  {(['CREDITO', 'CONTADO'] as const).map((c) => (
                    <span key={c} className="inline-flex items-center gap-1.5">
                      {c === 'CREDITO' ? 'Crédito' : 'Contado'}
                      <span className={`grid h-3.5 w-3.5 place-items-center rounded-full border border-brand-700 text-[11px] leading-none ${datos.condicionPago === c ? 'border-ink bg-ink text-white' : ''}`}>
                        {datos.condicionPago === c ? <IconoCheck className="h-2.5 w-2.5" aria-hidden="true" /> : null}
                      </span>
                    </span>
                  ))}
                </span>
              ),
            },
          ].map((c, i) => (
            <div key={c.n} className={`relative grid grid-rows-[1.25rem_2rem] ${i > 0 ? 'border-l border-brand-700' : ''}`}>
              <Marca n={c.n} activa={marcas} />
              <span className={`${etiqueta} justify-center border-b border-brand-700`}>{c.t}</span>
              {c.v}
            </div>
          ))}
        </div>
      </div>

      {/* Los renglones */}
      <div className="mt-3 rounded border-[1.5px] border-brand-700">
        <div className={`grid h-9 border-b border-brand-700 ${tabla} [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:text-center [&>span]:text-[11px] [&>span]:font-bold [&>span]:leading-tight [&>span:not(:first-child)]:border-l [&>span:not(:first-child)]:border-brand-700`}>
          <span>CANT.</span><span>DESCRIPCIÓN</span><span>(E)</span><span>PRECIO VENTA UNITARIO</span><span>MONTO</span>
        </div>
        <div className="relative">
          <Marca n={7} activa={marcas && datos.renglones.length > 0} />
          {datos.renglones.map((r, i) => (
            <div key={i} className={`${filaRenglon} ${tabla} [&>*:not(:first-child)]:border-l [&>*:not(:first-child)]:border-brand-700`}>
              <Valor className="justify-center tabular-nums">{String(r.cantidad).padStart(2, '0')}</Valor>
              <Valor className="font-medium" envolver>{r.descripcion}</Valor>
              <Valor className="justify-center">{r.exento ? '(E)' : ''}</Valor>
              <Valor className="justify-end tabular-nums">{monto(r.precioUnitarioBs)}</Valor>
              <Valor className="justify-end tabular-nums">{monto(r.montoBs)}</Valor>
            </div>
          ))}
        </div>
        {vacias > 0 && (
          <div className="relative border-t border-brand-700">
            <Marca n={8} activa={marcas && datos.renglones.length > 0} />
            {Array.from({ length: vacias }, (_, i) => (
              <div key={i} className={`${fila} ${tabla} [&>span:not(:first-child)]:border-l [&>span:not(:first-child)]:border-brand-700`}>
                <span /><span /><span /><span /><span />
              </div>
            ))}
            {datos.renglones.length > 0 && (
              <svg aria-hidden="true" className="pointer-events-none absolute left-[8%] top-0 h-full w-[92%] text-ink" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M6 94 L62 6" fill="none" stroke="currentColor" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
                <path d="M86 94 L97 6" fill="none" stroke="currentColor" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* El pie: el control a la izquierda, los totales a la derecha */}
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-start gap-3">
        <div className="grid gap-1.5">
          <p className="text-[11px] font-bold">Este Documento va sin Tachadura ni Enmendadura</p>
          <div className="rounded border-[1.5px] border-brand-700 px-3 py-1">
            <p className="text-sm font-bold tracking-wide">Nº DE CONTROL</p>
            <p className="text-lg font-bold tabular-nums text-deal">{datos.numeroControl}</p>
          </div>
          <p className="font-serif text-sm font-bold text-deal">ORIGINAL</p>
          <p className="text-[11px] font-bold leading-snug">ORIGINAL: solo el original da derecho a crédito fiscal. COPIA: sin derecho a crédito fiscal.</p>
        </div>
        <div className="relative rounded border-[1.5px] border-brand-700">
          <Marca n={9} activa={marcas && Boolean(totales)} />
          {[
            { t: 'Adiciones al Precio', v: '' },
            { t: 'Descuento u Otros Ajustes al Precio', v: monto(totales?.descuentoBs) },
            { t: 'Total Base Imponible', v: monto(totales?.baseBs) },
            { t: 'Total Exento o Exonerado', v: monto(totales?.exentoBs) },
            { t: `IVA ${datos.alicuota} % Sobre Total Base Imponible`, v: monto(totales?.ivaBs) },
            { t: 'MONTO TOTAL', v: monto(totales?.totalBs), fuerte: true },
          ].map((f) => (
            <div key={f.t} className={`${fila} grid-cols-[minmax(0,1fr)_40%]`}>
              <span className={`flex items-center justify-end px-2 text-right text-[11px] font-bold leading-tight ${f.fuerte ? 'text-xs' : ''}`}>{f.t}</span>
              <Valor className={`justify-end border-l border-brand-700 tabular-nums ${f.fuerte ? 'text-base' : ''}`}>{f.v}</Valor>
            </div>
          ))}
        </div>
      </div>

      {/* El pie de imprenta */}
      <p className="mt-3 rounded border-[1.5px] border-brand-700 px-2 py-1 text-center text-[11px] leading-snug">
        {imprenta.nombre} · RIF {imprenta.rif} · Autorizado: {imprenta.autorizacion}
        <br />
        Nº de Factura Serie {rango.serie} desde {rango.desdeTexto} hasta {rango.hastaTexto} · Documentos emitidos: {rango.documentos} · Nº de control desde el {rango.controlDesde} hasta el {rango.controlHasta}
        {imprenta.elaboradoEl ? ` · Elaborado: ${imprenta.elaboradoEl}` : ''}
      </p>
    </div>
  );
}
