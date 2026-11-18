'use client';

// C-297: lo que la tienda necesita saber del sorteo abierto para decir cuántos boletos da una compra: la escala por monto y
// el producto estrella de la semana. El servidor lo lee una vez por página (app/layout.tsx, sorteoParaCompra) y lo pasa
// aquí, como los ajustes públicos: el sello de la tarjeta, la ficha y el carrito lo leen sin pedir nada. null sin sorteo.
// Solo es para mostrar: los boletos de verdad los cuenta el servidor con las órdenes pagadas (lib/sorteo/servidor.ts).
import { createContext, useContext, type ReactNode } from 'react';
import type { SorteoParaCompra } from '@/lib/sorteo/estrella';

const SorteoCompraContext = createContext<SorteoParaCompra | null>(null);

export function SorteoCompraProvider({ valor, children }: { valor: SorteoParaCompra | null; children: ReactNode }) {
  return <SorteoCompraContext.Provider value={valor}>{children}</SorteoCompraContext.Provider>;
}

export const useSorteoCompra = () => useContext(SorteoCompraContext);
