'use client';

// C-227: lo que hace el aliado comercial en su página, sin cuenta: "Lo estoy preparando" y la guía, con una revisión antes
// de anotarla (un número mal escrito le llega al cliente). La API valida todo de nuevo (app/api/proveedor/despacho).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { IconoCheck, IconoCopiar, IconoEditar, IconoEnvio, IconoPaquete } from '@/components/iconos';
import { adminInput, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

const GUIA = /^[A-Z0-9][A-Z0-9 -]{3,39}$/;
const limpiar = (texto: string) => texto.trim().replace(/\s+/g, ' ').toUpperCase();

interface Props {
  token: string;
  preparando: boolean;
  /** "ZOOM" o "MRW" */
  empresa: string;
}

export default function AccionesDespacho({ token, preparando, empresa }: Props) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<'preparando' | 'guia' | null>(null);
  const [guia, setGuia] = useState('');
  const [revisando, setRevisando] = useState(false);
  const limpia = limpiar(guia);
  const valida = GUIA.test(limpia);

  const enviar = async (cuerpo: { accion: 'preparando' } | { accion: 'guia'; guia: string }) => {
    setEnviando(cuerpo.accion);
    try {
      const r = await fetch(`/api/proveedor/despacho/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(d.error || 'No se pudo guardar. Intente de nuevo.');
        return;
      }
      toast.success(cuerpo.accion === 'guia' ? '¡Guía anotada! El cliente ya recibió su número.' : 'Listo: el cliente ya sabe que lo está preparando.');
      router.refresh();
    } catch {
      toast.error('Sin conexión. Intente de nuevo.');
    } finally {
      setEnviando(null);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-5" aria-labelledby="despacho-pasos">
      <h2 id="despacho-pasos" className="text-base font-semibold text-ink">Lo que falta</h2>
      <ol className="mt-4 space-y-5">
        <li className="flex gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${preparando ? 'bg-success-strong text-white' : 'bg-brand-950 text-accent'}`}>
            {preparando ? <IconoCheck className="h-5 w-5" aria-hidden="true" /> : <IconoPaquete className="h-5 w-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">1. Prepárelo</p>
            {preparando ? (
              <p className="text-sm text-ink-soft">Lo está preparando: el cliente ya lo sabe.</p>
            ) : (
              <>
                <p className="text-sm text-ink-soft">Avísele al cliente que su pedido ya está en sus manos.</p>
                <button type="button" onClick={() => void enviar({ accion: 'preparando' })} disabled={enviando !== null} className={`${adminSecondaryButton} mt-3`}>
                  <IconoPaquete className="h-4 w-4" aria-hidden="true" />
                  {enviando === 'preparando' ? 'Guardando…' : 'Lo estoy preparando'}
                </button>
              </>
            )}
          </div>
        </li>

        <li className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-950 text-accent">
            <IconoEnvio className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">2. Anote la guía de {empresa}</p>
            {revisando ? (
              <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50 p-4">
                <p className="text-sm text-brand-900">Revise el número antes de anotarlo: es el que recibe el cliente.</p>
                <p className="mt-2 break-all font-mono text-2xl font-bold tracking-wide text-ink">{limpia}</p>
                <p className="text-sm text-ink-soft">Guía de {empresa}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void enviar({ accion: 'guia', guia: limpia })} disabled={enviando !== null} className={adminPrimaryButton}>
                    <IconoCheck className="h-4 w-4" aria-hidden="true" />
                    {enviando === 'guia' ? 'Anotando…' : 'Sí, anotar la guía'}
                  </button>
                  <button type="button" onClick={() => setRevisando(false)} disabled={enviando !== null} className={adminSecondaryButton}>
                    <IconoEditar className="h-4 w-4" aria-hidden="true" />
                    Corregir
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="mt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (valida) setRevisando(true);
                }}
              >
                <label htmlFor="guia" className="text-sm text-ink-soft">Cuando lo entregue en la agencia, escriba el número que sale en el recibo.</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    id="guia"
                    value={guia}
                    onChange={(e) => setGuia(e.target.value)}
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    maxLength={40}
                    placeholder="Número de guía"
                    className={`${adminInput(guia.length > 0 && !valida)} font-mono sm:max-w-xs`}
                  />
                  <button type="submit" disabled={!valida || enviando !== null} className={adminPrimaryButton}>
                    <IconoEnvio className="h-4 w-4" aria-hidden="true" />
                    Anotar la guía
                  </button>
                </div>
                {guia.length > 0 && !valida && (
                  <p className="mt-1 text-xs text-deal" role="alert">Letras, números y guiones, 4 o más.</p>
                )}
              </form>
            )}
          </div>
        </li>
      </ol>
    </section>
  );
}

/** "Copiar los datos" para pegarlos en el formulario de la guía de ZOOM o MRW. El botón dice "Copiado" dos segundos */
export function CopiarDatos({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = window.setTimeout(() => setCopiado(false), 2000);
    return () => window.clearTimeout(t);
  }, [copiado]);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      toast.error('No se pudo copiar. Selecciónelos a mano.');
    }
  };
  return (
    <button type="button" onClick={() => void copiar()} className={adminSecondaryButton}>
      {copiado ? <IconoCheck className="h-4 w-4" aria-hidden="true" /> : <IconoCopiar className="h-4 w-4" aria-hidden="true" />}
      {copiado ? 'Copiado' : 'Copiar los datos'}
    </button>
  );
}
