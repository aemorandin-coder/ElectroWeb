import Image from 'next/image';
import { formatUSD, formatVES } from '@/lib/currency';
import { lineasDeTexto } from '@/lib/cotizaciones/core';
import type { CotizacionPublica } from '@/lib/cotizaciones';

// La cotización como documento (C-148): la misma hoja en pantalla y al imprimir o guardar en PDF.
// Sigue el orden de los presupuestos que Andrés hacía a mano: empresa, número y fecha, cliente, equipos, condiciones,
// total, formas de pago, garantía y firmas. No es un documento fiscal.
// Firmas (C-148b): por la tienda va su sello; por el cliente, la aprobación digital (nombre, cédula o RIF, fecha y
// hora). Mientras no la apruebe, la hoja impresa dice que está pendiente y trae el código para aprobarla.

export interface EmpresaCotizacion {
  /** El nombre de la marca, como en el encabezado de la tienda ("Electro Shop") */
  marca: string;
  /** El ícono de la tienda (Configuración → logo) */
  logo: string | null;
  /** La razón social, para las firmas y la línea del RIF */
  nombre: string;
  lema: string | null;
  rif: string | null;
  direccion: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  sitio: string;
  tasaVES: number;
  /** Los métodos de pago activos con sus datos para pagar, como en el pago de la tienda (decisión de Andrés del 01/10) */
  pagos: { nombre: string; lineas: string[] }[];
  /** "Guanare - Portuguesa", para el sello */
  lugar: string | null;
  /** Imagen del sello firmado (Configuración → Negocio). Sin ella se dibuja el sello con los datos de la empresa.
   *  Se pide al doble de su tamaño en pantalla para que salga nítida al imprimir. */
  selloFirmado: string | null;
}

/** El QR del enlace del presupuesto, para aprobarlo desde la hoja impresa */
export interface QrCotizacion {
  tamano: number;
  camino: string;
}

