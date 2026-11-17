'use client';

// C-276: la ficha de un cliente (la A que eligió el equipo el 16/11): dos columnas con todo a la vista.
// - Izquierda: lo que hay que atender y cómo compra (ResumenCliente, con la IA, de C-213), los pedidos y la actividad.
// - Derecha: confianza (con "Recordarle"), documentos y firmas, sus datos, los avisos que recibió, lo que le interesa y las
//   notas del equipo (el cliente nunca las ve).
// Arriba, quién es con sus sellos y sus cifras, y las acciones: Escribirle (campana, correo o WhatsApp), WhatsApp, Editar y
// "Más" (reenviar la activación, suspender o reactivar, eliminar solo si no tiene historial).
import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaWhatsapp } from 'react-icons/fa6';
import ResumenCliente from '@/components/admin/clientes/ResumenCliente';
import { SellosPildoras } from '@/components/admin/clientes/Sellos';
import PildoraEstadoOrden from '@/components/admin/PildoraEstadoOrden';
import {
  IconoCalendario, IconoCarrito, IconoCorreo, IconoCuenta, IconoCupon, IconoDescargar, IconoDocumento, IconoEditar,
  IconoEliminar, IconoEntrar, IconoEnviar, IconoFavoritos, IconoFlechaIzquierda, IconoGarantia, IconoMaletin, IconoMasOpciones,
  IconoNotificaciones, IconoOrdenes, IconoPausa, IconoPlay, IconoPuntosEs, IconoReloj, IconoTarjeta, IconoTelefono, IconoTexto,
  IconoUbicacion, IconoVer, IconoVerificado, type IconType,
} from '@/components/iconos';
import {
  adminBadge, adminCard, adminDangerButton, adminDato, adminIconButton, adminInput, adminLabel, adminModalBody, adminModalFooter,
  adminModalHeader, adminModalOverlay, adminModalPanel, adminModalTitle, adminPrimaryButton, adminSecondaryButton, avisoAccion, iconoAccion,
} from '@/lib/admin-ui';
import { diaDe, fechaCorta, fechaYHora, haceCuanto } from '@/lib/clientes/fechas';
import type { FichaCliente as Ficha, Hito, TipoHito } from '@/lib/clientes/ficha';
import { formatUSD } from '@/lib/currency';
import { NOMBRE_CUENTA } from '@/lib/dto/cliente';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useFocoDeVuelta } from '@/lib/hooks/useFocoDeVuelta';
import { enlaceWhatsApp, telefonoLegible } from '@/lib/whatsapp';

function Tarjeta({ titulo, Icono, extra, children }: { titulo: string; Icono: IconType; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className={`${adminCard} p-4!`} aria-label={titulo}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <Icono className="h-4 w-4 text-brand-600" aria-hidden="true" />
        {titulo}
        {extra && <span className="ml-auto">{extra}</span>}
      </h2>
      {children}
    </section>
  );
}

