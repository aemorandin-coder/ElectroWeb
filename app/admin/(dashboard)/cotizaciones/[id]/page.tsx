'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaWhatsapp } from 'react-icons/fa6';
import { FiAlertTriangle, FiArrowLeft, FiBox, FiCheckCircle, FiCopy, FiExternalLink, FiMail, FiPlus, FiSend, FiTrash2 } from 'react-icons/fi';
import {
  adminBadge, adminCard, adminDangerButton, adminError, adminHint, adminIconButton, adminInput, adminLabel, adminNotice, adminPageSubtitle, adminPageTitle,
  adminPrimaryButton, adminSecondaryButton, adminSectionTitle, adminSpinner,
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { CONDICIONES_POR_DEFECTO, ESTADO_TEXTO, RETENCIONES_IVA, TERMINOS_POR_DEFECTO, totalesCotizacion } from '@/lib/cotizaciones/core';
import type { CotizacionAdmin } from '@/lib/cotizaciones';
import type { ProductoParaCotizar } from '@/lib/cotizaciones/productos';
import { BuscadorProductos } from '@/components/cotizaciones/BuscadorProductos';
import PresenciaEnEditor from '@/components/admin/edicion/PresenciaEnEditor';
import { combinar } from '@/lib/edicion/combinar';
import { enviarConVersion } from '@/lib/edicion/guardado';
import { useConflictoDeFormulario } from '@/lib/edicion/useConflictoDeFormulario';

// Editor de una cotización (C-148). El servidor recalcula el total cada vez que se guarda: lo de aquí es una vista.
// Orden de la pantalla: lo que pidió el cliente (si la pidió), datos del cliente, líneas (primero el buscador del
// catálogo, después lo agregado y el total), condiciones, y al final guardar y enviar. Aprobada, queda de solo lectura.

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
  /** '0', '75' o '100': lo que el cliente retiene del IVA al pagar (C-159) */
  ivaRetentionPercent: string;
  conditions: string;
  terms: string;
}

