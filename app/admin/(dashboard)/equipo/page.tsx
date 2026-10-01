'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { IconType } from 'react-icons';
import { FiAlertTriangle, FiArrowLeft, FiChevronRight, FiLock, FiLogOut, FiRefreshCw, FiRepeat, FiSend, FiSlash, FiTrash2, FiUnlock, FiUserPlus, FiX } from 'react-icons/fi';
import {
  adminBadge, adminCard, adminChoice, adminDangerButton, adminEmpty, adminError, adminIconButton, adminInput, adminLabel, adminModalBody, adminModalFooter,
  adminModalHeader, adminModalOverlay, adminModalPanel, adminModalTitle, adminNotice, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton,
  adminSecondaryButton, adminSectionTitle, adminSpinner,
} from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useCajonAccesible } from '@/lib/hooks/useCajonAccesible';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import type { EstadoMiembro, MiembroEquipo, RolEquipo } from '@/lib/equipo';

// Equipo (C-141): quién entra al panel, con qué rol y cómo protege su cuenta. Solo el super admin.
// Los admin nuevos entran por invitación al correo: cada uno crea su contraseña y sus dos pasos.

const ROLES: { rol: RolEquipo; nombre: string; detalle: string }[] = [
  { rol: 'ADMIN', nombre: 'Administrador', detalle: 'Todo el día a día: productos, órdenes, pagos, clientes, garantías y contenido. No ve Configuración, Métodos de pago ni Equipo.' },
  { rol: 'SUPER_ADMIN', nombre: 'Super admin', detalle: 'Todo, incluidos Configuración, Métodos de pago y Equipo. Solo para los dueños.' },
];
const nombreRol = (rol: RolEquipo) => (rol === 'SUPER_ADMIN' ? 'Super admin' : 'Administrador');
const otroRol = (rol: RolEquipo): RolEquipo => (rol === 'SUPER_ADMIN' ? 'ADMIN' : 'SUPER_ADMIN');

const ESTADOS: Record<EstadoMiembro, { texto: string; tono: 'success' | 'warning' | 'danger' }> = {
  activo: { texto: 'Con acceso', tono: 'success' },
  invitado: { texto: 'Invitación sin aceptar', tono: 'warning' },
  sin_acceso: { texto: 'Sin acceso', tono: 'danger' },
};

type Accion = 'cambiar_rol' | 'quitar_acceso' | 'devolver_acceso' | 'reiniciar_dos_pasos' | 'reenviar_invitacion' | 'cancelar_invitacion' | 'cerrar_sesiones';

