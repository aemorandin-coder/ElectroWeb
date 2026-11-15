import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { IconoAdvertencia, IconoCalendario, IconoConfirmado, IconoEnvio, IconoPaquete, IconoUbicacion } from '@/components/iconos';
import AccionesDespacho, { CopiarDatos } from '@/components/proveedores/AccionesDespacho';
import { formatUSD } from '@/lib/currency';
import { fechaLarga } from '@/lib/horarios';
import { NOMBRE_EMPRESA, type EmpresaGuia } from '@/lib/envios/empresas';
import { getPublicSettings } from '@/lib/site-settings';
import { despachoPorToken, formatoDeToken } from '@/lib/proveedores/despacho';
import type { DespachoCorreo } from '@/lib/email-templates/proveedores';
import { adminBadge, adminNotice } from '@/lib/admin-ui';

// C-227: la página del aliado comercial, con el enlace firmado de su correo y sin cuenta. Lo mismo del correo (la empresa,
// la oficina, los datos de la guía, sus productos con su costo y el empaque) y lo que falta: "Lo estoy preparando" y la
// guía. Nunca el correo del cliente ni lo que pagó. Sin índice: el enlace es privado.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Despacho del pedido', robots: { index: false, follow: false } };

const kilos = (kg: number) => `${String(Math.round(kg * 100) / 100).replace('.', ',')} kg`;
const lugar = (d: DespachoCorreo) => [d.ciudad, d.estado].filter(Boolean).join(', ');

/**
 * Lo que pide la guía de ZOOM o MRW, en el orden de su formulario (C-246, el equipo: "tienes que insertar claramente dónde
 * el cliente necesita el envío, eso va a la guía de ZOOM"). Lo mismo se ve en la página y se copia con un toque.
 */
function filasGuia(d: DespachoCorreo): [string, string][] {
  return [
    ['Destinatario', d.destinatario.nombre],
    ['Cédula', d.destinatario.cedula],
    ['Teléfono', d.destinatario.telefono],
    ['Ciudad de destino', `${lugar(d)}${d.codigoCiudad ? ` (código ${d.codigoCiudad})` : ''}`],
    ...(d.modo === 'DOOR'
      ? [['Dirección de entrega', d.direccion ?? ''] as [string, string]]
      : [
        [`${d.empresa === 'MRW' ? 'Agencia' : 'Oficina'} de destino`, `${d.oficina?.nombre ?? ''}${d.oficina?.codigo ? ` (código ${d.oficina.codigo})` : ''}`] as [string, string],
        ...(d.oficina?.direccion ? [['Dirección de la oficina', d.oficina.direccion] as [string, string]] : []),
      ]),
    ['Contenido', d.productos.map((p) => `${p.cantidad} x ${p.nombre}`).join(', ')],
    ...(d.empaque ? [['Piezas', String(d.empaque.piezas)], ['Peso aprox.', kilos(d.empaque.pesoKg)]] as [string, string][] : []),
  ];
}

/** Lo que se pega en el formulario de la guía */
const textoGuia = (d: DespachoCorreo) =>
  [`Orden: ${d.numero}`, ...filasGuia(d).map(([r, v]) => `${r}: ${v}`), `Flete: ${d.cobroADestino ? 'cobro a destino' : 'confirmar con Electro Shop'}`].join('\n');

