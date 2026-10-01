'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiCopy, FiKey, FiRefreshCw, FiShield, FiSmartphone } from 'react-icons/fi';
import {
  adminCard, adminHint, adminIconChip, adminInput, adminLabel, adminNotice, adminPageSubtitle, adminPageTitle, adminPrimaryButton,
  adminSecondaryButton, adminSectionTitle, adminSpinner,
} from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import CodigosRespaldo from '@/components/admin/CodigosRespaldo';

// Mi seguridad (C-141): cada admin configura aquí su verificación en dos pasos (app de códigos + 10 códigos de respaldo).
// Es obligatoria: sin ella el panel solo muestra esta pantalla. No se puede desactivar; el super admin la reinicia
// desde Equipo si alguien pierde el teléfono.

interface Estado {
  activo: boolean;
  activadoAt: string | null;
  codigosRestantes: number;
}

interface Configuracion {
  uri: string;
  clave: string;
  qr: { tamano: number; camino: string };
}

async function pedir<T>(cuerpo?: Record<string, string>): Promise<{ ok: true; datos: T } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/admin/dos-pasos', cuerpo
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }
      : { cache: 'no-store' });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: datos.error || 'No se pudo completar. Intenta de nuevo.' };
    return { ok: true, datos };
  } catch {
    return { ok: false, error: 'Sin conexión. Intenta de nuevo.' };
  }
}

function CampoCodigo({ id, valor, onChange, deshabilitado }: { id: string; valor: string; onChange: (v: string) => void; deshabilitado: boolean }) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={7}
      value={valor}
      onChange={(e) => onChange(e.target.value.replace(/[^\d\s]/g, ''))}
      placeholder="000000"
      disabled={deshabilitado}
      className={`${adminInput()} block text-center font-mono text-lg tracking-widest sm:max-w-48`}
    />
  );
}

