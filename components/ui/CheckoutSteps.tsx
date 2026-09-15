import { FiCheck, FiCreditCard, FiShoppingCart } from 'react-icons/fi';

const STEPS = [
  { label: 'Carrito', Icon: FiShoppingCart },
  { label: 'Pago', Icon: FiCreditCard },
  { label: 'Listo', Icon: FiCheck },
];

/** Pasos de la compra en el encabezado del carrito y del checkout (C-32). `current`: 0 carrito, 1 pago, 2 listo. */
export default function CheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Pasos de la compra">
      {STEPS.map(({ label, Icon }, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={active ? 'step' : undefined}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${
                active ? 'bg-brand-500 text-white' : done ? 'bg-white text-brand-700 ring-1 ring-brand-200' : 'bg-white text-muted ring-1 ring-line'
              }`}
            >
              {done ? <FiCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>{index + 1}. {label}</span>
            </span>
            {index < STEPS.length - 1 && <span className={`h-px w-4 sm:w-8 ${done ? 'bg-brand-300' : 'bg-line-strong'}`} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
