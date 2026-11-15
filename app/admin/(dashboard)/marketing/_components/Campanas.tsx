'use client';

// La lista de campañas de Marketing (C-75). C-249d: crear o cambiar una va por pasos en su propia página
// (/admin/marketing/campanas/nueva y /admin/marketing/campanas/<id>, PLAN.md §1.9); "Nueva campaña" y "Editar" llevan ahí.

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { IconoClientes, IconoCorreo, IconoEditar, IconoEliminar, IconoEnviar, IconoMas, IconoPausa, IconoPlay } from '@/components/iconos';
import {
  adminBadge, adminCard, adminCardFlush, adminEmpty, adminIconButton, adminNotice, adminPrimaryButton, adminSecondaryButton,
  adminSpinner, adminSuccessButton, type AdminTone,
} from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import ModalDestinatarios from '../campanas/_components/ModalDestinatarios';
import { clientes, type Audiencia } from '../campanas/_components/campana';

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

const fecha = (valor: string | null) => (valor ? new Date(valor).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export default function Campanas() {
  const [datos, setDatos] = useState<{ campanas: Resumen[]; destinatarios: number; audiencia?: Audiencia; marketingActivo: boolean; limiteDiario: number } | null>(null);

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
    if (!hayEnvio) return;
    const t = setInterval(cargar, 5000);
    return () => clearInterval(t);
  }, [hayEnvio, cargar]);

  return <Lista datos={datos} recargar={cargar} />;
}

/* ── Lista ──────────────────────────────────────────────────────────────── */

function Lista({ datos, recargar }: {
  datos: { campanas: Resumen[]; destinatarios: number; audiencia?: Audiencia; marketingActivo: boolean; limiteDiario: number } | null;
  recargar: () => void;
}) {
  const { confirm } = useConfirm();
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [verDestinatarios, setVerDestinatarios] = useState(false);

  const accion = async (campana: Resumen, tipo: 'enviar' | 'pausar' | 'reanudar') => {
    if (tipo === 'enviar') {
      const ok = await confirm({
        title: 'Enviar campaña',
        message: `Se enviará "${campana.subject}" a ${clientes(datos?.destinatarios ?? 0)} que ${(datos?.destinatarios ?? 0) === 1 ? 'aceptó' : 'aceptaron'} promociones, uno por uno. No se puede deshacer.`,
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
    let res = await fetch(`/api/admin/campaigns/${campana.id}`, { method: 'DELETE' });
    let data = await res.json().catch(() => null);
    // C-170: otra persona la tiene abierta ahora: se pregunta antes de borrarla
    if (res.status === 409 && data?.conflicto === 'en_edicion') {
      const seguir = await confirm({ title: 'La están editando ahora', message: `${data.error}. Si la borras, verá un aviso. ¿Borrarla igual?`, confirmText: 'Borrar', cancelText: 'Cancelar', type: 'warning' });
      if (!seguir) return;
      res = await fetch(`/api/admin/campaigns/${campana.id}?forzar=1`, { method: 'DELETE' });
      data = await res.json().catch(() => null);
    }
    if (!res.ok) return toast.error(data?.error || 'No se pudo borrar');
    recargar();
  };

  if (!datos) return <div className="flex justify-center py-16"><span className={adminSpinner} aria-label="Cargando" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`${adminCard} flex flex-col gap-2 p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconoClientes className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
              <div>
                <p className="text-xs text-muted">Aceptan promociones</p>
                <p className="text-lg font-bold text-ink">
                  {datos.audiencia ? `${datos.audiencia.aceptan} de ${clientes(datos.audiencia.clientes)}` : clientes(datos.destinatarios)}
                </p>
              </div>
            </div>
            {datos.destinatarios > 0 && (
              <button
                type="button"
                onClick={() => setVerDestinatarios(true)}
                className={`${adminSecondaryButton} h-8 px-2.5 text-xs`}
              >
                Ver correos
              </button>
            )}
          </div>
          {datos.audiencia && datos.audiencia.clientes > datos.audiencia.aceptan && (
            <ul className="space-y-0.5 pl-8 text-xs text-ink-soft">
              {datos.audiencia.sinDecidir > 0 && <li>{datos.audiencia.sinDecidir} sin decidir: Mi panel se lo pregunta</li>}
              {datos.audiencia.dijeronQueNo > 0 && <li>{datos.audiencia.dijeronQueNo} dijeron que no</li>}
              {datos.audiencia.sinVerificar > 0 && <li>{datos.audiencia.sinVerificar} sin verificar el correo</li>}
            </ul>
          )}
        </div>
        <div className={`${adminCard} flex items-center gap-3 p-4`}>
          <IconoCorreo className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <div>
            <p className="text-xs text-muted">Límite por día</p>
            <p className="text-lg font-bold text-ink">{datos.limiteDiario} correos</p>
          </div>
        </div>
        <div className={`${adminCard} flex items-center justify-between gap-3 p-4`}>
          <div>
            <p className="text-xs text-muted">Correos de marketing</p>
            <p className={`text-lg font-bold ${datos.marketingActivo ? 'text-success-strong' : 'text-ink'}`}>{datos.marketingActivo ? 'Activados' : 'Desactivados'}</p>
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
          Ningún cliente aceptó promociones todavía. Se les pregunta al registrarse y una vez en Mi panel; también lo activan en Mi perfil → Notificaciones.
        </p>
      )}

      <div className={adminCardFlush}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold text-ink">Campañas</h2>
          <Link href="/admin/marketing/campanas/nueva" className={`${adminPrimaryButton} h-9 px-3 text-xs`}>
            <IconoMas className="h-4 w-4" aria-hidden="true" /> Nueva campaña
          </Link>
        </div>

        {datos.campanas.length === 0 ? (
          <div className={`${adminEmpty} m-4`}>
            <IconoEnviar className="mb-2 h-8 w-8 text-subtle" aria-hidden="true" />
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
                        <Link href={`/admin/marketing/campanas/${c.id}`} className={`${adminSecondaryButton} h-9 px-3 text-xs`}><IconoEditar className="h-4 w-4" aria-hidden="true" /> Editar</Link>
                        <button type="button" onClick={() => accion(c, 'enviar')} disabled={ocupada === c.id || !datos.marketingActivo || datos.destinatarios === 0} className={`${adminSuccessButton} h-9 px-3 text-xs`}><IconoEnviar className="h-4 w-4" aria-hidden="true" /> Enviar</button>
                        <button type="button" onClick={() => borrar(c)} className={`${adminIconButton} hover:text-deal`} aria-label={`Borrar ${c.subject}`}><IconoEliminar className="h-4 w-4" /></button>
                      </>
                    )}
                    {c.status === 'SENDING' && (
                      <button type="button" onClick={() => accion(c, 'pausar')} disabled={ocupada === c.id} className={`${adminSecondaryButton} h-9 px-3 text-xs`}><IconoPausa className="h-4 w-4" aria-hidden="true" /> Pausar</button>
                    )}
                    {c.status === 'PAUSED' && (
                      <button type="button" onClick={() => accion(c, 'reanudar')} disabled={ocupada === c.id || !datos.marketingActivo} className={`${adminPrimaryButton} h-9 px-3 text-xs`}><IconoPlay className="h-4 w-4" aria-hidden="true" /> Reanudar</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Montado solo mientras está abierto: al cerrar se reinician búsqueda y páginas (C-109) */}
      {verDestinatarios && <ModalDestinatarios abierto alCerrar={() => setVerDestinatarios(false)} />}
    </div>
  );
}
