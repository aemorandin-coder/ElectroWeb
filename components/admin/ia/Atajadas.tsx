import { IconoCandado } from '@/components/iconos';
import { PLANTILLA_IMPORTAR, infoDeUso } from '@/lib/ia/reglas';
import type { AtajadaReciente } from '@/lib/ia/consumo';
import { ICONOS_DE_USO } from './iconos';
import { cuando } from './tipos';

// C-288 · Lo que atajaron las reglas: cada vez que la tienda cambió o frenó lo que respondió Claude, con lo que traía. Datos reales
// de IaAtajada; sin nada, el estado vacío dice qué saldría aquí.

/** Qué hizo la tienda, en una frase: lo que traía y lo que quedó */
export function queHizo(a: { accion: string; antes: string; despues: string | null }): string {
  if (a.accion === 'cambia') return `Cambió «${a.antes}»${a.despues ? ` por «${a.despues}»` : ''}`;
  if (a.accion === 'pide') return `Le pidió otra vez a la IA: traía «${a.antes}»`;
  if (a.accion === 'marca') return `Quedó para revisar: ${a.antes}`;
  return `Quitó «${a.antes}»`;
}

export default function Atajadas({ atajadas, limite }: { atajadas: AtajadaReciente[]; limite?: number }) {
  if (atajadas.length === 0) {
    return (
      <div className="flex items-center gap-3 py-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <IconoCandado className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">Todavía no atajaron nada</p>
          <p className="text-xs text-muted">Aquí sale cada vez que una regla cambie o frene una respuesta.</p>
        </div>
      </div>
    );
  }
  return (
    <ul>
      {atajadas.slice(0, limite).map((a) => {
        const uso = infoDeUso(a.uso);
        const Icono = ICONOS_DE_USO[uso?.icono ?? PLANTILLA_IMPORTAR.icono];
        return (
          <li key={a.id} className="flex items-start gap-3 border-t border-line py-3 first:border-t-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icono className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink [overflow-wrap:anywhere]">{queHizo(a)}</p>
              <p className="text-xs text-muted">{[uso?.nombre ?? PLANTILLA_IMPORTAR.nombre, a.referencia, cuando(a.cuando)].filter(Boolean).join(' · ')}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
