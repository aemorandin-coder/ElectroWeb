'use client';

// C-276: "Escribirle" a un cliente, por pasos (PLAN.md §1.9): qué le dices (una plantilla o un mensaje propio), por dónde
// (su campana, su correo y su WhatsApp, lo que eligió el equipo el 16/11) y "Revisar y enviar" con lo que verá en cada uno.
// El texto lo arma lib/clientes/plantillas.ts, el mismo que usa el servidor al enviar: lo que se ve es lo que llega.
// WhatsApp no sale solo: al final se abre el chat con el mensaje escrito y quien lo envía es la persona del equipo.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaWhatsapp } from 'react-icons/fa6';
import Asistente, { Campo, FilaResumen, VistaPrevia, type PasoAsistente } from '@/components/admin/Asistente';
import Opcion, { OpcionRadio } from '@/components/admin/Opcion';
import PildoraEstadoOrden from '@/components/admin/PildoraEstadoOrden';
import {
  IconoCarrito, IconoChat, IconoCheck, IconoCorreo, IconoDocumento, IconoEditar, IconoEnviar, IconoNotificaciones, IconoOrdenes, IconoVer,
  IconoFlechaIzquierda, type IconType,
} from '@/components/iconos';
import { adminCard, adminInput, adminPrimaryButton, adminSecondaryButton, avisoAccion, iconoAccion } from '@/lib/admin-ui';
import { TOPE_MENSAJE, TOPE_TITULO, armarMensaje, textoWhatsApp, type Canal, type MensajeArmado, type Plantilla } from '@/lib/clientes/plantillas';
import { enlaceWhatsApp, telefonoLegible } from '@/lib/whatsapp';

interface ClienteParaEscribir {
  id: string;
  nombre: string | null;
  correo: string | null;
  correoVerificado: boolean;
  cuentaActiva: boolean;
  telefono: string | null;
  firmoTerminos: boolean;
  carrito: number;
  pedidos: { id: string; numero: string; estado: string; resumen: string }[];
}

const PASOS: { titulo: string; queHacer: string; icono: IconType }[] = [
  { titulo: 'Qué le dices', queHacer: 'Un mensaje listo o uno tuyo.', icono: IconoChat },
  { titulo: 'Por dónde', queHacer: 'Su campana, su correo o su WhatsApp.', icono: IconoEnviar },
  { titulo: 'Revisar y enviar', queHacer: 'Mira lo que le llega antes de enviarlo.', icono: IconoVer },
];

const NOMBRE_CANAL: Record<Canal, string> = { campana: 'Su campana', correo: 'Su correo', whatsapp: 'Su WhatsApp' };

