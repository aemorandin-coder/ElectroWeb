import qrcode from 'qrcode-generator';

/** Los módulos del QR (true = oscuro), sin el margen. Sin servicios externos: el texto no sale del servidor. */
export function qrMatriz(texto: string): boolean[][] {
  const q = qrcode(0, 'M');
  q.addData(texto);
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, f) => Array.from({ length: n }, (_, c) => q.isDark(f, c)));
}

/** QR como SVG, con un margen de 4 módulos. */
export function qrSvg(texto: string): { tamano: number; camino: string } {
  const matriz = qrMatriz(texto);
  let camino = '';
  matriz.forEach((fila, f) => fila.forEach((oscuro, c) => { if (oscuro) camino += `M${c + 4} ${f + 4}h1v1h-1z`; }));
  return { tamano: matriz.length + 8, camino };
}
