import Image from 'next/image';
import { FiAlertTriangle, FiCheckCircle, FiClock } from 'react-icons/fi';
import { formatUSD, formatVES } from '@/lib/currency';
import { fechaCorta, fechaHora, fechaLarga, lineasDeTexto, totalLinea } from '@/lib/cotizaciones/core';
import type { CotizacionPublica } from '@/lib/cotizaciones';
import type { EmpresaCotizacion } from '@/lib/cotizaciones/empresa';

// La cotización como documento (C-148), con el estilo del presupuesto técnico que eligió Luis (C-182, maqueta A):
// membrete con el recuadro del documento, el cliente en un recuadro gris, las partidas con el encabezado azul noche,
// las condiciones al lado de los totales (anticipo en verde, saldo en rojo), la nota de lo que no incluye en ámbar,
// la garantía, las firmas y, si hay, el anexo técnico en una segunda hoja. La misma hoja en pantalla y al imprimir.
// No es un documento fiscal. En blanco y negro (data-tinta="bn" al imprimir) los fondos de color pasan a bordes.
// Firmas (C-148b): por la tienda va su sello; por el cliente, la aprobación digital (nombre, cédula o RIF, fecha y
// hora). Mientras no la apruebe, la hoja impresa dice que está pendiente y trae el código para aprobarla.

export type { EmpresaCotizacion };

/** El QR del enlace del presupuesto, para aprobarlo desde la hoja impresa */
export interface QrCotizacion {
  tamano: number;
  camino: string;
}

/** El sello de la tienda: el logo largo del membrete, el RIF, el teléfono y la ciudad (pedido de Andrés del 01/10). */
function Sello({ empresa }: { empresa: EmpresaCotizacion }) {
  return (
    <div className="inline-block -rotate-3 rounded-xl border-2 border-brand-600 p-0.5 text-brand-700" data-sello data-bn="tinta">
      <div className="whitespace-nowrap rounded-lg border border-brand-600 px-3 py-1.5 text-center">
        <p className="flex items-center justify-center gap-1.5">
          {empresa.logo && (
            <span className="relative h-6 w-6 shrink-0" data-bn="imagen">
              <Image src={empresa.logo} alt="" fill sizes="24px" className="object-contain" />
            </span>
          )}
          <span className="font-brand text-lg font-bold leading-none tracking-tight text-brand-600">{empresa.marca}</span>
        </p>
        {empresa.rif && <p className="mt-1 text-xs font-semibold leading-tight">RIF: {empresa.rif}</p>}
        {(empresa.telefono || empresa.whatsapp) && <p className="text-xs leading-tight">Tel.: {empresa.telefono || empresa.whatsapp}</p>}
        {empresa.lugar && <p className="text-xs font-semibold uppercase leading-tight tracking-wide">{empresa.lugar}</p>}
      </div>
    </div>
  );
}

