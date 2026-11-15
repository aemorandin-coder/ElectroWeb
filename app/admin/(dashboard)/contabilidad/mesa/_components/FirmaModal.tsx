'use client';

// C-235: dibujar (o cambiar) la firma y el sello de quien declara. El lienzo es el de los documentos (C-103); el servidor
// valida el trazo, lo recorta y lo guarda con el usuario de la sesión.

import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import SignaturePad, { type SignaturePadHandle } from '@/components/legal/SignaturePad';
import { IconoCerrar, IconoCheck, IconoEliminar } from '@/components/iconos';
import Opcion from '@/components/admin/Opcion';
import {
  adminError, adminHint, adminInput, adminLabel, adminModalBody, adminModalFooter, adminModalHeader, adminModalOverlay,
  adminModalPanel, adminModalTitle, adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import type { FirmaDTO } from '@/lib/contabilidad/mesa';

const LARGO_MINIMO = 120; // px de trazo, como en los documentos: un punto no es una firma
const TITULOS = ['Contadora Pública', 'Contador Público'] as const;

export default function FirmaModal({ actual, nombreSugerido, onCerrar, onGuardada }: {
  actual: FirmaDTO | null;
  nombreSugerido: string;
  onCerrar: () => void;
  onGuardada: (firma: FirmaDTO) => void;
}) {
  useBodyScrollLock(true);
  const pad = useRef<SignaturePadHandle>(null);
  const [largo, setLargo] = useState(0);
  const [nombre, setNombre] = useState(actual?.nombre ?? (nombreSugerido ? `Lic. ${nombreSugerido}` : ''));
  const [titulo, setTitulo] = useState<string>(actual?.titulo ?? TITULOS[0]);
  const [cpc, setCpc] = useState(actual?.cpc ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onCambio = useCallback((l: number) => setLargo(l), []);

  const trazoNuevo = largo >= LARGO_MINIMO;
  const cpcLimpio = cpc.replace(/[\s.]/g, '');
  const listo = nombre.trim().length >= 3 && /^\d{3,7}$/.test(cpcLimpio) && (trazoNuevo || Boolean(actual));

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/contabilidad/firma', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), titulo, cpc: cpcLimpio, ...(trazoNuevo ? { trazo: pad.current?.toDataURL() } : {}) }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setError(d?.error ?? 'No se pudo guardar la firma.');
        return;
      }
      toast.success('Tu firma y tu sello quedaron guardados');
      onGuardada(d.firma as FirmaDTO);
    } catch {
      setError('Sin conexión. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="firma-titulo" onClick={(e) => { if (e.target === e.currentTarget && !guardando) onCerrar(); }}>
      <div className={`${adminModalPanel} sm:max-w-lg`}>
        <div className={adminModalHeader}>
          <h2 id="firma-titulo" className={adminModalTitle}>{actual ? 'Cambiar mi firma y sello' : 'Mi firma y sello'}</h2>
          <button type="button" onClick={onCerrar} disabled={guardando} aria-label="Cerrar" className="rounded-lg p-2 text-muted hover:bg-surface"><IconoCerrar className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <div className={adminModalBody}>
          <p className="text-sm text-ink-soft">Va en cada cierre del mes y en la portada de cada Excel. Se dibuja una vez.</p>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className={adminLabel}>Tu firma{actual ? ' (déjala en blanco para conservar la de ahora)' : ''}</span>
              <button type="button" onClick={() => pad.current?.clear()} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                <IconoEliminar className="h-4 w-4" aria-hidden="true" /> Borrar
              </button>
            </div>
            <SignaturePad ref={pad} onChange={onCambio} label="Recuadro para firmar con el dedo, el lápiz o el mouse" />
            <p className={adminHint}>{largo > 0 && !trazoNuevo ? 'Un trazo completo, no un punto.' : 'Con el dedo, el lápiz o el mouse.'}</p>
          </div>
          <div className="mt-4 grid gap-4">
            <div>
              <label htmlFor="firma-nombre" className={adminLabel}>Tu nombre, como quieres que salga</label>
              <input id="firma-nombre" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} className={`${adminInput()} sm:max-w-sm`} autoComplete="name" />
            </div>
            <div>
              <span className={adminLabel}>Título</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Título">
                {TITULOS.map((t) => (
                  <Opcion key={t} tamano="chica" role="radio" aria-checked={titulo === t} elegida={titulo === t} onClick={() => setTitulo(t)} titulo={t} />
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="firma-cpc" className={adminLabel}>Número de C.P.C.</label>
              <input id="firma-cpc" value={cpc} maxLength={10} inputMode="numeric" onChange={(e) => setCpc(e.target.value)} className={`${adminInput(Boolean(cpc) && !/^\d{3,7}$/.test(cpcLimpio))} tabular-nums sm:max-w-40`} />
              <p className={adminHint}>Tu inscripción en el Colegio de Contadores Públicos.</p>
            </div>
          </div>
          {error && <p role="alert" className={`${adminError} mt-3`}>{error}</p>}
        </div>
        <div className={adminModalFooter}>
          <button type="button" onClick={onCerrar} disabled={guardando} className={adminSecondaryButton}>Cancelar</button>
          <button type="button" onClick={() => void guardar()} disabled={!listo || guardando} className={adminPrimaryButton}>
            <IconoCheck className="h-4 w-4" aria-hidden="true" /> {guardando ? 'Guardando…' : 'Guardar mi firma'}
          </button>
        </div>
      </div>
    </div>
  );
}
