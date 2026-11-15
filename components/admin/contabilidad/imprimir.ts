// C-229: imprime solo la réplica de la factura (la regla de impresión está en app/globals.css).
export function imprimirFactura(): void {
  document.body.classList.add('imprimiendo-factura');
  window.addEventListener('afterprint', () => document.body.classList.remove('imprimiendo-factura'), { once: true });
  window.print();
}
