import { FiPackage, FiTruck } from 'react-icons/fi';
import { adminCard } from '@/lib/admin-ui';
import { LogoEmpresa } from './LogoEmpresa';

/**
 * Caja de envíos del carrito y del checkout (C-106). Antes eran dos copias que ya decían cosas distintas.
 * Solo promete lo que la tienda cumple: cobro a destino, embalaje y guía de rastreo (C-100).
 * "100% asegurada" se quitó: con cobro a destino el seguro depende del valor que se declare en la guía.
 */
export function ConfianzaEnvio() {
  return (
    <section className={`${adminCard} space-y-4`} aria-labelledby="confianza-envio-titulo">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3 id="confianza-envio-titulo" className="text-xs font-bold uppercase tracking-wider text-muted">
          Envíos a toda Venezuela
        </h3>
        <div className="flex items-center gap-3">
          <LogoEmpresa empresa="ZOOM" className="h-5" />
          <LogoEmpresa empresa="MRW" className="h-4" />
        </div>
      </div>
      <ul className="space-y-3">
        <li className="flex items-start gap-3 text-xs">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/10">
            <FiTruck className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-semibold text-ink">ZOOM y MRW con cobro a destino</span>
            <span className="block text-muted">
              Aquí pagas el embalaje; el flete se lo pagas a la empresa al retirar. Si tu pedido tiene envío gratis, la tienda paga todo.
            </span>
          </span>
        </li>
        <li className="flex items-start gap-3 text-xs">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/10">
            <FiPackage className="h-3.5 w-3.5 text-success-strong" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-semibold text-ink">Embalaje reforzado y guía de rastreo</span>
            <span className="block text-muted">
              Cada pedido sale embalado para el viaje y con su número de guía para seguirlo desde Mis pedidos.
            </span>
          </span>
        </li>
      </ul>
    </section>
  );
}
