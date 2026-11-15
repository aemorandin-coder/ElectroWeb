'use client';

import { useMemo } from 'react';
import { IconoAdvertencia } from '@/components/iconos';
import { proponedorDeNombres, revisarNombre } from '@/lib/nombres/producto';

// C-202: debajo del nombre del producto. Si está casi todo en mayúsculas o trae abreviaturas de una lista de proveedor
// ("P/", "PERIF"), avisa y muestra cómo queda con la regla de la tienda: escrito normal, con siglas, unidades y marcas
// como se escriben. El botón solo lo copia al campo; el equipo lo revisa antes de guardar.
export default function AvisoNombre({ nombre, marcas = [], onUsar }: {
  nombre: string;
  /** Las marcas de la tienda, para escribirlas como están cargadas */
  marcas?: readonly string[];
  onUsar: (nuevo: string) => void;
}) {
  const proponer = useMemo(() => proponedorDeNombres(marcas, { conservarDudas: false }), [marcas]);
  const revision = revisarNombre(nombre);
  if (!revision.mayusculas && revision.abreviaturas.length === 0) return null;
  const propuesta = proponer(nombre).nombre;
  if (!propuesta || propuesta === nombre.trim()) return null;

  const motivo = revision.mayusculas
    ? 'Está en mayúsculas.'
    : `Tiene ${revision.abreviaturas.length === 1 ? 'una abreviatura' : 'abreviaturas'}: ${revision.abreviaturas.join(', ')}.`;
  return (
    <div role="status" className="mt-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
      <p className="flex items-start gap-1.5">
        <IconoAdvertencia className="h-7 w-7 shrink-0 rounded-lg bg-brand-950 p-1.5 text-accent" aria-hidden="true" />
        <span>{motivo} En la tienda los nombres van escritos normal, con las siglas y las marcas como se escriben:</span>
      </p>
      <p className="mt-1.5 break-words pl-5 font-medium text-ink">{propuesta}</p>
      <div className="mt-2 pl-5">
        <button type="button" onClick={() => onUsar(propuesta)} className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink hover:bg-surface">
          Usar este nombre
        </button>
        <span className="ml-2 text-xs text-ink-soft">Revísalo: puedes corregirlo después.</span>
      </div>
    </div>
  );
}
