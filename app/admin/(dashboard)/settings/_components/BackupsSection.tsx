'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiAlertTriangle, FiCheckCircle, FiCloud, FiCopy, FiDownload, FiExternalLink, FiKey, FiLink, FiPlay, FiRefreshCw, FiShieldOff, FiXCircle,
} from 'react-icons/fi';
import {
  adminBadge, adminDangerButton, adminInput, adminModalBody, adminModalFooter, adminModalHeader, adminModalOverlay, adminModalPanel, adminModalTitle,
  adminNotice, adminPrimaryButton, adminSecondaryButton, adminSpinner,
} from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { formatearBytes, horaEnTexto } from '@/lib/respaldos/texto';
import { Field, SettingsCard, SwitchRow } from './fields';

// C-165: respaldos automáticos a Google Drive. Solo los ve el dueño (Configuración es solo del dueño).

interface Corrida {
  id: string;
  kind: 'DB' | 'FILES';
  trigger: 'CRON' | 'MANUAL';
  status: 'RUNNING' | 'OK' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  items: number | null;
  error: string | null;
  verifiedAt: string | null;
  verifiedOk: boolean | null;
  deleted: boolean;
}

interface Estado {
  enabled: boolean;
  hour: number;
  retentionDays: number;
  includeFiles: boolean;
  problema: string | null;
  enCurso: boolean;
  ultimoBueno: { startedAt: string; sizeBytes: number } | null;
  alDia: boolean;
  clave: { creada: boolean; huella: string | null; creadaEn: string | null };
  drive: { clientId: string | null; tieneSecreto: boolean; conectado: boolean; email: string | null; conectadoEn: string | null; error: string | null; urlDeRetorno: string };
  corridas: Corrida[];
}

interface Verificacion { tipo: 'DB' | 'FILES'; fileName: string | null; ok: boolean; detalle: string }

const MENSAJES_DE_RETORNO: Record<string, { ok: boolean; texto: string }> = {
  conectado: { ok: true, texto: 'Google Drive conectado. Ya puedes encender el respaldo automático.' },
  cancelado: { ok: false, texto: 'Cancelaste el permiso en Google. Para conectar Drive hay que aceptarlo.' },
  'falta-cliente': { ok: false, texto: 'Primero guarda el ID y el secreto del cliente de Google.' },
  'estado-invalido': { ok: false, texto: 'La conexión venció o no era la que iniciaste. Vuelve a pulsar "Conectar con Google".' },
  'error-google': { ok: false, texto: 'Google devolvió un error al darte el permiso. Inténtalo otra vez.' },
  'error-drive': { ok: false, texto: 'No se pudo conectar Drive. El motivo está en el aviso rojo de arriba.' },
  error: { ok: false, texto: 'No se pudo terminar la conexión con Google.' },
};

const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Caracas' });
const nombreDeTipo = (kind: string) => (kind === 'DB' ? 'Base de datos' : 'Fotos y constancias');

async function pedir<T>(ruta: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const respuesta = await fetch(ruta, init);
  const data = (await respuesta.json().catch(() => ({}))) as T & { error?: string };
  return { ok: respuesta.ok, data };
}