function Fila({ Icono, tono = 'claro', titulo, detalle, children }: { Icono: IconType; tono?: 'si' | 'falta' | 'claro' | 'gris'; titulo: ReactNode; detalle?: ReactNode; children?: ReactNode }) {
  const placa = { si: 'bg-success-strong text-white', falta: 'bg-brand-500 text-white', claro: 'bg-brand-50 text-brand-700', gris: 'bg-surface text-ink-soft' }[tono];
  return (
    <li className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${placa}`}><Icono className="h-4 w-4" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink [overflow-wrap:anywhere]">{titulo}</p>
        {detalle && <p className="text-xs text-muted [overflow-wrap:anywhere]">{detalle}</p>}
      </div>
      {children}
    </li>
  );
}

const ICONO_HITO: Record<TipoHito, IconType> = {
  registro: IconoCuenta, activacion: IconoVerificado, ingreso: IconoEntrar, pedido: IconoOrdenes, puntos: IconoPuntosEs, firma: IconoDocumento,
  sorteo: IconoCupon, garantia: IconoGarantia, resena: IconoFavoritos, aviso: IconoNotificaciones, equipo: IconoCuenta,
};

function Actividad({ hitos }: { hitos: Hito[] }) {
  const [todos, setTodos] = useState(false);
  const visibles = todos ? hitos : hitos.slice(0, 12);
  return (
    <>
      <ol className="relative ml-3 border-l-2 border-line pl-5">
        {visibles.map((h, i) => {
          const dia = diaDe(h.en);
          const nuevoDia = i === 0 || diaDe(visibles[i - 1].en) !== dia;
          const Icono = ICONO_HITO[h.tipo];
          return (
            <li key={`${h.en}-${i}`} className="relative pb-3">
              {nuevoDia && <p className="-ml-5 mb-2 pl-0 text-xs font-bold uppercase tracking-wide text-ink-soft">{dia}</p>}
              <span className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white ${h.tipo === 'equipo' || h.quien ? 'border-brand-700 text-brand-700' : h.tipo === 'activacion' || h.tipo === 'firma' ? 'border-success-strong text-success-strong' : 'border-brand-300 text-brand-500'}`} style={nuevoDia ? { top: '1.75rem' } : undefined}>
                <Icono className="h-3 w-3" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-ink [overflow-wrap:anywhere]">{h.titulo}</p>
              <p className="text-xs text-muted">{fechaYHora(h.en)}{h.detalle ? ` · ${h.detalle}` : ''}</p>
            </li>
          );
        })}
      </ol>
      {hitos.length > 12 && (
        <button type="button" onClick={() => setTodos(!todos)} className="mt-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
          {todos ? 'Ver menos' : `Ver los ${hitos.length}`}
        </button>
      )}
    </>
  );
}

