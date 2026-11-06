'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { IconoCorreo } from '@/components/iconos';
import { adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

/**
 * C-191: Mi panel le pregunta una sola vez al cliente si quiere recibir ofertas por correo.
 * Las campañas solo van a quien dijo que sí (regla de Andrés del 16/09); antes nada se lo preguntaba y el
 * interruptor solo estaba en Mi perfil → Notificaciones. Sale solo si el cliente nunca lo decidió.
 */
export default function PreguntarPromociones() {
  const [preguntar, setPreguntar] = useState(false);
  const [guardando, setGuardando] = useState<'si' | 'no' | null>(null);

  useEffect(() => {
    let vigente = true;
    fetch('/api/customer/promociones')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { preguntar?: boolean } | null) => {
        if (vigente) setPreguntar(d?.preguntar === true);
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);

  if (!preguntar) return null;

  const responder = async (acepta: boolean) => {
    setGuardando(acepta ? 'si' : 'no');
    try {
      const res = await fetch('/api/customer/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificaciones: { emailPromotions: acepta } }),
      });
      if (!res.ok) throw new Error();
      setPreguntar(false);
      toast.success(acepta ? 'Listo: te avisaremos de las ofertas por correo' : 'Listo: no te enviaremos ofertas por correo');
    } catch {
      toast.error('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setGuardando(null);
    }
  };

  return (
    <section aria-labelledby="preguntar-promociones" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 lg:flex-row lg:items-center lg:p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden="true">
        <IconoCorreo className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="preguntar-promociones" className="font-semibold text-ink">¿Te avisamos de las ofertas?</h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          Ofertas, productos nuevos y cupones de la tienda, por correo. Puedes darte de baja cuando quieras desde Mi perfil o desde cada correo.
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => responder(true)} disabled={guardando !== null} className={`${adminPrimaryButton} h-11 flex-1 px-4 text-sm lg:flex-none`}>
          {guardando === 'si' ? 'Guardando…' : 'Sí, por correo'}
        </button>
        <button type="button" onClick={() => responder(false)} disabled={guardando !== null} className={`${adminSecondaryButton} h-11 flex-1 px-4 text-sm lg:flex-none`}>
          {guardando === 'no' ? 'Guardando…' : 'No, gracias'}
        </button>
      </div>
    </section>
  );
}