const VACIO: Formulario = {
  clientName: '', clientDoc: '', contactName: '', contactEmail: '', contactPhone: '', location: '', subject: '',
  validityDays: '15', advancePercent: '', ivaRetentionPercent: '0', conditions: CONDICIONES_POR_DEFECTO, terms: TERMINOS_POR_DEFECTO,
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
      advancePercent: c.advancePercent ? String(c.advancePercent) : '', ivaRetentionPercent: String(c.ivaRetentionPercent), conditions: c.conditions ?? '', terms: c.terms ?? '',
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
  // Enviar por correo (C-159): null = la dirección guardada de la cotización
  const [correoA, setCorreoA] = useState<string | null>(null);
  const [correoMensaje, setCorreoMensaje] = useState('');
  const [correoOcupado, setCorreoOcupado] = useState(false);
  // Lo que se sabe de los productos del catálogo que están en las líneas (código y disponible)
  const [catalogo, setCatalogo] = useState<Record<string, ProductoParaCotizar>>({});

  // C-170: la cotización como se abrió (formulario, líneas y versión). Es la BASE para combinar si otra persona guardó antes.
  const base = useRef<{ form: Formulario; lineas: Linea[]; version: string } | null>(null);
  const { resolver: resolverConflicto, dialogo: dialogoConflicto } = useConflictoDeFormulario({
    clientName: 'Cliente', clientDoc: 'RIF o cédula', contactName: 'Contacto', contactEmail: 'Correo', contactPhone: 'Teléfono', location: 'Lugar',
    subject: 'Asunto', validityDays: 'Validez (días)', advancePercent: 'Anticipo %', ivaRetentionPercent: 'Retención del IVA', conditions: 'Condiciones',
    terms: 'Términos', lineas: 'Líneas de la cotización',
  }, (campo, valor) => {
    if (campo === 'lineas') {
      const ls = valor as Array<{ title: string; quantity: string }>;
      return ls.length === 0 ? '(sin líneas)' : ls.map((l) => `${l.quantity} × ${l.title}`).join(', ');
    }
    if (campo === 'ivaRetentionPercent') return valor === '0' ? 'Sin retención' : `${valor} %`;
    return valor === '' || valor === null || valor === undefined ? '(vacío)' : String(valor).length > 120 ? `${String(valor).slice(0, 117)}…` : String(valor);
  });

  const aplicar = (c: CotizacionAdmin) => {
    const { form: f, lineas: l } = aFormulario(c);
    base.current = { form: f, lineas: l, version: c.updatedAt };
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
    const cargada = (await res.json()).cotizacion as CotizacionAdmin;
    aplicar(cargada);
    setCargando(false);
    const ids = [...new Set(cargada.items.flatMap((l) => (l.productId ? [l.productId] : [])))];
    if (ids.length === 0 || cargada.estadoGuardado === 'APPROVED') return;
    const info = await fetch(`/api/admin/cotizaciones/productos?ids=${ids.join(',')}`, { cache: 'no-store' }).catch(() => null);
    const datos = info?.ok ? ((await info.json().catch(() => null)) as { productos: ProductoParaCotizar[] } | null) : null;
    if (datos) setCatalogo((c) => ({ ...c, ...Object.fromEntries(datos.productos.map((p) => [p.id, p])) }));
  }, [id]);

  const soloLectura = cotizacion?.estadoGuardado === 'APPROVED';
  const cambiar = (campo: keyof Formulario, valor: string) => { setForm((f) => ({ ...f, [campo]: valor })); setError(''); };
  const cambiarLinea = (k: string, campo: keyof Omit<Linea, 'clave' | 'productId'>, valor: string) => {
    setLineas((ls) => ls.map((l) => (l.clave === k ? { ...l, [campo]: valor } : l)));
    setError('');
  };

  const taxPercent = cotizacion ? cotizacion.taxPercent : settings?.taxEnabled ? Number(settings.taxPercent) || 0 : 0;
  const cantidadDe = (l: Linea) => Math.max(1, Math.floor(numero(l.quantity)));
  /** Unidades de cada producto del catálogo que van en la cotización */
  const enCotizacion = new Map<string, number>();
  for (const l of lineas) if (l.productId) enCotizacion.set(l.productId, (enCotizacion.get(l.productId) ?? 0) + cantidadDe(l));
  const totales = totalesCotizacion(lineas.map((l) => ({ quantity: Math.max(1, Math.floor(numero(l.quantity))), unitPriceUSD: numero(l.unitPriceUSD) })), taxPercent, numero(form.advancePercent) || null, Number(form.ivaRetentionPercent));

  const cuerpo = (f: Formulario = form, ls: Linea[] = lineas) => ({
    ...f,
    validityDays: Math.floor(numero(f.validityDays)),
    advancePercent: f.advancePercent.trim() ? Math.floor(numero(f.advancePercent)) : null,
    ivaRetentionPercent: Number(f.ivaRetentionPercent),
    items: ls.map((l) => ({ productId: l.productId, title: l.title, description: l.description, quantity: Math.floor(numero(l.quantity)), unitPriceUSD: numero(l.unitPriceUSD) })),
  });

  /** Las líneas sin su `clave` interna (cambia en cada carga): así se comparan al combinar */
  const sinClave = (ls: Linea[]) => ls.map(({ clave: _clave, ...resto }) => { void _clave; return resto; });
  const conClave = (ls: Array<Omit<Linea, 'clave'>>): Linea[] => ls.map((l) => ({ clave: clave(), ...l }));

  /**
   * Guarda y devuelve la cotización guardada (o null si falló, con el error en pantalla). Al editar lleva la versión con que se
   * abrió (C-170): si otra persona guardó antes, se combina lo de cada una; solo se pregunta por lo que las dos tocaron.
   */
  const guardar = async (intento = 0, f: Formulario = form, ls: Linea[] = lineas): Promise<CotizacionAdmin | null> => {
    setOcupado(true);
    setError('');
    try {
      if (esNueva) {
        const res = await fetch('/api/admin/cotizaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo(f, ls)) });
        const datos = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(datos.error || 'No se pudo guardar.');
          return null;
        }
        return datos.cotizacion as CotizacionAdmin;
      }
      const r = await enviarConVersion<{ cotizacion: CotizacionAdmin }>(`/api/admin/cotizaciones/${id}`, 'PUT', cuerpo(f, ls), base.current?.version);
      if (r.ok) return r.datos.cotizacion;
      if (r.conflicto?.tipo === 'cambiado' && intento < 3 && base.current) {
        const actual = r.conflicto.actual as CotizacionAdmin;
        const suyo = aFormulario(actual);
        const abierto = base.current;
        const resultado = combinar(
          { ...abierto.form, lineas: sinClave(abierto.lineas) },
          { ...f, lineas: sinClave(ls) },
          { ...suyo.form, lineas: sinClave(suyo.lineas) },
        );
        const aplicarYGuardar = async (final: typeof resultado.combinado): Promise<CotizacionAdmin | null> => {
          const { lineas: lineasFinal, ...formFinal } = final;
          const nuevasLineas = conClave(lineasFinal);
          // Desde aquí la base es lo que hay en el servidor
          base.current = { form: suyo.form, lineas: suyo.lineas, version: actual.updatedAt };
          setForm(formFinal);
          setLineas(nuevasLineas);
          return guardar(intento + 1, formFinal, nuevasLineas);
        };
        if (resultado.conflictos.length === 0) return await aplicarYGuardar(resultado.combinado);
        // Las dos tocaron lo mismo: se pregunta. El guardado sigue cuando se elige; quien tocó "Enviar" lo toca otra vez
        setError(`${r.conflicto.por?.nombre ?? 'Otra persona'} y tú cambiaron lo mismo: elige qué queda.`);
        resolverConflicto({
          base: { ...abierto.form, lineas: sinClave(abierto.lineas) }, mio: { ...f, lineas: sinClave(ls) }, suyo: { ...suyo.form, lineas: sinClave(suyo.lineas) },
          quien: r.conflicto.por?.nombre ?? 'Otra persona',
          continuar: async (final) => {
            const guardada = await aplicarYGuardar(final);
            if (guardada) { setError(''); toast.success('Cotización guardada'); aplicar(guardada); }
          },
        });
        return null;
      }
      if (r.conflicto?.tipo === 'no_existe') setNoExiste(true);
      setError(r.error);
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

  const accion = async (idCotizacion: string, cual: 'enviar' | 'rechazar' | 'reabrir' | 'aprobar'): Promise<CotizacionAdmin | null> => {
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

  // El cliente aprobó por WhatsApp o en persona: lo registra el equipo. Descuenta el inventario igual que el enlace
  const aprobar = async () => {
    const delCatalogo = lineas.filter((l) => l.productId).length;
    const ok = await confirm({
      title: 'Marcar como aprobada',
      message: `Úsalo cuando el cliente ya dijo que sí por WhatsApp o en persona.${delCatalogo > 0 ? ` Se descuentan del inventario los productos del catálogo de esta cotización (${delCatalogo === 1 ? '1 línea' : `${delCatalogo} líneas`}), con su número como referencia.` : ' Esta cotización no tiene productos del catálogo: no se toca el inventario.'} Después ya no se puede editar.`,
      confirmText: 'Marcar como aprobada',
      cancelText: 'Cancelar',
      type: 'warning',
    });
    if (!ok) return;
    const guardada = await guardar();
    if (!guardada) return;
    setOcupado(true);
    const aprobada = await accion(guardada.id, 'aprobar');
    setOcupado(false);
    if (!aprobada) {
      if (esNueva) router.replace(`/admin/cotizaciones/${guardada.id}`);
      else aplicar(guardada);
      return;
    }
    toast.success('Cotización aprobada');
    if (esNueva) router.replace(`/admin/cotizaciones/${aprobada.id}`);
    else aplicar(aprobada);
  };

  const noSeConcreto = async () => {
    if (!cotizacion) return;
    const descontado = cotizacion.inventario.filter((l) => l.descontado > 0);
    const ok = await confirm({
      title: 'No se concretó',
      message: descontado.length > 0
        ? `Se devuelven al inventario: ${descontado.map((l) => `${l.descontado} × ${l.title}`).join(', ')}. El enlace del cliente deja de abrir.`
        : 'La cotización se cierra y el enlace del cliente deja de abrir.',
      confirmText: 'No se concretó',
      cancelText: 'Volver',
      type: 'danger',
    });
    if (ok) await cerrar('rechazar');
  };

  const cerrar = async (cual: 'rechazar' | 'reabrir') => {
    if (!cotizacion) return;
    setOcupado(true);
    const r = await accion(cotizacion.id, cual);
    setOcupado(false);
    if (!r) return;
    toast.success(cual === 'rechazar' ? 'Marcada como no concretada' : 'Volvió a borrador: el enlace del cliente queda apagado');
    setError('');
    aplicar(r);
  };

  const borrar = async () => {
    if (!cotizacion) return;
    const ok = await confirm({ title: 'Borrar la cotización', message: `Se borra ${cotizacion.number}. El cliente nunca la vio.`, confirmText: 'Borrar', cancelText: 'Cancelar', type: 'danger' });
    if (!ok) return;
    let res = await fetch(`/api/admin/cotizaciones/${cotizacion.id}`, { method: 'DELETE' }).catch(() => null);
    // C-170: otra persona la tiene abierta ahora: se pregunta antes de borrarla
    if (res?.status === 409) {
      const aviso = await res.clone().json().catch(() => ({}));
      if (aviso?.conflicto === 'en_edicion') {
        const seguir = await confirm({ title: 'La están editando ahora', message: `${aviso.error}. Si la borras, verá un aviso. ¿Borrarla igual?`, confirmText: 'Borrar', cancelText: 'Cancelar', type: 'warning' });
        if (!seguir) return;
        res = await fetch(`/api/admin/cotizaciones/${cotizacion.id}?forzar=1`, { method: 'DELETE' }).catch(() => null);
      }
    }
    if (!res?.ok) {
      setError((await res?.json().catch(() => ({})))?.error || 'No se pudo borrar.');
      return;
    }
    toast.success('Cotización borrada');
    router.replace('/admin/cotizaciones');
  };

  // Un producto que ya está en la cotización suma una unidad a su línea en vez de repetirla
  const agregarProducto = (p: ProductoParaCotizar) => {
    const yaVan = enCotizacion.get(p.id) ?? 0;
    setCatalogo((c) => ({ ...c, [p.id]: p }));
    setLineas((ls) => {
      const i = ls.findIndex((l) => l.productId === p.id);
      if (i === -1) return [...ls, { clave: clave(), productId: p.id, title: p.name, description: '', quantity: '1', unitPriceUSD: String(p.priceUSD) }];
      return ls.map((l, j) => (j === i ? { ...l, quantity: String(Math.min(9999, Math.max(1, Math.floor(numero(l.quantity))) + 1)) } : l));
    });
    setError('');
    toast.success(yaVan > 0 ? `Ahora van ${yaVan + 1}: ${p.name}` : `Agregado: ${p.name}`, { id: `agregado-${p.id}` });
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

  const destinoCorreo = correoA ?? cotizacion?.contactEmail ?? '';
  const enviarPorCorreo = async () => {
    if (!cotizacion) return;
    if (cotizacion.emailedAt) {
      const otraVez = await confirm({
        title: 'Enviar otra vez',
        message: `Ya se envió a ${cotizacion.emailedTo} (${new Date(cotizacion.emailedAt).toLocaleString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}). ¿Enviarla otra vez?`,
        confirmText: 'Enviar otra vez',
        cancelText: 'Cancelar',
        type: 'warning',
      });
      if (!otraVez) return;
    }
    setCorreoOcupado(true);
    try {
      const res = await fetch(`/api/admin/cotizaciones/${cotizacion.id}/correo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: destinoCorreo.trim(), mensaje: correoMensaje.trim() || undefined }),
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(datos.error || 'No se pudo enviar el correo.');
        return;
      }
      // Solo se anota el envío: lo que se esté editando sin guardar no se toca
      setCotizacion((c) => (c ? { ...c, emailedAt: datos.emailedAt, emailedTo: datos.to } : c));
      setCorreoMensaje('');
      toast.success(`Correo enviado a ${datos.to}`);
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setCorreoOcupado(false);
    }
  };

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

      {/* C-170: quién más la tiene abierta y si alguien la cambió mientras tanto */}
      {cotizacion && !soloLectura && <PresenciaEnEditor recurso={`quote:${cotizacion.id}`} etiqueta={`Cotización ${cotizacion.number}`} nombreRecurso="cotización" femenino />}

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
            {cotizacion.inventario.some((l) => l.descontado > 0) && (
              <span className="mt-1 block" data-descontado>
                Descontado del inventario con {cotizacion.number}: {cotizacion.inventario.filter((l) => l.descontado > 0).map((l) => `${l.descontado} × ${l.title}`).join(', ')}.
              </span>
            )}
            {cotizacion.inventario.some((l) => l.falto > 0) && (
              <strong className="mt-1 block text-warning-strong" data-faltante>
                Faltó inventario: {cotizacion.inventario.filter((l) => l.falto > 0).map((l) => `${l.falto} de ${l.quantity} × ${l.title}`).join(', ')}. Consíguelo antes de entregar.
              </strong>
            )}
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

          <div className="mt-4 border-t border-line pt-4" data-correo>
            <h3 className="text-sm font-semibold text-ink">Enviar por correo</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="c-correoA" className={adminLabel}>Correo del cliente</label>
                <input id="c-correoA" type="email" inputMode="email" autoComplete="off" value={destinoCorreo} onChange={(e) => setCorreoA(e.target.value)} maxLength={150} className={adminInput()} placeholder="compras@empresa.com" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="c-correoMensaje" className={adminLabel}>Mensaje <span className="font-normal text-muted">(opcional)</span></label>
                <textarea id="c-correoMensaje" rows={2} value={correoMensaje} onChange={(e) => setCorreoMensaje(e.target.value)} maxLength={600} className={`${adminInput()} h-auto py-2`} placeholder="Ej.: Quedo atento a cualquier duda." />
              </div>
            </div>
            <p className={adminHint}>
              Le llega el resumen con el botón para verla y aprobarla. Va lo último que guardaste.
              {cotizacion.emailedAt && ` Último envío: a ${cotizacion.emailedTo} (${new Date(cotizacion.emailedAt).toLocaleString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}).`}
            </p>
            <button type="button" onClick={enviarPorCorreo} disabled={correoOcupado || !destinoCorreo.trim()} className={`${adminSecondaryButton} mt-3`}>
              <FiMail className="h-4 w-4" aria-hidden="true" />{correoOcupado ? 'Enviando…' : 'Enviar por correo'}
            </button>
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

          {!soloLectura && (
            <div className="mt-4 rounded-xl bg-surface p-3 sm:p-4">
              <BuscadorProductos enCotizacion={enCotizacion} onAgregar={agregarProducto} bloqueado={ocupado} />
              <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-soft">¿Un servicio o algo que no está en el catálogo?</p>
                <button type="button" onClick={() => setLineas((ls) => [...ls, { clave: clave(), productId: null, title: '', description: '', quantity: '1', unitPriceUSD: '' }])} className={`${adminSecondaryButton} shrink-0`} data-linea-libre>
                  <FiPlus className="h-4 w-4" aria-hidden="true" />
                  Agregar una línea libre
                </button>
              </div>
            </div>
          )}

          <h3 className="mt-5 text-sm font-semibold text-ink">En la cotización{lineas.length > 0 ? ` (${lineas.length})` : ''}</h3>
          {lineas.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">Todavía no hay líneas. Busca un producto del catálogo o agrega una línea libre.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {lineas.map((l, i) => {
                const producto = l.productId ? catalogo[l.productId] : undefined;
                const pedidas = l.productId ? enCotizacion.get(l.productId) ?? 0 : 0;
                const faltan = producto && producto.disponible !== null ? Math.max(0, pedidas - producto.disponible) : 0;
                return (
                  <li key={l.clave} className="rounded-xl border border-line p-3" data-linea>
                    {l.productId && (
                      <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft" data-del-catalogo>
                        <span className={adminBadge('brand')}><FiBox className="h-3 w-3" aria-hidden="true" />Del catálogo</span>
                        {producto && <span className="[overflow-wrap:anywhere]">{producto.sku}</span>}
                        {producto && !soloLectura && (producto.disponible === null
                          ? <span>Digital: no lleva inventario</span>
                          : <span>{producto.disponible === 0 ? 'Sin existencias' : `${producto.disponible} ${producto.disponible === 1 ? 'disponible' : 'disponibles'}`}</span>)}
                      </p>
                    )}
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
                      <p className="pb-2.5 text-right text-sm font-semibold tabular-nums text-ink">{formatUSD(Math.round(numero(l.unitPriceUSD) * cantidadDe(l) * 100) / 100)}</p>
                    </div>
                    {faltan > 0 && !soloLectura && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-warning-strong" data-falta-inventario>
                        <FiAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{producto?.disponible === 0 ? 'No hay existencias' : `Solo hay ${producto?.disponible}`}: si se aprueba así, {faltan === 1 ? 'falta 1 unidad' : `faltan ${faltan} unidades`} por conseguir.</span>
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 border-t border-line pt-4 text-right">
            <p className="text-sm text-muted">Total</p>
            <p className="text-2xl font-bold tabular-nums text-ink" data-total>{formatUSD(totales.totalUSD)}</p>
            {totales.ivaUSD > 0 && <p className="text-xs text-ink-soft">IVA incluido ({taxPercent} %): {formatUSD(totales.ivaUSD)} · Base imponible: {formatUSD(totales.baseUSD)}</p>}
            {totales.retencionUSD > 0 && (
              <p className="text-xs text-ink-soft" data-retencion>
                Retención del IVA ({form.ivaRetentionPercent} %): −{formatUSD(totales.retencionUSD)} · <strong className="font-semibold text-ink">Neto a pagar: {formatUSD(totales.netoUSD)}</strong>
              </p>
            )}
            {totales.anticipoUSD !== null && totales.saldoUSD !== null && <p className="text-xs text-ink-soft">Anticipo{totales.retencionUSD > 0 ? ' (del neto)' : ''}: {formatUSD(totales.anticipoUSD)} · Saldo: {formatUSD(totales.saldoUSD)}</p>}
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
            {taxPercent > 0 && (
              <div className="sm:col-span-2">
                <label htmlFor="c-ivaRetentionPercent" className={adminLabel}>Retención del IVA que practica el cliente</label>
                <select id="c-ivaRetentionPercent" value={form.ivaRetentionPercent} onChange={(e) => cambiar('ivaRetentionPercent', e.target.value)} className={`${adminInput()} max-w-xs`}>
                  {RETENCIONES_IVA.map((r) => <option key={r} value={r}>{r === 0 ? 'No retiene' : `Retiene el ${r} % del IVA`}</option>)}
                </select>
                <p className={adminHint}>
                  Solo la practican los contribuyentes especiales (75 %; 100 % si la factura no cumple los requisitos o el proveedor no está inscrito en el Portal Fiscal).
                  Los órganos del Estado, las gobernaciones, las alcaldías y los entes públicos sin fines empresariales no retienen.
                  Confirma la condición del cliente con el SENIAT antes de marcarla. El presupuesto muestra el neto a pagar.
                </p>
              </div>
            )}
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

      {soloLectura && (
        <div className="mt-4">
          <button type="button" onClick={noSeConcreto} disabled={ocupado} className={adminSecondaryButton}>No se concretó: devolver al inventario</button>
        </div>
      )}

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
          {cotizacion && cotizacion.estadoGuardado !== 'REJECTED' && (
            <button type="button" onClick={aprobar} disabled={ocupado} className={adminSecondaryButton}><FiCheckCircle className="h-4 w-4" aria-hidden="true" />Marcar como aprobada</button>
          )}
          {cotizacion?.estadoGuardado === 'SENT' && (
            <>
              <button type="button" onClick={() => void cerrar('reabrir')} disabled={ocupado} className={adminSecondaryButton}>Volver a borrador</button>
              <button type="button" onClick={noSeConcreto} disabled={ocupado} className={adminSecondaryButton}>No se concretó</button>
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
      {dialogoConflicto}
    </div>
  );
}
