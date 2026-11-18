'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { IconoCelular, IconoCopiar, IconoDescargar, IconoLlave, IconoQr } from '@/components/iconos';
import Pasos, { type Paso } from '@/components/admin/Pasos';
import Opcion from '@/components/admin/Opcion';
import Ayuda from '@/components/admin/Ayuda';
import CodigosRespaldo from '@/components/admin/CodigosRespaldo';
import TelefonoDibujado from '@/components/admin/dos-pasos/TelefonoDibujado';
import { APPS_DE_CODIGOS, appPorId, useTelefono, type IdApp } from '@/components/admin/dos-pasos/apps';
import { adminLabel, adminPrimaryButton } from '@/lib/admin-ui';
import Trabado from '@/components/admin/dos-pasos/Trabado';
import { CaminoDeEntrada, CampoNumero, Marco, Pie, Qr, Tiendas } from './piezas';

// C-290: configurar los dos pasos en cuatro pasos dibujados (skill herramientas-claras). Antes eran tres tarjetas con
// texto: la contadora no supo "qué app es doble factor" ni qué hacer después (18/11).
// 1. Baja la app: las tres, con su logo y su tienda.
// 2. Agrega Electro Shop: el teléfono dibujado con lo que se toca, y el QR (en el teléfono, "Abrir en la app").
// 3. Escribe el número: el de la app, con su dibujo. Al acertar, la verificación queda activa.
// 4. Guarda tus llaves de repuesto: los 10 códigos de respaldo, y cómo será cada entrada.

export interface Configuracion {
  uri: string;
  clave: string;
  qr: { tamano: number; camino: string };
}

