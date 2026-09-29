import { FiCheck } from 'react-icons/fi';
import type { PasoPedido } from '@/lib/order-pasos';

// Stepper horizontal de un pedido (C-128): Confirmado → En preparación → Despachado a ZOOM → Listo para retiro.
// Cabe a 360 px: 3 o 4 pasos en columnas iguales, con la etiqueta debajo en dos líneas como mucho.

const COLUMNAS: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };

export default function OrderStepper({ pasos }: { pasos: PasoPedido[] }) {
  return (
    <ol className={`grid ${COLUMNAS[pasos.length] ?? 'grid-cols-4'}`}>
      {pasos.map((paso, i) => {
        const hecho = paso.estado === 'hecho';
        const actual = paso.estado === 'actual';
        return (
          <li key={paso.label} className="relative flex flex-col items-center text-center" aria-current={actual ? 'step' : undefined}>
            {/* Línea hacia el paso siguiente: llena si este ya se hizo */}
            {i < pasos.length - 1 && (
              <span className={`absolute left-1/2 top-3 h-0.5 w-full ${hecho ? 'bg-brand-500' : 'bg-line'}`} aria-hidden="true" />
            )}
            <span
              className={`relative flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                hecho ? 'bg-brand-500 text-white' : actual ? 'bg-white text-brand-600 ring-2 ring-brand-500' : 'bg-white text-muted ring-1 ring-line-strong'
              }`}
            >
              {hecho ? <FiCheck className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
            </span>
            <span className={`mt-1.5 px-0.5 text-xs leading-tight ${actual ? 'font-semibold text-ink' : hecho ? 'text-ink-soft' : 'text-muted'}`}>
              {paso.label}
              <span className="sr-only">{hecho ? ' (hecho)' : actual ? ' (en curso)' : ' (pendiente)'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
