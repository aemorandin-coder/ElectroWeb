'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaWhatsapp } from 'react-icons/fa6';
import { FiArrowLeft, FiCheckCircle, FiCopy, FiExternalLink, FiPlus, FiSearch, FiSend, FiTrash2 } from 'react-icons/fi';
import {
  adminBadge, adminCard, adminDangerButton, adminError, adminHint, adminIconButton, adminInput, adminLabel, adminNotice, adminPageSubtitle, adminPageTitle,
  adminPrimaryButton, adminSecondaryButton, adminSectionTitle, adminSpinner,
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { CONDICIONES_POR_DEFECTO, ESTADO_TEXTO, TERMINOS_POR_DEFECTO, totalesCotizacion } from '@/lib/cotizaciones/core';
import type { CotizacionAdmin } from '@/lib/cotizaciones';

// Editor de una cotización (C-148). El servidor recalcula el total cada vez que se guarda: lo de aquí es una vista.
// Orden de la pantalla: lo que pidió el cliente (si la pidió), datos del cliente, líneas, condiciones, y al final
// guardar y enviar. Una cotización aprobada queda de solo lectura.

interface Linea {
  clave: string;
  productId: string | null;
  title: string;
  description: string;
  quantity: string;
  unitPriceUSD: string;
}

interface Formulario {
  clientName: string;
  clientDoc: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  location: string;
  subject: string;
  validityDays: string;
  advancePercent: string;
  conditions: string;
  terms: string;
}

const VACIO: Formulario = {
  clientName: '', clientDoc: '', contactName: '', contactEmail: '', contactPhone: '', location: '', subject: '',
  validityDays: '15', advancePercent: '', conditions: CONDICIONES_POR_DEFECTO, terms: TERMINOS_POR_DEFECTO,
};

let siguienteClave = 0;
const clave = () => `l${++siguienteClave}`;
/** "12,50" o "12.50" → 12.5 */
const numero = (texto: string) => Number.parseFloat(texto.replace(',', '.')) || 0;

function aFormulario(c: CotizacionAdmin): { form: Formulario; lineas: Linea[] } {
  return {
    form: {
      clientName: c.clientName, clientDoc: c.clientDoc ?? '', contactName: c.contactName ?? '', contactEmail: c.contactEmail ?? '',
      contactPhone: c.contactPhone ?? '', location: c.location ?? '', subject: c.subject ?? '', validityDays: String(c.validityDays),
      advancePercent: c.advancePercent ? String(c.advancePercent) : '', conditions: c.conditions ?? '', terms: c.terms ?? '',
    },
    lineas: c.items.map((l) => ({ clave: clave(), productId: l.productId, title: l.title, description: l.description ?? '', quantity: String(l.quantity), unitPriceUSD: String(l.unitPriceUSD) })),
  };
}

export default function EditorCotizacion() {
  const { id } = useParams<{ id: string }>();
  const esNueva = id === 'nueva';
  const router = useRouter();
  const { confirm } = useConfirm();
  const { settings } = useSettings();
  const [cotizacion, setCotizacion] = useState<CotizacionAdmin | null>(null);
  const [form, setForm] = useState<Formulario>(VACIO);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [cargando, setCargando] = useState(!esNueva);
  const [noExiste, setNoExiste] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  // Buscador del catálogo
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<{ id: string; name: string; priceUSD: number }[] | null>(null);

  const aplicar = (c: CotizacionAdmin) => {
    const { form: f, lineas: l } = aFormulario(c);
    setCotizacion(c);
    setForm(f);
    setLineas(l);
  };

  useCargarAlMontar(async () => {
    if (esNueva) return;
    const res = await fetch(`/api/admin/cotizaciones/${id}`, { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) {
      setNoExiste(true);
      setCargando(false);
      return;
    }
    aplicar((await res.json()).cotizacion);
    setCargando(false);
  }, [id]);

  const soloLectura = cotizacion?.estadoGuardado === 'APPROVED';
  const cambiar = (campo: keyof Formulario, valor: string) => { setForm((f) => ({ ...f, [campo]: valor })); setError(''); };
  const cambiarLinea = (k: string, campo: keyof Omit<Linea, 'clave' | 'productId'>, valor: string) => {
    setLineas((ls) => ls.map((l) => (l.clave === k ? { ...l, [campo]: valor } : l)));
    setError('');
  };

  const taxPercent = cotizacion ? cotizacion.taxPercent : settings?.taxEnabled ? Number(settings.taxPercent) || 0 : 0;
  const totales = totalesCotizacion(lineas.map((l) => ({ quantity: Math.max(1, Math.floor(numero(l.quantity))), unitPriceUSD: numero(l.unitPriceUSD) })), taxPercent, numero(form.advancePercent) || null);

  const cuerpo = () => ({
    ...form,
    validityDays: Math.floor(numero(form.validityDays)),
    advancePercent: form.advancePercent.trim() ? Math.floor(numero(form.advancePercent)) : null,
    items: lineas.map((l) => ({ productId: l.productId, title: l.title, description: l.description, quantity: Math.floor(numero(l.quantity)), unitPriceUSD: numero(l.unitPriceUSD) })),
  });

  /** Guarda y devuelve la cotización guardada (o null si falló, con el error en pantalla). */
  const guardar = async (): Promise<CotizacionAdmin | null> => {
    setOcupado(true);
    setError('');
    try {
      const res = await fetch(esNueva ? '/api/admin/cotizaciones' : `/api/admin/cotizaciones/${id}`, {
        method: esNueva ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo()),
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(datos.error || 'No se pudo guardar.');
        return null;
      }
      return datos.cotizacion as CotizacionAdmin;
    } catch {
      setError('Sin conexión. Intenta de nuevo.');
      return null;
    } finally {
      setOcupado(false);
    }
  };

  const guardarBorrador = async () => {
    const guardada = await guardar();
    if (!guardada) return;
    toast.success('Cotización guardada');
    if (esNueva) router.replace(`/admin/cotizaciones/${guardada.id}`);
    else aplicar(guardada);
  };

  const accion = async (idCotizacion: string, cual: 'enviar' | 'rechazar' | 'reabrir'): Promise<CotizacionAdmin | null> => {
    const res = await fetch(`/api/admin/cotizaciones/${idCotizacion}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: cual }) }).catch(() => null);
    const datos = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setError(datos.error || 'No se pudo completar la acción.');
      return null;
    }
    return datos.cotizacion as CotizacionAdmin;
  };

  const enviar = async () => {
    const guardada = await guardar();
    if (!guardada) return;
    setOcupado(true);
    const enviada = await accion(guardada.id, 'enviar');
    setOcupado(false);
    if (!enviada) {
      // Quedó guardada aunque no se envió: si era nueva, ya tiene su página
      if (esNueva) router.replace(`/admin/cotizaciones/${guardada.id}`);
      else aplicar(guardada);
      return;
    }
    toast.success('Lista: el cliente ya puede abrirla con su enlace');
    if (esNueva) router.replace(`/admin/cotizaciones/${enviada.id}`);
    else aplicar(enviada);
  };

  const cerrar = async (cual: 'rechazar' | 'reabrir') => {
    if (!cotizacion) return;
    setOcupado(true);
    const r = await accion(cotizacion.id, cual);
    setOcupado(false);
    if (!r) return;
    toast.success(cual === 'rechazar' ? 'Marcada como no concretada' : 'Volvió a borrador: el enlace del cliente queda apagado');
    aplicar(r);
  };

  const borrar = async () => {
    if (!cotizacion) return;
    const ok = await confirm({ title: 'Borrar la cotización', message: `Se borra ${cotizacion.number}. El cliente nunca la vio.`, confirmText: 'Borrar', cancelText: 'Cancelar', type: 'danger' });
    if (!ok) return;
    const res = await fetch(`/api/admin/cotizaciones/${cotizacion.id}`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) {
      setError((await res?.json().catch(() => ({})))?.error || 'No se pudo borrar.');
      return;
    }
    toast.success('Cotización borrada');
    router.replace('/admin/cotizaciones');
  };

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busqueda.trim().length < 2) return;
    const res = await fetch(`/api/products?search=${encodeURIComponent(busqueda.trim())}&status=published&limit=8`, { cache: 'no-store' }).catch(() => null);
    const datos = res?.ok ? await res.json().catch(() => null) : null;
    const lista = Array.isArray(datos) ? datos : datos?.products ?? [];
    setResultados(lista.map((p: { id: string; name: string; priceUSD: number | string }) => ({ id: p.id, name: p.name, priceUSD: Number(p.priceUSD) || 0 })));
  };

  const agregarProducto = (p: { id: string; name: string; priceUSD: number }) => {
    setLineas((ls) => [...ls, { clave: clave(), productId: p.id, title: p.name, description: '', quantity: '1', unitPriceUSD: String(p.priceUSD) }]);
    setResultados(null);
    setBusqueda('');
  };

  if (cargando) return <div className="flex justify-center py-16" role="status" aria-label="Cargando"><span className={adminSpinner} aria-hidden="true" /></div>;
  if (noExiste) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className={adminNotice('danger')} role="alert">Esa cotización no existe.</p>
        <Link href="/admin/cotizaciones" className={`${adminSecondaryButton} mt-4`}>Volver a Cotizaciones</Link>
      </div>
    );
  }

  const enlace = cotizacion && typeof window !== 'undefined' ? `${window.location.origin}/cotizacion/${cotizacion.token}` : '';
  const visibleParaCliente = cotizacion?.estadoGuardado === 'SENT' || cotizacion?.estadoGuardado === 'APPROVED';
  const telefono = (cotizacion?.contactPhone ?? '').replace(/\D/g, '').replace(/^0/, '58');
  const mensaje = cotizacion ? `Hola${cotizacion.contactName ? ` ${cotizacion.contactName.split(' ')[0]}` : ''}, te enviamos el presupuesto ${cotizacion.number}: ${enlace}` : '';

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar. Selecciónalo y cópialo a mano.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <Link href="/admin/cotizaciones" className="mb-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
        Cotizaciones
      </Link>
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className={adminPageTitle}>{cotizacion ? cotizacion.number : 'Nueva cotización'}</h1>
        {cotizacion && <span className={adminBadge(ESTADO_TEXTO[cotizacion.status].tono)}>{ESTADO_TEXTO[cotizacion.status].texto}</span>}
      </div>

      {cotizacion?.requestNote && (
        <section className={`${adminNotice('brand')} mb-4`} aria-labelledby="pidio-titulo">
          <h2 id="pidio-titulo" className="font-semibold">Lo que pidió el cliente</h2>
          <p className="mt-1 whitespace-pre-line">{cotizacion.requestNote}</p>
        </section>
      )}

      {cotizacion?.estadoGuardado === 'APPROVED' && (
        <p className={`${adminNotice('success')} mb-4 flex items-start gap-2`} role="status">
          <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Aprobada por <strong>{cotizacion.approvedName}</strong>{cotizacion.approvedDoc ? ` (${cotizacion.approvedDoc})` : ''}
            {cotizacion.approvedAt ? ` el ${new Date(cotizacion.approvedAt).toLocaleString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}` : ''}.
            {' '}Ya no se puede cambiar: coordina el pago y la entrega con el cliente.
          </span>
        </p>
      )}

      {visibleParaCliente && cotizacion && (
        <section className={`${adminCard} mb-4`} aria-labelledby="enlace-titulo">
          <h2 id="enlace-titulo" className={adminSectionTitle}>Enlace para el cliente</h2>
          <p className={adminPageSubtitle}>Con este enlace la ve, la imprime o la guarda en PDF y la aprueba. No necesita cuenta.</p>
          <p className="mt-3 break-all rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink" data-enlace>{enlace}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={copiar} className={adminSecondaryButton}><FiCopy className="h-4 w-4" aria-hidden="true" />Copiar enlace</button>
            {telefono.length >= 10 && (
              <a href={`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer" className={adminSecondaryButton}>
                <FaWhatsapp className="h-4 w-4" aria-hidden="true" />Enviar por WhatsApp
              </a>
            )}
            <a href={enlace} target="_blank" rel="noopener noreferrer" className={adminSecondaryButton}><FiExternalLink className="h-4 w-4" aria-hidden="true" />Abrir</a>
          </div>
        </section>
      )}

      <fieldset disabled={soloLectura || ocupado} className="space-y-4">
        <section className={adminCard} aria-labelledby="cliente-titulo">
          <h2 id="cliente-titulo" className={adminSectionTitle}>Cliente</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-clientName" className={adminLabel}>Empresa, institución o persona</label>
              <input id="c-clientName" value={form.clientName} onChange={(e) => cambiar('clientName', e.target.value)} maxLength={120} className={adminInput()} />
            </div>
            <div>
              <label htmlFor="c-clientDoc" className={adminLabel}>RIF o cédula</label>
              <input id="c-clientDoc" value={form.clientDoc} onChange={(e) => cambiar('clientDoc', e.target.value)} maxLength={20} className={adminInput()} placeholder="J-12345678-9" />
            </div>
            <div>
              <label htmlFor="c-contactName" className={adminLabel}>Persona de contacto</label>
              <input id="c-contactName" value={form.contactName} onChange={(e) => cambiar('contactName', e.target.value)} maxLength={100} className={adminInput()} />
            </div>
            <div>
              <label htmlFor="c-contactPhone" className={adminLabel}>Teléfono o WhatsApp</label>
              <input id="c-contactPhone" type="tel" inputMode="tel" value={form.contactPhone} onChange={(e) => cambiar('contactPhone', e.target.value)} maxLength={30} className={adminInput()} />
              <p className={adminHint}>Con el número, aparece &quot;Enviar por WhatsApp&quot; al enviarla.</p>
            </div>
            <div>
              <label htmlFor="c-contactEmail" className={adminLabel}>Correo</label>
              <input id="c-contactEmail" type="email" inputMode="email" value={form.contactEmail} onChange={(e) => cambiar('contactEmail', e.target.value)} maxLength={150} className={adminInput()} />
            </div>
            <div>
              <label htmlFor="c-location" className={adminLabel}>Ubicación</label>
              <input id="c-location" value={form.location} onChange={(e) => cambiar('location', e.target.value)} maxLength={200} className={adminInput()} placeholder="Guanare, Portuguesa" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="c-subject" className={adminLabel}>Para qué es</label>
              <input id="c-subject" value={form.subject} onChange={(e) => cambiar('subject', e.target.value)} maxLength={200} className={adminInput()} placeholder="Equipos para taquilla y punto de venta" />
            </div>
          </div>
        </section>

        <section className={adminCard} aria-labelledby="lineas-titulo">
          <h2 id="lineas-titulo" className={adminSectionTitle}>Equipos y servicios</h2>
          <p className={adminPageSubtitle}>Los precios van finales, con el IVA incluido. Una línea en $0 sale como &quot;Incluido&quot;.</p>

          {lineas.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">Todavía no hay líneas. Busca un producto del catálogo o agrega una línea libre.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {lineas.map((l, i) => (
                <li key={l.clave} className="rounded-xl border border-line p-3" data-linea>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`${l.clave}-title`} className="sr-only">Línea {i + 1}: qué es</label>
                      <input id={`${l.clave}-title`} value={l.title} onChange={(e) => cambiarLinea(l.clave, 'title', e.target.value)} maxLength={160} className={adminInput()} placeholder="Equipo o servicio" />
                    </div>
                    <button type="button" onClick={() => setLineas((ls) => ls.filter((x) => x.clave !== l.clave))} aria-label={`Quitar la línea ${i + 1}`} className={`${adminIconButton} h-11 w-11 shrink-0 hover:text-deal`}>
                      <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <label htmlFor={`${l.clave}-desc`} className="sr-only">Línea {i + 1}: descripción</label>
                  <textarea id={`${l.clave}-desc`} rows={2} value={l.description} onChange={(e) => cambiarLinea(l.clave, 'description', e.target.value)} maxLength={1200} className={`${adminInput()} mt-2 h-auto py-2`} placeholder="Descripción para el cliente (opcional)" />
                  <div className="mt-2 grid grid-cols-3 items-end gap-2">
                    <div>
                      <label htmlFor={`${l.clave}-qty`} className="mb-1 block text-xs font-semibold text-muted">Cantidad</label>
                      <input id={`${l.clave}-qty`} inputMode="numeric" value={l.quantity} onChange={(e) => cambiarLinea(l.clave, 'quantity', e.target.value.replace(/\D/g, ''))} maxLength={4} className={`${adminInput()} text-right tabular-nums`} />
                    </div>
                    <div>
                      <label htmlFor={`${l.clave}-price`} className="mb-1 block text-xs font-semibold text-muted">Precio unitario ($)</label>
                      <input id={`${l.clave}-price`} inputMode="decimal" value={l.unitPriceUSD} onChange={(e) => cambiarLinea(l.clave, 'unitPriceUSD', e.target.value.replace(/[^\d.,]/g, ''))} maxLength={12} className={`${adminInput()} text-right tabular-nums`} />
                    </div>
                    <p className="pb-2.5 text-right text-sm font-semibold tabular-nums text-ink">{formatUSD(Math.round(numero(l.unitPriceUSD) * Math.max(1, Math.floor(numero(l.quantity))) * 100) / 100)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!soloLectura && (
            <div className="mt-4 space-y-3 border-t border-line pt-4">
              <form onSubmit={buscar} className="flex gap-2" role="search">
                <label className="relative block flex-1">
                  <span className="sr-only">Buscar un producto del catálogo</span>
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en el catálogo" className={`${adminInput()} pl-9`} />
                </label>
                <button type="submit" className={`${adminSecondaryButton} shrink-0`}>Buscar</button>
              </form>
              {resultados && (
                resultados.length === 0 ? <p className="text-sm text-muted">Ningún producto publicado con ese nombre.</p> : (
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {resultados.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => agregarProducto(p)} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface">
                          <span className="min-w-0 truncate text-ink">{p.name}</span>
                          <span className="shrink-0 font-semibold tabular-nums text-ink">{formatUSD(p.priceUSD)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              )}
              <button type="button" onClick={() => setLineas((ls) => [...ls, { clave: clave(), productId: null, title: '', description: '', quantity: '1', unitPriceUSD: '' }])} className={adminSecondaryButton}>
                <FiPlus className="h-4 w-4" aria-hidden="true" />
                Agregar una línea libre
              </button>
            </div>
          )}

          <div className="mt-4 border-t border-line pt-4 text-right">
            <p className="text-sm text-muted">Total</p>
            <p className="text-2xl font-bold tabular-nums text-ink" data-total>{formatUSD(totales.totalUSD)}</p>
            {totales.ivaUSD > 0 && <p className="text-xs text-ink-soft">IVA incluido ({taxPercent} %): {formatUSD(totales.ivaUSD)} · Base imponible: {formatUSD(totales.baseUSD)}</p>}
            {totales.anticipoUSD !== null && totales.saldoUSD !== null && <p className="text-xs text-ink-soft">Anticipo: {formatUSD(totales.anticipoUSD)} · Saldo: {formatUSD(totales.saldoUSD)}</p>}
          </div>
        </section>

        <section className={adminCard} aria-labelledby="condiciones-titulo">
          <h2 id="condiciones-titulo" className={adminSectionTitle}>Condiciones</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-validityDays" className={adminLabel}>Validez (días)</label>
              <input id="c-validityDays" inputMode="numeric" value={form.validityDays} onChange={(e) => cambiar('validityDays', e.target.value.replace(/\D/g, ''))} maxLength={3} className={`${adminInput()} max-w-32`} />
              <p className={adminHint}>Cuenta desde el día que se envía. Después, el cliente ya no puede aprobarla.</p>
            </div>
            <div>
              <label htmlFor="c-advancePercent" className={adminLabel}>Anticipo (%) <span className="font-normal text-muted">(opcional)</span></label>
              <input id="c-advancePercent" inputMode="numeric" value={form.advancePercent} onChange={(e) => cambiar('advancePercent', e.target.value.replace(/\D/g, ''))} maxLength={2} className={`${adminInput()} max-w-32`} placeholder="70" />
              <p className={adminHint}>Vacío: sin anticipo. Con 70, muestra el anticipo y el saldo contra entrega.</p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="c-conditions" className={adminLabel}>Condiciones comerciales</label>
              <textarea id="c-conditions" rows={4} value={form.conditions} onChange={(e) => cambiar('conditions', e.target.value)} maxLength={3000} className={`${adminInput()} h-auto py-2`} />
              <p className={adminHint}>Una por línea.</p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="c-terms" className={adminLabel}>Entrega y garantía</label>
              <textarea id="c-terms" rows={4} value={form.terms} onChange={(e) => cambiar('terms', e.target.value)} maxLength={3000} className={`${adminInput()} h-auto py-2`} />
              <p className={adminHint}>Una por línea. Escribe solo lo que la tienda va a cumplir.</p>
            </div>
          </div>
        </section>
      </fieldset>

      {error && <p className={`${adminError} mt-4 text-sm`} role="alert">{error}</p>}

      {!soloLectura && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button type="button" onClick={enviar} disabled={ocupado} className={adminPrimaryButton}>
            <FiSend className="h-4 w-4" aria-hidden="true" />
            {cotizacion?.estadoGuardado === 'SENT' ? 'Guardar y reenviar' : 'Guardar y enviar al cliente'}
          </button>
          <button type="button" onClick={guardarBorrador} disabled={ocupado} className={adminSecondaryButton}>Guardar{cotizacion?.estadoGuardado === 'SENT' ? '' : ' borrador'}</button>
          {cotizacion && !visibleParaCliente && (
            <a href={enlace} target="_blank" rel="noopener noreferrer" className={adminSecondaryButton}><FiExternalLink className="h-4 w-4" aria-hidden="true" />Vista previa</a>
          )}
          {cotizacion?.estadoGuardado === 'SENT' && (
            <>
              <button type="button" onClick={() => void cerrar('reabrir')} disabled={ocupado} className={adminSecondaryButton}>Volver a borrador</button>
              <button type="button" onClick={() => void cerrar('rechazar')} disabled={ocupado} className={adminSecondaryButton}>No se concretó</button>
            </>
          )}
          {cotizacion?.estadoGuardado === 'REJECTED' && (
            <button type="button" onClick={() => void cerrar('reabrir')} disabled={ocupado} className={adminSecondaryButton}>Volver a borrador</button>
          )}
          {cotizacion && !cotizacion.sentAt && (cotizacion.estadoGuardado === 'DRAFT' || cotizacion.estadoGuardado === 'REQUESTED') && (
            <button type="button" onClick={borrar} disabled={ocupado} className={`${adminDangerButton} sm:ml-auto`}><FiTrash2 className="h-4 w-4" aria-hidden="true" />Borrar</button>
          )}
        </div>
      )}
    </div>
  );
}