function Notas({ clienteId, notas, yo }: { clienteId: string; notas: Ficha['notas']; yo: string | null }) {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const guardar = async () => {
    const limpio = texto.trim();
    if (!limpio) return;
    setEnviando(true);
    try {
      const r = await fetch(`/api/admin/clientes/${clienteId}/notas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: limpio }) });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'No se pudo guardar la nota');
      setTexto('');
      toast.success('Nota guardada');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar la nota');
    } finally {
      setEnviando(false);
    }
  };
  const borrar = async (id: string) => {
    const r = await fetch(`/api/admin/clientes/${clienteId}/notas/${id}`, { method: 'DELETE' });
    if (r.ok) { toast.success('Nota borrada'); router.refresh(); } else toast.error((await r.json().catch(() => null))?.error || 'No se pudo borrar');
  };
  return (
    <>
      {notas.length > 0 && (
        <ul className="mb-3 grid gap-2">
          {notas.map((n) => (
            <li key={n.id} className="rounded-xl bg-surface px-3 py-2">
              <p className="whitespace-pre-line text-sm text-ink [overflow-wrap:anywhere]">{n.texto}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                {n.autor} · {fechaCorta(n.fecha)}
                {n.autorId && n.autorId === yo && (
                  <button type="button" onClick={() => void borrar(n.id)} className="ml-auto font-semibold text-deal hover:underline">Borrar</button>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
      <label htmlFor="nota-nueva" className="sr-only">Nota nueva</label>
      <textarea id="nota-nueva" value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} maxLength={1000} placeholder="Escribe una nota (no la ve el cliente)" className={`${adminInput()} min-h-0 py-2`} />
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={() => void guardar()} disabled={enviando || !texto.trim()} className={`${adminSecondaryButton} h-9! px-3! text-xs! disabled:opacity-50`}>
          <IconoTexto className="h-4 w-4" aria-hidden="true" /> Guardar nota
        </button>
      </div>
    </>
  );
}

type Dialogo = null | 'suspender' | 'reactivar' | 'eliminar';

export default function FichaCliente({ ficha, yo }: { ficha: Ficha; yo: string | null }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [verPedidos, setVerPedidos] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useBodyScrollLock(dialogo !== null);
  useFocoDeVuelta(dialogo !== null, panel);

  const f = ficha;
  const nombre = f.nombre || 'Sin nombre';
  const primerNombre = (f.nombre || '').trim().split(/\s+/)[0] || 'este cliente';
  const inicial = (f.nombre || f.correo || '?').trim().charAt(0).toUpperCase();
  const telefono = f.datos.whatsapp || f.datos.telefono;
  const wa = enlaceWhatsApp(telefono, `Hola ${primerNombre}, te escribimos de Electro Shop.`);
  const escribir = (plantilla?: string) => `/admin/customers/${f.id}/escribir${plantilla ? `?plantilla=${plantilla}` : ''}`;
  const terminos = f.documentos.vigentes.find((d) => d.slug === 'terminos-saldo');
  const pedidos = verPedidos ? f.pedidos : f.pedidos.slice(0, 6);

  const accion = async (url: string, cuerpo: unknown, exito: string) => {
    setOcupado(true);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || 'No se pudo hacer');
      toast.success(exito);
      setDialogo(null);
      setMotivo('');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo hacer');
    } finally {
      setOcupado(false);
    }
  };
  const reenviarActivacion = () => { setMenu(false); void accion(`/api/admin/clientes/${f.id}/activacion`, {}, `Le reenviamos el enlace de activación a ${f.correo}`); };
  const eliminar = async () => {
    setOcupado(true);
    try {
      const r = await fetch(`/api/customers/${f.id}`, { method: 'DELETE' });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || 'No se pudo eliminar');
      toast.success('Cliente eliminado');
      router.push('/admin/customers');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
      setOcupado(false);
    }
  };

  const cifras: Array<{ Icono: IconType; valor: string; texto: string; fuerte?: boolean }> = [
    { Icono: IconoCarrito, valor: formatUSD(f.cifras.gastado), texto: `Gastado en ${f.cifras.pedidosValidos} ${f.cifras.pedidosValidos === 1 ? 'pedido' : 'pedidos'}`, fuerte: true },
    { Icono: IconoPuntosEs, valor: formatUSD(f.cifras.puntos), texto: f.cifras.recargaPorRevisar > 0 ? `Puntos ES · ${formatUSD(f.cifras.recargaPorRevisar)} por revisar` : 'Puntos ES' },
    f.cifras.boletos !== null
      ? { Icono: IconoCupon, valor: String(f.cifras.boletos), texto: f.cifras.boletos === 1 ? 'Boleto del sorteo' : 'Boletos del sorteo' }
      : { Icono: IconoOrdenes, valor: String(f.cifras.activos), texto: 'Pedidos en curso' },
    { Icono: IconoReloj, valor: f.cifras.ultimoIngreso ? haceCuanto(f.cifras.ultimoIngreso.en) : 'Nunca', texto: f.cifras.ultimoIngreso?.dispositivo ? `${f.cifras.ultimoIngreso.dispositivo}${f.cifras.ultimoIngreso.metodo === 'google' ? ' · con Google' : ''}` : 'Último ingreso' },
  ];

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <Link href="/admin/customers" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-brand-600">
        <IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /> Clientes
      </Link>

      {/* Quién es */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 text-2xl font-bold text-white">
          {f.foto ? <Image src={f.foto} alt="" fill sizes="64px" className="object-cover" /> : inicial}
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="text-2xl font-bold text-ink [overflow-wrap:anywhere]">{nombre}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <SellosPildoras sellos={f.sellos} />
            <span className={adminDato}><IconoCalendario className="h-3.5 w-3.5" aria-hidden="true" />Cliente desde {fechaCorta(f.registro, true)}</span>
            {f.cuenta !== 'ACTIVE' && <span className={adminBadge(f.cuenta === 'SUSPENDED' ? 'danger' : 'neutral')}>{NOMBRE_CUENTA[f.cuenta]}</span>}
          </div>
        </div>
        <div className="relative flex flex-wrap gap-2">
          <Link href={escribir()} className={adminPrimaryButton}><IconoEnviar className="h-4 w-4" aria-hidden="true" /> Escribirle</Link>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={adminSecondaryButton}>
              <FaWhatsapp className="h-4 w-4 text-whatsapp" aria-hidden="true" /> WhatsApp
            </a>
          )}
          <Link href={`/admin/customers/${f.id}/editar`} className={adminSecondaryButton}><IconoEditar className="h-4 w-4" aria-hidden="true" /> Editar</Link>
          <button type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Más acciones" className={adminIconButton}>
            <IconoMasOpciones className="h-5 w-5" aria-hidden="true" />
          </button>
          {menu && (
            <div className="absolute right-0 top-12 z-[var(--z-dropdown)] w-64 rounded-xl border border-line bg-white p-1.5 shadow-lg" role="menu">
              {!f.sellos.correo && (
                <button type="button" role="menuitem" onClick={reenviarActivacion} disabled={ocupado} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface">
                  <IconoCorreo className="h-4 w-4 text-brand-600" aria-hidden="true" /> Reenviar el enlace de activación
                </button>
              )}
              {f.cuenta === 'SUSPENDED' ? (
                <button type="button" role="menuitem" onClick={() => { setMenu(false); setDialogo('reactivar'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface">
                  <IconoPlay className="h-4 w-4 text-success-strong" aria-hidden="true" /> Reactivar la cuenta
                </button>
              ) : (
                <button type="button" role="menuitem" onClick={() => { setMenu(false); setDialogo('suspender'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface">
                  <IconoPausa className="h-4 w-4 text-ink-soft" aria-hidden="true" /> Suspender la cuenta
                </button>
              )}
              <button type="button" role="menuitem" onClick={() => { setMenu(false); setDialogo('eliminar'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-deal hover:bg-surface">
                <IconoEliminar className="h-4 w-4" aria-hidden="true" /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sus cifras: lo gastado es la pieza fuerte */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cifras.map(({ Icono, valor, texto, fuerte }) => (
          <div key={texto} className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 ${fuerte ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-white'}`}>
            <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${fuerte ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-700'}`}><Icono className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className={`text-lg font-bold tabular-nums ${fuerte ? 'text-white' : 'text-ink'}`}>{valor}</p>
              <p className={`text-xs ${fuerte ? 'text-brand-200' : 'text-ink-soft'}`}>{texto}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 grid-cols-1 gap-4">
          <section className={`${adminCard} p-4!`} aria-label="Resumen">
            <ResumenCliente clienteId={f.id} />
          </section>

          <Tarjeta titulo="Pedidos" Icono={IconoOrdenes} extra={f.cifras.pedidos > 0 ? <span className="text-xs font-normal text-muted">{f.cifras.pedidos} en total</span> : null}>
            {f.pedidos.length === 0 ? (
              <p className="text-sm text-muted">Todavía no ha comprado.</p>
            ) : (
              <>
                <ul>
                  {pedidos.map((o) => (
                    <li key={o.id} className="relative flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm">
                          <Link href={`/admin/orders?orden=${o.id}`} className="font-semibold text-ink after:absolute after:inset-0 hover:text-brand-600">{o.numero}</Link>
                          <PildoraEstadoOrden status={o.estado} />
                        </p>
                        <p className="truncate text-xs text-muted">{o.resumen} · {fechaCorta(o.fecha)}{o.factura ? ` · Factura ${o.factura}` : ''}</p>
                      </div>
                      <span className="font-semibold tabular-nums text-ink">{formatUSD(o.total)}</span>
                    </li>
                  ))}
                </ul>
                {f.pedidos.length > 6 && (
                  <button type="button" onClick={() => setVerPedidos(!verPedidos)} className="mt-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    {verPedidos ? 'Ver menos' : `Ver los ${f.pedidos.length} últimos`}
                  </button>
                )}
              </>
            )}
          </Tarjeta>

          <Tarjeta titulo="Actividad" Icono={IconoReloj}>
            <Actividad hitos={f.actividad} />
          </Tarjeta>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4">
          <Tarjeta titulo="Confianza" Icono={IconoVerificado}>
            <ul>
              <Fila Icono={IconoCorreo} tono={f.sellos.correo ? 'si' : 'falta'} titulo={f.sellos.correo ? 'Correo verificado' : 'Sin activar el correo'} detalle={f.correoVerificadoEn ? `El ${fechaCorta(f.correoVerificadoEn, true)}` : 'No abrió el enlace de activación'}>
                {!f.sellos.correo && <button type="button" onClick={reenviarActivacion} disabled={ocupado} className={`${adminSecondaryButton} h-8! px-2.5! text-xs!`}>Reenviar</button>}
              </Fila>
              <Fila Icono={IconoTelefono} tono={f.sellos.telefono ? 'si' : 'gris'} titulo={f.sellos.telefono ? 'Teléfono' : 'Sin teléfono'} detalle={telefonoLegible(telefono) ?? 'No lo ha dado'} />
              <Fila Icono={IconoTarjeta} tono={f.sellos.cedula ? 'si' : 'gris'} titulo={f.sellos.cedula ? 'Cédula' : 'Sin cédula'} detalle={f.datos.cedula ?? 'No la ha dado'} />
              <Fila Icono={IconoDocumento} tono={f.sellos.terminos ? 'si' : 'gris'} titulo="Términos de los Puntos ES" detalle={f.sellos.terminos ? `Firmados${terminos?.firmadoEn ? ` el ${fechaCorta(terminos.firmadoEn, true)}` : ''}` : 'Por firmar · sin eso no recarga'}>
                {!f.sellos.terminos && <Link href={escribir('terminos')} className={`${adminSecondaryButton} h-8! px-2.5! text-xs!`}>Recordarle</Link>}
              </Fila>
              {f.empresa && (
                <Fila Icono={IconoMaletin} tono={f.empresa.estado === 'APPROVED' ? 'si' : f.empresa.estado === 'PENDING' ? 'falta' : 'gris'} titulo={f.empresa.estado === 'APPROVED' ? 'Empresa verificada' : f.empresa.estado === 'PENDING' ? 'Empresa por verificar' : f.empresa.estado === 'REJECTED' ? 'Empresa rechazada' : 'Empresa sin verificar'} detalle={f.empresa.nombre ?? undefined}>
                  {f.empresa.estado === 'PENDING' && <Link href="/admin/verifications" className={`${adminSecondaryButton} h-8! px-2.5! text-xs!`}>Revisar</Link>}
                </Fila>
              )}
            </ul>
          </Tarjeta>

          <Tarjeta titulo="Documentos y firmas" Icono={IconoDocumento}>
            <ul>
              {f.documentos.vigentes.map((d) => (
                <Fila key={d.slug} Icono={IconoDocumento} tono={d.firmado ? 'claro' : 'falta'} titulo={d.titulo} detalle={`Versión ${d.version} · ${d.firmado ? (d.legado ? 'aceptada antes del sistema de firmas' : `firmada el ${d.firmadoEn ? fechaCorta(d.firmadoEn, true) : ''}`) : 'por firmar'}${d.paraQue ? ` · necesaria para ${d.paraQue.toLowerCase()}` : ''}`}>
                  {d.firmaId && <a href={`/api/legal/firmas/${d.firmaId}/pdf`} target="_blank" rel="noopener noreferrer" className={`${adminSecondaryButton} h-8! px-2.5! text-xs!`}><IconoDescargar className="h-3.5 w-3.5" aria-hidden="true" />PDF</a>}
                </Fila>
              ))}
              {f.documentos.anteriores.map((d) => (
                <Fila key={d.id} Icono={IconoDocumento} tono="gris" titulo={`${d.titulo}, versión ${d.version}`} detalle={`Firmada el ${fechaCorta(d.firmadoEn, true)}${d.revocada ? ' · revocada' : ' · reemplazada'}`}>
                  <a href={`/api/legal/firmas/${d.id}/pdf`} target="_blank" rel="noopener noreferrer" className={`${adminSecondaryButton} h-8! px-2.5! text-xs!`}><IconoDescargar className="h-3.5 w-3.5" aria-hidden="true" />PDF</a>
                </Fila>
              ))}
              {f.empresa && (
                <>
                  <Fila Icono={IconoMaletin} tono="claro" titulo="Acta constitutiva" detalle={f.empresa.acta ? 'Subida' : 'No la ha subido'}>
                    {f.empresa.acta && <a href={f.empresa.acta} target="_blank" rel="noopener noreferrer" className={`${adminSecondaryButton} h-8! px-2.5! text-xs!`}><IconoVer className="h-3.5 w-3.5" aria-hidden="true" />Ver</a>}
                  </Fila>
                  <Fila Icono={IconoMaletin} tono="claro" titulo="RIF digital" detalle={f.empresa.rifDocumento ? 'Subido' : 'No lo ha subido'}>
                    {f.empresa.rifDocumento && <a href={f.empresa.rifDocumento} target="_blank" rel="noopener noreferrer" className={`${adminSecondaryButton} h-8! px-2.5! text-xs!`}><IconoVer className="h-3.5 w-3.5" aria-hidden="true" />Ver</a>}
                  </Fila>
                </>
              )}
            </ul>
            {f.documentos.vigentes.length === 0 && !f.empresa && <p className="text-sm text-muted">No hay documentos para firmar.</p>}
          </Tarjeta>

          <Tarjeta titulo="Sus datos" Icono={IconoCuenta} extra={<Link href={`/admin/customers/${f.id}/editar`} className="text-xs font-semibold text-brand-600 hover:text-brand-700">Editar</Link>}>
            <ul>
              <Fila Icono={IconoCorreo} tono="gris" titulo={f.correo ?? 'Sin correo'} detalle="Correo" />
              <Fila Icono={IconoTelefono} tono="gris" titulo={telefonoLegible(f.datos.telefono) ?? 'Sin teléfono'} detalle={f.datos.whatsapp && f.datos.whatsapp !== f.datos.telefono ? `WhatsApp: ${telefonoLegible(f.datos.whatsapp)}` : 'Teléfono y WhatsApp'} />
              {(f.datos.ciudad || f.datos.estado) && <Fila Icono={IconoUbicacion} tono="gris" titulo={[f.datos.ciudad, f.datos.estado].filter(Boolean).join(', ')} detalle="Dónde vive" />}
              {f.empresa && <Fila Icono={IconoMaletin} tono="gris" titulo={f.empresa.nombre ?? 'Empresa'} detalle={[f.empresa.rif && `RIF ${f.empresa.rif}`, f.empresa.domicilioFiscal].filter(Boolean).join(' · ') || 'Empresa'} />}
              <Fila Icono={IconoEntrar} tono="gris" titulo={[f.datos.entraCon.google && 'Google', f.datos.entraCon.clave && 'su clave'].filter(Boolean).join(' y ') || 'Todavía no entra'} detalle={f.datos.dispositivos.length > 0 ? `Cómo entra · ${f.datos.dispositivos.map((d) => d.dispositivo).filter((d, i, a) => a.indexOf(d) === i).slice(0, 3).join(', ')}` : 'Cómo entra'} />
            </ul>
          </Tarjeta>

          <Tarjeta titulo="Avisos que recibió" Icono={IconoNotificaciones} extra={<Link href={escribir()} className="text-xs font-semibold text-brand-600 hover:text-brand-700">Escribirle</Link>}>
            {f.avisos.length === 0 ? (
              <p className="text-sm text-muted">Todavía no ha recibido avisos.</p>
            ) : (
              <ul>
                {f.avisos.slice(0, 6).map((a) => (
                  <Fila key={a.id} Icono={IconoNotificaciones} tono="claro" titulo={a.titulo} detalle={`${fechaCorta(a.fecha)}${a.porEquipo ? ` · de ${a.porEquipo}` : ''}`}>
                    <span className={adminBadge(a.leido ? 'success' : 'neutral')}>{a.leido ? 'Leído' : 'Sin leer'}</span>
                  </Fila>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta titulo="Lo que le interesa" Icono={IconoFavoritos}>
            <ul>
              <Fila Icono={IconoFavoritos} tono="claro" titulo={f.interesa.favoritos.total === 0 ? 'Sin favoritos' : `${f.interesa.favoritos.total} ${f.interesa.favoritos.total === 1 ? 'favorito' : 'favoritos'}`} detalle={f.interesa.favoritos.nombres.join(', ') || undefined} />
              <Fila Icono={IconoCarrito} tono="claro" titulo={f.interesa.carrito ? `${f.interesa.carrito.productos} en el carrito` : 'Carrito vacío'} detalle={f.interesa.carrito?.nombres.join(', ') || undefined}>
                {f.interesa.carrito && <Link href={escribir('carrito')} className={`${adminSecondaryButton} h-8! px-2.5! text-xs!`}>Recordarle</Link>}
              </Fila>
            </ul>
          </Tarjeta>

          <Tarjeta titulo="Notas del equipo" Icono={IconoTexto}>
            <Notas clienteId={f.id} notas={f.notas} yo={yo} />
          </Tarjeta>
        </div>
      </div>

      {dialogo && (
        <div className={adminModalOverlay} onClick={() => !ocupado && setDialogo(null)}>
          <div ref={panel} className={`${adminModalPanel} sm:max-w-md`} role="dialog" aria-modal="true" aria-labelledby="titulo-dialogo" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape' && !ocupado) setDialogo(null); }}>
            <div className={adminModalHeader}>
              <h2 id="titulo-dialogo" className={adminModalTitle}>
                {dialogo === 'suspender' ? `Suspender la cuenta de ${primerNombre}` : dialogo === 'reactivar' ? `Reactivar la cuenta de ${primerNombre}` : `Eliminar a ${primerNombre}`}
              </h2>
            </div>
            <div className={`${adminModalBody} grid gap-3 text-sm text-ink-soft`}>
              {dialogo === 'suspender' && (
                <>
                  <p>No podrá entrar a la tienda y se cierran sus sesiones abiertas. Sus pedidos, sus Puntos ES y su historial quedan como están, y se puede reactivar cuando quieras.</p>
                  <div>
                    <label htmlFor="motivo" className={adminLabel}>Por qué (queda en su actividad)</label>
                    <input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} className={adminInput()} placeholder="Por ejemplo: pagos rechazados varias veces" autoFocus />
                  </div>
                </>
              )}
              {dialogo === 'reactivar' && <p>Podrá entrar de nuevo con su correo y su clave, o con Google.</p>}
              {dialogo === 'eliminar' && (
                f.cifras.pedidos > 0 || f.cifras.puntos > 0 ? (
                  <div className={`${avisoAccion} flex items-start gap-3`}>
                    <IconoPausa className={iconoAccion} aria-hidden="true" />
                    <p>Tiene {f.cifras.pedidos > 0 ? `${f.cifras.pedidos} ${f.cifras.pedidos === 1 ? 'pedido' : 'pedidos'}` : 'Puntos ES'}: no se borra, para no perder su historial ni sus facturas. Si no debe usar la tienda, suspende su cuenta.</p>
                  </div>
                ) : (
                  <p>Se borra su cuenta con sus datos. No se puede deshacer. Solo se puede con quien no tiene pedidos, Puntos ES ni movimientos.</p>
                )
              )}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setDialogo(null)} disabled={ocupado} className={adminSecondaryButton}>Cancelar</button>
              {dialogo === 'suspender' && (
                <button type="button" onClick={() => void accion(`/api/admin/clientes/${f.id}/estado`, { accion: 'suspender', motivo }, 'Cuenta suspendida')} disabled={ocupado || motivo.trim().length < 3} className={adminDangerButton}>
                  <IconoPausa className="h-4 w-4" aria-hidden="true" /> Suspender
                </button>
              )}
              {dialogo === 'reactivar' && (
                <button type="button" onClick={() => void accion(`/api/admin/clientes/${f.id}/estado`, { accion: 'reactivar' }, 'Cuenta reactivada')} disabled={ocupado} className={adminPrimaryButton}>
                  <IconoPlay className="h-4 w-4" aria-hidden="true" /> Reactivar
                </button>
              )}
              {dialogo === 'eliminar' && !(f.cifras.pedidos > 0 || f.cifras.puntos > 0) && (
                <button type="button" onClick={() => void eliminar()} disabled={ocupado} className={adminDangerButton}>
                  <IconoEliminar className="h-4 w-4" aria-hidden="true" /> Eliminar
                </button>
              )}
              {dialogo === 'eliminar' && (f.cifras.pedidos > 0 || f.cifras.puntos > 0) && f.cuenta !== 'SUSPENDED' && (
                <button type="button" onClick={() => { setDialogo('suspender'); }} className={adminPrimaryButton}>
                  <IconoPausa className="h-4 w-4" aria-hidden="true" /> Suspender en su lugar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
