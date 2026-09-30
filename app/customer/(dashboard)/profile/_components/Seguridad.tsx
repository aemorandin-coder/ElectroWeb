'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiArchive, FiCheck, FiClock, FiCircle, FiEye, FiEyeOff, FiLogIn, FiLogOut, FiMonitor, FiSlash, FiSmartphone, FiTrash2, FiX, FiXCircle, FiKey } from 'react-icons/fi';
import {
  adminBadge, adminDangerButton, adminError, adminInput, adminLabel, adminModalBody, adminModalFooter, adminModalHeader,
  adminModalOverlay, adminModalPanel, adminModalTitle, adminNotice, adminPrimaryButton, adminSecondaryButton, adminIconButton,
} from '@/lib/admin-ui';
import { REGLAS_CONTRASENA } from '@/lib/validations/registro';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useCajonAccesible } from '@/lib/hooks/useCajonAccesible';
import { useMontado } from '@/lib/hooks/useMontado';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { Seccion, fechaCorta } from './comun';
import type { Actividad, Ajustes } from './tipos';

// Seguridad (C-138): contraseña, sesiones, actividad reciente y la cuenta (desactivar o pedir que se elimine).

const TEXTO_ACTIVIDAD: Record<string, { texto: string; Icono: typeof FiLogIn; tono: 'success' | 'danger' | 'warning' | 'brand' }> = {
  AUTH_LOGIN_SUCCESS: { texto: 'Inicio de sesión', Icono: FiLogIn, tono: 'success' },
  AUTH_LOGIN_FAILED: { texto: 'Contraseña equivocada', Icono: FiXCircle, tono: 'danger' },
  AUTH_LOGIN_BLOCKED: { texto: 'Bloqueado por muchos intentos', Icono: FiSlash, tono: 'danger' },
  AUTH_PASSWORD_CHANGED: { texto: 'Cambió la contraseña', Icono: FiKey, tono: 'brand' },
  AUTH_PASSWORD_RESET: { texto: 'Recuperó la contraseña', Icono: FiKey, tono: 'warning' },
};