export default function Configurar({ correo, config, ocupado, error, codigos, onEmpezar, onActivar, onEntrar, onLimpiarError }: {
  correo: string;
  config: Configuracion | null;
  ocupado: boolean;
  error: string;
  /** Los códigos de respaldo recién creados: la verificación ya está activa */
  codigos: string[] | null;
  /** Pide la clave y el QR al servidor (si todavía no los tiene) */
  onEmpezar: () => Promise<boolean>;
  onActivar: (codigo: string) => Promise<boolean>;
  onEntrar: () => Promise<void>;
  onLimpiarError: () => void;
}) {
  const [paso, setPaso] = useState(codigos ? 3 : 0);
  const [appId, setAppId] = useState<IdApp>('google');
  const [codigo, setCodigo] = useState('');
  const app = appPorId(appId);
  const activa = codigos !== null;
  // En el teléfono la pantalla no se puede escanear a sí misma: el enlace abre la app con la cuenta puesta
  const enTelefono = useTelefono() !== null;

  const irA = (i: number) => {
    onLimpiarError();
    setPaso(i);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const pasos: Paso[] = [
    { titulo: 'Baja la app', resumen: paso > 0 ? app.nombre : 'Gratis, en tu teléfono', hecho: paso > 0, disponible: !activa, icono: IconoDescargar },
    { titulo: 'Agrega Electro Shop', resumen: paso > 1 ? 'Con el código QR' : 'Escanea un código', hecho: paso > 1, disponible: !activa && config !== null, icono: IconoQr },
    { titulo: 'Escribe el número', resumen: activa ? 'Activada' : '6 cifras de tu app', hecho: activa, disponible: !activa && config !== null, icono: IconoCelular },
    { titulo: 'Guarda tus llaves', resumen: 'Por si pierdes el teléfono', hecho: false, disponible: activa, icono: IconoLlave },
  ];

  const seguirAlQr = async () => {
    if (await onEmpezar()) irA(1);
  };

  const activar = async () => {
    if (await onActivar(codigo)) {
      setCodigo('');
      irA(3);
    }
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

  const mensajeError = error && <p className="text-sm font-semibold text-deal" role="alert">{error}</p>;

  return (
    <div className="space-y-4">
      <Pasos pasos={pasos} actual={paso} onIr={irA} etiqueta="Pasos para activar la verificación" />

      {paso === 0 && (
        <Marco
          id="paso-app"
          titulo="Baja una app de códigos"
          linea="Es gratis. Te da un número nuevo cada 30 segundos para entrar."
          pie={<Pie despues="Después: agregas Electro Shop con un código QR." siguiente={{ texto: 'Ya la tengo: siguiente', onClick: seguirAlQr, ocupado }} />}
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-10">
            <div className="grid gap-2" role="radiogroup" aria-label="Elige una app">
              {APPS_DE_CODIGOS.map((a) => (
                <Opcion
                  key={a.id}
                  role="radio"
                  aria-checked={a.id === appId}
                  elegida={a.id === appId}
                  icono={a.logo}
                  titulo={a.nombre}
                  detalle={a.nota}
                  onClick={() => setAppId(a.id)}
                />
              ))}
            </div>
            <div>
              <p className={adminLabel}>Bájala de la tienda de tu teléfono</p>
              <Tiendas app={app} />
            </div>
          </div>
          <p className="text-sm text-muted">¿Ya tienes una de estas? Usa esa: sirve igual.</p>
          {mensajeError}
        </Marco>
      )}

      {paso === 1 && config && (
        <Marco
          id="paso-qr"
          titulo="Agrega Electro Shop a la app"
          linea={enTelefono ? 'Ábrela con un toque desde aquí.' : `Abre ${app.nombre} y escanea este código.`}
          pie={<Pie onAtras={() => irA(0)} despues="Después: escribes el número que te muestra." siguiente={{ texto: 'Siguiente: el número', onClick: () => irA(2) }} />}
        >
          {enTelefono ? (
            <div className="space-y-3">
              <a href={config.uri} className={`${adminPrimaryButton} w-full sm:w-auto`}>
                <IconoCelular className="h-4 w-4" aria-hidden="true" />
                Abrir en {app.nombre}
              </a>
              <ol className="space-y-2">
                {[`Toca «Abrir en ${app.nombre}»`, 'En la app, acepta la cuenta nueva', 'Vuelve aquí y toca «Siguiente»'].map((texto, i) => (
                  <li key={texto} className="flex items-center gap-3 text-sm text-ink">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">{i + 1}</span>
                    {texto}
                  </li>
                ))}
              </ol>
              <p className="text-sm text-muted">Tu pantalla no se puede escanear a sí misma: este botón la agrega.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <TelefonoDibujado app={app} modo="agregar" />
              <div className="w-full min-w-0 space-y-4">
                <ol className="space-y-2">
                  {['Abre la app en tu teléfono', ...app.agregar, 'Apunta la cámara a este código'].map((texto, i) => (
                    <li key={texto} className="flex items-center gap-3 text-sm text-ink">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">{i + 1}</span>
                      {texto}
                    </li>
                  ))}
                </ol>
                <Qr texto={config.uri} etiqueta="Código QR para agregar Electro Shop a la app" className="h-44 w-44" />
              </div>
            </div>
          )}
          <details className="max-w-xl rounded-xl border border-line px-3 py-2">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-ink">{enTelefono ? '¿No se abrió? Escribe la clave' : '¿No puedes escanear? Escribe la clave'}</summary>
            <p className="mt-1 text-sm text-muted">En la app: «Ingresar una clave» (o «clave de configuración»), con tu correo como nombre.</p>
            <p className="mt-2 break-all rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink">{config.clave}</p>
            <button type="button" onClick={copiarClave} className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
              <IconoCopiar className="h-4 w-4" aria-hidden="true" />
              Copiar la clave
            </button>
            <p className="pb-1 text-xs text-muted">Cuenta: {correo} · Tipo: basada en el tiempo</p>
          </details>
        </Marco>
      )}

      {paso === 2 && config && (
        <Marco
          id="paso-numero"
          titulo="Escribe el número de la app"
          linea="Busca «Electro Shop» en la app y escribe sus 6 cifras."
          pie={<Pie onAtras={() => irA(1)} despues="Después: guardas tus llaves de repuesto." siguiente={{ texto: 'Activar y seguir', tipo: 'submit', form: 'form-activar', ocupado }} />}
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <TelefonoDibujado app={app} modo="numero" />
            <form id="form-activar" className="w-full min-w-0 space-y-2" noValidate onSubmit={(e) => { e.preventDefault(); void activar(); }}>
              <div className="flex items-center gap-1">
                <label htmlFor="codigo-activar" className={`${adminLabel} mb-0`}>El número de 6 cifras</label>
                <Ayuda etiqueta="Si el número no sirve">
                  Cambia cada 30 segundos: escribe el que ves ahora. Si sigue sin servir, pon la hora del teléfono en automática. Si ves dos «Electro Shop», usa el más nuevo.
                </Ayuda>
              </div>
              <CampoNumero id="codigo-activar" valor={codigo} onChange={(v) => { setCodigo(v); onLimpiarError(); }} deshabilitado={ocupado} invalido={Boolean(error)} />
              {mensajeError}
            </form>
          </div>
        </Marco>
      )}

      {paso === 3 && codigos && (
        <Marco
          id="paso-llaves"
          titulo="Guarda tus llaves de repuesto"
          linea="Si pierdes el teléfono, cada llave te deja entrar una vez."
          pie={null}
        >
          <CodigosRespaldo
            codigos={codigos}
            correo={correo}
            textoBoton="Entrar al panel"
            onListo={onEntrar}
            antesDeConfirmar={(
              <div className="mt-6 border-t border-line pt-5">
                <p className="mb-3 text-sm font-semibold text-ink">Así será cada vez que entres</p>
                <CaminoDeEntrada />
              </div>
            )}
          />
        </Marco>
      )}

      <Trabado mensaje="Hola, me trabé activando la verificación en dos pasos del panel." />
    </div>
  );
}
