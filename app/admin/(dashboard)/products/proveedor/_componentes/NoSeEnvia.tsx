'use client';

import { useState } from 'react';
import { IconoBloqueado, IconoCargando } from '@/components/iconos';
import { adminHint, adminInput, adminSecondaryButton } from '@/lib/admin-ui';
import { NO_SE_ENVIA_BASE, esLaDeSiempre, terminosDesdeTexto } from '@/lib/proveedores/no-se-envia';

/**
 * C-204: la lista de lo que ZOOM y MRW no llevan, del proveedor elegido. Lo que la trae en su nombre se marca en la vista
 * previa y no se crea. Se guarda con el proveedor (como el descuento); vacía o igual a la de siempre, vale la de siempre.
 */
export default function NoSeEnvia({ terminos, guardada, marcados, guardando, onCambiar, onGuardar }: {
  terminos: readonly string[];
  /** La que está guardada, para saber si hay cambios */
  guardada: readonly string[];
  /** Cuántas filas de la lista cargada no se envían */
  marcados: number | null;
  guardando: boolean;
  onCambiar: (terminos: string[]) => void;
  onGuardar: () => void;
}) {
  const [texto, setTexto] = useState(() => terminos.join('\n'));
  const cambiada = terminos.join('\n') !== guardada.join('\n');
  const deSiempre = esLaDeSiempre(terminos);

  return (
    <details className="rounded-xl border border-line p-3">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <IconoBloqueado className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
        <span className="font-semibold text-ink">Lo que no se envía por ZOOM ni MRW</span>
        <span className="text-muted">
          · {terminos.length} {terminos.length === 1 ? 'palabra' : 'palabras'}{deSiempre ? ' (la lista de siempre)' : ''}
          {marcados !== null && ` · ${marcados} de esta lista no se ${marcados === 1 ? 'crea' : 'crean'}`}
          {cambiada && ' · sin guardar'}
        </span>
      </summary>
      <div className="mt-3 space-y-2">
        <p className={adminHint}>
          Pinturas, solventes, aerosoles, pegas con solvente y gas. Lo que trae una de estas palabras enteras en su nombre (el de su lista o el de la tienda) no se crea. Una por línea; las abreviaturas de su sistema también (&quot;esm&quot; es esmalte; &quot;esmeril&quot; no cae).
        </p>
        <label htmlFor="no-se-envia" className="sr-only">Palabras de lo que no se envía</label>
        <textarea
          id="no-se-envia"
          rows={6}
          value={texto}
          onChange={(e) => { setTexto(e.target.value); onCambiar(terminosDesdeTexto(e.target.value)); }}
          className={`${adminInput()} min-h-32 font-mono text-xs`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onGuardar} disabled={guardando || !cambiada} className={adminSecondaryButton}>
            {guardando && <IconoCargando className="h-4 w-4 animate-spin" aria-hidden="true" />} Guardar la lista
          </button>
          {!deSiempre && (
            <button
              type="button"
              onClick={() => { setTexto(NO_SE_ENVIA_BASE.join('\n')); onCambiar([...NO_SE_ENVIA_BASE]); }}
              className="min-h-11 px-2 text-sm font-semibold text-brand-600 hover:underline"
            >
              Volver a la de siempre
            </button>
          )}
        </div>
      </div>
    </details>
  );
}