const fechaLarga = (iso: string) => {
  const texto = new Date(iso).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{etiqueta}</dt>
      <dd className="break-words text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

/** El sello de la tienda: el logo largo del membrete, el RIF, el teléfono y la ciudad (pedido de Andrés del 01/10). */
function Sello({ empresa }: { empresa: EmpresaCotizacion }) {
  return (
    <div className="inline-block -rotate-3 rounded-xl border-2 border-brand-600 p-0.5 text-brand-700" data-sello>
      <div className="whitespace-nowrap rounded-lg border border-brand-600 px-3 py-1.5 text-center">
        <p className="flex items-center justify-center gap-1.5">
          {empresa.logo && (
            <span className="relative h-6 w-6 shrink-0">
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

export default function DocumentoCotizacion({ cotizacion: c, empresa, qr }: { cotizacion: CotizacionPublica; empresa: EmpresaCotizacion; qr?: QrCotizacion | null }) {
  const { totales } = c;
  const condiciones = lineasDeTexto(c.conditions);
  const terminos = lineasDeTexto(c.terms);
  const fecha = c.sentAt ?? c.createdAt;
  const aprobada = Boolean(c.approvedAt && c.approvedName);
  const fechaAprobacion = c.approvedAt ? new Date(c.approvedAt).toLocaleString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const contacto = [empresa.whatsapp && `WhatsApp: ${empresa.whatsapp}`, empresa.telefono && empresa.telefono !== empresa.whatsapp && `Tel.: ${empresa.telefono}`].filter(Boolean).join(' · ');

  return (
    <article className="mx-auto max-w-4xl rounded-2xl border border-line bg-white p-5 text-ink sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0">
      <header className="flex flex-col gap-4 border-b-2 border-brand-500 pb-4 sm:flex-row sm:items-start sm:justify-between print:pb-3">
        <div className="min-w-0">
          {/* Membrete con el logo largo de la tienda (pedido de Andrés del 30/09): el ícono y el nombre con la letra
              de la marca, igual que en el encabezado. Color liso: un degradado no sale al imprimir. */}
          <p className="flex items-center gap-2.5" data-membrete>
            {empresa.logo && (
              <span className="relative h-11 w-11 shrink-0">
                <Image src={empresa.logo} alt="" fill sizes="44px" className="object-contain" priority />
              </span>
            )}
            <span className="font-brand min-w-0 text-2xl font-bold tracking-tight text-brand-600 sm:text-3xl">{empresa.marca}</span>
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            {[empresa.nombre !== empresa.marca ? empresa.nombre : null, empresa.lema].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-1 text-xs text-muted">
            {[empresa.rif && `RIF: ${empresa.rif}`, empresa.direccion].filter(Boolean).join(' · ')}
          </p>
          <p className="text-xs text-muted">{[contacto, empresa.correo, empresa.sitio].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-2xl font-bold text-ink">Presupuesto</p>
          <p className="font-mono text-sm font-semibold text-brand-700">N.º {c.number}</p>
          <p className="mt-1 text-xs text-muted">{fechaLarga(fecha)}</p>
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl bg-surface p-4 sm:grid-cols-2 print:mt-3 print:grid-cols-2 print:gap-y-2 print:p-3">
        <Dato etiqueta="Cliente o empresa">{c.clientName}</Dato>
        {c.clientDoc && <Dato etiqueta="RIF o cédula">{c.clientDoc}</Dato>}
        {c.contactName && <Dato etiqueta="Atención">{c.contactName}</Dato>}
        {c.location && <Dato etiqueta="Ubicación">{c.location}</Dato>}
        {c.subject && <Dato etiqueta="Para">{c.subject}</Dato>}
        <Dato etiqueta="Validez">
          {c.validityDays} días continuos{c.venceEl ? `, hasta el ${new Date(c.venceEl).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
        </Dato>
      </dl>

      <div className="mt-4 overflow-x-auto print:mt-3 print:overflow-visible">
        <table className="w-full min-w-[32rem] text-sm print:min-w-0">
          <thead>
            <tr className="bg-brand-600 text-left text-xs font-semibold uppercase tracking-wide text-white">
              <th scope="col" className="rounded-l-lg px-3 py-2">Descripción</th>
              <th scope="col" className="px-3 py-2 text-right">Cant.</th>
              <th scope="col" className="px-3 py-2 text-right">Precio unit.</th>
              <th scope="col" className="rounded-r-lg px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {c.items.map((l) => (
              <tr key={l.id} className="border-b border-line align-top break-inside-avoid">
                <td className="px-3 py-3 print:py-2">
                  <p className="font-semibold text-ink">{l.title}</p>
                  {l.description && <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-ink-soft">{l.description}</p>}
                </td>
                <td className="px-3 py-3 text-right tabular-nums print:py-2">{l.quantity}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums print:py-2">{formatUSD(l.unitPriceUSD)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums print:py-2">{l.unitPriceUSD === 0 ? 'Incluido' : formatUSD(Math.round(l.unitPriceUSD * l.quantity * 100) / 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 print:mt-3 print:grid-cols-2">
        <section aria-labelledby="cot-condiciones" className="break-inside-avoid">
          {condiciones.length > 0 && (
            <>
              <h2 id="cot-condiciones" className="text-sm font-bold text-ink">Condiciones comerciales</h2>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-relaxed text-ink-soft">
                {condiciones.map((linea) => <li key={linea}>{linea}</li>)}
              </ul>
            </>
          )}
        </section>

        <section aria-label="Total" className="break-inside-avoid rounded-xl border border-line p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-bold uppercase tracking-wide text-ink">Monto total</p>
            <p className="text-2xl font-bold tabular-nums text-brand-700" data-total>{formatUSD(totales.totalUSD)}</p>
          </div>
          {empresa.tasaVES > 0 && (
            <p className="text-right text-xs tabular-nums text-muted">{formatVES(Math.round(totales.totalUSD * empresa.tasaVES * 100) / 100)} a la tasa BCV de hoy ({formatVES(empresa.tasaVES)})</p>
          )}
          {totales.ivaUSD > 0 && (
            <p className="mt-1 text-right text-xs text-ink-soft" data-iva>
              IVA incluido ({c.taxPercent} %): <strong className="font-semibold text-ink">{formatUSD(totales.ivaUSD)}</strong> · Base imponible: {formatUSD(totales.baseUSD)}
            </p>
          )}
          {totales.anticipoUSD !== null && totales.saldoUSD !== null && (
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="font-semibold text-ink">Anticipo ({c.advancePercent} %)</dt><dd className="font-semibold tabular-nums text-ink">{formatUSD(totales.anticipoUSD)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-soft">Saldo contra entrega</dt><dd className="tabular-nums text-ink-soft">{formatUSD(totales.saldoUSD)}</dd></div>
            </dl>
          )}
        </section>
      </div>

      <section aria-labelledby="cot-pago" className="mt-4 break-inside-avoid print:mt-3" data-pagos>
        <h2 id="cot-pago" className="text-sm font-bold text-ink">Formas de pago</h2>
        {empresa.pagos.length > 0 ? (
          <ul className="mt-2 grid gap-2 sm:grid-cols-3 print:grid-cols-3">
            {empresa.pagos.map((pago) => (
              <li key={pago.nombre} className="rounded-lg border border-line p-2.5 text-xs leading-relaxed text-ink-soft">
                <p className="font-semibold text-ink">{pago.nombre}</p>
                {pago.lineas.map((linea) => <p key={linea} className="break-words">{linea}</p>)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">Las que la tienda tenga activas al momento de pagar.</p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          Al pagar, avísanos{empresa.whatsapp ? ` por WhatsApp al ${empresa.whatsapp}` : ''} con el número de este presupuesto ({c.number}) para confirmar el pedido.
        </p>
      </section>

      {/* Al imprimir, la garantía y las firmas van juntas: si no caben, pasan las dos a la otra hoja (unas firmas
          solas en una hoja parecen un papel suelto). Con una garantía muy larga se deja partir. */}
      <div className={terminos.length <= 8 ? 'break-inside-avoid' : undefined}>
        {terminos.length > 0 && (
          <section aria-labelledby="cot-terminos" className="mt-4 break-inside-avoid print:mt-3">
            <h2 id="cot-terminos" className="text-sm font-bold text-ink">Entrega y garantía</h2>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-ink-soft">
              {terminos.map((linea) => <li key={linea}>{linea}</li>)}
            </ol>
          </section>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 break-inside-avoid text-center text-xs text-ink-soft sm:grid-cols-2 print:mt-3 print:grid-cols-2" data-firmas>
          <div className="flex flex-col">
            <div className="flex flex-1 items-end justify-center pb-1 sm:min-h-24 print:min-h-16">
              {empresa.selloFirmado ? (
                <span className="relative block h-24 w-44 print:h-16 print:w-40" data-sello-firmado>
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
                <div className="rounded-xl border-2 border-success-strong px-3 py-1.5 text-success-strong" data-aprobada>
                  <p className="text-xs font-bold uppercase tracking-wide">Aprobado</p>
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
                    <strong className="block font-semibold text-warning-strong">Pendiente de aprobación</strong>
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
    </article>
  );
}
