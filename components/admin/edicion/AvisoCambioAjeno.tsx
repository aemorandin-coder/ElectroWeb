import { FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { listaEnTexto } from '@/lib/edicion/producto';
import type { CambioAjeno } from '@/lib/edicion/useEdicionEnVivo';

// C-169: otra persona cambió, movió a la papelera, restauró o borró el recurso que se está editando.
// Lo grave (papelera, borrado) queda fijo y con salida; lo demás es un aviso que se cierra.

function haceCuanto(iso: string): string {
  const segundos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (segundos < 60) return 'hace un momento';
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

interface Props {
  cambio: CambioAjeno;
  /** "producto", "configuración"… */
  recurso: string;
  ocupado?: boolean;
  /** Sacarlo de la papelera y seguir editando (si se puede) */
  onRestaurar?: () => void;
  /** Guardar lo que se tiene como un recurso nuevo (si se puede) */
  onGuardarComoNuevo?: () => void;
  onCerrar: () => void;
}

export default function AvisoCambioAjeno({ cambio, recurso, ocupado, onRestaurar, onGuardarComoNuevo, onCerrar }: Props) {
  const { accion, por } = cambio;

  if (accion === 'papelera' || accion === 'eliminado') {
    const borrado = accion === 'eliminado';
    return (
      <div role="alert" className="mb-4 rounded-xl border border-deal/30 bg-deal-bg p-4 text-sm text-deal">
        <div className="flex items-start gap-3">
          <FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {por.nombre} {borrado ? `borró para siempre este ${recurso}` : `movió este ${recurso} a la papelera`} {haceCuanto(cambio.en)}.
            </p>
            <p className="mt-1">
              Lo que escribiste no se perdió: sigue en esta pantalla y en el borrador de este navegador. No se puede guardar sobre un {recurso} {borrado ? 'que ya no existe' : 'que está en la papelera'}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!borrado && onRestaurar && (
                <button type="button" onClick={onRestaurar} disabled={ocupado} className={adminPrimaryButton}>Restaurar y seguir editando</button>
              )}
              {onGuardarComoNuevo && (
                <button type="button" onClick={onGuardarComoNuevo} disabled={ocupado} className={adminSecondaryButton}>Guardar como {recurso} nuevo</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const texto = accion === 'restaurado'
    ? `${por.nombre} restauró este ${recurso} de la papelera ${haceCuanto(cambio.en)}.`
    : `${por.nombre} guardó cambios ${haceCuanto(cambio.en)}${cambio.campos && cambio.campos.length > 0 ? `: ${listaEnTexto(cambio.campos)}` : ''}. Al guardar tú, se combinan con los tuyos.`;
  return (
    <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700">
      <FiInfo className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">{texto}</p>
      <button type="button" onClick={onCerrar} className="shrink-0 rounded-lg px-2 py-1 font-semibold hover:bg-white">Entendido</button>
    </div>
  );
}