export default function SeguridadPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  // Códigos recién creados: `primeros` son los de la activación (al confirmar, la sesión pasa a verificada)
  const [codigos, setCodigos] = useState<{ lista: string[]; primeros: boolean } | null>(null);
  const [regenerando, setRegenerando] = useState(false);

  const correo = session?.user?.email ?? '';
  const verificada = session?.user?.dosPasos === true;

  const entrarAlPanel = async () => {
    // update() vuelve a firmar la sesión con los dos pasos hechos; desde ahí el `proxy` deja pasar al panel
    await update();
    router.replace('/admin');
    router.refresh();
  };

  useCargarAlMontar(async () => {
    const r = await pedir<Estado>();
    if (!r.ok) {
      setErrorCarga(r.error);
      return;
    }
    setEstado(r.datos);
  });

  // Activó y cerró la pestaña antes de confirmar que guardó los códigos: la sesión sigue siendo la que activó
  // (las demás se cerraron), así que se verifica y entra. Los códigos los puede generar de nuevo.
  const pendienteDeEntrar = Boolean(estado?.activo && session && !verificada && !codigos);
  useCargarAlMontar(() => {
    if (pendienteDeEntrar) void entrarAlPanel();
  }, [pendienteDeEntrar]);

  const empezar = async () => {
    setOcupado(true);
    setError('');
    const r = await pedir<Configuracion>({ accion: 'iniciar' });
    setOcupado(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setConfig(r.datos);
  };

  const enviarCodigo = async (accion: 'activar' | 'regenerar') => {
    if (codigo.replace(/\s/g, '').length !== 6) {
      setError('Escribe los 6 dígitos que muestra la app.');
      return;
    }
    setOcupado(true);
    setError('');
    const r = await pedir<{ codigos: string[] }>({ accion, codigo });
    setOcupado(false);
    setCodigo('');
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setCodigos({ lista: r.datos.codigos, primeros: accion === 'activar' });
    setRegenerando(false);
    setEstado((e) => ({ activo: true, activadoAt: e?.activadoAt ?? new Date().toISOString(), codigosRestantes: r.datos.codigos.length }));
  };

  const copiarClave = async () => {
    if (!config) return;
    try {
      await navigator.clipboard.writeText(config.clave.replace(/\s/g, ''));
      toast.success('Clave copiada');
    } catch {
      toast.error('No se pudo copiar. Escríbela a mano.');
    }
  };

  if (errorCarga) return <p className={`${adminNotice('danger')} mx-auto max-w-2xl`} role="alert">{errorCarga}</p>;
  if (!estado || pendienteDeEntrar) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Cargando">
        <span className={adminSpinner} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className={adminPageTitle}>Mi seguridad</h1>
        <p className={adminPageSubtitle}>
          {estado.activo && !codigos?.primeros
            ? 'Tu cuenta pide un código de tu teléfono cada vez que entras al panel.'
            : 'Para usar el panel necesitas la verificación en dos pasos: tu contraseña y un código de tu teléfono.'}
        </p>
      </div>

      {codigos ? (
        <section className={adminCard} aria-labelledby="titulo-codigos">
          <h2 id="titulo-codigos" className={`${adminSectionTitle} mb-1 flex items-center gap-2`}>
            <FiCheckCircle className="h-5 w-5 shrink-0 text-success-strong" aria-hidden="true" />
            {codigos.primeros ? 'Listo. Ahora guarda tus códigos de respaldo' : 'Tus códigos de respaldo nuevos'}
          </h2>
          <p className="mb-4 text-sm text-muted">
            {codigos.primeros ? 'La verificación en dos pasos quedó activa.' : 'Los anteriores dejaron de servir.'}
          </p>
          <CodigosRespaldo
            codigos={codigos.lista}
            correo={correo}
            textoBoton={codigos.primeros ? 'Entrar al panel' : 'Listo'}
            onListo={codigos.primeros ? entrarAlPanel : () => setCodigos(null)}
          />
        </section>
      ) : estado.activo ? (
        <>
          <section className={`${adminCard} flex items-start gap-4`}>
            <span className={adminIconChip('success')}><FiShield className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 className={adminSectionTitle}>Verificación en dos pasos activa</h2>
              <p className="mt-1 text-sm text-muted">
                {estado.activadoAt ? `Desde el ${new Date(estado.activadoAt).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', year: 'numeric' })}. ` : ''}
                Es obligatoria para todo el equipo y no se puede desactivar.
              </p>
              <p className="mt-2 text-sm text-muted">
                {session?.user?.role === 'SUPER_ADMIN'
                  ? '¿Cambiaste de teléfono? Otro super admin reinicia tu verificación desde Equipo y la configuras de nuevo. Si eres el único, se reinicia desde el servidor.'
                  : '¿Cambiaste de teléfono? El dueño de la tienda reinicia tu verificación desde Equipo y la configuras de nuevo.'}
              </p>
            </div>
          </section>

          <section className={`${adminCard} mt-4`} aria-labelledby="titulo-respaldo">
            <div className="flex items-start gap-4">
              <span className={adminIconChip(estado.codigosRestantes <= 2 ? 'warning' : 'neutral')}><FiKey className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <h2 id="titulo-respaldo" className={adminSectionTitle}>Códigos de respaldo</h2>
                <p className="mt-1 text-sm text-muted">
                  {estado.codigosRestantes === 0 ? 'No te queda ninguno.' : estado.codigosRestantes === 1 ? 'Te queda 1 código.' : `Te quedan ${estado.codigosRestantes} códigos.`}
                  {' '}Sirven para entrar cuando no tienes el teléfono. Al generar nuevos, los anteriores dejan de servir.
                </p>
                {regenerando ? (
                  <form className="mt-4" onSubmit={(e) => { e.preventDefault(); void enviarCodigo('regenerar'); }} noValidate>
                    <label htmlFor="codigo-regenerar" className={adminLabel}>Código de la app</label>
                    <CampoCodigo id="codigo-regenerar" valor={codigo} onChange={(v) => { setCodigo(v); setError(''); }} deshabilitado={ocupado} />
                    {error && <p className="mt-2 text-sm font-semibold text-deal" role="alert">{error}</p>}
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <button type="submit" disabled={ocupado} className={adminPrimaryButton}>Generar códigos nuevos</button>
                      <button type="button" onClick={() => { setRegenerando(false); setCodigo(''); setError(''); }} className={adminSecondaryButton}>Cancelar</button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => setRegenerando(true)} className={`${adminSecondaryButton} mt-4`}>
                    <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
                    Generar códigos nuevos
                  </button>
                )}
              </div>
            </div>
          </section>
        </>
      ) : (
        <ol className="space-y-4">
          <li className={adminCard}>
            <h2 className={`${adminSectionTitle} flex items-center gap-2`}>
              <FiSmartphone className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
              1. Instala una app de códigos en tu teléfono
            </h2>
            <p className="mt-1 text-sm text-muted">Google Authenticator o Authy. Son gratis y están en Play Store y App Store. Si ya tienes una, usa esa.</p>
            {!config && (
              <>
                {error && <p className="mt-3 text-sm font-semibold text-deal" role="alert">{error}</p>}
                <button type="button" onClick={empezar} disabled={ocupado} className={`${adminPrimaryButton} mt-4 w-full sm:w-auto`}>Ya tengo la app: seguir</button>
              </>
            )}
          </li>

          {config && (
            <>
              <li className={adminCard}>
                <h2 className={adminSectionTitle}>2. Agrega Electro Shop a la app</h2>
                <p className="mt-1 text-sm text-muted">En la app toca el botón de agregar y escanea este código QR.</p>
                <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <svg viewBox={`0 0 ${config.qr.tamano} ${config.qr.tamano}`} role="img" aria-label="Código QR para la app de códigos" className="h-48 w-48 shrink-0 rounded-xl border border-line bg-white" shapeRendering="crispEdges">
                    <path d={config.qr.camino} className="fill-ink" />
                  </svg>
                  <div className="w-full min-w-0">
                    {/* En el mismo teléfono no se puede escanear: el enlace abre la app con los datos puestos */}
                    <a href={config.uri} className={`${adminSecondaryButton} mb-3 w-full lg:hidden`}>
                      <FiSmartphone className="h-4 w-4" aria-hidden="true" />
                      Abrir en la app de códigos
                    </a>
                    <p className="text-sm font-semibold text-ink">¿No puedes escanear? Escribe esta clave en la app</p>
                    <p className="mt-2 break-all rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink">{config.clave}</p>
                    <button type="button" onClick={copiarClave} className="mt-2 inline-flex h-10 items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
                      <FiCopy className="h-4 w-4" aria-hidden="true" />
                      Copiar la clave
                    </button>
                    <p className={adminHint}>Cuenta: {correo}. Tipo: basado en tiempo.</p>
                  </div>
                </div>
              </li>

              <li className={adminCard}>
                <h2 className={adminSectionTitle}>3. Escribe el código que muestra la app</h2>
                <p className="mt-1 text-sm text-muted">Son 6 dígitos y cambian cada 30 segundos.</p>
                <form className="mt-4" onSubmit={(e) => { e.preventDefault(); void enviarCodigo('activar'); }} noValidate>
                  <label htmlFor="codigo-activar" className={adminLabel}>Código de la app</label>
                  <CampoCodigo id="codigo-activar" valor={codigo} onChange={(v) => { setCodigo(v); setError(''); }} deshabilitado={ocupado} />
                  {error && <p className="mt-2 text-sm font-semibold text-deal" role="alert">{error}</p>}
                  <button type="submit" disabled={ocupado} className={`${adminPrimaryButton} mt-3 w-full sm:w-auto`}>Activar la verificación</button>
                </form>
              </li>
            </>
          )}
        </ol>
      )}
    </div>
  );
}