const ACCIONES: Record<Accion, { Icon: IconType; titulo: (m: MiembroEquipo) => string; detalle: (m: MiembroEquipo) => string; boton: string; hecho: string; peligro?: boolean; para: (m: MiembroEquipo) => boolean }> = {
  reenviar_invitacion: {
    Icon: FiSend,
    titulo: () => 'Reenviar la invitación',
    detalle: (m) => `Le llega a ${m.correo} un enlace nuevo para crear su contraseña. Sirve 24 horas y el anterior deja de servir.`,
    boton: 'Reenviar',
    hecho: 'Invitación reenviada',
    para: (m) => m.estado === 'invitado',
  },
  cambiar_rol: {
    Icon: FiRepeat,
    titulo: (m) => `Cambiar a ${nombreRol(otroRol(m.rol))}`,
    detalle: (m) => `${m.nombre} pasa de ${nombreRol(m.rol)} a ${nombreRol(otroRol(m.rol))}. ${ROLES.find((r) => r.rol === otroRol(m.rol))?.detalle} Si tiene una sesión abierta se cierra y vuelve a entrar con el rol nuevo.`,
    boton: 'Cambiar el rol',
    hecho: 'Rol cambiado',
    para: () => true,
  },
  reiniciar_dos_pasos: {
    Icon: FiRefreshCw,
    titulo: () => 'Reiniciar sus dos pasos',
    detalle: (m) => `Para cuando ${m.nombre} pierde o cambia el teléfono. Se borran su app de códigos y sus códigos de respaldo, se cierran sus sesiones y la próxima vez que entre los configura de nuevo. Antes de hacerlo, confirma por otro medio (una llamada) que quien lo pide es esa persona.`,
    boton: 'Reiniciar',
    hecho: 'Dos pasos reiniciados',
    para: (m) => m.dosPasos,
  },
  cerrar_sesiones: {
    Icon: FiLogOut,
    titulo: () => 'Cerrar sus sesiones',
    detalle: (m) => `${m.nombre} sale del panel en todos sus dispositivos y tiene que volver a entrar.`,
    boton: 'Cerrar sesiones',
    hecho: 'Sesiones cerradas',
    para: (m) => m.sesionAbierta,
  },
  devolver_acceso: {
    Icon: FiUnlock,
    titulo: () => 'Devolver el acceso',
    detalle: (m) => `${m.nombre} puede volver a entrar al panel como ${nombreRol(m.rol)}, con su contraseña y sus dos pasos de antes.`,
    boton: 'Devolver el acceso',
    hecho: 'Acceso devuelto',
    para: (m) => m.estado === 'sin_acceso',
  },
  quitar_acceso: {
    Icon: FiSlash,
    titulo: () => 'Quitar el acceso',
    detalle: (m) => `${m.nombre} deja de entrar al panel ahora mismo: se cierran sus sesiones y su contraseña ya no sirve. Lo que hizo queda en la bitácora. Se puede devolver después.`,
    boton: 'Quitar el acceso',
    hecho: 'Acceso quitado',
    peligro: true,
    para: (m) => m.estado === 'activo',
  },
  cancelar_invitacion: {
    Icon: FiTrash2,
    titulo: () => 'Cancelar la invitación',
    detalle: (m) => `Se borra la invitación de ${m.correo} y su enlace deja de servir. Úsalo si el correo estaba mal escrito.`,
    boton: 'Cancelar la invitación',
    hecho: 'Invitación cancelada',
    peligro: true,
    para: (m) => m.estado === 'invitado',
  },
};
const ORDEN: Accion[] = ['reenviar_invitacion', 'devolver_acceso', 'cambiar_rol', 'reiniciar_dos_pasos', 'cerrar_sesiones', 'quitar_acceso', 'cancelar_invitacion'];

const fecha = (iso: string) => new Date(iso).toLocaleString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

async function enviar(cuerpo: Record<string, string>): Promise<{ ok: true; correoEnviado?: boolean } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/admin/equipo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: datos.error || 'No se pudo completar la acción.' };
    return { ok: true, correoEnviado: datos.correoEnviado };
  } catch {
    return { ok: false, error: 'Sin conexión. Intenta de nuevo.' };
  }
}

const avisoCorreo = (enviado: boolean | undefined, exito: string) => {
  if (enviado === false) toast.error('Quedó guardado, pero el correo no salió. Revisa el correo de la tienda en Configuración y usa "Reenviar la invitación".', { duration: 8000 });
  else toast.success(exito);
};

