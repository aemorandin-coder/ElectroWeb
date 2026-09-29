import Link from 'next/link';
import { FiInfo, FiShield } from 'react-icons/fi';
import type { PublicCondition } from '@/lib/dto/product';

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('es-VE')} ${n === 1 ? one : many}`;

/**
 * C-119: aviso junto al nombre de un producto que no es nuevo. Va antes del precio: el cliente sabe qué compra
 * antes de ver cuánto cuesta.
 */
export function ConditionNotice({ condition }: { condition: PublicCondition }) {
  return (
    <div className="mt-3 rounded-xl border border-line bg-surface p-3 text-sm">
      <p className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-ink px-1.5 py-0.5 text-xs font-semibold tracking-wide text-white">{condition.badge.toUpperCase()}</span>
        {condition.gradeDefinition && <span className="text-ink-soft">{condition.gradeDefinition}</span>}
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-ink-soft">
        <FiShield className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        Garantía de la tienda: {plural(condition.warrantyDays, 'día', 'días')}.{' '}
        <a href="#estado" className="font-semibold text-brand-700 hover:underline">
          Ver el estado del equipo
        </a>
      </p>
    </div>
  );
}

/** C-119: el estado completo del equipo, como en la ficha de un reacondicionado de Amazon */
export default function ConditionDetails({ condition }: { condition: PublicCondition }) {
  const rows: [string, string][] = [
    ['Condición', condition.label],
    ...(condition.gradeLabel ? ([['Estado estético', `${condition.gradeLabel}: ${condition.gradeDefinition}`]] as [string, string][]) : []),
    ...(condition.packaging ? ([['Empaque', condition.packaging]] as [string, string][]) : []),
    ...(condition.includedItems ? ([['Incluye', condition.includedItems]] as [string, string][]) : []),
    ...(condition.missingItems ? ([['No incluye', condition.missingItems]] as [string, string][]) : []),
    ...(condition.usageHours !== null ? ([['Horas de uso', plural(condition.usageHours, 'hora', 'horas')]] as [string, string][]) : []),
    ...(condition.batteryHealth !== null ? ([['Salud de la batería', `${condition.batteryHealth} %`]] as [string, string][]) : []),
    ...(condition.cosmeticNotes ? ([['Detalles', condition.cosmeticNotes]] as [string, string][]) : []),
    ...(condition.testNotes ? ([['Pruebas hechas', condition.testNotes]] as [string, string][]) : []),
    ['Garantía de la tienda', `${plural(condition.warrantyDays, 'día', 'días')} por fallas de funcionamiento`],
  ];
  return (
    <section id="estado" aria-labelledby="estado-title" className="scroll-mt-28 rounded-2xl border border-line bg-white p-4 lg:col-span-12 lg:p-6">
      <h2 id="estado-title" className="text-lg font-bold text-ink lg:text-xl">
        Estado de este equipo
      </h2>
      <p className="mt-1 text-sm text-muted">Las fotos son de esta unidad. Lo que ves es lo que recibes.</p>
      <dl className="mt-3 divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-1 gap-1 py-2.5 text-sm sm:grid-cols-3 sm:gap-3">
            <dt className="text-muted">{label}</dt>
            <dd className="whitespace-pre-line font-medium text-ink sm:col-span-2">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 flex gap-2 rounded-xl bg-surface p-3 text-xs text-ink-soft">
        <FiInfo className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          La garantía la da la tienda: cubre fallas de funcionamiento, no el desgaste descrito aquí ni daños posteriores a la entrega. No hay devoluciones por
          cambio de opinión. Detalles en los{' '}
          <Link href="/terminos#usados" className="font-semibold text-brand-700 hover:underline">
            términos y condiciones
          </Link>
          .
        </span>
      </p>
    </section>
  );
}
