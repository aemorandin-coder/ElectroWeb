'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiArrowDown, FiArrowLeft, FiArrowUp, FiEdit3, FiImage, FiLink, FiMail, FiPause, FiPlay, FiPlus, FiSave, FiSend, FiTrash2, FiType, FiUpload, FiUsers,
} from 'react-icons/fi';
import {
  adminBadge, adminCard, adminCardFlush, adminEmpty, adminHint, adminIconButton, adminInput, adminLabel, adminNotice,
  adminPrimaryButton, adminSecondaryButton, adminSpinner, adminSuccessButton, type AdminTone,
} from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useSession } from 'next-auth/react';

type Bloque =
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'texto'; texto: string }
  | { tipo: 'imagen'; url: string; alt: string; enlace?: string }
  | { tipo: 'boton'; texto: string; url: string };

interface Resumen {
  id: string;
  subject: string;
  status: 'DRAFT' | 'SENDING' | 'PAUSED' | 'SENT';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  lastError: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

const ESTADOS: Record<Resumen['status'], { label: string; tone: AdminTone }> = {
  DRAFT: { label: 'Borrador', tone: 'neutral' },
  SENDING: { label: 'Enviando', tone: 'brand' },
  PAUSED: { label: 'Pausada', tone: 'warning' },
  SENT: { label: 'Enviada', tone: 'success' },
};

const NUEVO: { subject: string; preheader: string; bloques: Bloque[] } = {
  subject: '',
  preheader: '',
  bloques: [
    { tipo: 'titulo', texto: 'Hola {nombre}' },
    { tipo: 'texto', texto: '' },
    { tipo: 'boton', texto: 'Ver ofertas', url: '/productos' },
  ],
};

const fecha = (valor: string | null) => (valor ? new Date(valor).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export default function Campanas() {
  const [datos, setDatos] = useState<{ campanas: Resumen[]; destinatarios: number; marketingActivo: boolean; limiteDiario: number } | null>(null);
  const [editando, setEditando] = useState<{ id: string | null } | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/campaigns');
      if (!res.ok) throw new Error();
      setDatos(await res.json());
    } catch {
      toast.error('No se pudieron cargar las campañas');
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/admin/campaigns')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelado) setDatos(d); })
      .catch(() => toast.error('No se pudieron cargar las campañas'));
    return () => { cancelado = true; };
  }, []);

  // Mientras una campaña se envía, el avance se refresca solo
  const hayEnvio = datos?.campanas.some((c) => c.status === 'SENDING');
  useEffect(() => {
    if (!hayEnvio || editando) return;
    const t = setInterval(cargar, 5000);
    return () => clearInterval(t);
  }, [hayEnvio, editando, cargar]);

  if (editando) {
    return <Editor id={editando.id} destinatarios={datos?.destinatarios ?? 0} alSalir={() => { setEditando(null); cargar(); }} />;
  }

  return (
    <Lista
      datos={datos}
      alCrear={() => setEditando({ id: null })}
      alEditar={(id) => setEditando({ id })}
      recargar={cargar}
    />
  );
}

/* ── Lista ──────────────────────────────────────────────────────────────── */

