import qrcode from 'qrcode-generator';

/** QR como SVG (sin servicios externos: el texto no sale del servidor). */
export function qrSvg(texto: string): { tamano: number; camino: string } {
  const q = qrcode(0, 'M');
  q.addData(texto);
  q.make();
  const n = q.getModuleCount();
  let camino = '';
  for (let f = 0; f < n; f++) {
    for (let c = 0; c < n; c++) if (q.isDark(f, c)) camino += `M${c + 4} ${f + 4}h1v1h-1z`;
  }
  return { tamano: n + 8, camino };
}
