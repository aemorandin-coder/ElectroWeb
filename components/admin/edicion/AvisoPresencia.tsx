import { FiUsers } from 'react-icons/fi';
import type { PersonaEnLinea } from '@/lib/realtime/eventos';

// C-169: "Luis también está editando esto". Se pone arriba de cualquier editor que use useEdicionEnVivo.

function iniciales(nombre: string): string {
  return nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export default function AvisoPresencia({ otros, recurso = 'esto' }: { otros: PersonaEnLinea[]; recurso?: string }) {
  if (otros.length === 0) return null;
  const nombres = otros.map((o) => o.nombre);
  const quienes = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  return (
    <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700">
      <span className="flex shrink-0 -space-x-2" aria-hidden="true">
        {otros.slice(0, 3).map((o) => (
          <span key={o.id} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-500 text-xs font-semibold text-white">{iniciales(o.nombre)}</span>
        ))}
      </span>
      <p className="min-w-0 flex-1">
        <FiUsers className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
        <span className="font-semibold">{quienes}</span> {otros.length === 1 ? 'también está' : 'también están'} editando {recurso} ahora mismo.
        Si los dos guardan, se combinan los cambios y solo se pregunta por lo que ambos tocaron.
      </p>
    </div>
  );
}