export default function Seguridad({ ajustes, onCambio }: { ajustes: Ajustes; onCambio: () => Promise<void> }) {
  const { confirm } = useConfirm();
  const { seguridad, cuenta } = ajustes;
  const [eliminar, setEliminar] = useState(false);
  // Sube al cerrar las demás sesiones desde el cambio de contraseña: la lista se vuelve a pedir
  const [versionLista, setVersionLista] = useState(0);

  const cerrarTodas = async () => {
    const ok = await confirm({
      title: 'Cerrar sesión en todos los dispositivos',
      message: 'Se cierra tu sesión aquí y en cualquier otro teléfono o computadora. Tendrás que volver a entrar.',
      confirmText: 'Cerrar todas',
      cancelText: 'Cancelar',
      type: 'warning',
    });
    if (!ok) return;
    const res = await fetch('/api/customer/settings', { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) {
      toast.error('No se pudieron cerrar las sesiones');
      return;
    }
    toast.success('Listo: se cerraron todas tus sesiones');
    await signOut({ callbackUrl: '/login' });
  };

  const desactivar = async () => {
    const ok = await confirm({
      title: 'Desactivar tu cuenta',
      message: 'Se cierra tu sesión en todos los dispositivos y la tienda deja de enviarte avisos. Tus pedidos y tus Puntos ES se guardan. Para reactivarla, solo vuelve a iniciar sesión.',
      confirmText: 'Desactivar',
      cancelText: 'Cancelar',
      type: 'warning',
    });
    if (!ok) return;
    const res = await fetch('/api/customer/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deactivate' }),
    }).catch(() => null);
    if (!res?.ok) {
      toast.error('No se pudo desactivar la cuenta');
      return;
    }
    toast.success('Cuenta desactivada');
    await signOut({ callbackUrl: '/login' });
  };

  const cancelarEliminacion = async () => {
    const res = await fetch('/api/customer/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_deletion' }),
    }).catch(() => null);
    if (!res?.ok) {
      toast.error('No se pudo cancelar el pedido');
      return;
    }
    toast.success('Pedido cancelado: tu cuenta sigue activa');
    await onCambio();
  };

  return (
    <div className="space-y-4">
      {cuenta.estado === 'PENDING_DELETION' && (
        <div className={`${adminNotice('warning')} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`} role="status">
          <div className="flex items-start gap-2">
            <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="text-sm">
              <strong>Pediste eliminar tu cuenta</strong>
              {cuenta.eliminacionPedidaEl && <> el {new Date(cuenta.eliminacionPedidaEl).toLocaleDateString('es-VE', { day: 'numeric', month: 'long' })}</>}.
              {' '}El equipo te escribirá a tu correo para confirmarlo. Mientras tanto puedes seguir usándola.
            </p>
          </div>
          <button type="button" onClick={cancelarEliminacion} className={`${adminSecondaryButton} shrink-0`}>Cancelar el pedido</button>
        </div>
      )}

      <Seccion titulo="Contraseña">
        {seguridad.tieneContrasena ? (
          <CambiarContrasena onOtrasCerradas={() => setVersionLista((v) => v + 1)} />
        ) : (
          <p className="text-sm text-ink-soft">
            Entras con Google y tu cuenta no tiene contraseña. Si quieres crear una para entrar también con tu correo, usa{' '}
            <Link href="/recuperar-contrasena" className="font-semibold text-brand-600 hover:underline">Recuperar contraseña</Link>.
          </p>
        )}
        {seguridad.conGoogle && seguridad.tieneContrasena && (
          <p className="mt-3 text-sm text-muted">También puedes entrar con Google.</p>
        )}
      </Seccion>

      <Seccion titulo="Dónde tienes tu sesión abierta" descripcion="Si ves un dispositivo que no reconoces, ciérralo y cambia tu contraseña.">
        <SesionesAbiertas key={versionLista} />
        <button type="button" onClick={cerrarTodas} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink">
          <FiLogOut className="h-4 w-4" aria-hidden="true" /> Cerrar sesión en todos, también aquí
        </button>
      </Seccion>

      <Seccion titulo="Actividad reciente" descripcion="Los últimos accesos y cambios de contraseña de tu cuenta.">
        {seguridad.actividad.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay actividad registrada.</p>
        ) : (
          <ul className="divide-y divide-line">
            {seguridad.actividad.map((a) => <FilaActividad key={a.id} actividad={a} />)}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Tu cuenta">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Desactivar la cuenta</p>
              <p className="text-sm text-muted">Una pausa: vuelve a iniciar sesión cuando quieras y todo sigue igual.</p>
            </div>
            <button type="button" onClick={desactivar} className={`${adminSecondaryButton} shrink-0`}>Desactivar</button>
          </div>
          <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Eliminar la cuenta</p>
              <p className="text-sm text-muted">Le pides al equipo que la cierre para siempre.</p>
            </div>
            <button
              type="button"
              onClick={() => setEliminar(true)}
              disabled={cuenta.estado === 'PENDING_DELETION'}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-deal/40 bg-white px-5 text-sm font-semibold text-deal transition-colors hover:bg-deal-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiTrash2 className="h-4 w-4" aria-hidden="true" /> {cuenta.estado === 'PENDING_DELETION' ? 'Ya lo pediste' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Seccion>

      {eliminar && <ModalEliminar onCerrar={() => setEliminar(false)} onListo={onCambio} />}
    </div>
  );
}

function FilaActividad({ actividad }: { actividad: Actividad }) {
  const meta = TEXTO_ACTIVIDAD[actividad.accion] ?? { texto: actividad.accion, Icono: FiMonitor, tono: 'brand' as const };
  const { Icono } = meta;
  const color = meta.tono === 'danger' ? 'text-deal' : meta.tono === 'success' ? 'text-success-strong' : meta.tono === 'warning' ? 'text-warning-strong' : 'text-brand-600';
  return (
    <li className="flex items-start gap-3 py-3">
      <Icono className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          {meta.texto}
          {actividad.metodo === 'google' && <span className="font-normal text-muted"> con Google</span>}
        </p>
        {actividad.dispositivo !== 'Desconocido' && <p className="text-xs text-muted">{actividad.dispositivo}</p>}
      </div>
      <span className="shrink-0 text-xs text-muted">{fechaCorta(actividad.fecha)}</span>
    </li>
  );
}

interface SesionAbierta {
  id: string;
  dispositivo: string;
  metodo: string | null;
  createdAt: string;
  lastSeenAt: string;
  actual: boolean;
}

/** C-140: cada sesión con su dispositivo y "Cerrar". La actual primero y sin botón (para eso está "Salir"). */
function SesionesAbiertas() {
  const { confirm } = useConfirm();
  const [sesiones, setSesiones] = useState<SesionAbierta[] | null>(null);
  const [actualConNombre, setActualConNombre] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = async () => {
    const res = await fetch('/api/customer/sesiones').catch(() => null);
    if (!res?.ok) {
      setSesiones([]);
      return;
    }
    const data = await res.json();
    setActualConNombre(data.actualConNombre);
    setSesiones([...data.sesiones].sort((a: SesionAbierta, b: SesionAbierta) => Number(b.actual) - Number(a.actual)));
  };
  useCargarAlMontar(() => void cargar(), []);

  const cerrar = async (s: SesionAbierta) => {
    setOcupado(s.id);
    const res = await fetch(`/api/customer/sesiones?id=${encodeURIComponent(s.id)}`, { method: 'DELETE' }).catch(() => null);
    setOcupado(null);
    if (!res?.ok) {
      toast.error('No se pudo cerrar esa sesión');
      return;
    }
    toast.success(`Cerramos la sesión de ${s.dispositivo}`);
    await cargar();
  };

  const cerrarOtras = async () => {
    const ok = await confirm({
      title: 'Cerrar las demás sesiones',
      message: actualConNombre
        ? 'Se cierra tu sesión en cualquier otro teléfono o computadora. Aquí sigues conectado.'
        : 'Se cierra tu sesión en todos los dispositivos, también aquí: vuelve a entrar para seguir.',
      confirmText: 'Cerrar las demás',
      cancelText: 'Cancelar',
      type: 'warning',
    });
    if (!ok) return;
    setOcupado('otras');
    const res = await fetch('/api/customer/sesiones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'cerrar_otras' }),
    }).catch(() => null);
    setOcupado(null);
    if (!res?.ok) {
      toast.error('No se pudieron cerrar las sesiones');
      return;
    }
    const data = await res.json();
    if (data.actualCerrada) {
      await signOut({ callbackUrl: '/login' });
      return;
    }
    toast.success('Cerramos las demás sesiones');
    await cargar();
  };

  if (!sesiones) return <div className="h-20 animate-pulse rounded-xl bg-surface" aria-label="Cargando sesiones" />;
  const otras = sesiones.filter((s) => !s.actual).length;

  return (
    <div>
      {sesiones.length === 0 ? (
        <p className="text-sm text-muted">No hay otras sesiones abiertas.</p>
      ) : (
        <ul className="divide-y divide-line">
          {sesiones.map((s) => {
            const Icono = /^(Android|iPhone|iPad)/.test(s.dispositivo) ? FiSmartphone : FiMonitor;
            return (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <Icono className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-ink">
                    {s.dispositivo === 'Desconocido' ? 'Dispositivo desconocido' : s.dispositivo}
                    {s.actual && <span className={adminBadge('success')}>Este dispositivo</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {s.actual ? 'Activa ahora' : `Último uso: ${fechaCorta(s.lastSeenAt)}`}
                    {' · '}Entró {s.metodo === 'google' ? 'con Google' : 'con contraseña'} el {new Date(s.createdAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                {!s.actual && (
                  <button type="button" onClick={() => cerrar(s)} disabled={ocupado !== null} className={`${adminSecondaryButton} h-10 shrink-0 px-3`}>
                    {ocupado === s.id ? 'Cerrando…' : 'Cerrar'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {(otras > 0 || !actualConNombre) && (
        <button type="button" onClick={cerrarOtras} disabled={ocupado !== null} className={`${adminSecondaryButton} mt-3 w-full sm:w-auto`}>
          <FiLogOut className="h-4 w-4" aria-hidden="true" /> {ocupado === 'otras' ? 'Cerrando…' : 'Cerrar las demás sesiones'}
        </button>
      )}
    </div>
  );
}

function CambiarContrasena({ onOtrasCerradas }: { onOtrasCerradas: () => void }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [ver, setVer] = useState(false);
  const [cerrarOtras, setCerrarOtras] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cumpleReglas = REGLAS_CONTRASENA.every((r) => r.cumple(nueva));
  const noCoinciden = repetir.length > 0 && nueva !== repetir;
  const listo = actual && cumpleReglas && nueva === repetir;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listo) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch('/api/customer/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: actual, newPassword: nueva, cerrarOtras }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo cambiar la contraseña');
        return;
      }
      if (data.sesionCerrada) {
        toast.success('Contraseña cambiada. Entra de nuevo con la nueva.');
        await signOut({ callbackUrl: '/login' });
        return;
      }
      toast.success(cerrarOtras ? 'Contraseña cambiada. Cerramos tus otras sesiones.' : 'Contraseña cambiada');
      if (cerrarOtras) onOtrasCerradas();
      setActual('');
      setNueva('');
      setRepetir('');
    } catch {
      setError('No se pudo cambiar la contraseña. Revisa tu conexión.');
    } finally {
      setEnviando(false);
    }
  };

  const tipo = ver ? 'text' : 'password';
  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <div>
        <label htmlFor="clave-actual" className={adminLabel}>Contraseña actual</label>
        <div className="relative">
          <input id="clave-actual" type={tipo} value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" className={`${adminInput()} pr-11`} />
          <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseñas' : 'Mostrar contraseñas'} aria-pressed={ver} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink">
            {ver ? <FiEyeOff className="h-4 w-4" aria-hidden="true" /> : <FiEye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="clave-nueva" className={adminLabel}>Nueva contraseña</label>
          <input id="clave-nueva" type={tipo} value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" aria-describedby="clave-reglas" className={adminInput()} />
        </div>
        <div>
          <label htmlFor="clave-repetir" className={adminLabel}>Repite la nueva</label>
          <input id="clave-repetir" type={tipo} value={repetir} onChange={(e) => setRepetir(e.target.value)} autoComplete="new-password" className={adminInput(noCoinciden)} />
          {noCoinciden && <p className={adminError}>No coinciden</p>}
        </div>
      </div>
      <ul id="clave-reglas" className="grid grid-cols-2 gap-x-3 gap-y-1">
        {REGLAS_CONTRASENA.map((regla) => {
          const cumple = regla.cumple(nueva);
          const Icono = cumple ? FiCheck : FiCircle;
          return (
            <li key={regla.id} className={`flex items-center gap-1.5 text-xs font-medium ${cumple ? 'text-success-strong' : 'text-muted'}`}>
              <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {regla.texto}
              <span className="sr-only">{cumple ? ': listo' : ': falta'}</span>
            </li>
          );
        })}
      </ul>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={cerrarOtras} onChange={(e) => setCerrarOtras(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-line text-brand-500 focus:ring-brand-500" />
        <span className="text-sm text-ink-soft">Cerrar mi sesión en los demás dispositivos (recomendado si alguien más la conocía)</span>
      </label>
      {error && <p className={adminError} role="alert">{error}</p>}
      <button type="submit" disabled={!listo || enviando} className={`${adminPrimaryButton} w-full sm:w-auto`}>
        {enviando ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

function ModalEliminar({ onCerrar, onListo }: { onCerrar: () => void; onListo: () => Promise<void> }) {
  const montado = useMontado();
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  useBodyScrollLock(true);
  useCajonAccesible(true, 'modal-eliminar-cuenta', onCerrar);

  const enviar = async () => {
    setEnviando(true);
    try {
      const res = await fetch('/api/customer/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_deletion', reason: motivo.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'No se pudo enviar el pedido');
        return;
      }
      toast.success(data.message || 'Recibimos tu pedido');
      onCerrar();
      await onListo();
    } catch {
      toast.error('No se pudo enviar el pedido. Revisa tu conexión.');
    } finally {
      setEnviando(false);
    }
  };

  if (!montado) return null;
  return createPortal(
    <div className={adminModalOverlay} onClick={onCerrar}>
      <div
        id="modal-eliminar-cuenta"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-eliminar-titulo"
        className={`${adminModalPanel} sm:max-w-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={adminModalHeader}>
          <h2 id="modal-eliminar-titulo" className={adminModalTitle}>Eliminar tu cuenta</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className={adminIconButton}><FiX className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <div className={`${adminModalBody} space-y-3 text-sm text-ink-soft`}>
          <p>Tu pedido le llega al equipo, que te escribirá a tu correo para confirmarlo antes de cerrar la cuenta.</p>
          <ul className="space-y-2">
            <li className="flex gap-2"><FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" aria-hidden="true" /><span><strong className="text-ink">Antes, usa tus Puntos ES:</strong> no se convierten en dinero.</span></li>
            <li className="flex gap-2"><FiArchive className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" /><span><strong className="text-ink">Se guardan tus pedidos y recibos</strong> en los registros de la tienda, como exige la ley.</span></li>
            <li className="flex gap-2"><FiClock className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" /><span><strong className="text-ink">Mientras tanto</strong> puedes seguir usando tu cuenta y cancelar el pedido desde aquí.</span></li>
          </ul>
          <p>Si solo quieres una pausa, mejor <strong>desactívala</strong>: vuelves cuando quieras.</p>
          <div>
            <label htmlFor="motivo-eliminar" className={adminLabel}>¿Por qué te vas? <span className="font-normal text-muted">(opcional)</span></label>
            <textarea id="motivo-eliminar" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} rows={3} className={`${adminInput()} h-auto py-2`} />
          </div>
        </div>
        <div className={adminModalFooter}>
          <button type="button" onClick={onCerrar} className={adminSecondaryButton}>Volver</button>
          <button type="button" onClick={enviar} disabled={enviando} className={adminDangerButton}>
            {enviando ? 'Enviando…' : 'Pedir que eliminen mi cuenta'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
