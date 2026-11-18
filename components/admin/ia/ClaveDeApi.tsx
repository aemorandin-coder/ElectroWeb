'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { IconoAdvertencia, IconoClave, IconoPlay, IconoRestablecer } from '@/components/iconos';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { adminHint, adminInput, adminNotice, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { infoProveedor, type IdProveedor } from '@/lib/ia/proveedores/catalogo';
import { claveDe, llamar, segundos, type DatosIa } from './tipos';

// C-288 · La clave de la API de Anthropic: se ve enmascarada ("sk-ant-…" y los últimos 4), se cambia (se prueba antes de guardarla y
// queda cifrada en la base), se vuelve a la del servidor y se prueba la conexión. La clave nunca sale del servidor.
// C-292: la misma pieza para cada proveedor (`proveedor`). Los que no son Anthropic se prueban pidiéndole su lista de modelos.

const chico = 'h-9! px-3! text-[13px]';

export default function ClaveDeApi({ datos, alGuardar, proveedor = 'anthropic' }: { datos: DatosIa; alGuardar: () => Promise<void>; proveedor?: IdProveedor }) {
  const { confirm } = useConfirm();
  const clave = claveDe(datos, proveedor);
  const info = infoProveedor(proveedor);
  const esAnthropic = proveedor === 'anthropic';
  const id = `ia-clave-${proveedor}`;
  const [nueva, setNueva] = useState('');
  const [cambiando, setCambiando] = useState(false);
  const [ocupado, setOcupado] = useState<'guardar' | 'probar' | 'volver' | null>(null);
  const [conexion, setConexion] = useState<{ ok: boolean; texto: string } | null>(null);
  const [errorDeLaClave, setErrorDeLaClave] = useState('');

  const guardar = async () => {
    setOcupado('guardar');
    setErrorDeLaClave('');
    try {
      const r = await llamar<{ ms?: number; modelo?: string; modelos?: string[] }>('/api/admin/ia/clave', 'PUT', { clave: nueva.trim(), proveedor });
      if (!r.ok) {
        setErrorDeLaClave(r.datos.error ?? 'No se pudo guardar la clave.');
        return;
      }
      toast.success(esAnthropic
        ? `Clave guardada: Claude respondió en ${segundos(r.datos.ms ?? 0)}. Rige desde el próximo pedido.`
        : `Clave de ${info.empresa} guardada: ofrece ${r.datos.modelos?.length ?? 0} modelos. Elige uno en "El motor".`);
      setNueva('');
      setCambiando(false);
      setConexion(null);
      await alGuardar();
    } catch {
      setErrorDeLaClave('Sin conexión. Prueba otra vez.');
    } finally {
      setOcupado(null);
    }
  };

  const volver = async () => {
    const aLaDelServidor = clave.hayEnServidor || esAnthropic;
    const sigue = await confirm({
      title: aLaDelServidor ? 'Volver a la clave del servidor' : `Quitar la clave de ${info.empresa}`,
      message: aLaDelServidor
        ? `Se borra la clave que se pegó en el panel y ${info.motor} sigue con la del servidor (${info.variableDeClave}). ¿Volver?`
        : `${info.motor} queda sin clave: lo que lo use pasa al respaldo, si hay uno. ¿Quitarla?`,
      confirmText: aLaDelServidor ? 'Volver a la del servidor' : 'Quitar la clave', cancelText: 'Cancelar', type: 'warning',
    });
    if (!sigue) return;
    setOcupado('volver');
    try {
      const r = await llamar(`/api/admin/ia/clave${esAnthropic ? '' : `?proveedor=${proveedor}`}`, 'DELETE');
      if (r.ok) toast.success(aLaDelServidor ? `${info.motor} vuelve a usar la clave del servidor` : `Clave de ${info.empresa} quitada`);
      else toast.error(r.datos.error ?? 'No se pudo quitar la clave');
      await alGuardar();
    } catch {
      toast.error('Sin conexión. Prueba otra vez.');
    } finally {
      setOcupado(null);
    }
  };

  const probar = async () => {
    setOcupado('probar');
    setConexion(null);
    try {
      const r = await llamar<{ ok: boolean; ms?: number; modelo?: string }>('/api/admin/ia/probar', 'POST', { proveedor });
      setConexion(r.datos.ok ? { ok: true, texto: `Conectado: ${r.datos.modelo} respondió en ${segundos(r.datos.ms ?? 0)}` } : { ok: false, texto: r.datos.error ?? 'No se pudo probar la conexión' });
    } catch {
      setConexion({ ok: false, texto: 'Sin conexión. Prueba otra vez.' });
    } finally {
      setOcupado(null);
    }
  };

  const donde = clave.fuente === 'panel' ? 'Guardada en el panel, cifrada' : clave.fuente === 'env' ? 'En el servidor (.env)' : 'No hay ninguna';

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${clave.hay ? 'bg-success-strong text-white' : 'bg-surface text-muted'}`}>
          <IconoClave className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="break-all font-mono text-sm font-semibold text-ink">{clave.enmascarada ?? 'Sin clave'}</p>
          <p className="text-xs text-muted">{donde}. Nunca sale del servidor ni se muestra entera.</p>
        </div>
      </div>

      {clave.claveRota && (
        <div className={`${adminNotice('warning')} mt-3 flex items-start gap-3`} role="alert">
          <IconoAdvertencia aria-hidden="true" />
          <span>La clave que se guardó en el panel no se pudo leer (cambió el secreto del servidor). {clave.hay ? `${info.motor} sigue con la del servidor.` : `${info.motor} está sin clave.`} Pega la clave otra vez.</span>
        </div>
      )}

      {cambiando ? (
        <form onSubmit={(e) => { e.preventDefault(); void guardar(); }} className="mt-4">
          <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">La clave de {info.empresa}</label>
          <input
            id={id}
            type="password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={400}
            placeholder={info.ejemploClave}
            className={`${adminInput(Boolean(errorDeLaClave))} font-mono text-xs sm:max-w-xl`}
            aria-invalid={Boolean(errorDeLaClave)}
            aria-describedby={`${id}-ayuda`}
          />
          {errorDeLaClave
            ? <p className="mt-1 text-xs font-semibold text-deal" role="alert">{errorDeLaClave}</p>
            : <p id={`${id}-ayuda`} className={adminHint}>Sale de <a href={info.consola} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">su consola</a>. Se prueba con {info.empresa} antes de guardarla y queda cifrada. Si no responde, no se guarda.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" disabled={ocupado !== null || nueva.trim().length < 20} className={`${adminPrimaryButton} ${chico}`}>
              {ocupado === 'guardar' ? 'Probando…' : 'Probar y guardar'}
            </button>
            <button type="button" onClick={() => { setCambiando(false); setNueva(''); setErrorDeLaClave(''); }} disabled={ocupado !== null} className={`${adminSecondaryButton} ${chico}`}>Cancelar</button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setCambiando(true)} disabled={ocupado !== null} className={`${adminSecondaryButton} ${chico}`}>
            <IconoClave className="h-4 w-4" aria-hidden="true" />{clave.hay ? 'Cambiar la clave' : 'Conectar la clave'}
          </button>
          {clave.fuente === 'panel' && (clave.hayEnServidor || !esAnthropic) && (
            <button type="button" onClick={() => void volver()} disabled={ocupado !== null} className={`${adminSecondaryButton} ${chico}`}>
              <IconoRestablecer className="h-4 w-4" aria-hidden="true" />{clave.hayEnServidor || esAnthropic ? 'Volver a la del servidor' : 'Quitar la clave'}
            </button>
          )}
          <button type="button" onClick={() => void probar()} disabled={ocupado !== null || !clave.hay} className={`${adminSecondaryButton} ${chico}`}>
            <IconoPlay className="h-4 w-4" aria-hidden="true" />{ocupado === 'probar' ? 'Probando…' : 'Probar la conexión'}
          </button>
        </div>
      )}
      {conexion && <p className={`mt-3 text-sm font-semibold ${conexion.ok ? 'text-success-strong' : 'text-deal'}`} role="status">{conexion.texto}</p>}
    </div>
  );
}