/** El membrete de cada hoja: la empresa a la izquierda y el recuadro del documento a la derecha */
function Membrete({ empresa, titulo, numero, filas, estado }: {
  empresa: EmpresaCotizacion; titulo: string; numero: string; filas: React.ReactNode; estado?: React.ReactNode;
}) {
  const contacto = [empresa.whatsapp && `WhatsApp: ${empresa.whatsapp}`, empresa.telefono && empresa.telefono !== empresa.whatsapp && `Tel.: ${empresa.telefono}`].filter(Boolean).join(' · ');
  return (
    <header className="grid gap-4 border-b-2 border-brand-950 pb-4 sm:grid-cols-[1.45fr_1fr] sm:items-start print:grid-cols-[1.45fr_1fr] print:pb-3" data-bn="raya">
      <div className="flex min-w-0 items-start gap-3">
        {/* Membrete con el logo largo de la tienda (pedido de Andrés del 30/09): el ícono y el nombre con la letra de la
            marca. Color liso: un degradado no sale al imprimir. */}
        {empresa.logo && (
          <span className="relative h-12 w-12 shrink-0" data-bn="imagen">
            <Image src={empresa.logo} alt="" fill sizes="48px" className="object-contain" priority />
          </span>
        )}
        <div className="min-w-0" data-membrete>
          <p className="font-brand text-2xl font-bold leading-none tracking-tight text-brand-600 sm:text-3xl" data-bn="tinta">{empresa.marca}</p>
          {empresa.nombre !== empresa.marca && <p className="mt-1.5 text-xs font-bold uppercase tracking-wide text-brand-950">{empresa.nombre}</p>}
          {empresa.lema && <p className="text-xs text-ink-soft">{empresa.lema}</p>}
          <p className="text-xs text-ink-soft">{[empresa.rif && `RIF: ${empresa.rif}`, empresa.direccion].filter(Boolean).join(' · ')}</p>
          <p className="text-xs text-ink-soft">{[contacto, empresa.correo, empresa.sitio].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <div className="rounded-lg border-[1.5px] border-brand-950 bg-surface px-3.5 py-2.5 sm:text-right print:text-right" data-bn="recuadro">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-950">{titulo}</p>
        <p className="mt-0.5 text-lg font-bold tabular-nums text-brand-500" data-bn="tinta">N.º {numero}</p>
        <div className="mt-1 space-y-0.5 text-xs text-ink-soft">{filas}</div>
        {estado}
      </div>
    </header>
  );
}

/** El anexo técnico: párrafos, listas ("- ") y tablas (líneas con "|", la primera es el encabezado) */
function Anexo({ texto }: { texto: string }) {
  const bloques: React.ReactNode[] = [];
  const lineas = texto.split('\n');
  for (let i = 0; i < lineas.length;) {
    const linea = lineas[i].trim();
    if (!linea) { i++; continue; }
    if (linea.includes('|')) {
      const filas: string[][] = [];
      while (i < lineas.length && lineas[i].includes('|')) {
        filas.push(lineas[i].split('|').map((c) => c.trim()));
        i++;
      }
      const [cabeza, ...cuerpo] = filas;
      // En el teléfono, una tabla ancha se desliza de lado en vez de cortarse; al imprimir sale completa
      bloques.push(
        <div key={i} className="mt-3 overflow-x-auto print:overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-950 text-left text-xs font-semibold uppercase tracking-wide text-white" data-bn="cabeza">
                {cabeza.map((c, k) => <th key={k} scope="col" className={`px-2.5 py-2 sm:px-3 ${k ? 'text-right' : ''} ${k === 0 ? 'rounded-tl-md' : ''} ${k === cabeza.length - 1 ? 'rounded-tr-md' : ''}`}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {cuerpo.map((f, n) => (
                <tr key={n} className="border-b border-line even:bg-surface">
                  {cabeza.map((_, k) => <td key={k} className={`px-2.5 py-2 align-top sm:px-3 ${k ? 'whitespace-nowrap text-right tabular-nums' : 'min-w-32 font-semibold text-brand-950'}`}>{f[k] ?? ''}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (linea.startsWith('- ')) {
      const items: string[] = [];
      while (i < lineas.length && lineas[i].trim().startsWith('- ')) {
        items.push(lineas[i].trim().slice(2));
        i++;
      }
      bloques.push(<ul key={i} className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-soft">{items.map((t, k) => <li key={k}>{t}</li>)}</ul>);
      continue;
    }
    const parrafo: string[] = [];
    while (i < lineas.length && lineas[i].trim() && !lineas[i].includes('|') && !lineas[i].trim().startsWith('- ')) {
      parrafo.push(lineas[i].trim());
      i++;
    }
    bloques.push(<p key={i} className="mt-3 text-sm leading-relaxed text-ink-soft">{parrafo.join(' ')}</p>);
  }
  return <>{bloques}</>;
}

export default function DocumentoCotizacion({ cotizacion: c, empresa, qr }: { cotizacion: CotizacionPublica; empresa: EmpresaCotizacion; qr?: QrCotizacion | null }) {
  const { totales } = c;
  const condiciones = lineasDeTexto(c.conditions);
  const terminos = lineasDeTexto(c.terms);
  const fecha = c.sentAt ?? c.createdAt;
  const aprobada = Boolean(c.approvedAt && c.approvedName);
  const fechaAprobacion = c.approvedAt ? fechaHora(c.approvedAt) : '';
  const conRetencion = totales.retencionUSD > 0;

  const estado = aprobada ? (
    <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-success/45 bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success-strong" data-bn="sello">
      <FiCheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> Aprobado el {new Date(c.approvedAt!).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })}
    </p>
  ) : c.status === 'EXPIRED' ? (
    <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-deal/40 bg-deal-bg px-2.5 py-0.5 text-xs font-bold text-deal" data-bn="sello">Vencido</p>
  ) : c.status === 'SENT' ? (
    <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-warning/45 bg-warning/10 px-2.5 py-0.5 text-xs font-bold text-warning-strong" data-bn="sello">
      <FiClock className="h-3.5 w-3.5" aria-hidden="true" /> Pendiente de aprobación
    </p>
  ) : null;

  return (
    <article className="mx-auto max-w-4xl text-ink" data-documento>
      {/* ---------------- Hoja 1: el presupuesto */}
      <section className="rounded-2xl border border-line bg-white p-5 sm:p-8 print:rounded-none print:border-0 print:p-0">
        <Membrete empresa={empresa} titulo="Presupuesto" numero={c.number} estado={estado} filas={<>
          <p><strong className="font-semibold text-ink">Fecha:</strong> {fechaLarga(fecha)}</p>
          <p><strong className="font-semibold text-ink">Validez:</strong> {c.validityDays} días{c.venceEl ? `, hasta el ${fechaCorta(c.venceEl)}` : ''}</p>
        </>} />

        <div className="mt-4 grid gap-x-6 gap-y-1 rounded-lg border border-line-strong bg-surface px-4 py-3 text-sm text-ink-soft sm:grid-cols-[1.2fr_1fr] print:mt-3 print:grid-cols-[1.2fr_1fr] print:py-2" data-bn="recuadro">
          <div className="space-y-0.5">
            <p><strong className="font-bold text-brand-950">Cliente o empresa:</strong> {c.clientName}</p>
            {c.clientDoc && <p><strong className="font-bold text-brand-950">RIF o cédula:</strong> {c.clientDoc}</p>}
            {c.contactName && <p><strong className="font-bold text-brand-950">Atención:</strong> {c.contactName}</p>}
          </div>
          <div className="space-y-0.5 sm:text-right print:text-right">
            {c.location && <p><strong className="font-bold text-brand-950">Ubicación:</strong> {c.location}</p>}
            {c.subject && <p><strong className="font-bold text-brand-950">Para:</strong> {c.subject}</p>}
          </div>
        </div>

        {/* Las partidas: tabla desde tabletas y al imprimir; en el teléfono, una debajo de otra */}
        <table className="mt-4 hidden w-full text-sm sm:table print:mt-3 print:table">
          <thead>
            <tr className="bg-brand-950 text-left text-xs font-semibold uppercase tracking-wide text-white" data-bn="cabeza">
              <th scope="col" className="rounded-tl-md px-3 py-2">Descripción</th>
              <th scope="col" className="px-3 py-2 text-center">Cant.</th>
              <th scope="col" className="px-3 py-2 text-right">Precio unit.</th>
              <th scope="col" className="rounded-tr-md px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {c.items.map((l) => (
              <tr key={l.id} className="break-inside-avoid border-b border-line align-top even:bg-surface">
                <td className="px-3 py-2.5 print:py-1.5">
                  <p className="font-bold text-brand-950">{l.title}</p>
                  {l.description && <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-ink-soft">{l.description}</p>}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums print:py-1.5">{l.quantity}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums print:py-1.5">{formatUSD(l.unitPriceUSD)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums print:py-1.5">{l.unitPriceUSD === 0 ? 'Incluido' : formatUSD(totalLinea(l.unitPriceUSD, l.quantity))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="mt-4 divide-y divide-line border-y border-line sm:hidden print:hidden">
          {c.items.map((l) => (
            <li key={l.id} className="py-3">
              <p className="font-bold text-brand-950">{l.title}</p>
              {l.description && <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-ink-soft">{l.description}</p>}
              <p className="mt-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="tabular-nums text-ink-soft"><strong className="font-bold text-ink">{l.quantity}</strong> × {formatUSD(l.unitPriceUSD)} c/u</span>
                <strong className="tabular-nums">{l.unitPriceUSD === 0 ? 'Incluido' : formatUSD(totalLinea(l.unitPriceUSD, l.quantity))}</strong>
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-4 sm:grid-cols-[0.95fr_1.3fr] sm:items-start print:mt-3 print:grid-cols-[0.95fr_1.3fr]">
          <section aria-labelledby="cot-condiciones" className="break-inside-avoid rounded-lg border border-line bg-surface px-3.5 py-3 text-xs leading-relaxed text-ink-soft" data-bn="recuadro">
            {condiciones.length > 0 && (
              <>
                <h2 id="cot-condiciones" className="text-sm font-bold text-brand-950">Condiciones comerciales</h2>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">{condiciones.map((linea) => <li key={linea}>{linea}</li>)}</ul>
              </>
            )}
            <div data-pagos>
              <h2 className={`text-sm font-bold text-brand-950 ${condiciones.length > 0 ? 'mt-2.5' : ''}`}>Formas de pago</h2>
              {empresa.pagos.length > 0 ? (
                <ul className="mt-1 space-y-0.5">
                  {empresa.pagos.map((pago) => (
                    <li key={pago.nombre} className="break-words"><strong className="font-semibold text-ink">{pago.nombre}:</strong> {pago.lineas.map((x) => x.replace(/^[^:]+: /, '')).join(' · ')}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1">Las que la tienda tenga activas al momento de pagar.</p>
              )}
              <p className="mt-1.5">Al pagar, avísanos{empresa.whatsapp ? ` por WhatsApp al ${empresa.whatsapp}` : ''} con el número de este presupuesto ({c.number}) para confirmar el pedido.</p>
            </div>
          </section>

          <section aria-label="Total" className="break-inside-avoid">
            <table className="w-full text-sm">
              <tbody>
                {totales.ivaUSD > 0 && (
                  <>
                    <tr><td className="px-3 py-1 text-ink-soft">Base imponible</td><td className="whitespace-nowrap px-3 py-1 text-right font-semibold tabular-nums text-brand-950">{formatUSD(totales.baseUSD)}</td></tr>
                    <tr data-iva><td className="px-3 py-1 text-ink-soft">IVA ({c.taxPercent} %), incluido en los precios</td><td className="whitespace-nowrap px-3 py-1 text-right font-semibold tabular-nums text-brand-950">{formatUSD(totales.ivaUSD)}</td></tr>
                  </>
                )}
                <tr className="border-t-[1.5px] border-brand-950" data-bn="raya">
                  <td className="px-3 pb-0.5 pt-2 text-base font-bold text-brand-950">Monto total</td>
                  <td className="whitespace-nowrap px-3 pb-0.5 pt-2 text-right text-xl font-bold tabular-nums text-brand-950" data-total>{formatUSD(totales.totalUSD)}</td>
                </tr>
                {empresa.tasaVES > 0 && (
                  <tr><td colSpan={2} className="px-3 pb-1 text-right text-xs tabular-nums text-muted">{formatVES(Math.round(totales.totalUSD * empresa.tasaVES * 100) / 100)} a la tasa BCV de hoy ({formatVES(empresa.tasaVES)})</td></tr>
                )}
                {conRetencion && (
                  <>
                    <tr data-retencion><td className="px-3 py-1 text-ink-soft">Retención del IVA ({c.ivaRetentionPercent} %), la practica el cliente</td><td className="whitespace-nowrap px-3 py-1 text-right tabular-nums text-ink-soft">−{formatUSD(totales.retencionUSD)}</td></tr>
                    <tr><td className="px-3 py-1 font-bold text-ink">Neto a pagar a {empresa.marca}</td><td className="whitespace-nowrap px-3 py-1 text-right text-lg font-bold tabular-nums text-brand-950" data-neto>{formatUSD(totales.netoUSD)}</td></tr>
                    {empresa.tasaVES > 0 && <tr><td colSpan={2} className="px-3 text-right text-xs tabular-nums text-muted">{formatVES(Math.round(totales.netoUSD * empresa.tasaVES * 100) / 100)} a la tasa BCV de hoy</td></tr>}
                    <tr><td colSpan={2} className="px-3 pb-1 text-xs leading-relaxed text-muted">El cliente retiene ese monto del IVA al pagar y le entrega a {empresa.nombre} su comprobante de retención.</td></tr>
                  </>
                )}
                {totales.anticipoUSD !== null && totales.saldoUSD !== null && (
                  <>
                    <tr aria-hidden="true"><td colSpan={2} className="h-1.5 p-0" /></tr>
                    <tr className="bg-success/10 text-success-strong" data-bn="resaltado">
                      <td className="rounded-l-md px-3 py-1.5 font-bold">Anticipo ({c.advancePercent} %{conRetencion ? ' del neto' : ''})</td>
                      <td className="whitespace-nowrap rounded-r-md px-3 py-1.5 text-right text-base font-bold tabular-nums">{formatUSD(totales.anticipoUSD)}</td>
                    </tr>
                    <tr aria-hidden="true"><td colSpan={2} className="h-1.5 p-0" /></tr>
                    <tr className="bg-deal-bg text-deal" data-bn="resaltado">
                      <td className="rounded-l-md px-3 py-1.5 font-bold">Saldo contra entrega ({100 - (c.advancePercent ?? 0)} %)</td>
                      <td className="whitespace-nowrap rounded-r-md px-3 py-1.5 text-right font-bold tabular-nums">{formatUSD(totales.saldoUSD)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </section>
        </div>

        {c.notice && (
          <section className="mt-4 break-inside-avoid rounded-lg border border-l-4 border-warning/45 border-l-warning bg-warning/10 px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft print:mt-3" data-bn="nota" data-nota>
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-warning-strong" data-bn="tinta">
              <FiAlertTriangle className="h-4 w-4" aria-hidden="true" /> Nota importante: lo que no incluye
            </h2>
            <p className="mt-0.5 whitespace-pre-line">{c.notice}</p>
          </section>
        )}

        {/* Al imprimir, la garantía y las firmas van juntas: si no caben, pasan las dos a la otra hoja (unas firmas
            solas en una hoja parecen un papel suelto). Con una garantía muy larga se deja partir. */}
        <div className={terminos.length <= 8 ? 'break-inside-avoid' : undefined}>
          {terminos.length > 0 && (
            <section aria-labelledby="cot-terminos" className="mt-4 border-t border-line pt-3 print:mt-3">
              <h2 id="cot-terminos" className="text-sm font-bold text-brand-950">Entrega y garantía</h2>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs leading-relaxed text-ink-soft">
                {terminos.map((linea) => <li key={linea}>{linea}</li>)}
              </ol>
            </section>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 break-inside-avoid text-center text-xs text-ink-soft sm:grid-cols-2 sm:gap-10 print:mt-4 print:grid-cols-2" data-firmas>
            <div className="flex flex-col">
              <div className="flex flex-1 items-end justify-center pb-1 sm:min-h-24 print:min-h-16">
                {empresa.selloFirmado ? (
                  <span className="relative block h-24 w-44 print:h-16 print:w-40" data-sello-firmado data-bn="imagen">
                    <Image src={empresa.selloFirmado} alt={`Sello y firma de ${empresa.nombre}`} fill sizes="384px" className="object-contain object-bottom" />
                  </span>
                ) : (
                  <Sello empresa={empresa} />
                )}
              </div>
              <div className="border-t border-ink pt-2">
                <p className="font-semibold text-ink">Por {empresa.nombre}</p>
                <p>{empresa.rif ? `RIF: ${empresa.rif}` : 'Emisión del presupuesto'}</p>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-1 items-end justify-center pb-1 sm:min-h-24 print:min-h-16">
                {aprobada ? (
                  <div className="-rotate-2 rounded-xl border-2 border-success-strong px-3 py-1.5 text-success-strong" data-aprobada data-bn="tinta">
                    <p className="flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wide"><FiCheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> Aprobado</p>
                    <p className="text-xs font-semibold leading-tight text-ink">{c.approvedName}</p>
                    {c.approvedDoc && <p className="text-xs leading-tight text-ink">{c.approvedDoc}</p>}
                    <p className="text-xs leading-tight text-ink-soft">{fechaAprobacion}</p>
                  </div>
                ) : c.status === 'SENT' ? (
                  <div className="flex items-center gap-2 text-left" data-pendiente>
                    {qr && (
                      <svg viewBox={`0 0 ${qr.tamano} ${qr.tamano}`} role="img" aria-label="Código QR para abrir y aprobar este presupuesto" className="hidden h-20 w-20 shrink-0 print:block" shapeRendering="crispEdges">
                        <path d={qr.camino} className="fill-ink" />
                      </svg>
                    )}
                    <p className="max-w-52 text-xs leading-snug text-ink-soft">
                      <strong className="block font-semibold text-warning-strong" data-bn="tinta">Pendiente de aprobación</strong>
                      <span className="print:hidden">Se aprueba en esta página, con tu nombre y tu cédula o RIF.</span>
                      <span className="hidden print:inline">Para aprobarlo, escanea el código y escribe tu nombre y tu cédula o RIF.</span>
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="border-t border-ink pt-2">
                <p className="font-semibold text-ink">Por {c.clientName}</p>
                <p>{aprobada ? 'Aprobación registrada con fecha y hora' : 'Conformidad y aprobación'}</p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted print:mt-2">Este presupuesto no es una factura.</p>
        </div>
      </section>

      {/* ---------------- Hoja 2: el anexo técnico, si lo hay */}
      {c.annex && (
        <section className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-8 print:mt-0 print:break-before-page print:rounded-none print:border-0 print:p-0" data-anexo>
          <Membrete empresa={empresa} titulo="Anexo técnico" numero={`${c.number} · 1`} filas={<>
            {c.annexTitle && <p><strong className="font-semibold text-ink">Contenido:</strong> {c.annexTitle}</p>}
            <p><strong className="font-semibold text-ink">Fecha:</strong> {fechaLarga(fecha)}</p>
          </>} />
          {c.annexTitle && <h2 className="mt-4 text-base font-bold text-brand-950">{c.annexTitle}</h2>}
          <Anexo texto={c.annex} />
          <p className="mt-6 text-center text-xs text-muted">Anexo del presupuesto {c.number}. No es una factura.</p>
        </section>
      )}
    </article>
  );
}
