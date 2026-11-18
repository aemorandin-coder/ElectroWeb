import { IconoCandado, IconoChevronDerecha, IconoDocumento } from '@/components/iconos';
import { adminCard, adminDato } from '@/lib/admin-ui';
import { esGeneral, PLANTILLA_IMPORTAR, REGLAS_IA, reglasDe, USOS_IA, type UsoRegla } from '@/lib/ia/reglas';
import Atajadas from './Atajadas';
import FilaRegla from './FilaRegla';
import FrasesEditables from './FrasesEditables';
import { ICONOS_DE_USO } from './iconos';
import type { DatosIa } from './tipos';

// C-288 · Las reglas: las dos capas explicadas, las que valen en varios usos, las frases que nunca van (editables), las de cada uso
// en su desplegable y, al lado, lo que atajaron. Las reglas viven en lib/ia/reglas.ts (la misma lista que usa el servidor).

export default function Reglas({ datos, alGuardar }: { datos: DatosIa; alGuardar: () => Promise<void> }) {
  const { consumo } = datos;
  const mes = consumo.mes;
  const generales = REGLAS_IA.filter(esGeneral);
  const grupos: Array<{ id: UsoRegla; nombre: string; icono: keyof typeof ICONOS_DE_USO }> = [
    ...USOS_IA.map((u) => ({ id: u.id as UsoRegla, nombre: u.nombre, icono: u.icono })),
    { id: 'plantilla', nombre: PLANTILLA_IMPORTAR.nombre, icono: PLANTILLA_IMPORTAR.icono },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 @xl:grid-cols-2">
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white"><IconoCandado className="h-4 w-4" aria-hidden="true" /></span>
          <div>
            <p className="text-sm font-semibold text-ink">La tienda lo comprueba</p>
            <p className="text-xs text-muted">En cada respuesta, antes de que llegue al producto o al cliente. La IA no puede saltársela, aunque cambien sus instrucciones.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-muted"><IconoDocumento className="h-4 w-4" aria-hidden="true" /></span>
          <div>
            <p className="text-sm font-semibold text-ink">En las instrucciones, fija</p>
            <p className="text-xs text-muted">La IA la recibe siempre, debajo de lo que escribe el equipo. No se borra desde aquí.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] @3xl:items-start">
        <div className="min-w-0 space-y-4">
          <section className={adminCard}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-base font-semibold text-ink">Para varios usos</h4>
              <span className="text-xs text-muted">{generales.length} reglas</span>
            </div>
            <ul className="mt-1">
              {generales.map((r) => <FilaRegla key={r.id} regla={r} vecesEnElMes={consumo.atajadas.porRegla[r.id] ?? 0} />)}
            </ul>
          </section>

          <section className={adminCard}>
            <h4 className="text-base font-semibold text-ink">Frases que nunca van en lo que se publica</h4>
            <p className="mb-3 mt-0.5 max-w-prose text-sm text-muted">Si una aparece en una descripción, un nombre, un correo o una respuesta, la tienda quita la oración entera. Agrega las que veas.</p>
            <FrasesEditables datos={datos} alGuardar={alGuardar} />
          </section>

          {grupos.map((g, i) => {
            const propias = reglasDe(g.id).filter((r) => !esGeneral(r));
            const Icono = ICONOS_DE_USO[g.icono];
            return (
              <details key={g.id} open={i === 0} className={`${adminCard} group`}>
                <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icono className="h-4 w-4" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1 text-[15px] font-semibold text-ink">{g.nombre}</span>
                  <span className={adminDato}>{propias.length} propias</span>
                  <IconoChevronDerecha className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
                </summary>
                <ul className="mt-2">
                  {propias.map((r) => <FilaRegla key={r.id} regla={r} vecesEnElMes={consumo.atajadas.porRegla[r.id] ?? 0} />)}
                </ul>
              </details>
            );
          })}
        </div>

        {/* Al lado de una lista larga, se queda a la vista mientras se baja por ella */}
        <section className={`${adminCard} @3xl:sticky @3xl:top-22`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-base font-semibold text-ink">Lo que atajaron</h4>
            <span className="text-xs text-muted">{consumo.atajadas.totalMes} en {mes.split(' de ')[0]}</span>
          </div>
          {consumo.atajadas.ultimas.length > 0 && <p className="mt-0.5 text-xs text-muted">Cada vez que una regla cambia o frena una respuesta, queda aquí con lo que traía.</p>}
          <div className="mt-2" />
          <div className="max-h-[32rem] overflow-y-auto">
            <Atajadas atajadas={consumo.atajadas.ultimas} />
          </div>
        </section>
      </div>
    </div>
  );
}
