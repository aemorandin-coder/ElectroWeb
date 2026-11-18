'use client';

import { useCallback, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { IconoCheck, IconoGuardar, IconoRestablecer } from '@/components/iconos';
import { adminNotice, adminPrimaryButton, adminSecondaryButton, adminSpinner } from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import {
  buildPatch, isDirty, toSettingsForm, type FieldErrors, type SectionProps, type SetField, type SettingsForm, type SettingsKey,
} from '../../settings/_components/settings-form';

// C-294 (D2 del 18/11): Portada y "Google y redes" pasaron de Ajustes a Marketing, porque son contenido: también los cambian los
// administradores con permiso de contenido (la API acepta esos campos con MANAGE_CONTENT, lib/validations/settings.ts). Esta pieza
// carga los ajustes, deja cambiar solo `campos` con la sección de siempre (la de Ajustes) y los guarda con su barra.

export default function AjustesDeContenido({ campos, children }: { campos: readonly SettingsKey[]; children: (props: SectionProps) => ReactNode }) {
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [initial, setInitial] = useState<SettingsForm | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useCargarAlMontar(async () => {
    try {
      const r = await fetch('/api/settings', { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const datos = toSettingsForm(await r.json());
      setForm(datos);
      setInitial(datos);
    } catch {
      setError('No se pudieron cargar los ajustes. Recarga la página.');
    }
  });

  const set: SetField = useCallback((key, value) => {
    setForm((previo) => (previo ? { ...previo, [key]: value } : previo));
    setErrors((previo) => (previo[key] ? { ...previo, [key]: undefined } : previo));
    setGuardado(false);
  }, []);

  if (error) return <p className={adminNotice('danger')} role="alert">{error}</p>;
  if (!form || !initial) return <div className="flex justify-center py-16"><span className={adminSpinner} aria-label="Cargando" /></div>;

  const cambios = campos.filter((k) => isDirty(form, initial, k));

  const guardar = async () => {
    setSaving(true);
    setErrors({});
    try {
      const r = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPatch(form, initial, campos)) });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (datos.fields && typeof datos.fields === 'object') setErrors(datos.fields);
        toast.error(datos.error || 'No se pudo guardar');
        return;
      }
      const nuevo = toSettingsForm(datos);
      setForm(nuevo);
      setInitial(nuevo);
      setGuardado(true);
      toast.success('Guardado: se ve en la tienda en un minuto');
    } catch {
      toast.error('Sin conexión. Tus cambios siguen aquí; intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="space-y-5">{children({ form, set, errors })}</div>
      <div className="sticky bottom-0 z-[var(--z-sticky)] -mx-3 mt-6 px-3 pb-3 pt-2 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0" aria-live="polite">
        {cambios.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-white p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:pl-5">
            <p className="text-sm text-ink"><strong>{cambios.length === 1 ? '1 cambio sin guardar' : `${cambios.length} cambios sin guardar`}</strong></p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button type="button" onClick={() => { setForm(initial); setErrors({}); }} disabled={saving} className={`${adminSecondaryButton} whitespace-nowrap`}>
                <IconoRestablecer className="hidden h-4 w-4 sm:block" aria-hidden="true" />Descartar
              </button>
              <button type="button" onClick={() => void guardar()} disabled={saving} className={`${adminPrimaryButton} whitespace-nowrap`}>
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" /> : <IconoGuardar className="hidden h-4 w-4 sm:block" aria-hidden="true" />}
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : guardado ? (
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-success-strong"><IconoCheck className="h-4 w-4" aria-hidden="true" />Guardado</p>
        ) : null}
      </div>
    </div>
  );
}
