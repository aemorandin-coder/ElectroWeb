'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { adminNotice, adminPageSubtitle, adminPageTitle, adminSpinner } from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import AsiFunciona from '@/components/onboarding/AsiFunciona';
import CodigosRespaldo from '@/components/admin/CodigosRespaldo';
import Configurar, { type Configuracion } from './_components/Configurar';
import Activa from './_components/Activa';
import Trabado from '@/components/admin/dos-pasos/Trabado';

// Mi seguridad (C-141): cada admin configura aquí su verificación en dos pasos (app de códigos + 10 llaves de repuesto).
// Es obligatoria: sin ella el panel solo muestra esta pantalla. No se puede desactivar; el super admin la reinicia
// desde Equipo si alguien pierde el teléfono.
// C-290: la configuración va en cuatro pasos dibujados, con las apps y sus tiendas (Configurar), y la vista de la
// verificación activa dice cómo es cada entrada (Activa). Skill herramientas-claras.

interface Estado {
  activo: boolean;
  activadoAt: string | null;
  codigosRestantes: number;
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
    return { ok: false, error: 'Sin conexión. Revisa tu internet e intenta de nuevo.' };
  }
}

export default function SeguridadPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  // Llaves recién creadas: `primeras` son las de la activación (al confirmar, la sesión pasa a verificada)
  const [llaves, setLlaves] = useState<{ lista: string[]; primeras: boolean } | null>(null);

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

  // Activó y cerró la pestaña antes de confirmar que guardó las llaves: la sesión sigue siendo la que activó
  // (las demás se cerraron), así que se verifica y entra. Las llaves las puede crear de nuevo.
  const pendienteDeEntrar = Boolean(estado?.activo && session && !verificada && !llaves);
  useCargarAlMontar(() => {
    if (pendienteDeEntrar) void entrarAlPanel();
  }, [pendienteDeEntrar]);

  /** La clave y el QR: se piden una sola vez (pedirlos otra vez cambiaría la clave que ya escaneó) */
  const empezar = async (): Promise<boolean> => {
    if (config) return true;
    setOcupado(true);
    setError('');
    const r = await pedir<Configuracion>({ accion: 'iniciar' });
    setOcupado(false);
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    setConfig(r.datos);
    return true;
  };

  const enviarCodigo = async (accion: 'activar' | 'regenerar', codigo: string): Promise<boolean> => {
    if (codigo.replace(/\s/g, '').length !== 6) {
      setError('Faltan cifras: el número de la app tiene 6.');
      return false;
    }
    setOcupado(true);
    setError('');
    const r = await pedir<{ codigos: string[] }>({ accion, codigo });
    setOcupado(false);
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    setLlaves({ lista: r.datos.codigos, primeras: accion === 'activar' });
    setEstado((e) => ({ activo: true, activadoAt: e?.activadoAt ?? new Date().toISOString(), codigosRestantes: r.datos.codigos.length }));
    return true;
  };

  if (errorCarga) return <p className={`${adminNotice('danger')} max-w-2xl`} role="alert">{errorCarga}</p>;
  if (!estado || pendienteDeEntrar) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Cargando">
        <span className={adminSpinner} aria-hidden="true" />
      </div>
    );
  }

  const configurando = !estado.activo || llaves?.primeras === true;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className={adminPageTitle}>Mi seguridad</h1>
        <p className={adminPageSubtitle}>
          {configurando ? 'Tu contraseña y un número de tu teléfono: así nadie más entra.' : 'Tu cuenta pide un número de tu teléfono al entrar.'}
        </p>
      </div>

      {configurando ? (
        <>
          <Configurar
            correo={correo}
            config={config}
            ocupado={ocupado}
            error={error}
            codigos={llaves?.primeras ? llaves.lista : null}
            onEmpezar={empezar}
            onActivar={(codigo) => enviarCodigo('activar', codigo)}
            onEntrar={entrarAlPanel}
            onLimpiarError={() => setError('')}
          />
          <AsiFunciona
            clave="dos-pasos"
            sinChispa
            titulo="Así entras al panel"
            nota="Aunque alguien sepa tu contraseña, sin tu teléfono no entra."
            pasos={[
              { icono: 'candado', texto: 'Tu contraseña' },
              { icono: 'celular', texto: 'Un número de tu teléfono' },
              { icono: 'verificado', texto: 'Entras al panel' },
            ]}
            boton="Empezar"
          />
        </>
      ) : llaves ? (
        <NuevasLlaves lista={llaves.lista} correo={correo} onListo={() => setLlaves(null)} />
      ) : (
        <Activa
          activadoAt={estado.activadoAt}
          llavesRestantes={estado.codigosRestantes}
          esSuperAdmin={session?.user?.role === 'SUPER_ADMIN'}
          ocupado={ocupado}
          error={error}
          onRegenerar={(codigo) => enviarCodigo('regenerar', codigo)}
          onLimpiarError={() => setError('')}
        />
      )}
    </div>
  );
}

function NuevasLlaves({ lista, correo, onListo }: { lista: string[]; correo: string; onListo: () => void }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4 sm:p-5" aria-labelledby="titulo-nuevas">
      <h2 id="titulo-nuevas" className="text-lg font-semibold text-ink">Tus llaves de repuesto nuevas</h2>
      <p className="mb-4 mt-0.5 text-sm text-muted">Las de antes dejaron de servir.</p>
      <CodigosRespaldo codigos={lista} correo={correo} textoBoton="Listo" onListo={onListo} />
      <div className="mt-4"><Trabado mensaje="Hola, tengo una duda con mis llaves de repuesto del panel." /></div>
    </section>
  );
}

