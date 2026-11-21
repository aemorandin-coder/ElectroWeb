import Image from 'next/image';
import Opcion from '@/components/admin/Opcion';
import MuestraViva from './_components/MuestraViva';
import {
  IconoAdvertencia, IconoCheck, IconoConfirmado, IconoDocumento, IconoEnvio, IconoMas, IconoOrdenes, IconoPaquete, IconoReloj, IconoTienda,
} from '@/components/iconos';
import {
  adminBadge, adminCard, adminIconChip, adminNotice, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton,
  adminRowZebra, adminSecondaryButton, adminSectionTitle, adminTable, adminTableWrap, adminTd, adminTh,
} from '@/lib/admin-ui';
import { avisoCorreo, boletoCorreo, CORREO, FUENTE, placaCorreo, placaInteriorCorreo } from '@/lib/email-templates/estilo';
import { ESCALA_TIPO, FLUJOS_DE_TRABAJO, FUERA_DEL_KIT, GRILLAS_Y_ANCHOS, LOGO, PALETA, REGLAS } from '@/lib/marca';

// C-243 · Kit 2.0: colores, tipografía, grillas, flujos y piezas vivas compartidas entre tienda, panel y correos.
export const metadata = { title: 'Kit de marca' };

/** Un correo de muestra con las piezas de lib/email-templates/estilo.ts, en un marco aparte (el correo no lee el CSS de la página). */
function correoDeMuestra(): string {
  const cuerpo = [
    boletoCorreo({ rotulo: 'Sorteo de Navidad', titulo: '¡Ya llevas 2 boletos!', texto: 'El resultado sale el 20 de diciembre.', numero: '2', unidad: 'Boletos' }),
    avisoCorreo('Al retirar: tu cédula y el flete', 'Tu caja viaja con cobro a destino: el flete se lo pagas a ZOOM o MRW en la oficina, con tu cédula en mano.', 'envio'),
    placaCorreo(`<p style="${CORREO.placaRotulo}">Electro Shop · Gift card</p><p style="${CORREO.placaTitulo}">$50,00</p>${placaInteriorCorreo('Código de canje', 'GIFT-XXXX-XXXX')}`),
  ].join('');
  return `<!doctype html><html><body style="margin:0;padding:16px;background:#ffffff;font-family:${FUENTE};">${cuerpo}</body></html>`;
}

function Muestra({ hex, nombre, token, para, nunca }: { hex: string; nombre: string; token: string; para: string; nunca?: string }) {
  return (
    <li className="flex gap-3 rounded-xl border border-line bg-white p-3">
      <span className="h-12 w-12 shrink-0 rounded-lg border border-line" style={{ backgroundColor: hex }} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{nombre} <span className="font-normal tabular-nums text-muted">{hex} · {token}</span></p>
        <p className="mt-0.5 text-xs text-ink-soft text-pretty">{para}</p>
        {nunca && <p className="mt-0.5 text-xs font-semibold text-deal">Nunca: {nunca}</p>}
      </div>
    </li>
  );
}

