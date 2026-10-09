'use client';

import { useCallback, useState, type ReactNode } from 'react';
import DialogoConflicto, { valorEnTexto, type ConflictoCampo, type Eleccion } from '@/components/admin/edicion/DialogoConflicto';
import { combinar } from './combinar';

// C-170: lo que hace un formulario cuando otra persona guardó antes. Se combina campo por campo (la base es como se abrió, "mío" es
// lo que hay escrito y "suyo" es lo que quedó en el servidor): si nadie tocó lo mismo, sigue solo; si los dos tocaron un campo, sale
// el cuadro para elegir. Para formularios planos (texto, números, interruptores). Los editores largos (productos) lo hacen a mano.

interface Pendiente {
  quien: string;
  conflictos: ConflictoCampo[];
  combinado: Record<string, unknown>;
  continuar: (final: Record<string, unknown>) => void | Promise<void>;
}

export function useConflictoDeFormulario(etiquetas: Record<string, string>, formatear?: (campo: string, valor: unknown) => string) {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [guardando, setGuardando] = useState(false);

  /** `continuar` recibe el formulario ya combinado; allí se vuelve a guardar con la versión nueva */
  const resolver = useCallback(<F extends object>(args: { base: F; mio: F; suyo: F; quien: string; continuar: (final: F) => void | Promise<void> }) => {
    const r = combinar(args.base, args.mio, args.suyo);
    const continuar = args.continuar as unknown as Pendiente['continuar'];
    if (r.conflictos.length === 0) {
      void continuar(r.combinado as Record<string, unknown>);
      return;
    }
    setPendiente({ quien: args.quien, conflictos: r.conflictos as unknown as ConflictoCampo[], combinado: r.combinado as Record<string, unknown>, continuar });
  }, []);

  const dialogo: ReactNode = pendiente ? (
    <DialogoConflicto
      quien={pendiente.quien}
      conflictos={pendiente.conflictos}
      etiquetas={etiquetas}
      formatear={formatear ?? ((_campo, valor) => valorEnTexto(valor))}
      guardando={guardando}
      onCancelar={() => setPendiente(null)}
      onGuardar={async (elecciones: Record<string, Eleccion>) => {
        const final = { ...pendiente.combinado };
        for (const c of pendiente.conflictos) if (elecciones[c.campo] === 'suyo') final[c.campo] = c.suyo;
        setGuardando(true);
        try {
          await pendiente.continuar(final);
        } finally {
          setGuardando(false);
          setPendiente(null);
        }
      }}
    />
  ) : null;

  return { resolver, dialogo };
}
