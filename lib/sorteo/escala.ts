// C-297: cuántos boletos da una compra por su monto (Andrés, 18/11: "compra de $5 da 2 boletos, compras de $50 dan 5 y así
// en múltiplos de 50"). Módulo puro y sin nada del servidor: lo usan las reglas del sorteo y el carrito, que dice "Esta
// compra te da 7 boletos" y lo que falta para el próximo salto. Los boletos de verdad los cuenta siempre el servidor.

/** La regla por monto de un sorteo. Con la escala apagada (0), cada compra de la mínima o más da `porCompra` */
export interface ReglaDeCompra {
  minimoUSD: number;
  porCompra: number;
  escalaUSD: number;
  porEscala: number;
}

const centavos = (usd: number) => Math.round(usd * 100);

/** Los boletos de una compra por su monto en productos (sin envío): la regla de la compra o la escala, la que dé más */
export function boletosPorMonto(subtotalUSD: number, r: ReglaDeCompra): number {
  const c = centavos(subtotalUSD);
  if (c <= 0 || c < centavos(r.minimoUSD)) return 0;
  const escala = centavos(r.escalaUSD);
  const porEscala = escala > 0 && r.porEscala > 0 ? Math.floor(c / escala) * r.porEscala : 0;
  return Math.max(Math.max(0, r.porCompra), porEscala);
}

/** El próximo salto desde este monto: cuánto falta y cuántos boletos daría la compra entonces. null si no hay más saltos */
export function proximoSalto(subtotalUSD: number, r: ReglaDeCompra): { faltaUSD: number; boletos: number } | null {
  const c = Math.max(0, centavos(subtotalUSD));
  const minimo = centavos(r.minimoUSD);
  if (c < minimo) return { faltaUSD: (minimo - c) / 100, boletos: boletosPorMonto(r.minimoUSD, r) };
  const escala = centavos(r.escalaUSD);
  if (escala <= 0 || r.porEscala <= 0) return null;
  const ahora = boletosPorMonto(c / 100, r);
  // El próximo múltiplo de la escala que da más boletos que hoy (con $5 = 2 y cada $50 = 5, el primero ya da más)
  for (let k = Math.floor(c / escala) + 1; k < Math.floor(c / escala) + 50; k++) {
    const boletos = boletosPorMonto((k * escala) / 100, r);
    if (boletos > ahora) return { faltaUSD: (k * escala - c) / 100, boletos };
  }
  return null;
}

/** Los escalones para mostrar la regla: "$5 → 2 · $50 → 5 · $100 → 10" (el primero, la compra mínima) */
export function escalones(r: ReglaDeCompra, cuantos = 3): Array<{ montoUSD: number; boletos: number }> {
  const lista = [{ montoUSD: r.minimoUSD, boletos: boletosPorMonto(r.minimoUSD, r) }];
  const escala = centavos(r.escalaUSD);
  if (escala <= 0 || r.porEscala <= 0) return lista;
  for (let k = 1; lista.length < cuantos && k < 50; k++) {
    const montoUSD = (k * escala) / 100;
    const boletos = boletosPorMonto(montoUSD, r);
    if (montoUSD > r.minimoUSD && boletos > lista[lista.length - 1].boletos) lista.push({ montoUSD, boletos });
  }
  return lista;
}

/** La regla de un sorteo (sus columnas de la base, ya como números) */
export function reglaDe(s: { compraMinimaUSD: unknown; boletosPorCompra: number; escalaUSD: unknown; boletosPorEscala: number }): ReglaDeCompra {
  return { minimoUSD: Number(s.compraMinimaUSD), porCompra: s.boletosPorCompra, escalaUSD: Number(s.escalaUSD), porEscala: s.boletosPorEscala };
}

export const boletosTexto = (n: number) => `${n} ${n === 1 ? 'boleto' : 'boletos'}`;

/** "$5" y no "$5,00": un monto redondo se lee mejor */
export const montoCorto = (usd: number) => (Number.isInteger(usd) ? `$${usd}` : `$${usd.toFixed(2).replace('.', ',')}`);

/** C-297: la regla en una línea, para títulos y tarjetas: "Desde $5, 2 boletos. Desde $50, 5 por cada $50." */
export function reglaCorta(r: ReglaDeCompra): string {
  const primero = `Desde ${montoCorto(r.minimoUSD)}, ${boletosTexto(boletosPorMonto(r.minimoUSD, r))}.`;
  if (escalones(r, 2).length < 2) return primero;
  return `${primero} Desde ${montoCorto(r.escalaUSD)}, ${r.porEscala} por cada ${montoCorto(r.escalaUSD)}.`;
}

/**
 * C-297: la regla completa, para las bases y las preguntas: "Cada compra pagada de $5 o más en productos (sin contar el
 * envío) te da 2 boletos. Si llega a $50, te da 5 por cada $50: $50 son 5, $100 son 10 y $150 son 15."
 */
export function reglaLarga(r: ReglaDeCompra): string {
  const base = `Cada compra pagada de ${montoCorto(r.minimoUSD)} o más en productos (sin contar el envío) te da ${boletosTexto(boletosPorMonto(r.minimoUSD, r))}.`;
  const tramos = escalones(r, 4).slice(1);
  if (tramos.length === 0) return base;
  const ejemplos = tramos.map((t) => `${montoCorto(t.montoUSD)} son ${t.boletos}`);
  const lista = ejemplos.length > 1 ? `${ejemplos.slice(0, -1).join(', ')} y ${ejemplos[ejemplos.length - 1]}` : ejemplos[0];
  return `${base} Si llega a ${montoCorto(r.escalaUSD)}, te da ${r.porEscala} por cada ${montoCorto(r.escalaUSD)}: ${lista}.`;
}
