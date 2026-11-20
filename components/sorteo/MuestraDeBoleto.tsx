'use client';

// C-297 (el equipo, 18/11, mirando /sorteo sin cuenta: "está solo y es muy simple y desordenado"): al lado de "Cómo
// participar", el boleto que le espera a quien todavía no tiene cuenta. Es el boleto épico de verdad (C-263), con el premio
// y un correo de muestra, en la pila de los que da una compra de la mínima; debajo, lo que da cada camino en tres líneas
// con su ícono y el botón para crear la cuenta.
import { useMemo } from 'react';
import Link from 'next/link';
import { IconoCalendario, IconoCarrito, IconoEstrella } from '@/components/iconos';
import BoletoEpico from '@/components/sorteo/BoletoEpico';
import { dibujoDelSorteo } from '@/components/sorteo/MisBoletos';
import type { MisBoletosPublicos } from '@/lib/dto/sorteo';
import type { BoletoParaDibujar } from '@/lib/sorteo/dibujo';

/**
 * C-302: el boleto de muestra solo, en la pila de los que da una compra de la mínima, con su número. Lo usan "Así se ve tu
 * boleto" de /sorteo y la invitación de Mi panel (con el correo tapado del cliente: así se verá el suyo).
 */
export function BoletoDeMuestra({ sorteo, minimo, porCompra, correo = 'tu***@correo.com', className = '' }: {
  sorteo: MisBoletosPublicos['sorteo'];
  minimo: string;
  porCompra: number;
  correo?: string;
  className?: string;
}) {
  const dibujo = useMemo(() => dibujoDelSorteo(sorteo, correo), [sorteo, correo]);
  const boleto: BoletoParaDibujar = { codigo: 'TUS-UER', tipo: 'compra', origen: `Compra de ${minimo}`, n: 1, total: porCompra, cantidad: porCompra };
  return (
    <div className={`relative ${className}`}>
      {porCompra > 1 && (
        <>
          <span aria-hidden="true" className="absolute inset-x-5 -bottom-3 top-3 rounded-2xl bg-brand-700/25" />
          <span aria-hidden="true" className="absolute inset-x-2.5 -bottom-1.5 top-1.5 rounded-2xl bg-brand-700/50" />
        </>
      )}
      <div className="relative">
        <BoletoEpico boleto={boleto} sorteo={dibujo} foto={sorteo.imagen} />
      </div>
      {porCompra > 1 && (
        <span className="absolute -right-1.5 -top-2.5 rounded-full bg-brand-500 px-2.5 py-0.5 text-sm font-bold text-white shadow ring-2 ring-white">
          {porCompra}<span className="sr-only"> boletos</span>
        </span>
      )}
    </div>
  );
}

export default function MuestraDeBoleto({ sorteo, minimo, porCompra, estrella, resultado, registro }: {
  sorteo: MisBoletosPublicos['sorteo'];
  /** "$5" */
  minimo: string;
  /** Los boletos de una compra de la mínima */
  porCompra: number;
  /** Los boletos de más del producto estrella de esta semana, o null */
  estrella: number | null;
  /** "20 de diciembre" */
  resultado: string;
  /** /registro, con la vuelta a /sorteo */
  registro: string;
}) {
  return (
    <section aria-labelledby="muestra-boleto" className="rounded-2xl border border-line bg-white p-5">
      <h2 id="muestra-boleto" className="text-lg font-semibold text-ink">Así se ve tu boleto</h2>
      <p className="mt-0.5 text-sm text-ink-soft">Con tu correo y un código propio.</p>
      <BoletoDeMuestra sorteo={sorteo} minimo={minimo} porCompra={porCompra} className="mt-5" />
      <ul className="iconos-marca mt-7 space-y-2.5 text-sm text-ink">
        <li className="flex items-center gap-2.5">
          <IconoCarrito className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <span>Compra de {minimo}: <strong className="font-semibold">{porCompra} {porCompra === 1 ? 'boleto' : 'boletos'}</strong></span>
        </li>
        {estrella && (
          <li className="flex items-center gap-2.5">
            <IconoEstrella className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <span>Producto estrella: <strong className="font-semibold">+{estrella}</strong> por cada uno</span>
          </li>
        )}
        <li className="flex items-center gap-2.5">
          <IconoCalendario className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <span>Ganador el {resultado}</span>
        </li>
      </ul>
      <Link
        href={registro}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        Crear mi cuenta gratis
      </Link>
    </section>
  );
}
