import { IconoCandado, IconoDocumento } from '@/components/iconos';
import { adminBadge, adminDato } from '@/lib/admin-ui';
import { nombreDeAccion, type ReglaIa } from '@/lib/ia/reglas';
import { veces } from './tipos';

// C-288: una regla en una lista: su placa (azul si la tienda la comprueba, gris si va en las instrucciones), lo que dice y un
// ejemplo, el sello de lo que hace la tienda y, si la tienda la aplicó, cuántas veces en el mes.

export default function FilaRegla({ regla, vecesEnElMes, mes }: { regla: ReglaIa; vecesEnElMes?: number; mes?: string }) {
  const deLaTienda = regla.capa === 'tienda';
  const Icono = deLaTienda ? IconoCandado : IconoDocumento;
  // Lo que queda para revisar es lo que alguien tiene que mirar: el sello del azul oscuro del logo. El resto de lo que hace la tienda, azul
  const sello = !deLaTienda ? adminDato : adminBadge(regla.accion === 'marca' ? 'warning' : 'brand');
  return (
    <li className="flex flex-wrap items-start gap-3 border-t border-line py-3 first:border-t-0 sm:flex-nowrap">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${deLaTienda ? 'bg-brand-500 text-white' : 'bg-surface text-muted'}`}>
        <Icono className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{regla.texto}</p>
        <p className="mt-0.5 max-w-prose text-xs text-muted">{regla.ejemplo}</p>
      </div>
      <div className="flex w-full shrink-0 flex-row items-center gap-2 pl-11 sm:w-auto sm:flex-col sm:items-end sm:gap-1 sm:pl-0">
        <span className={sello}>{nombreDeAccion(regla)}</span>
        {deLaTienda && vecesEnElMes !== undefined && (
          <span className="text-xs text-muted">{veces(vecesEnElMes)}{mes ? ` en ${mes.split(' de ')[0]}` : ''}</span>
        )}
      </div>
    </li>
  );
}