function Lista({ datos, alCrear, alEditar, recargar }: {
  datos: { campanas: Resumen[]; destinatarios: number; marketingActivo: boolean; limiteDiario: number } | null;
  alCrear: () => void;
  alEditar: (id: string) => void;
  recargar: () => void;
}) {
  const { confirm } = useConfirm();
  const [ocupada, setOcupada] = useState<string | null>(null);

  const accion = async (campana: Resumen, tipo: 'enviar' | 'pausar' | 'reanudar') => {
    if (tipo === 'enviar') {
      const ok = await confirm({
        title: 'Enviar campaña',
        message: `Se enviará "${campana.subject}" a ${datos?.destinatarios ?? 0} clientes que aceptaron promociones, uno por uno. No se puede deshacer.`,
        confirmText: 'Enviar ahora', cancelText: 'Cancelar', type: 'warning',
      });
      if (!ok) return;
    }
    setOcupada(campana.id);
    try {
      const res = await fetch(`/api/admin/campaigns/${campana.id}/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: tipo }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error || 'No se pudo completar la acción');
      toast.success(tipo === 'pausar' ? 'Campaña pausada' : tipo === 'reanudar' ? 'Envío reanudado' : `Enviando a ${data.totalRecipients} clientes`);
      recargar();
    } finally {
      setOcupada(null);
    }
  };

  const borrar = async (campana: Resumen) => {
    const ok = await confirm({ title: 'Borrar borrador', message: `¿Borrar "${campana.subject}"?`, confirmText: 'Borrar', cancelText: 'Cancelar', type: 'danger' });
    if (!ok) return;
    const res = await fetch(`/api/admin/campaigns/${campana.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => null);
    if (!res.ok) return toast.error(data?.error || 'No se pudo borrar');
    recargar();
  };

  if (!datos) return <div className="flex justify-center py-16"><span className={adminSpinner} aria-label="Cargando" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`${adminCard} flex items-center gap-3 p-4`}>
          <FiUsers className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <div>
            <p className="text-xs text-muted">Aceptan promociones</p>
            <p className="text-lg font-bold text-ink">{datos.destinatarios} clientes</p>
          </div>
        </div>
        <div className={`${adminCard} flex items-center gap-3 p-4`}>
          <FiMail className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <div>
            <p className="text-xs text-muted">Límite por día</p>
            <p className="text-lg font-bold text-ink">{datos.limiteDiario} correos</p>
          </div>
        </div>
        <div className={`${adminCard} flex items-center justify-between gap-3 p-4`}>
          <div>
            <p className="text-xs text-muted">Correos de marketing</p>
            <p className={`text-lg font-bold ${datos.marketingActivo ? 'text-success-strong' : 'text-warning-strong'}`}>{datos.marketingActivo ? 'Activados' : 'Desactivados'}</p>
          </div>
          <Link href="/admin/settings#correo" className="text-xs font-semibold text-brand-600 hover:underline">Configurar</Link>
        </div>
      </div>

      {!datos.marketingActivo && (
        <p className={adminNotice('warning')}>
          Puedes preparar campañas y enviar pruebas, pero para enviarlas a los clientes activa <strong>Correos de marketing</strong> en Configuración → Correo.
        </p>
      )}
      {datos.destinatarios === 0 && (
        <p className={adminNotice('neutral')}>
          Ningún cliente aceptó promociones todavía. Cada cliente lo activa en Mi panel → Configuración → Notificaciones.
        </p>
      )}

      <div className={adminCardFlush}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold text-ink">Campañas</h2>
          <button type="button" onClick={alCrear} className={`${adminPrimaryButton} h-9 px-3 text-xs`}>
            <FiPlus className="h-4 w-4" aria-hidden="true" /> Nueva campaña
          </button>
        </div>

        {datos.campanas.length === 0 ? (
          <div className={`${adminEmpty} m-4`}>
            <FiSend className="mb-2 h-8 w-8 text-subtle" aria-hidden="true" />
            <p className="font-semibold text-ink">Sin campañas</p>
            <p className="mt-1 text-sm text-muted">Redacta la primera con texto, imágenes y un botón.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {datos.campanas.map((c) => {
              const progreso = c.totalRecipients > 0 ? Math.round(((c.sentCount + c.failedCount) / c.totalRecipients) * 100) : 0;
              return (
                <li key={c.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-ink">{c.subject}</p>
                      <span className={adminBadge(ESTADOS[c.status].tone)}>{ESTADOS[c.status].label}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {c.status === 'DRAFT' ? `Creada ${fecha(c.createdAt)}` : `${c.sentCount} enviados${c.failedCount ? ` · ${c.failedCount} fallidos` : ''} de ${c.totalRecipients} · ${c.finishedAt ? `terminó ${fecha(c.finishedAt)}` : `empezó ${fecha(c.startedAt)}`}`}
                    </p>
                    {c.status !== 'DRAFT' && (
                      <div className="mt-2 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={progreso} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del envío">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${progreso}%` }} />
                      </div>
                    )}
                    {c.lastError && <p className="mt-1 text-xs font-semibold text-deal">{c.lastError}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.status === 'DRAFT' && (
                      <>
                        <button type="button" onClick={() => alEditar(c.id)} className={`${adminSecondaryButton} h-9 px-3 text-xs`}><FiEdit3 className="h-4 w-4" aria-hidden="true" /> Editar</button>
                        <button type="button" onClick={() => accion(c, 'enviar')} disabled={ocupada === c.id || !datos.marketingActivo || datos.destinatarios === 0} className={`${adminSuccessButton} h-9 px-3 text-xs`}><FiSend className="h-4 w-4" aria-hidden="true" /> Enviar</button>
                        <button type="button" onClick={() => borrar(c)} className={`${adminIconButton} hover:text-deal`} aria-label={`Borrar ${c.subject}`}><FiTrash2 className="h-4 w-4" /></button>
                      </>
                    )}
                    {c.status === 'SENDING' && (
                      <button type="button" onClick={() => accion(c, 'pausar')} disabled={ocupada === c.id} className={`${adminSecondaryButton} h-9 px-3 text-xs`}><FiPause className="h-4 w-4" aria-hidden="true" /> Pausar</button>
                    )}
                    {c.status === 'PAUSED' && (
                      <button type="button" onClick={() => accion(c, 'reanudar')} disabled={ocupada === c.id || !datos.marketingActivo} className={`${adminPrimaryButton} h-9 px-3 text-xs`}><FiPlay className="h-4 w-4" aria-hidden="true" /> Reanudar</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── Editor ─────────────────────────────────────────────────────────────── */

function Editor({ id, destinatarios, alSalir }: { id: string | null; destinatarios: number; alSalir: () => void }) {
  const { data: session } = useSession();
  const [campana, setCampana] = useState(NUEVO);
  const [campanaId, setCampanaId] = useState<string | null>(id);
  const [cargando, setCargando] = useState(Boolean(id));
  const [guardando, setGuardando] = useState(false);
  const [html, setHtml] = useState('');
  const [errorVista, setErrorVista] = useState<string | null>(null);
  // Por defecto, el correo de quien está en el panel (derivado, sin efecto)
  const [correoElegido, setCorreoPrueba] = useState<string | null>(null);
  const correoPrueba = correoElegido ?? session?.user?.email ?? '';
  const [probando, setProbando] = useState(false);
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const indiceSubida = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/campaigns/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCampana({ subject: d.subject, preheader: d.preheader || '', bloques: d.bloques }))
      .catch(() => toast.error('No se pudo abrir la campaña'))
      .finally(() => setCargando(false));
  }, [id]);

  // Vista previa con la misma función del envío real, con una pequeña espera mientras se escribe
  useEffect(() => {
    if (cargando) return;
    const t = setTimeout(async () => {
      // Mientras se escribe, los bloques vacíos no cuentan: la validación completa es al guardar o probar
      const bloques = campana.bloques.filter((b) =>
        b.tipo === 'imagen' ? b.url.trim() !== '' : b.tipo === 'boton' ? b.texto.trim() !== '' && b.url.trim() !== '' : b.texto.trim() !== ''
      );
      if (bloques.length === 0) {
        setHtml('');
        setErrorVista('Escribe o agrega un bloque para ver la vista previa.');
        return;
      }
      const res = await fetch('/api/admin/campaigns/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...campana, bloques, subject: campana.subject || 'Sin asunto' }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setHtml(data.html);
        setErrorVista(null);
      } else {
        setErrorVista(data?.error || 'Revisa el contenido');
      }
    }, 500);
    return () => clearTimeout(t);
  }, [campana, cargando]);

  const cambiarBloque = (indice: number, cambios: Partial<Bloque>) =>
    setCampana((c) => ({ ...c, bloques: c.bloques.map((b, i) => (i === indice ? ({ ...b, ...cambios } as Bloque) : b)) }));
  const mover = (indice: number, delta: number) =>
    setCampana((c) => {
      const bloques = [...c.bloques];
      const destino = indice + delta;
      if (destino < 0 || destino >= bloques.length) return c;
      [bloques[indice], bloques[destino]] = [bloques[destino], bloques[indice]];
      return { ...c, bloques };
    });
  const quitar = (indice: number) => setCampana((c) => ({ ...c, bloques: c.bloques.filter((_, i) => i !== indice) }));
  const agregar = (bloque: Bloque) => setCampana((c) => ({ ...c, bloques: [...c.bloques, bloque] }));

  const subirImagen = async (file: File) => {
    const indice = indiceSubida.current;
    if (indice === null) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('La imagen pesa más de 5 MB');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'campaign');
    setSubiendo(indice);
    try {
      const res = await fetch('/api/upload/settings', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error || 'No se pudo subir la imagen');
      cambiarBloque(indice, { url: data.url });
    } finally {
      setSubiendo(null);
      if (archivo.current) archivo.current.value = '';
    }
  };

  const guardar = async (): Promise<string | null> => {
    setGuardando(true);
    try {
      const res = await fetch(campanaId ? `/api/admin/campaigns/${campanaId}` : '/api/admin/campaigns', {
        method: campanaId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campana),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || 'No se pudo guardar');
        return null;
      }
      const nuevoId = campanaId ?? data.id;
      setCampanaId(nuevoId);
      toast.success('Borrador guardado');
      return nuevoId;
    } finally {
      setGuardando(false);
    }
  };

  const enviarPrueba = async () => {
    setProbando(true);
    try {
      const res = await fetch('/api/admin/campaigns/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...campana, email: correoPrueba }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error || 'No se pudo enviar la prueba');
      toast.success(`Prueba enviada a ${correoPrueba}`);
    } finally {
      setProbando(false);
    }
  };

  if (cargando) return <div className="flex justify-center py-16"><span className={adminSpinner} aria-label="Cargando" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={alSalir} className={`${adminSecondaryButton} h-9 px-3 text-xs`}>
          <FiArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a campañas
        </button>
        <button type="button" onClick={guardar} disabled={guardando} className={`${adminPrimaryButton} h-9 px-4 text-xs`}>
          <FiSave className="h-4 w-4" aria-hidden="true" /> {guardando ? 'Guardando…' : 'Guardar borrador'}
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className={`${adminCard} space-y-4`}>
            <div>
              <label htmlFor="campana-asunto" className={adminLabel}>Asunto *</label>
              <input id="campana-asunto" value={campana.subject} maxLength={150} onChange={(e) => setCampana((c) => ({ ...c, subject: e.target.value }))} placeholder="Ofertas de la semana en audio" className={adminInput()} />
            </div>
            <div>
              <label htmlFor="campana-preheader" className={adminLabel}>Texto de vista previa</label>
              <input id="campana-preheader" value={campana.preheader} maxLength={200} onChange={(e) => setCampana((c) => ({ ...c, preheader: e.target.value }))} placeholder="Lo que se lee junto al asunto en la bandeja" className={adminInput()} />
              <p className={adminHint}>Escribe <span className="font-mono">{'{nombre}'}</span> en títulos o textos para saludar a cada cliente por su nombre.</p>
            </div>
          </section>

          {campana.bloques.map((bloque, indice) => (
            <section key={indice} className={`${adminCard} space-y-3`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {bloque.tipo === 'titulo' ? 'Título' : bloque.tipo === 'texto' ? 'Texto' : bloque.tipo === 'imagen' ? 'Imagen' : 'Botón'}
                </p>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => mover(indice, -1)} disabled={indice === 0} className={adminIconButton} aria-label="Subir bloque"><FiArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => mover(indice, 1)} disabled={indice === campana.bloques.length - 1} className={adminIconButton} aria-label="Bajar bloque"><FiArrowDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => quitar(indice)} className={`${adminIconButton} hover:text-deal`} aria-label="Quitar bloque"><FiTrash2 className="h-4 w-4" /></button>
                </div>
              </div>

              {bloque.tipo === 'titulo' && (
                <input value={bloque.texto} maxLength={150} onChange={(e) => cambiarBloque(indice, { texto: e.target.value })} aria-label="Título" className={adminInput()} />
              )}
              {bloque.tipo === 'texto' && (
                <textarea value={bloque.texto} rows={5} maxLength={4000} onChange={(e) => cambiarBloque(indice, { texto: e.target.value })} aria-label="Texto" placeholder="Deja una línea en blanco para separar párrafos." className={`${adminInput()} h-auto py-2.5`} />
              )}
              {bloque.tipo === 'imagen' && (
                <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  <button
                    type="button"
                    onClick={() => { indiceSubida.current = indice; archivo.current?.click(); }}
                    className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-surface text-muted hover:border-brand-200"
                  >
                    {subiendo === indice ? <span className={adminSpinner} aria-label="Subiendo" /> : bloque.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bloque.url} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-center text-xs"><FiUpload className="mx-auto mb-1 h-5 w-5" aria-hidden="true" />Subir JPG o PNG</span>
                    )}
                  </button>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor={`bloque-${indice}-alt`} className={adminLabel}>Descripción de la imagen</label>
                      <input id={`bloque-${indice}-alt`} value={bloque.alt} maxLength={150} onChange={(e) => cambiarBloque(indice, { alt: e.target.value })} placeholder="Audífonos en oferta" className={adminInput()} />
                      <p className={adminHint}>La leen quienes tienen las imágenes bloqueadas.</p>
                    </div>
                    <div>
                      <label htmlFor={`bloque-${indice}-enlace`} className={adminLabel}>Enlace al tocarla</label>
                      <input id={`bloque-${indice}-enlace`} value={bloque.enlace ?? ''} onChange={(e) => cambiarBloque(indice, { enlace: e.target.value })} placeholder="/productos/audifonos" className={adminInput()} />
                    </div>
                  </div>
                </div>
              )}
              {bloque.tipo === 'boton' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`bloque-${indice}-texto`} className={adminLabel}>Texto del botón</label>
                    <input id={`bloque-${indice}-texto`} value={bloque.texto} maxLength={40} onChange={(e) => cambiarBloque(indice, { texto: e.target.value })} className={adminInput()} />
                  </div>
                  <div>
                    <label htmlFor={`bloque-${indice}-url`} className={adminLabel}>Enlace</label>
                    <input id={`bloque-${indice}-url`} value={bloque.url} onChange={(e) => cambiarBloque(indice, { url: e.target.value })} placeholder="/productos" className={adminInput()} />
                  </div>
                </div>
              )}
            </section>
          ))}

          <input ref={archivo} type="file" accept="image/png,image/jpeg,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subirImagen(f); }} />

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => agregar({ tipo: 'titulo', texto: '' })} className={`${adminSecondaryButton} h-9 px-3 text-xs`}><FiType className="h-4 w-4" aria-hidden="true" /> Título</button>
            <button type="button" onClick={() => agregar({ tipo: 'texto', texto: '' })} className={`${adminSecondaryButton} h-9 px-3 text-xs`}><FiEdit3 className="h-4 w-4" aria-hidden="true" /> Texto</button>
            <button type="button" onClick={() => agregar({ tipo: 'imagen', url: '', alt: '', enlace: '' })} className={`${adminSecondaryButton} h-9 px-3 text-xs`}><FiImage className="h-4 w-4" aria-hidden="true" /> Imagen</button>
            <button type="button" onClick={() => agregar({ tipo: 'boton', texto: 'Ver más', url: '/productos' })} className={`${adminSecondaryButton} h-9 px-3 text-xs`}><FiLink className="h-4 w-4" aria-hidden="true" /> Botón</button>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className={adminCardFlush}>
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold text-ink">Vista previa</h3>
              <p className="text-xs text-muted">Así llegará a {destinatarios} clientes, con su nombre y el enlace de baja.</p>
            </div>
            {errorVista ? (
              <p className={`${adminNotice('warning')} m-4`}>{errorVista}</p>
            ) : (
              <iframe title="Vista previa de la campaña" srcDoc={html} sandbox="" className="h-[34rem] w-full bg-surface" />
            )}
          </section>

          <section className={`${adminCard} space-y-3`}>
            <label htmlFor="campana-prueba" className={adminLabel}>Enviar una prueba</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="campana-prueba" type="email" value={correoPrueba} onChange={(e) => setCorreoPrueba(e.target.value)} placeholder="tu@correo.com" className={adminInput()} />
              <button type="button" onClick={enviarPrueba} disabled={probando || !correoPrueba || Boolean(errorVista)} className={`${adminSecondaryButton} shrink-0`}>
                <FiSend className="h-4 w-4" aria-hidden="true" /> {probando ? 'Enviando…' : 'Enviar prueba'}
              </button>
            </div>
            <p className={adminHint}>Llega solo a esa dirección, marcada como prueba. Revísala en el teléfono antes de enviar la campaña.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
