'use client';

// C-260 (el kit de onboarding en más lugares; C-258 midió que "Agregar" no ofrecía "Ver carrito" y que en la computadora el
// carrito era un menú que nadie encontraba): al agregar, el aviso dice "¡Listo! Ya está en tu carrito" con el carrito que
// llega rodando y el botón "Ver carrito", y el carrito del header salta una vez, para que se vea dónde quedó.
// Un solo aviso a la vez: agregar dos cosas seguidas cambia el texto, no apila avisos.
import Link from 'next/link';
import toast from 'react-hot-toast';
import { IconoCarrito, IconoFlechaDerecha } from '@/components/iconos';
import IconoDibujado from '@/components/onboarding/IconoDibujado';
import { prefiereMenosMovimiento } from '@/lib/motion/resorte';

export function avisarAgregado(detalle?: string) {
  toast.custom(
    (t) => (
      <div
        role="status"
        className={`pointer-events-auto flex w-[min(22rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-lg transition-opacity duration-200 ${
          t.visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-500 text-white">
          <IconoDibujado key={t.id + (detalle ?? '')} Icono={IconoCarrito} accion="carrito" className="h-6 w-6" retraso={0.05} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">¡Listo! Ya está en tu carrito</span>
          {detalle && <span className="block truncate text-xs text-muted">{detalle}</span>}
        </span>
        <Link
          href="/carrito"
          onClick={() => toast.dismiss(t.id)}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg bg-brand-50 px-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          Ver carrito
          <IconoFlechaDerecha className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    ),
    { id: 'agregado-al-carrito', duration: 4500 }
  );

  // Los carritos a la vista saltan una vez: el del header y, en el teléfono, el de la barra de abajo (el de arriba queda
  // debajo del aviso)
  if (prefiereMenosMovimiento()) return;
  for (const carrito of document.querySelectorAll<HTMLElement>('[data-tour="carrito"]')) {
    const r = carrito.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > window.innerHeight) continue;
    carrito.animate(
      [
        { transform: 'none' },
        { transform: 'translateY(-6px) scale(1.12)', offset: 0.35 },
        { transform: 'translateY(1px) scale(0.97)', offset: 0.65 },
        { transform: 'none' },
      ],
      { duration: 600, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' }
    );
  }
}