export default async function DespachoProveedorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!formatoDeToken(token)) notFound();
  const despacho = await despachoPorToken(token);
  if (!despacho) notFound();
  const d = despacho.datos;
  const empresa = NOMBRE_EMPRESA[d.empresa as EmpresaGuia] ?? d.empresa;
  const abierta = despacho.estado === 'abierta';
  const settings = await getPublicSettings().catch(() => null);
  const whatsapp = (settings?.whatsapp || '').replace(/\D/g, '');
  const conCosto = d.productos.every((p) => p.costo !== null);
  const total = d.productos.reduce((s, p) => s + (p.costo ?? 0) * p.cantidad, 0);

  const titulo = {
    abierta: '¡Se vendió su producto!',
    enviada: '¡Ya va en camino!',
    entregada: 'Pedido entregado',
    cancelada: 'No lo despache',
    'sin-pago': 'Todavía no se despacha',
  }[despacho.estado];

  return (
    <main className="min-h-dvh bg-surface px-4 pb-24 pt-5 sm:pt-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="font-brand text-lg text-brand-600">Electro Shop</Link>
          <span className={adminBadge('brand')}>Aliado comercial</span>
        </header>

        <section className="rounded-2xl border border-line bg-white p-5">
          <p className="text-sm font-semibold text-brand-600">{d.proveedor}</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">{titulo}</h1>
          <p className="mt-1 text-sm text-ink-soft">Orden {d.numero} · pagada {fechaLarga(d.pagadaEl)}</p>
          {abierta && (
            <p className={`${adminNotice('warning')} mt-4 flex items-center gap-3`}>
              <IconoCalendario aria-hidden="true" />
              <span>Llévelo a {empresa} a más tardar <strong>{fechaLarga(d.plazo)}</strong>.</span>
            </p>
          )}
          {despacho.estado === 'enviada' && despacho.guia && (
            <p className={`${adminNotice('success')} mt-4 flex items-start gap-2`}>
              <IconoConfirmado className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Anotó la guía <strong className="font-mono">{despacho.guia}</strong> de {empresa}. El cliente ya la recibió: gracias.</span>
            </p>
          )}
          {!abierta && despacho.estado !== 'enviada' && despacho.motivo && (
            <p className={`${adminNotice(despacho.estado === 'cancelada' ? 'danger' : 'neutral')} mt-4 flex items-start gap-2`} role="status">
              <IconoAdvertencia className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{despacho.motivo}{despacho.estado === 'cancelada' ? ' Si ya hizo la guía, pídale a la empresa que la anule.' : ''}</span>
            </p>
          )}
        </section>

        {abierta && (
          <section className="rounded-2xl border-2 border-brand-200 bg-white p-5 text-center" aria-label="Empresa de envío">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-700">Va por</p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-ink">{empresa}</p>
            <div className="mt-4 rounded-xl bg-brand-50 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-700">Envíelo a</p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-2xl font-bold text-brand-700">
                <IconoUbicacion className="h-6 w-6 shrink-0" aria-hidden="true" />
                {lugar(d) || 'Destino sin ciudad'}
              </p>
              {d.codigoCiudad && <p className="text-xs text-muted">Ciudad de destino en {empresa}: código {d.codigoCiudad}</p>}
              {d.modo === 'DOOR' ? (
                <>
                  <p className="mt-2 text-sm text-ink-soft">Puerta a puerta, a la casa del cliente:</p>
                  {d.direccion && <p className="font-semibold text-ink">{d.direccion}</p>}
                </>
              ) : (
                <>
                  <p className="mt-2 font-semibold text-ink">
                    {d.empresa === 'MRW' ? 'Agencia' : 'Oficina'} {empresa} {d.oficina?.nombre ?? ''}{d.oficina?.codigo ? ` · código ${d.oficina.codigo}` : ''}
                  </p>
                  {d.oficina?.direccion && <p className="text-sm text-ink-soft">{d.oficina.direccion}</p>}
                </>
              )}
              <p className="mt-2 text-sm text-ink-soft">
                A nombre de <strong className="text-ink">{d.destinatario.nombre}</strong> · {d.destinatario.cedula} · {d.destinatario.telefono}
              </p>
            </div>
            <p className="mt-3 text-sm font-semibold text-brand-800">
              {d.cobroADestino ? 'Cobro a destino: el flete lo paga el cliente al retirar.' : 'El flete no va a cobro a destino: confírmelo con el equipo antes de enviarlo.'}
            </p>
          </section>
        )}

        {abierta && <AccionesDespacho token={token} preparando={despacho.preparando} empresa={empresa} />}

        {/* Cancelada o sin pagar, los datos del cliente ya no hacen falta */}
        {(abierta || despacho.estado === 'enviada') && (
        <section className="rounded-2xl border border-line bg-white p-5" aria-labelledby="datos-guia">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="datos-guia" className="flex items-center gap-2 text-base font-semibold text-ink">
              <IconoEnvio className="h-5 w-5 text-brand-600" aria-hidden="true" />
              Datos para la guía
            </h2>
            {abierta && <CopiarDatos texto={textoGuia(d)} />}
          </div>
          <dl className="mt-3 divide-y divide-line text-sm">
            {filasGuia(d).map(([rotulo, valor]) => (
              <div key={rotulo} className="flex gap-3 py-2">
                <dt className="w-36 shrink-0 text-muted">{rotulo}</dt>
                <dd className="min-w-0 font-semibold text-ink">{valor}</dd>
              </div>
            ))}
          </dl>
        </section>
        )}

        <section className="rounded-2xl border border-line bg-white p-5" aria-labelledby="en-la-caja">
          <h2 id="en-la-caja" className="flex items-center gap-2 text-base font-semibold text-ink">
            <IconoPaquete className="h-5 w-5 text-brand-600" aria-hidden="true" />
            Lo que va en la caja
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {d.productos.map((p, i) => (
              <li key={`${p.codigo ?? p.nombre}-${i}`} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{p.nombre}</p>
                  <p className="text-sm text-muted">{p.codigo ? `Código ${p.codigo} · ` : ''}Cantidad: {p.cantidad}</p>
                </div>
                {p.costo !== null && <p className="shrink-0 font-semibold tabular-nums text-ink">{formatUSD(p.costo * p.cantidad)}</p>}
              </li>
            ))}
          </ul>
          {conCosto && (
            <div className="mt-2 flex items-baseline justify-between gap-3 border-t-2 border-line pt-3">
              <p className="font-semibold text-ink">Total a su costo</p>
              <p className="text-right">
                <span className="text-xl font-bold tabular-nums text-brand-600">{formatUSD(total)}</span>
                {d.ivaIncluido && <span className="block text-xs text-muted">IVA incluido, como en su lista</span>}
              </p>
            </div>
          )}
          {abierta && d.empaque && (
            <div className={`${adminNotice('warning')} mt-4 flex items-start gap-3`}>
              <IconoPaquete aria-hidden="true" />
              <div>
                <p className="font-semibold">Embálelo así</p>
                {d.empaque.renglones.length > 0
                  ? d.empaque.renglones.map((r) => <p key={r}>{r}</p>)
                  : <p>{d.empaque.piezas === 1 ? '1 pieza' : `${d.empaque.piezas} piezas`}, {kilos(d.empaque.pesoKg)} aprox. Que viaje firme y bien cerrado.</p>}
              </div>
            </div>
          )}
        </section>

        {whatsapp && (
          <p className="text-center text-sm text-ink-soft">
            ¿Algo se complicó?{' '}
            <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola, les escribe ${d.proveedor} por la orden ${d.numero}`)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:text-brand-700">
              Escríbanos por WhatsApp
            </a>
          </p>
        )}
      </div>
    </main>
  );
}