export default function KitDeMarca() {
  return (
    <div className="space-y-5">
      <header className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Kit de marca · 2.0</h1>
          <p className={adminPageSubtitle}>Los colores, tipografía, grillas, flujos y piezas vivas que comparten la tienda, Mi panel y el panel admin.</p>
        </div>
      </header>

      <section aria-labelledby="logo" className={`${adminCard} grid gap-5 lg:grid-cols-2 lg:items-center`}>
        <div>
          <h2 id="logo" className={adminSectionTitle}>El logo y sus dos azules</h2>
          <p className="mt-1 max-w-prose text-sm text-muted text-pretty">Todo sale de estos dos. El azul noche y el cian ya no se usan: no están en el logo.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {[{ hex: LOGO.azul, nombre: 'Azul de la marca' }, { hex: LOGO.azulOscuro, nombre: 'Azul oscuro' }].map((c) => (
              <div key={c.hex} className="w-36 overflow-hidden rounded-xl border border-line">
                <div className="h-14" style={{ backgroundColor: c.hex }} />
                <p className="px-2.5 py-1.5 text-xs"><span className="font-semibold tabular-nums text-ink">{c.hex}</span><br /><span className="text-muted">{c.nombre}</span></p>
              </div>
            ))}
          </div>
        </div>
        <Image src="/images/brand/logo-largo.png" alt="Electro Shop" width={1660} height={288} className="h-auto w-full max-w-md" />
      </section>

      <section aria-labelledby="paleta" className={adminCard}>
        <h2 id="paleta" className={adminSectionTitle}>La paleta y para qué es cada color</h2>
        <ul className="mt-3 grid gap-2 lg:grid-cols-2">
          {PALETA.map((c) => <Muestra key={c.nombre} {...c} />)}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Fuera del kit: {FUERA_DEL_KIT.map((c) => `${c.nombre} (${c.hex}, antes ${c.antes}; ahora ${c.ahora})`).join(' · ')}.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="reglas" className={adminCard}>
          <h2 id="reglas" className={adminSectionTitle}>Las reglas</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft text-pretty">
            {REGLAS.map((r) => <li key={r}>{r}</li>)}
          </ol>
          <p className="mt-3 text-xs text-muted">Antes de subir, <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-ink">npm run check:marca</code> rechaza colores de fuera, verde claro con blanco, peso excesivo o componentes retirados.</p>
        </section>

        <section aria-labelledby="grillas" className={adminCard}>
          <h2 id="grillas" className={adminSectionTitle}>Grillas, anchos y espaciado</h2>
          <dl className="mt-3 space-y-2.5">
            {GRILLAS_Y_ANCHOS.map((item) => (
              <div key={item.zona} className="border-b border-line pb-2 last:border-b-0 last:pb-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{item.zona}</dt>
                <dd className="mt-0.5 text-sm text-ink-soft text-pretty">{item.regla}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section aria-labelledby="tipografia" className={adminCard}>
        <h2 id="tipografia" className={adminSectionTitle}>Escala tipográfica única</h2>
        <div className={`${adminTableWrap} mt-3`}>
          <table className={`${adminTable} min-w-[600px]`}>
            <thead>
              <tr>
                <th scope="col" className={adminTh}>Nivel</th>
                <th scope="col" className={adminTh}>Clases estándar</th>
                <th scope="col" className={adminTh}>Dónde aplica</th>
              </tr>
            </thead>
            <tbody>
              {ESCALA_TIPO.map((t) => (
                <tr key={t.nivel} className={adminRowZebra}>
                  <td className={`${adminTd} font-semibold`}>{t.nivel}</td>
                  <td className={`${adminTd} font-mono text-xs text-brand-700`}>{t.clase}</td>
                  <td className={`${adminTd} text-ink-soft`}>{t.uso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="flujos" className={adminCard}>
        <h2 id="flujos" className={adminSectionTitle}>Los 5 flujos de trabajo</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FLUJOS_DE_TRABAJO.map((f) => (
            <div key={f.paso} className="rounded-xl border border-line bg-surface/60 p-4">
              <p className="text-sm font-bold text-ink">{f.paso}</p>
              <p className="mt-1 text-xs font-medium text-brand-700">{f.cuando}</p>
              <p className="mt-1.5 text-xs text-ink-soft text-pretty">{f.patron}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="piezas" className={adminCard}>
        <h2 id="piezas" className={adminSectionTitle}>Las piezas vivas</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">Botones (min-h-11)</p>
              <div className="flex flex-wrap gap-2">
                <span className={adminPrimaryButton}><IconoMas className="h-4 w-4" aria-hidden="true" /> Nueva factura</span>
                <span className={adminSecondaryButton}><IconoDocumento className="h-4 w-4" aria-hidden="true" /> Facturar</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">Sellos de estado (llenos)</p>
              <div className="flex flex-wrap gap-2">
                <span className={adminBadge('success')}><IconoConfirmado className="h-3.5 w-3.5" aria-hidden="true" /> Pagada</span>
                <span className={adminBadge('brand')}><IconoPaquete className="h-3.5 w-3.5" aria-hidden="true" /> En camino</span>
                <span className={adminBadge('warning')}><IconoReloj className="h-3.5 w-3.5" aria-hidden="true" /> Te toca</span>
                <span className={adminBadge('danger')}>Cancelada</span>
                <span className={adminBadge('neutral')}>Borrador</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">Placas de ícono</p>
              <div className="flex gap-2">
                <span className={adminIconChip('brand')}><IconoDocumento className="h-5 w-5" aria-hidden="true" /></span>
                <span className={adminIconChip('warning')}><IconoReloj className="h-5 w-5" aria-hidden="true" /></span>
                <span className={adminIconChip('success')}><IconoConfirmado className="h-5 w-5" aria-hidden="true" /></span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">Aviso de lo que alguien tiene que hacer</p>
              <div className={adminNotice('warning')}>
                <div className="flex gap-3">
                  <IconoAdvertencia aria-hidden="true" />
                  <p><strong>Falta el domicilio fiscal.</strong> Escríbelo para poder emitir la factura de la empresa.</p>
                </div>
              </div>
            </div>
            <MuestraViva />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">Elegir entre opciones (components/admin/Opcion)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Opcion elegida={false} aria-pressed={false} icono={IconoOrdenes} titulo="Una compra de la web" detalle="Los montos salen de la orden" />
                <Opcion elegida aria-pressed icono={IconoTienda} titulo="Una venta en la tienda" detalle="Escribes los renglones" />
              </div>
              <div className="flex gap-2">
                <Opcion tamano="chica" elegida role="radio" aria-checked titulo="Contado" className="flex-1" />
                <Opcion tamano="chica" elegida={false} role="radio" aria-checked={false} titulo="Crédito" className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">La pieza fuerte (una por pantalla)</p>
              <div className="rounded-2xl bg-brand-700 p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-300">Sorteo de Navidad</p>
                <p className="mt-1 text-xl font-bold">Gana una PlayStation 4 reacondicionada</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-200"><IconoEnvio className="h-4 w-4" aria-hidden="true" /> Si ganas, te la enviamos sin costo por ZOOM.</p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700"><IconoCheck className="h-4 w-4" aria-hidden="true" /> Ver mis boletos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="correo" className={adminCard}>
        <h2 id="correo" className={adminSectionTitle}>En un correo</h2>
        <p className="mt-1 text-sm text-muted">Las mismas piezas que salen en los correos: el boleto, el aviso con su placa y la gift card.</p>
        <iframe title="Piezas de un correo" srcDoc={correoDeMuestra()} className="mt-3 h-[34rem] w-full max-w-xl rounded-xl border border-line bg-white" />
      </section>
    </div>
  );
}
