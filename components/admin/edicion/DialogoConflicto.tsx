'use client';

import { useId, useState } from 'react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useCajonAccesible } from '@/lib/hooks/useCajonAccesible';
import { adminModalOverlay, adminModalPanel, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

// C-169: dos personas cambiaron el mismo campo. Se elige uno por campo; lo que solo tocó una de las dos ya se combinó solo.

export type Eleccion = 'mio' | 'suyo';

/** Un campo en el que los dos cambiaron algo distinto (lib/edicion/combinar.ts) */
export interface ConflictoCampo {
  campo: string;
  base: unknown;
  mio: unknown;
  suyo: unknown;
}

/** Un valor como lo lee una persona: "(vacío)", "Sí", "3 elementos"… */
export function valorEnTexto(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '(vacío)';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (Array.isArray(valor)) return `${valor.length} ${valor.length === 1 ? 'elemento' : 'elementos'}`;
  if (typeof valor === 'object') return `${Object.keys(valor as object).length} datos`;
  const texto = String(valor);
  return texto.length > 120 ? `${texto.slice(0, 117)}…` : texto;
}

interface Props {
  /** Quién más cambió el recurso */
  quien: string;
  conflictos: ConflictoCampo[];
  etiquetas: Record<string, string>;
  /** Cómo mostrar un valor de un campo (por ejemplo, el nombre de una categoría en vez de su id) */
  formatear?: (campo: string, valor: unknown) => string;
  guardando?: boolean;
  onGuardar: (elecciones: Record<string, Eleccion>) => void;
  onCancelar: () => void;
}

export default function DialogoConflicto({ quien, conflictos, etiquetas, formatear, guardando, onGuardar, onCancelar }: Props) {
  const id = useId();
  const [elecciones, setElecciones] = useState<Record<string, Eleccion>>(() => Object.fromEntries(conflictos.map((c) => [c.campo, 'mio' as Eleccion])));
  useBodyScrollLock(true);
  useCajonAccesible(true, `conflicto-${id}`, onCancelar);
  const mostrar = (campo: string, valor: unknown) => (formatear ? formatear(campo, valor) : valorEnTexto(valor));

  return (
    <div className={adminModalOverlay}>
      <div className="fixed inset-0" onClick={onCancelar} aria-hidden="true" />
      <div id={`conflicto-${id}`} role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`} className={`${adminModalPanel} relative z-10 my-auto max-w-lg p-5 sm:p-6`}>
        <h2 id={`${id}-titulo`} className="text-lg font-bold text-ink">{quien} y tú cambiaron lo mismo</h2>
        <p className="mt-1 text-sm text-muted">
          Lo demás que cambió cada uno ya se combinó. {conflictos.length === 1 ? 'En este campo' : 'En estos campos'} los dos escribieron algo distinto: elige cuál queda.
        </p>

        <ul className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {conflictos.map((c) => (
            <li key={c.campo}>
              <fieldset>
                <legend className="text-sm font-semibold text-ink">{etiquetas[c.campo] ?? c.campo}</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {([['mio', 'Tu cambio', c.mio], ['suyo', `Lo de ${quien}`, c.suyo]] as const).map(([valor, titulo, contenido]) => (
                    <label key={valor} className={`flex min-h-12 cursor-pointer items-start gap-2 rounded-xl border-2 p-3 text-sm ${elecciones[c.campo] === valor ? 'border-brand-500 bg-brand-50' : 'border-line bg-white hover:border-brand-200'}`}>
                      <input
                        type="radio"
                        name={`${id}-${c.campo}`}
                        checked={elecciones[c.campo] === valor}
                        onChange={() => setElecciones((previas) => ({ ...previas, [c.campo]: valor }))}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-muted">{titulo}</span>
                        <span className="block font-medium text-ink [overflow-wrap:anywhere]">{mostrar(c.campo, contenido)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancelar} disabled={guardando} className={adminSecondaryButton}>Cancelar y revisar</button>
          <button type="button" onClick={() => onGuardar(elecciones)} disabled={guardando} className={adminPrimaryButton}>{guardando ? 'Guardando…' : 'Guardar combinado'}</button>
        </div>
      </div>
    </div>
  );
}
