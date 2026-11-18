'use client';

// C-297 (el equipo, 18/11: "mejorar la parte de preguntas, diseño animado un poco más discreto", y "mucho scroll"): las
// preguntas del sorteo en una sola tarjeta con líneas entre ellas, el ícono chico y sin placa, y una abierta a la vez.
// - Al abrir, la respuesta se despliega (de 0 a su alto) y aparece; el "+" gira y queda como "×". Con "reducir
//   movimiento", abre y cierra sin moverse.
// - En la computadora, dos columnas dentro de la misma tarjeta.
// - Cada pregunta es un botón con aria-expanded y su respuesta, una región; cerrada, la respuesta es inerte (no se enfoca
//   ni la lee el lector de pantalla), pero está en la página para los buscadores.
import { useId, useState, type ReactNode } from 'react';
import { IconoMas } from '@/components/iconos';

export interface PreguntaSorteo {
  id: string;
  /** El ícono ya dibujado (un componente no puede viajar del servidor a esta pieza) */
  icono: ReactNode;
  pregunta: string;
  respuesta: ReactNode;
}

function Pregunta({ p, abierta, alTocar }: { p: PreguntaSorteo; abierta: boolean; alTocar: () => void }) {
  const base = useId();
  const boton = `${base}-boton`;
  const panel = `${base}-panel`;
  return (
    <li>
      <h3>
        <button
          type="button" id={boton} aria-expanded={abierta} aria-controls={panel} onClick={alTocar}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-50/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 motion-reduce:transition-none lg:px-5"
        >
          <span className={`iconos-marca flex h-5 w-5 shrink-0 items-center justify-center transition-colors motion-reduce:transition-none ${abierta ? 'text-brand-600' : 'text-muted'}`}>{p.icono}</span>
          <span className={`flex-1 text-[15px] font-semibold leading-snug transition-colors motion-reduce:transition-none ${abierta ? 'text-brand-700' : 'text-ink'}`}>{p.pregunta}</span>
          <IconoMas
            className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none ${abierta ? 'rotate-45 text-brand-600' : 'text-muted'}`}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        id={panel} role="region" aria-labelledby={boton} inert={!abierta}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${abierta ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <p className="pb-4 pl-12 pr-4 text-sm leading-relaxed text-ink-soft lg:pl-[3.25rem] lg:pr-5">{p.respuesta}</p>
        </div>
      </div>
    </li>
  );
}

export default function AcordeonPreguntas({ preguntas }: { preguntas: PreguntaSorteo[] }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const mitad = Math.ceil(preguntas.length / 2);
  const columnas = [preguntas.slice(0, mitad), preguntas.slice(mitad)];
  return (
    <div className="mt-4 grid grid-cols-1 overflow-hidden rounded-2xl border border-line bg-white lg:grid-cols-2">
      {columnas.map((columna, c) => (
        <ul key={c} className={`divide-y divide-line ${c === 1 ? 'border-t border-line lg:border-l lg:border-t-0' : ''}`}>
          {columna.map((p) => (
            <Pregunta key={p.id} p={p} abierta={abierta === p.id} alTocar={() => setAbierta((a) => (a === p.id ? null : p.id))} />
          ))}
        </ul>
      ))}
    </div>
  );
}
