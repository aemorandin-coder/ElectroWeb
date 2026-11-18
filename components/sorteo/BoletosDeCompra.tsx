'use client';

// C-297 (Andrés, 18/11: "que la web venda mucho más"): cuántos boletos del sorteo da lo que el cliente está por comprar,
// dicho donde decide. Lee la escala y el producto estrella del contexto (app/layout.tsx); sin sorteo abierto no sale nada.
// Es solo para mostrar: los boletos de verdad los cuenta el servidor con la orden pagada (lib/sorteo/servidor.ts).
// - En la ficha (BoletosDelProducto): el producto estrella, destacado, con sus boletos de más; cualquier otro, una línea.
// - En el carrito (BoletosDelCarrito): "Esta compra te da 7 boletos", y cuánto falta para el próximo salto, con su barra.
import Link from 'next/link';
import { IconoCupon, IconoEstrella } from '@/components/iconos';
import { useSorteoCompra } from '@/contexts/SorteoCompraContext';
import { formatUSD } from '@/lib/currency';
import { boletosPorMonto, boletosTexto, montoCorto, proximoSalto } from '@/lib/sorteo/escala';

const ZONA = 'America/Caracas';
const diaCorto = (iso: string) => new Intl.DateTimeFormat('es-VE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ZONA }).format(new Date(iso));

/** En la ficha, debajo del precio. `subtotalUSD`: el precio por la cantidad elegida */
export function BoletosDelProducto({ productId, subtotalUSD, cantidad }: { productId: string; subtotalUSD: number; cantidad: number }) {
  const sorteo = useSorteoCompra();
  if (!sorteo) return null;
  const { regla, estrella } = sorteo;
  const porMonto = boletosPorMonto(subtotalUSD, regla);
  if (estrella && estrella.productId === productId) {
    const total = porMonto + estrella.boletos * cantidad;
    return (
      <div className="iconos-marca rounded-xl border border-brand-200 bg-brand-50 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
          <IconoEstrella className="h-4 w-4 shrink-0" aria-hidden="true" /> Producto estrella del sorteo
        </p>
        <p className="mt-1 text-sm text-ink">
          <span className="text-lg font-bold text-brand-700">+{estrella.boletos}</span> boletos por cada uno, además de los de tu compra.
          {' '}{cantidad === 1 ? 'Con uno' : `Con ${cantidad}`}, te da <strong className="font-semibold">{boletosTexto(total)}</strong>.
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Hasta el {diaCorto(estrella.hasta)}. <Link href="/sorteo" className="font-semibold text-brand-600 hover:underline">Ver el sorteo</Link>
        </p>
      </div>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-sm text-ink-soft">
      <IconoCupon className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
      {porMonto > 0
        ? <span>Con esta compra ganas <strong className="font-semibold text-ink">{boletosTexto(porMonto)}</strong> para el <Link href="/sorteo" className="font-semibold text-brand-600 hover:underline">sorteo</Link>.</span>
        : <span>Desde {montoCorto(regla.minimoUSD)} en tu compra, {boletosTexto(boletosPorMonto(regla.minimoUSD, regla))} para el <Link href="/sorteo" className="font-semibold text-brand-600 hover:underline">sorteo</Link>.</span>}
    </p>
  );
}

/** En el resumen del carrito. `items`: el producto y la cantidad de cada línea (sin las gift cards de la tienda) */
export function BoletosDelCarrito({ subtotalUSD, items, className = '' }: { subtotalUSD: number; items: Array<{ productId: string; cantidad: number }>; className?: string }) {
  const sorteo = useSorteoCompra();
  if (!sorteo || subtotalUSD <= 0) return null;
  const { regla, estrella } = sorteo;
  const porMonto = boletosPorMonto(subtotalUSD, regla);
  const unidades = estrella ? items.filter((i) => i.productId === estrella.productId).reduce((s, i) => s + i.cantidad, 0) : 0;
  const porEstrella = estrella ? unidades * estrella.boletos : 0;
  const total = porMonto + porEstrella;
  const salto = proximoSalto(subtotalUSD, regla);
  const avance = salto ? Math.max(4, Math.min(100, Math.round((subtotalUSD / (subtotalUSD + salto.faltaUSD)) * 100))) : 100;
  return (
    <div className={`rounded-xl bg-brand-50 p-3 ${className}`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <IconoCupon className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
        {total > 0 ? <span>Esta compra te da <span className="text-brand-700">{boletosTexto(total)}</span> para el sorteo</span> : <span>Esta compra todavía no da boletos</span>}
      </p>
      {porEstrella > 0 && <p className="mt-0.5 pl-7 text-xs text-ink-soft">{porMonto} por el monto y {porEstrella} del producto estrella</p>}
      {salto && (
        <div className="mt-2 pl-7">
          <div className="h-1.5 overflow-hidden rounded-full bg-white" aria-hidden="true">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${avance}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            Te {salto.faltaUSD === 1 ? 'falta' : 'faltan'} <strong className="font-semibold text-ink">{formatUSD(salto.faltaUSD)}</strong> en productos para {total > 0 ? 'tener' : 'ganar'}{' '}
            <strong className="font-semibold text-ink">{boletosTexto(salto.boletos + porEstrella)}</strong>.
          </p>
        </div>
      )}
      <Link href="/sorteo" className="mt-1 inline-flex min-h-9 items-center pl-7 text-xs font-semibold text-brand-600 hover:underline">Cómo funciona el sorteo</Link>
    </div>
  );
}