export default function EscribirCliente({ cliente: c, plantillaInicial, pedidoInicial }: {
  cliente: ClienteParaEscribir; plantillaInicial: Plantilla | null; pedidoInicial: string | null;
}) {
  const router = useRouter();
  const ficha = `/admin/customers/${c.id}`;
  const numeroWa = enlaceWhatsApp(c.telefono);

  // Lo que se puede decir y por qué no, si no se puede
  const noSePuede: Record<Plantilla, string | null> = {
    terminos: c.firmoTerminos ? 'Ya firmó la versión vigente' : null,
    activar: c.correoVerificado ? 'Su correo ya está verificado' : !c.cuentaActiva ? 'Su cuenta no está activa' : null,
    pedido: c.pedidos.length === 0 ? 'Todavía no tiene pedidos' : null,
    carrito: c.carrito === 0 ? 'No tiene nada en el carrito' : null,
    libre: null,
  };
  const canalNo: Record<Canal, string | null> = {
    campana: null,
    correo: !c.correo ? 'No tiene correo' : !c.cuentaActiva ? 'Su cuenta no está activa: no recibe correos' : null,
    whatsapp: !numeroWa ? 'No tiene un número de WhatsApp' : null,
  };

  const inicial: Plantilla = plantillaInicial && !noSePuede[plantillaInicial] ? plantillaInicial : pedidoInicial ? 'pedido' : 'libre';
  const [plantilla, setPlantilla] = useState<Plantilla>(inicial);
  const [pedidoId, setPedidoId] = useState<string | null>(pedidoInicial ?? c.pedidos[0]?.id ?? null);
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enlace, setEnlace] = useState('');
  const [canales, setCanales] = useState<Record<Canal, boolean>>({ campana: true, correo: !canalNo.correo, whatsapp: false });
  const [paso, setPaso] = useState(plantillaInicial && inicial === plantillaInicial ? 1 : 0);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<{ resultado: Record<Canal, boolean>; mensaje: MensajeArmado } | null>(null);

  const pedido = c.pedidos.find((p) => p.id === pedidoId) ?? null;
  const armado = armarMensaje(plantilla, { nombre: c.nombre, pedido: pedido ? { numero: pedido.numero, estado: pedido.estado } : null, titulo, mensaje, enlace });
  const listo = 'error' in armado ? null : armado;
  // El enlace de activación sale por correo: con "Activa tu cuenta", el correo va siempre
  const elegidos = { ...canales, correo: plantilla === 'activar' ? !canalNo.correo : canales.correo };
  const algunCanal = (Object.keys(elegidos) as Canal[]).some((k) => elegidos[k] && !canalNo[k]);

  const OPCIONES: { valor: Plantilla; titulo: string; detalle: string; icono: IconType }[] = [
    { valor: 'terminos', titulo: 'Firmar los términos de Puntos ES', detalle: noSePuede.terminos ?? 'Le falta firmar la versión vigente', icono: IconoDocumento },
    { valor: 'activar', titulo: 'Activar su cuenta', detalle: noSePuede.activar ?? 'Le reenviamos el enlace de activación', icono: IconoCorreo },
    { valor: 'pedido', titulo: 'Sobre un pedido', detalle: noSePuede.pedido ?? 'Cómo va, según su estado', icono: IconoOrdenes },
    { valor: 'carrito', titulo: 'Su carrito', detalle: noSePuede.carrito ?? `Tiene ${c.carrito} ${c.carrito === 1 ? 'producto' : 'productos'} esperando`, icono: IconoCarrito },
    { valor: 'libre', titulo: 'Un mensaje tuyo', detalle: 'Escribes el título y el mensaje', icono: IconoEditar },
  ];

  const pasos: PasoAsistente[] = PASOS.map((p, i) => ({
    ...p,
    problema: i === 0 ? ('error' in armado ? armado.error : null) : i === 1 ? (algunCanal ? null : 'Elige por dónde se lo dices.') : null,
    resumen: i === 0 ? (listo ? listo.titulo : 'Qué le dices')
      : i === 1 ? ((Object.keys(elegidos) as Canal[]).filter((k) => elegidos[k] && !canalNo[k]).map((k) => NOMBRE_CANAL[k]).join(' · ') || 'Por dónde')
        : 'Lo que le llega',
  }));

  const enviar = async () => {
    if (!listo) return;
    setEnviando(true);
    try {
      const r = await fetch(`/api/admin/clientes/${c.id}/avisos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantilla, pedidoId: plantilla === 'pedido' ? pedidoId : undefined, titulo, mensaje, enlace, canales: elegidos }),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string; campana?: boolean; correo?: boolean; whatsapp?: boolean; mensaje?: MensajeArmado };
      if (!r.ok || !d.mensaje) { toast.error(d.error || 'No se pudo enviar'); return; }
      const resultado = { campana: Boolean(d.campana), correo: Boolean(d.correo), whatsapp: Boolean(d.whatsapp) };
      const fallo = (['campana', 'correo'] as const).filter((k) => elegidos[k] && !canalNo[k] && !resultado[k]);
      if (fallo.length > 0) toast.error(`No salió por ${fallo.map((k) => NOMBRE_CANAL[k].toLowerCase()).join(' ni por ')}`);
      if (resultado.whatsapp) { setEnviado({ resultado, mensaje: d.mensaje }); return; }
      toast.success('Mensaje enviado');
      router.push(ficha);
      router.refresh();
    } catch {
      toast.error('Error de conexión. Verifica tu internet.');
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    const wa = enlaceWhatsApp(c.telefono, textoWhatsApp(enviado.mensaje, c.nombre, window.location.origin));
    const salio = (['campana', 'correo'] as const).filter((k) => enviado.resultado[k]).map((k) => NOMBRE_CANAL[k].toLowerCase());
    return (
      <div className="max-w-xl space-y-4">
        <div className={adminCard}>
          <p className="flex items-center gap-2 text-lg font-semibold text-ink"><IconoCheck className="h-5 w-5 text-success-strong" aria-hidden="true" /> {salio.length ? `Le llegó a ${salio.join(' y a ')}` : 'Mensaje listo'}</p>
          <p className="mt-1 text-sm text-muted">Falta WhatsApp: se abre el chat con el mensaje escrito y tú lo envías.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={adminPrimaryButton}><FaWhatsapp className="h-4 w-4" aria-hidden="true" /> Abrir WhatsApp con el mensaje</a>}
            <Link href={ficha} className={adminSecondaryButton}><IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /> Volver a su ficha</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Asistente
      titulo={`Escribirle a ${c.nombre?.trim().split(/\s+/)[0] || c.correo || 'este cliente'}`}
      subtitulo="Le llega a su campana, a su correo o a su WhatsApp."
      icono={IconoEnviar}
      volver={{ href: ficha, texto: 'Su ficha' }}
      etiqueta="Pasos para escribirle"
      pasos={pasos}
      paso={paso}
      onPaso={setPaso}
      final={{
        contenido: enviando ? 'Enviando…' : <><IconoEnviar className="h-4 w-4" aria-hidden="true" /> Enviar</>,
        onClick: () => void enviar(),
        deshabilitado: enviando || !listo || !algunCanal,
      }}
      vistaAncha
      vistaPrevia={listo ? <VistaDelMensaje m={listo} nombre={c.nombre} canales={elegidos} canalNo={canalNo} /> : (
        <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">Cuando escribas el mensaje, aquí ves lo que le llega.</p>
      )}
    >
      {paso === 0 && (
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">Elige el mensaje</legend>
            <div className="grid gap-2 lg:grid-cols-2">
              {OPCIONES.map((o) => (
                <Opcion key={o.valor} role="radio" aria-checked={plantilla === o.valor} elegida={plantilla === o.valor} disabled={Boolean(noSePuede[o.valor])}
                  onClick={() => setPlantilla(o.valor)} icono={o.icono} titulo={o.titulo} detalle={o.detalle} />
              ))}
            </div>
          </fieldset>

          {plantilla === 'pedido' && c.pedidos.length > 0 && (
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-ink">Cuál pedido</legend>
              <div className="grid gap-2 lg:grid-cols-2">
                {c.pedidos.map((p) => (
                  <OpcionRadio key={p.id} name="escribir-pedido" elegida={pedidoId === p.id} onElegir={() => setPedidoId(p.id)}
                    titulo={p.numero} detalle={p.resumen} extra={<PildoraEstadoOrden status={p.estado} />} />
                ))}
              </div>
            </fieldset>
          )}

          {plantilla === 'libre' && (
            <div className="space-y-5 lg:max-w-3xl">
              <Campo etiqueta="Título" id="escribir-titulo" pista={`${titulo.trim().length}/${TOPE_TITULO}`}>
                <input id="escribir-titulo" value={titulo} maxLength={TOPE_TITULO} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Llegó el cargador que buscabas" className={`${adminInput()} sm:max-w-lg`} />
              </Campo>
              <Campo etiqueta="Mensaje" id="escribir-mensaje" pista={`${mensaje.trim().length}/${TOPE_MENSAJE}`}>
                <textarea id="escribir-mensaje" rows={4} value={mensaje} maxLength={TOPE_MENSAJE} onChange={(e) => setMensaje(e.target.value)} className={`${adminInput()} h-auto py-2`} />
              </Campo>
              <Campo etiqueta="Enlace (opcional)" id="escribir-enlace" ayuda="Una página de la tienda, por ejemplo /productos/cargador-usb-c o https://electroshopve.com/ofertas. Nunca de otra página.">
                <input id="escribir-enlace" value={enlace} maxLength={200} inputMode="url" onChange={(e) => setEnlace(e.target.value)} placeholder="/ofertas" className={`${adminInput()} sm:max-w-lg`} />
              </Campo>
            </div>
          )}
        </div>
      )}

      {paso === 1 && (
        <fieldset className="space-y-2 lg:max-w-xl">
          <legend className="mb-1.5 text-sm font-semibold text-ink">Por dónde se lo dices</legend>
          {(['campana', 'correo', 'whatsapp'] as const).map((k) => {
            const fijo = k === 'correo' && plantilla === 'activar';
            const Icono = k === 'campana' ? IconoNotificaciones : k === 'correo' ? IconoCorreo : FaWhatsapp;
            const detalle = canalNo[k] ?? (k === 'campana' ? 'La ve al entrar a la tienda' : k === 'correo' ? (fijo ? `${c.correo} · el enlace sale por aquí` : c.correo) : `${telefonoLegible(c.telefono)} · se abre el chat y tú lo envías`);
            return (
              <Opcion key={k} role="checkbox" aria-checked={elegidos[k] && !canalNo[k]} elegida={elegidos[k] && !canalNo[k]} disabled={Boolean(canalNo[k]) || fijo}
                onClick={() => setCanales((v) => ({ ...v, [k]: !v[k] }))} icono={Icono} titulo={NOMBRE_CANAL[k]} detalle={detalle} />
            );
          })}
          {!c.cuentaActiva && (
            <p className={`${avisoAccion} mt-3`}><IconoNotificaciones className={iconoAccion} aria-hidden="true" /> Su cuenta no está activa: no entra a la tienda, así que la campana solo la verá si la reactivas.</p>
          )}
        </fieldset>
      )}

      {paso === 2 && listo && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          <FilaResumen icono={IconoChat} titulo={listo.titulo} detalle={listo.mensaje} onCambiar={() => setPaso(0)} />
          <FilaResumen icono={IconoEnviar} titulo={pasos[1].resumen} detalle={elegidos.whatsapp && !canalNo.whatsapp ? 'WhatsApp se abre al final, con el mensaje escrito' : undefined} onCambiar={() => setPaso(1)} />
        </ul>
      )}
    </Asistente>
  );
}

/** Lo que le llega, en cada lugar que se eligió */
function VistaDelMensaje({ m, nombre, canales, canalNo }: { m: MensajeArmado; nombre: string | null; canales: Record<Canal, boolean>; canalNo: Record<Canal, string | null> }) {
  const va = (k: Canal) => canales[k] && !canalNo[k];
  const primer = nombre?.trim().split(/\s+/)[0];
  return (
    <>
      {va('campana') && (
        <VistaPrevia rotulo="En su campana">
          <div className="flex gap-3 rounded-xl border border-line bg-white p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><IconoChat className="h-4 w-4" aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink [overflow-wrap:anywhere]">{m.titulo}</span>
              <span className="mt-0.5 block text-sm text-ink-soft [overflow-wrap:anywhere]">{m.mensaje}</span>
              <span className="mt-1 block text-xs text-muted">Ahora</span>
            </span>
          </div>
        </VistaPrevia>
      )}
      {va('correo') && (
        <VistaPrevia rotulo="En su correo" nota={m.enlace === null && m.titulo === 'Activa tu cuenta' ? 'Le llega el correo de activación de siempre, con su enlace nuevo.' : undefined}>
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="bg-brand-700 px-4 py-4 text-white">
              <p className="text-xs font-semibold tracking-wide text-brand-100">MENSAJE DE ELECTRO SHOP</p>
              <p className="mt-1 text-lg font-bold [overflow-wrap:anywhere]">{m.titulo}</p>
              {primer && <p className="mt-1 text-sm text-brand-100">Hola, {primer}.</p>}
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="text-sm text-ink [overflow-wrap:anywhere]">{m.mensaje}</p>
              {m.enlace && <span className="inline-flex rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white">{m.boton ?? 'Ver más'}</span>}
            </div>
          </div>
        </VistaPrevia>
      )}
      {va('whatsapp') && (
        <VistaPrevia rotulo="En su WhatsApp" nota="Se abre el chat con esto escrito: tú lo envías.">
          <p className="whitespace-pre-line rounded-xl rounded-tl-sm border border-line bg-surface p-3 text-sm text-ink [overflow-wrap:anywhere]">
            {textoWhatsApp(m, nombre, 'https://electroshopve.com')}
          </p>
        </VistaPrevia>
      )}
    </>
  );
}