export default function EquipoPage() {
  const [equipo, setEquipo] = useState<MiembroEquipo[] | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [invitando, setInvitando] = useState(false);
  const [elegido, setElegido] = useState<MiembroEquipo | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/equipo', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      setEquipo((await res.json()).equipo);
      setErrorCarga('');
    } catch {
      setErrorCarga('No se pudo cargar el equipo. Recarga la página.');
    }
  }, []);
  useCargarAlMontar(cargar);

  return (
    <div className="mx-auto max-w-4xl">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Equipo</h1>
          <p className={adminPageSubtitle}>Quién entra al panel, con qué rol y cómo protege su cuenta.</p>
        </div>
        <button type="button" onClick={() => setInvitando(true)} className={adminPrimaryButton}>
          <FiUserPlus className="h-4 w-4" aria-hidden="true" />
          Invitar
        </button>
      </div>

      {errorCarga ? (
        <p className={adminNotice('danger')} role="alert">{errorCarga}</p>
      ) : !equipo ? (
        <div className="flex justify-center py-16" role="status" aria-label="Cargando"><span className={adminSpinner} aria-hidden="true" /></div>
      ) : equipo.length === 0 ? (
        <div className={adminEmpty}><p className="text-sm text-muted">Todavía no hay nadie en el equipo.</p></div>
      ) : (
        <ul className="space-y-3">
          {equipo.map((m) => (
            <li key={m.id} className={`${adminCard} flex flex-col gap-4 sm:flex-row sm:items-center`}>
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700" aria-hidden="true">{m.nombre.charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-semibold text-ink">{m.nombre}</span>
                    {m.soyYo && <span className={adminBadge('neutral')}>Tú</span>}
                    <span className={adminBadge(m.rol === 'SUPER_ADMIN' ? 'brand' : 'neutral')}>{nombreRol(m.rol)}</span>
                  </p>
                  <p className="truncate text-sm text-muted">{m.correo}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={adminBadge(ESTADOS[m.estado].tono)}>{ESTADOS[m.estado].texto}</span>
                    {m.estado !== 'invitado' && (
                      <span className={adminBadge(m.dosPasos ? 'success' : 'warning')}>
                        <FiLock className="h-3 w-3" aria-hidden="true" />
                        {m.dosPasos ? 'Dos pasos activos' : 'Dos pasos sin configurar'}
                      </span>
                    )}
                    {m.sesionAbierta && <span className={adminBadge('brand')}>Sesión abierta</span>}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {m.estado === 'invitado'
                      ? m.invitacionVence ? `El enlace sirve hasta el ${fecha(m.invitacionVence)}` : 'El enlace venció: reenvía la invitación'
                      : m.ultimaEntrada ? `Última entrada: ${fecha(m.ultimaEntrada)}` : 'Todavía no ha entrado'}
                  </p>
                </div>
              </div>
              {m.soyYo ? (
                <Link href="/admin/seguridad" className={`${adminSecondaryButton} shrink-0`}>Mi seguridad</Link>
              ) : (
                <button type="button" onClick={() => setElegido(m)} className={`${adminSecondaryButton} shrink-0`}>
                  Administrar
                  <FiChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <section className={`${adminCard} mt-6`} aria-labelledby="titulo-roles">
        <h2 id="titulo-roles" className={adminSectionTitle}>Qué puede hacer cada rol</h2>
        <dl className="mt-3 space-y-3">
          {ROLES.map((r) => (
            <div key={r.rol}>
              <dt className="text-sm font-semibold text-ink">{r.nombre}</dt>
              <dd className="text-sm text-muted">{r.detalle}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted">Todos entran con su contraseña y un código de su teléfono (verificación en dos pasos). Tu propia cuenta no se cambia desde aquí: otro super admin tendría que hacerlo.</p>
      </section>

      {invitando && <ModalInvitar cerrar={() => setInvitando(false)} alTerminar={cargar} />}
      {elegido && <ModalMiembro miembro={elegido} cerrar={() => setElegido(null)} alTerminar={cargar} />}
    </div>
  );
}

function ModalInvitar({ cerrar, alTerminar }: { cerrar: () => void; alTerminar: () => Promise<void> }) {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState<RolEquipo>('ADMIN');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useBodyScrollLock(true);
  useCajonAccesible(true, 'equipo-invitar', cerrar);

  const invitar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 2) return setError('Escribe el nombre de la persona.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) return setError('Escribe un correo válido.');
    setOcupado(true);
    setError('');
    const r = await enviar({ accion: 'invitar', nombre, correo, rol });
    setOcupado(false);
    if (!r.ok) return setError(r.error);
    avisoCorreo(r.correoEnviado, `Invitación enviada a ${correo.trim()}`);
    await alTerminar();
    cerrar();
  };

  return (
    <div className={adminModalOverlay} onClick={cerrar}>
      <form id="equipo-invitar" role="dialog" aria-modal="true" aria-labelledby="titulo-invitar" onSubmit={invitar} onClick={(e) => e.stopPropagation()} noValidate className={`${adminModalPanel} sm:max-w-lg`}>
        <div className={adminModalHeader}>
          <h2 id="titulo-invitar" className={adminModalTitle}>Invitar al equipo</h2>
          <button type="button" onClick={cerrar} aria-label="Cerrar" className={adminIconButton}><FiX className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <div className={`${adminModalBody} space-y-4`}>
          <p className="text-sm text-muted">Le llega un correo con un enlace de 24 horas para crear su contraseña. Tú nunca la conoces. Al entrar configura sus dos pasos.</p>
          <div>
            <label htmlFor="invitar-nombre" className={adminLabel}>Nombre</label>
            <input id="invitar-nombre" type="text" value={nombre} onChange={(e) => { setNombre(e.target.value); setError(''); }} maxLength={80} autoComplete="off" className={adminInput()} disabled={ocupado} />
          </div>
          <div>
            <label htmlFor="invitar-correo" className={adminLabel}>Correo</label>
            <input id="invitar-correo" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={correo} onChange={(e) => { setCorreo(e.target.value); setError(''); }} maxLength={120} autoComplete="off" className={adminInput()} disabled={ocupado} />
            <p className="mt-1 text-xs text-muted">Un correo que esa persona no use como cliente de la tienda.</p>
          </div>
          <fieldset>
            <legend className={adminLabel}>Rol</legend>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label key={r.rol} className={`${adminChoice(rol === r.rol)} flex cursor-pointer items-start gap-3 p-3`}>
                  <input type="radio" name="rol" value={r.rol} checked={rol === r.rol} onChange={() => setRol(r.rol)} className="mt-1 h-4 w-4 shrink-0 accent-brand-500" disabled={ocupado} />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{r.nombre}</span>
                    <span className="block text-sm text-muted">{r.detalle}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p className={adminError} role="alert">{error}</p>}
        </div>
        <div className={adminModalFooter}>
          <button type="button" onClick={cerrar} className={adminSecondaryButton}>Cancelar</button>
          <button type="submit" disabled={ocupado} className={adminPrimaryButton}>
            <FiSend className="h-4 w-4" aria-hidden="true" />
            {ocupado ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ModalMiembro({ miembro, cerrar, alTerminar }: { miembro: MiembroEquipo; cerrar: () => void; alTerminar: () => Promise<void> }) {
  const [accion, setAccion] = useState<Accion | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useBodyScrollLock(true);
  useCajonAccesible(true, 'equipo-miembro', cerrar);

  const disponibles = ORDEN.filter((a) => ACCIONES[a].para(miembro));
  const actual = accion ? ACCIONES[accion] : null;

  const confirmar = async () => {
    if (!accion || !actual) return;
    setOcupado(true);
    setError('');
    const r = await enviar({ accion, id: miembro.id, ...(accion === 'cambiar_rol' ? { rol: otroRol(miembro.rol) } : {}) });
    setOcupado(false);
    if (!r.ok) return setError(r.error);
    avisoCorreo(accion === 'reenviar_invitacion' ? r.correoEnviado : undefined, actual.hecho);
    await alTerminar();
    cerrar();
  };

  return (
    <div className={adminModalOverlay} onClick={cerrar}>
      <div id="equipo-miembro" role="dialog" aria-modal="true" aria-labelledby="titulo-miembro" onClick={(e) => e.stopPropagation()} className={`${adminModalPanel} sm:max-w-lg`}>
        <div className={adminModalHeader}>
          <div className="min-w-0">
            <h2 id="titulo-miembro" className={`${adminModalTitle} truncate`}>{actual ? actual.titulo(miembro) : miembro.nombre}</h2>
            <p className="truncate text-sm text-muted">{actual ? miembro.nombre : `${miembro.correo} · ${nombreRol(miembro.rol)}`}</p>
          </div>
          <button type="button" onClick={cerrar} aria-label="Cerrar" className={adminIconButton}><FiX className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        {actual ? (
          <>
            <div className={adminModalBody}>
              <p className={`${adminNotice(actual.peligro ? 'danger' : 'neutral')} flex items-start gap-2`}>
                {actual.peligro && <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                <span>{actual.detalle(miembro)}</span>
              </p>
              {error && <p className={`${adminError} mt-3`} role="alert">{error}</p>}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => { setAccion(null); setError(''); }} disabled={ocupado} className={adminSecondaryButton}>
                <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver
              </button>
              <button type="button" onClick={confirmar} disabled={ocupado} className={actual.peligro ? adminDangerButton : adminPrimaryButton}>
                {ocupado ? 'Un momento…' : actual.boton}
              </button>
            </div>
          </>
        ) : (
          <ul className={`${adminModalBody} space-y-2`}>
            {disponibles.map((a) => {
              const { Icon, titulo, peligro } = ACCIONES[a];
              return (
                <li key={a}>
                  <button type="button" onClick={() => setAccion(a)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border border-line px-4 py-2 text-left text-sm font-semibold transition-colors hover:bg-surface ${peligro ? 'text-deal' : 'text-ink'}`}>
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{titulo(miembro)}</span>
                    <FiChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
