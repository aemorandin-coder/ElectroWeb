'use client';

// C-234: cuándo sale cada pedido (el equipo, 14/11, en 6 preguntas: PLAN.md §7.2). El corte de lunes a viernes, los
// feriados de Venezuela (que el equipo puede abrir) y los días cerrados de más. Abajo, el ejemplo con lo que está escrito
// (PLAN.md §1.9: se ve el resultado antes de guardar). Las reglas están en lib/horarios.

import { useState } from 'react';
import { IconoCalendario, IconoCerrar, IconoMas, IconoReloj } from '@/components/iconos';
import { adminDato, adminError, adminHint, adminInput, adminNotice, adminSecondaryButton } from '@/lib/admin-ui';
import { calendarioDe, diaSemanaDe, enVenezuela, fechaDeSalida, fechaLarga, feriadosDelAño, sumarDias } from '@/lib/horarios';
import { Field, SettingsCard } from './fields';
import type { SectionProps } from './settings-form';

/** "lunes 16 de noviembre" (sin el "el") */
const dia = (fecha: string) => fechaLarga(fecha).replace(/^el /, '');

export default function DespachosCard({ form, set, errors }: SectionProps) {
  const [nuevo, setNuevo] = useState('');
  const calendario = calendarioDe(form);
  const hoy = enVenezuela(new Date()).fecha;
  const año = Number(hoy.slice(0, 4));
  const feriados = [...feriadosDelAño(año), ...feriadosDelAño(año + 1)].filter((f) => f.fecha >= hoy).slice(0, 12);
  const cerrados = form.diasCerrados.filter((d) => d >= hoy);

  // El ejemplo: el próximo sábado a las 12:00, como lo dijo el equipo
  let sabado = sumarDias(hoy, 1);
  while (diaSemanaDe(sabado) !== 6) sabado = sumarDias(sabado, 1);
  const mediodia = new Date(`${sabado}T12:00:00-04:00`);
  const tienda = fechaDeSalida(mediodia, calendario);
  const proveedor = fechaDeSalida(mediodia, calendario, 1);

  const agregar = () => {
    if (!nuevo || nuevo < hoy || cerrados.includes(nuevo)) return;
    set('diasCerrados', [...cerrados, nuevo].sort());
    setNuevo('');
  };

  return (
    <SettingsCard
      title="Cuándo sale cada pedido"
      description="Lo que ve el cliente antes de comprar: «Compra en las próximas 2 h y sale hoy» o «Compra hoy y sale el lunes». Se despacha de lunes a viernes; lo de un proveedor sale un día hábil después."
    >
      <div className="max-w-3xl space-y-5">
        <Field label="Hora de corte" htmlFor="horaCorte" hint="Lo pagado antes de esta hora sale ese mismo día." error={errors.horaCorte}>
          <input
            id="horaCorte"
            type="time"
            value={form.horaCorte}
            onChange={(e) => set('horaCorte', e.target.value)}
            className={`${adminInput(Boolean(errors.horaCorte))} w-36`}
          />
        </Field>

        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink"><IconoCalendario className="h-4 w-4 text-brand-600" aria-hidden="true" /> Feriados que vienen</p>
          <p className={adminHint}>Esos días no se despacha. Si la tienda abre uno, márcalo.</p>
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
            {feriados.map((f) => {
              const abierto = form.diasAbiertos.includes(f.fecha);
              return (
                <li key={f.fecha} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium text-ink">{dia(f.fecha)}</span>
                    <span className="text-muted"> · {f.nombre}{f.costumbre ? ' (la tienda cierra por costumbre)' : ''}</span>
                  </span>
                  <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-ink-soft">
                    <input
                      type="checkbox"
                      checked={abierto}
                      onChange={(e) => set('diasAbiertos', e.target.checked ? [...form.diasAbiertos, f.fecha].sort() : form.diasAbiertos.filter((d) => d !== f.fecha))}
                      className="h-4 w-4 accent-brand-600"
                    />
                    Abre
                  </label>
                </li>
              );
            })}
          </ul>
          {errors.diasAbiertos && <p className={adminError} role="alert">{errors.diasAbiertos}</p>}
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">Otros días cerrados</p>
          <p className={adminHint}>Un inventario, un viaje: lo pagado ese día se corre al siguiente día hábil.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input type="date" value={nuevo} min={hoy} onChange={(e) => setNuevo(e.target.value)} aria-label="Día cerrado" className={`${adminInput(false)} w-44`} />
            <button type="button" onClick={agregar} disabled={!nuevo || nuevo < hoy || cerrados.includes(nuevo)} className={adminSecondaryButton}>
              <IconoMas className="h-4 w-4" aria-hidden="true" /> Agregar
            </button>
          </div>
          {cerrados.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Días cerrados">
              {cerrados.map((d) => (
                <li key={d} className={`${adminDato} gap-1.5 py-1`}>
                  {dia(d)}
                  <button type="button" onClick={() => set('diasCerrados', cerrados.filter((x) => x !== d))} aria-label={`Quitar el ${dia(d)}`} className="rounded-full p-0.5 hover:bg-line">
                    <IconoCerrar className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {errors.diasCerrados && <p className={adminError} role="alert">{errors.diasCerrados}</p>}
        </div>

        <p className={`${adminNotice('brand')} flex items-start gap-2`}>
          <IconoReloj className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Así se ve: si alguien paga el {dia(sabado)} a las 12:00, lo de la tienda sale el {dia(tienda)} y lo de un proveedor, el {dia(proveedor)}.
          </span>
        </p>
      </div>
    </SettingsCard>
  );
}