export default function BackupsSection() {
  const { confirm } = useConfirm();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [claveNueva, setClaveNueva] = useState<{ pem: string; huella: string } | null>(null);
  const [verificacion, setVerificacion] = useState<Verificacion[] | null>(null);
  // Formulario: solo lo que el dueño escribe. Los secretos nunca vuelven del servidor
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [hora, setHora] = useState(3);
  const [dias, setDias] = useState(14);
  const [conArchivos, setConArchivos] = useState(true);

  const adoptar = (e: Estado) => {
    setEstado(e);
    setClientId(e.drive.clientId ?? '');
    setHora(e.hour);
    setDias(e.retentionDays);
    setConArchivos(e.includeFiles);
  };

  const cargar = async () => {
    const r = await pedir<Estado>('/api/admin/respaldos');
    if (!r.ok) {
      setErrorCarga(r.data.error ?? 'No se pudo leer el estado de los respaldos.');
      return;
    }
    setErrorCarga('');
    adoptar(r.data);
  };

  useCargarAlMontar(cargar);

  // Al volver de Google, la dirección trae ?respaldos=…: se avisa y se limpia
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const motivo = params.get('respaldos');
    if (!motivo) return;
    const mensaje = MENSAJES_DE_RETORNO[motivo];
    if (mensaje) (mensaje.ok ? toast.success : toast.error)(mensaje.texto, { duration: 7000 });
    window.history.replaceState(null, '', `${window.location.pathname}#respaldos`);
  }, []);

  // Mientras hay un respaldo en marcha, se consulta cada pocos segundos
  const enCurso = estado?.enCurso ?? false;
  useEffect(() => {
    if (!enCurso) return;
    const intervalo = setInterval(() => { void cargar(); }, 3000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enCurso]);

  const accion = async (nombre: string, fn: () => Promise<void>) => {
    setOcupado(nombre);
    try {
      await fn();
    } catch {
      toast.error('No se pudo completar. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      setOcupado(null);
    }
  };

  const guardar = (datos: Record<string, unknown>, mensaje: string) =>
    accion('guardar', async () => {
      const r = await pedir<Estado>('/api/admin/respaldos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
      if (!r.ok) return void toast.error(r.data.error ?? 'No se pudo guardar.');
      adoptar(r.data);
      setClientSecret('');
      toast.success(mensaje);
    });

  const crearClave = async (reemplazar: boolean) => {
    if (reemplazar) {
      const sigue = await confirm({
        title: 'Cambiar la clave del respaldo',
        message: 'Los respaldos nuevos usarán la clave nueva. Los que ya están en Drive solo se abren con la clave anterior: no la pierdas. ¿Cambiarla?',
        confirmText: 'Cambiar la clave', cancelText: 'Cancelar', type: 'warning',
      });
      if (!sigue) return;
    }
    await accion('clave', async () => {
      const r = await pedir<{ privateKeyPem: string; huella: string }>('/api/admin/respaldos/clave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reemplazar }) });
      if (!r.ok) return void toast.error(r.data.error ?? 'No se pudo crear la clave.');
      setClaveNueva({ pem: r.data.privateKeyPem, huella: r.data.huella });
      await cargar();
    });
  };

  const probar = () =>
    accion('probar', async () => {
      const r = await pedir<{ ok: boolean; email?: string; usadoBytes?: number | null; limiteBytes?: number | null; reautorizar?: boolean }>('/api/admin/respaldos/probar', { method: 'POST' });
      await cargar();
      if (!r.data.ok) return void toast.error(r.data.error ?? 'No se pudo probar la conexión.');
      const libre = r.data.limiteBytes && r.data.usadoBytes !== null && r.data.usadoBytes !== undefined ? ` Te quedan ${formatearBytes(r.data.limiteBytes - r.data.usadoBytes)} libres.` : '';
      toast.success(`Conexión correcta con ${r.data.email ?? 'tu cuenta de Google'}.${libre}`, { duration: 6000 });
    });

  const desconectar = async () => {
    const sigue = await confirm({
      title: 'Desconectar Google Drive',
      message: 'El respaldo automático se apaga. Los respaldos que ya están en tu Drive no se borran.',
      confirmText: 'Desconectar', cancelText: 'Cancelar', type: 'danger',
    });
    if (!sigue) return;
    await accion('desconectar', async () => {
      const r = await pedir<Estado>('/api/admin/respaldos/drive', { method: 'DELETE' });
      if (!r.ok) return void toast.error(r.data.error ?? 'No se pudo desconectar.');
      adoptar(r.data);
      toast.success('Drive desconectado.');
    });
  };

  const respaldarAhora = () =>
    accion('ejecutar', async () => {
      const r = await pedir<{ ok?: boolean }>('/api/admin/respaldos/ejecutar', { method: 'POST' });
      if (!r.ok) return void toast.error(r.data.error ?? 'No se pudo iniciar el respaldo.');
      toast.success('Respaldo en marcha. Puede tardar unos minutos.');
      setVerificacion(null);
      await cargar();
    });

  const verificar = () =>
    accion('verificar', async () => {
      const r = await pedir<{ resultados: Verificacion[] }>('/api/admin/respaldos/verificar', { method: 'POST' });
      if (!r.ok) return void toast.error(r.data.error ?? 'No se pudo verificar.');
      setVerificacion(r.data.resultados);
      if (r.data.resultados.length === 0) toast('Todavía no hay respaldos que verificar.');
      await cargar();
    });

  if (!estado) {
    return errorCarga ? (
      <div className={adminNotice('danger')} role="alert">{errorCarga}</div>
    ) : (
      <div className="flex justify-center py-16"><div className={adminSpinner} role="status" aria-label="Cargando" /></div>
    );
  }

  const ultimoBueno = estado.ultimoBueno;
  const listo = !estado.problema;
  const hayCambios = hora !== estado.hour || dias !== estado.retentionDays || conArchivos !== estado.includeFiles;
  const clienteGuardado = Boolean(estado.drive.clientId && estado.drive.tieneSecreto);

  return (
    <>
      {/* Estado de un vistazo */}
      {estado.enabled && listo && ultimoBueno && estado.alDia ? (
        <div className={`${adminNotice('success')} flex items-start gap-2`}>
          <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span><strong>Los respaldos están al día.</strong> El último se hizo el {fechaHora(ultimoBueno.startedAt)} y pesa {formatearBytes(ultimoBueno.sizeBytes)}. Se guarda en tu Google Drive ({estado.drive.email}).</span>
        </div>
      ) : estado.enabled && listo ? (
        <div className={`${adminNotice('warning')} flex items-start gap-2`} role="alert">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span><strong>{ultimoBueno ? 'El último respaldo bueno tiene más de un día.' : 'Todavía no hay ningún respaldo hecho.'}</strong> Pulsa “Respaldar ahora” y revisa el historial: si falla, ahí dice por qué.</span>
        </div>
      ) : (
        <div className={`${adminNotice('danger')} flex items-start gap-2`} role="alert">
          <FiShieldOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span><strong>La tienda no tiene respaldos automáticos.</strong> Si el servidor se daña, se pierden las órdenes, los clientes y los Puntos ES. {estado.problema ?? 'Enciende el respaldo automático más abajo.'}</span>
        </div>
      )}

      {estado.drive.error && (
        <div className={`${adminNotice('danger')} flex items-start gap-2`} role="alert">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span><strong>Google rechazó el permiso:</strong> {estado.drive.error}</span>
        </div>
      )}

      {/* Paso 1: la clave */}
      <SettingsCard
        title="1. Clave del respaldo"
        description="Los respaldos se guardan cifrados. Solo esta clave los abre: ni Google, ni el servidor, ni nosotros podemos leerlos sin ella."
        action={estado.clave.creada
          ? <button type="button" onClick={() => crearClave(true)} disabled={ocupado !== null} className={adminSecondaryButton}><FiKey className="h-4 w-4" aria-hidden="true" />Cambiar la clave</button>
          : <button type="button" onClick={() => crearClave(false)} disabled={ocupado !== null} className={adminPrimaryButton}><FiKey className="h-4 w-4" aria-hidden="true" />{ocupado === 'clave' ? 'Creando…' : 'Crear la clave'}</button>}
      >
        {estado.clave.creada ? (
          <p className="flex items-start gap-2 text-sm text-ink">
            <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success-strong" aria-hidden="true" />
            <span>Clave creada el {estado.clave.creadaEn ? fechaHora(estado.clave.creadaEn) : '—'}. Huella: <span className="font-mono text-xs">{estado.clave.huella}</span>. La clave privada se mostró una sola vez; guárdala en tu gestor de contraseñas.</span>
          </p>
        ) : (
          <p className="text-sm text-muted">Al crearla se te muestra <strong>una sola vez</strong> la clave privada. Guárdala fuera del servidor (gestor de contraseñas o un papel en un lugar seguro).</p>
        )}
      </SettingsCard>

      {/* Paso 2: Google Drive */}
      <SettingsCard
        title="2. Google Drive"
        description="Dónde se guardan los respaldos. La tienda solo puede ver y borrar lo que ella misma sube a su carpeta, nada más de tu cuenta."
        action={estado.drive.conectado ? <span className={adminBadge('success')}><FiCheckCircle className="h-3.5 w-3.5" aria-hidden="true" />Conectado</span> : <span className={adminBadge('warning')}>Sin conectar</span>}
      >
        {estado.drive.conectado ? (
          <div className="space-y-3">
            <p className="text-sm text-ink">Cuenta: <strong>{estado.drive.email ?? '—'}</strong>{estado.drive.conectadoEn && <span className="text-muted"> · conectada el {fechaHora(estado.drive.conectadoEn)}</span>}. Carpeta: <strong>Respaldos ElectroShop</strong>.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={probar} disabled={ocupado !== null} className={adminSecondaryButton}><FiRefreshCw className={`h-4 w-4 ${ocupado === 'probar' ? 'animate-spin' : ''}`} aria-hidden="true" />Probar conexión</button>
              <a href="/api/admin/respaldos/drive/conectar" className={adminSecondaryButton}><FiLink className="h-4 w-4" aria-hidden="true" />Volver a conectar</a>
              <button type="button" onClick={desconectar} disabled={ocupado !== null} className={adminDangerButton}>Desconectar</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <details className="rounded-xl border border-line bg-surface p-4 text-sm text-ink">
              <summary className="cursor-pointer font-semibold">Cómo obtener el ID y el secreto (10 minutos, una sola vez)</summary>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted">
                <li>Entra a <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline">console.cloud.google.com<FiExternalLink className="h-3 w-3" aria-hidden="true" /></a> con la cuenta de Google donde quieres guardar los respaldos y crea un proyecto nuevo (“ElectroShop Respaldos”).</li>
                <li>Menú → <strong>APIs y servicios</strong> → <strong>Biblioteca</strong>: busca <strong>Google Drive API</strong> y pulsa <strong>Habilitar</strong>.</li>
                <li><strong>Pantalla de consentimiento de OAuth</strong>: tipo <strong>Externo</strong>, nombre “ElectroShop” y tu correo. En permisos (scopes) agrega <span className="font-mono text-xs">.../auth/drive.file</span>. Al final pulsa <strong>Publicar la aplicación</strong>: si se queda en “Prueba”, Google vence el permiso a los 7 días.</li>
                <li><strong>Credenciales</strong> → Crear credenciales → <strong>ID de cliente de OAuth</strong> → tipo <strong>Aplicación web</strong>. En “URI de redireccionamiento autorizados” pega la dirección de abajo.</li>
                <li>Google te muestra el <strong>ID de cliente</strong> y el <strong>secreto</strong>: pégalos aquí abajo y pulsa “Guardar”.</li>
              </ol>
            </details>

            <Field label="Dirección de redireccionamiento (cópiala en Google)" htmlFor="respaldos-uri">
              <div className="flex gap-2">
                <input id="respaldos-uri" readOnly value={estado.drive.urlDeRetorno} className={`${adminInput(false)} font-mono text-xs`} onFocus={(e) => e.currentTarget.select()} />
                <button type="button" onClick={() => { void navigator.clipboard.writeText(estado.drive.urlDeRetorno).then(() => toast.success('Dirección copiada.')); }} className={adminSecondaryButton} aria-label="Copiar la dirección"><FiCopy className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ID de cliente" htmlFor="respaldos-id" hint="Termina en .apps.googleusercontent.com">
                <input id="respaldos-id" value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" spellCheck={false} className={`${adminInput(false)} font-mono text-xs`} />
              </Field>
              <Field label="Secreto del cliente" htmlFor="respaldos-secreto" hint={estado.drive.tieneSecreto ? 'Ya hay uno guardado (cifrado). Escribe otro solo si lo cambiaste.' : 'Se guarda cifrado y no vuelve a mostrarse.'}>
                <input id="respaldos-secreto" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} autoComplete="new-password" spellCheck={false} placeholder={estado.drive.tieneSecreto ? '••••••••••••' : ''} className={`${adminInput(false)} font-mono text-xs`} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => guardar({ driveClientId: clientId, ...(clientSecret ? { driveClientSecret: clientSecret } : {}) }, 'Datos de Google guardados.')} disabled={ocupado !== null || !clientId || (!clientSecret && !estado.drive.tieneSecreto)} className={adminSecondaryButton}>Guardar</button>
              {clienteGuardado ? (
                <a href="/api/admin/respaldos/drive/conectar" className={adminPrimaryButton}><FiCloud className="h-4 w-4" aria-hidden="true" />Conectar con Google</a>
              ) : (
                <span className={`${adminPrimaryButton} pointer-events-none opacity-50`} aria-disabled="true"><FiCloud className="h-4 w-4" aria-hidden="true" />Conectar con Google</span>
              )}
            </div>
          </div>
        )}
      </SettingsCard>

      {/* Paso 3: programación */}
      <SettingsCard title="3. Respaldo automático" description="La tienda lo hace sola cada día a la hora que elijas (hora de Venezuela) y avisa por tus canales si algo falla.">
        <div className="space-y-5">
          <SwitchRow
            label="Respaldo automático encendido"
            description={listo ? 'Cada día, la base de datos. Los domingos, además, las fotos y las constancias firmadas.' : (estado.problema ?? '')}
            checked={estado.enabled}
            onChange={(valor) => { void guardar({ enabled: valor }, valor ? 'Respaldo automático encendido.' : 'Respaldo automático apagado.'); }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hora del respaldo" htmlFor="respaldos-hora" hint="De madrugada hay menos clientes comprando.">
              <select id="respaldos-hora" value={hora} onChange={(e) => setHora(Number(e.target.value))} className={adminInput(false)}>
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{horaEnTexto(h)}</option>)}
              </select>
            </Field>
            <Field label="Días que se guardan" htmlFor="respaldos-dias" hint="Los más viejos se borran de tu Drive. Siempre quedan los 3 últimos buenos.">
              <input id="respaldos-dias" type="number" min={7} max={90} value={dias} onChange={(e) => setDias(Number(e.target.value))} className={adminInput(false)} />
            </Field>
          </div>
          <SwitchRow label="Incluir fotos y constancias firmadas" description="Los domingos y al respaldar a mano. Ocupan más espacio en tu Drive." checked={conArchivos} onChange={setConArchivos} />
          {hayCambios && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => guardar({ hour: hora, retentionDays: dias, includeFiles: conArchivos }, 'Programación guardada.')} disabled={ocupado !== null} className={adminPrimaryButton}>Guardar programación</button>
              <button type="button" onClick={() => { setHora(estado.hour); setDias(estado.retentionDays); setConArchivos(estado.includeFiles); }} className={adminSecondaryButton}>Descartar</button>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Acciones y historial */}
      <SettingsCard
        title="Historial"
        description="Cada intento queda aquí. Un respaldo solo cuenta como hecho cuando Drive confirma que lo guardó completo."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={respaldarAhora} disabled={ocupado !== null || enCurso || !listo} className={adminPrimaryButton}>
              {enCurso ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" /> : <FiPlay className="h-4 w-4" aria-hidden="true" />}
              {enCurso ? 'En marcha…' : 'Respaldar ahora'}
            </button>
            <button type="button" onClick={verificar} disabled={ocupado !== null || !estado.drive.conectado} className={adminSecondaryButton}>
              <FiCheckCircle className="h-4 w-4" aria-hidden="true" />Verificar el último
            </button>
          </div>
        }
      >
        {verificacion && verificacion.length > 0 && (
          <ul className="mb-4 space-y-2" aria-live="polite">
            {verificacion.map((v) => (
              <li key={v.tipo} className={`${adminNotice(v.ok ? 'success' : 'danger')} flex items-start gap-2`}>
                {v.ok ? <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <FiXCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                <span><strong>{nombreDeTipo(v.tipo)}:</strong> {v.detalle}</span>
              </li>
            ))}
          </ul>
        )}
        {estado.corridas.length === 0 ? (
          <p className="text-sm text-muted">Todavía no se ha hecho ningún respaldo.</p>
        ) : (
          <ul className="divide-y divide-line">
            {estado.corridas.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{nombreDeTipo(c.kind)} <span className="font-normal text-muted">· {fechaHora(c.startedAt)} · {c.trigger === 'CRON' ? 'automático' : 'a mano'}</span></p>
                  {c.status === 'FAILED' && <p className="mt-0.5 break-words text-sm text-deal">{c.error}</p>}
                  {c.status === 'OK' && (
                    <p className="mt-0.5 text-sm text-muted">
                      {formatearBytes(c.sizeBytes)} · {c.kind === 'DB' ? `${c.items} tablas` : `${c.items} archivos`}
                      {c.deleted ? ' · borrado de Drive por antigüedad' : c.verifiedOk === false ? ' · el archivo en Drive no coincide' : c.verifiedAt ? ' · comprobado en Drive' : ''}
                    </p>
                  )}
                </div>
                <span className={adminBadge(c.status === 'OK' ? 'success' : c.status === 'FAILED' ? 'danger' : 'brand')}>
                  {c.status === 'OK' ? 'Hecho' : c.status === 'FAILED' ? 'Falló' : 'En curso'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>

      <SettingsCard title="Si algún día hay que restaurar" description="Para esto sí hace falta la clave privada que guardaste.">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink">
          <li>Descarga el archivo <span className="font-mono text-xs">.enc</span> de la carpeta “Respaldos ElectroShop” de tu Drive.</li>
          <li>En una computadora con Node, dentro del proyecto: <span className="font-mono text-xs">npx tsx scripts/respaldo-descifrar.ts respaldo.dump.enc clave.pem</span>.</li>
          <li>Restaura en una base nueva: <span className="font-mono text-xs">pg_restore --no-owner --no-acl -d base_nueva respaldo.dump</span>.</li>
        </ol>
        <p className="mt-3 text-sm text-muted">Restaurar y descargar respaldos no se hace desde el panel a propósito: si alguien se robara una sesión, no podría llevarse ni pisar la base. Los pasos completos están en <span className="font-mono text-xs">docs/plan/OPERACION.md</span>.</p>
      </SettingsCard>

      {claveNueva && <ClaveNueva clave={claveNueva} onCerrar={() => setClaveNueva(null)} />}
    </>
  );
}

/** La clave privada, una sola vez. No se cierra hasta confirmar que se guardó. */
function ClaveNueva({ clave, onCerrar }: { clave: { pem: string; huella: string }; onCerrar: () => void }) {
  const [guardada, setGuardada] = useState(false);
  useBodyScrollLock(true);

  const copiar = () => { void navigator.clipboard.writeText(clave.pem).then(() => toast.success('Clave copiada.')); };
  const descargar = () => {
    const url = URL.createObjectURL(new Blob([clave.pem], { type: 'application/x-pem-file' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'clave-privada-respaldos-electroshop.pem';
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="clave-titulo">
      <div className={`${adminModalPanel} sm:max-w-2xl`}>
        <div className={adminModalHeader}>
          <h2 id="clave-titulo" className={adminModalTitle}>Guarda tu clave privada</h2>
        </div>
        <div className={`${adminModalBody} space-y-4`}>
          <div className={`${adminNotice('warning')} flex items-start gap-2`}>
            <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span><strong>Esta clave se muestra una sola vez.</strong> No queda guardada en el servidor. Sin ella, nadie puede abrir los respaldos. Guárdala ahora en tu gestor de contraseñas o descarga el archivo y ponlo en un lugar seguro, <strong>fuera del servidor</strong>.</span>
          </div>
          <textarea readOnly value={clave.pem} rows={10} onFocus={(e) => e.currentTarget.select()} className={`${adminInput(false)} h-auto resize-none py-2.5 font-mono text-xs`} aria-label="Clave privada" />
          <p className="text-xs text-muted">Huella de la clave: <span className="font-mono">{clave.huella}</span></p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copiar} className={adminSecondaryButton}><FiCopy className="h-4 w-4" aria-hidden="true" />Copiar</button>
            <button type="button" onClick={descargar} className={adminSecondaryButton}><FiDownload className="h-4 w-4" aria-hidden="true" />Descargar archivo</button>
          </div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
            <input type="checkbox" checked={guardada} onChange={(e) => setGuardada(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500" />
            <span>Ya guardé la clave en un lugar seguro y entiendo que no se puede recuperar.</span>
          </label>
        </div>
        <div className={adminModalFooter}>
          <button type="button" onClick={onCerrar} disabled={!guardada} className={adminPrimaryButton}>Listo, ya la guardé</button>
        </div>
      </div>
    </div>
  );
}
