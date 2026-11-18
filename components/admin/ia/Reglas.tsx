import { IconoCandado, IconoDocumento } from '@/components/iconos';
import Plegable from '@/components/admin/Plegable';
import { adminCard, adminDato } from '@/lib/admin-ui';
import { esGeneral, PLANTILLA_IMPORTAR, REGLAS_IA, reglasDe, USOS_IA, type UsoRegla } from '@/lib/ia/reglas';
import FilaRegla from './FilaRegla';
import FrasesEditables from './FrasesEditables';
import { ICONOS_DE_USO } from './iconos';
import type { DatosIa } from './tipos';

// C-288 · Las reglas: las dos capas explicadas, las que valen en varios usos, las frases que nunca van (editables), las de cada uso
// en su desplegable y, al lado, lo que atajaron. Las reglas viven en lib/ia/reglas.ts (la misma lista que usa el servidor).
// C-298: "Lo que atajaron" pasó a Consumo y fallas (es una cifra del mes); las de cada uso, plegadas con cuántas veces atajaron.

export default function Reglas({ datos, alGuardar }: { datos: DatosIa; alGuardar: () => Promise<void> }) {
  const { consumo } = datos;
  const mes = consumo.mes.split(' de ')[0];
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

      <div className="grid gap-4 @4xl:grid-cols-2 @4xl:items-start">
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
      </div>

      <div>
        <h4 className="mb-2 text-base font-semibold text-ink">Las de cada uso</h4>
        <div className="grid gap-2.5 @4xl:grid-cols-2 @4xl:items-start">
          {grupos.map((g) => {
            const propias = reglasDe(g.id).filter((r) => !esGeneral(r));
            const atajadas = propias.reduce((n, r) => n + (consumo.atajadas.porRegla[r.id] ?? 0), 0);
            return (
              <Plegable
                key={g.id}
                id={`ia-reglas-${g.id}`}
                icono={ICONOS_DE_USO[g.icono]}
                titulo={g.nombre}
                resumen={atajadas > 0 ? `Atajaron ${atajadas} ${atajadas === 1 ? 'vez' : 'veces'} en ${mes}.` : `Sin atajadas en ${mes}.`}
                extra={<span className={adminDato}>{propias.length} propias</span>}
              >
                <ul>
                  {propias.map((r) => <FilaRegla key={r.id} regla={r} vecesEnElMes={consumo.atajadas.porRegla[r.id] ?? 0} />)}
                </ul>
              </Plegable>
            );
          })}
        </div>
      </div>
    </div>
  );
}
