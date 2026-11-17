'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { IconoAdvertencia, IconoClave, IconoPlay, IconoRestablecer } from '@/components/iconos';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { adminHint, adminInput, adminNotice, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { llamar, segundos, type DatosIa } from './tipos';

// C-288 · La clave de la API de Anthropic: se ve enmascarada ("sk-ant-…" y los últimos 4), se cambia (se prueba antes de guardarla y
// queda cifrada en la base), se vuelve a la del servidor y se prueba la conexión. La clave nunca sale del servidor.

const chico = 'h-9! px-3! text-[13px]';

export default function ClaveDeApi({ datos, alGuardar }: { datos: DatosIa; alGuardar: () => Promise<void> }) {
  const { confirm } = useConfirm();
  const { clave } = datos;
  const [nueva, setNueva] = useState('');
  const [cambiando, setCambiando] = useState(false);
  const [ocupado, setOcupado] = useState<'guardar' | 'probar' | 'volver' | null>(null);
  const [conexion, setConexion] = useState<{ ok: boolean; texto: string } | null>(null);
  const [errorDeLaClave, setErrorDeLaClave] = useState('');

  const guardar = async () => {
    setOcupado('guardar');
    setErrorDeLaClave('');
    try {
      const r = await llamar<{ ms?: number; modelo?: string }>('/api/admin/ia/clave', 'PUT', { clave: nueva.trim() });
      if (!r.ok) {
        setErrorDeLaClave(r.datos.error ?? 'No se pudo guardar la clave.');
        return;
      }
      toast.success(`Clave guardada: Claude respondió en ${segundos(r.datos.ms ?? 0)}. Rige desde el próximo pedido.`);
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
    const sigue = await confirm({
      title: 'Volver a la clave del servidor',
      message: 'Se borra la clave que se pegó en el panel y Claude sigue con la del servidor (ANTHROPIC_API_KEY). ¿Volver?',
      confirmText: 'Volver a la del servidor', cancelText: 'Cancelar', type: 'warning',
    });
    if (!sigue) return;
    setOcupado('volver');
    try {
      const r = await llamar('/api/admin/ia/clave', 'DELETE');
      if (r.ok) toast.success('Claude vuelve a usar la clave del servidor');
      else toast.error(r.datos.error ?? 'No se pudo volver a la clave del servidor');
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
      const r = await llamar<{ ok: boolean; ms?: number; modelo?: string }>('/api/admin/ia/probar', 'POST');
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
          <span>La clave que se guardó en el panel no se pudo leer (cambió el secreto del servidor). {clave.hay ? 'Claude sigue con la del servidor.' : 'Claude está sin clave.'} Pega la clave otra vez.</span>
        </div>
      )}

      {cambiando ? (
        <form onSubmit={(e) => { e.preventDefault(); void guardar(); }} className="mt-4">
          <label htmlFor="ia-clave-nueva" className="mb-1.5 block text-sm font-semibold text-ink">La clave nueva</label>
          <input
            id="ia-clave-nueva"
            type="password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={400}
            placeholder="sk-ant-api03-…"
            className={`${adminInput(Boolean(errorDeLaClave))} font-mono text-xs sm:max-w-xl`}
            aria-invalid={Boolean(errorDeLaClave)}
            aria-describedby="ia-clave-ayuda"
          />
          {errorDeLaClave
            ? <p className="mt-1 text-xs font-semibold text-deal" role="alert">{errorDeLaClave}</p>
            : <p id="ia-clave-ayuda" className={adminHint}>Se prueba con Anthropic antes de guardarla y queda cifrada en la base, como el token del bot de Telegram. Si no responde, no se guarda.</p>}
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
            <IconoClave className="h-4 w-4" aria-hidden="true" />Cambiar la clave
          </button>
          {clave.fuente === 'panel' && clave.hayEnServidor && (
            <button type="button" onClick={() => void volver()} disabled={ocupado !== null} className={`${adminSecondaryButton} ${chico}`}>
              <IconoRestablecer className="h-4 w-4" aria-hidden="true" />Volver a la del servidor
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
