// Convierte una tarjeta de lib/og/tarjetas.tsx en un JPEG liviano para compartir (C-178). Solo en el servidor.
// ImageResponse entrega PNG (Satori + Resvg). Se pasa a JPEG con sharp: con fotos, el PNG pesa de 500 KB a 1 MB, y
// WhatsApp a veces no muestra imágenes tan pesadas.
// Satori no lee WebP (el formato de las fotos de la tienda): cada foto se entrega ya convertida y del tamaño en que se ve.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import type { ReactElement } from 'react';
import sharp from 'sharp';
import { ALTO, ANCHO, type Marca } from './tarjetas';

const CARPETA_FUENTES = path.join(process.cwd(), 'lib', 'og', 'fuentes');
const MARCA = path.join(process.cwd(), 'public', 'images', 'brand', 'logo-largo.png');

type Fuente = { name: string; data: Buffer; weight: 500 | 600 | 700 | 800; style: 'normal' };
let fuentes: Promise<Fuente[]> | null = null;

/** Inter estática (recortada al latín; licencia en public/fonts/Inter-LICENSE.txt) y Tektrron, solo para el wordmark */
function cargarFuentes(): Promise<Fuente[]> {
  fuentes ??= Promise.all([
    ...([['Medium', 500], ['SemiBold', 600], ['Bold', 700], ['ExtraBold', 800]] as const).map(async ([archivo, peso]) => ({
      name: 'Inter', data: await readFile(path.join(CARPETA_FUENTES, `Inter-${archivo}.ttf`)), weight: peso, style: 'normal' as const,
    })),
    readFile(path.join(process.cwd(), 'public', 'fonts', 'Tektrron.ttf')).then((data) => ({ name: 'Tektrron', data, weight: 700 as const, style: 'normal' as const })),
  ]);
  return fuentes;
}

const comoData = (buffer: Buffer, tipo: 'png' | 'jpeg') => `data:image/${tipo};base64,${buffer.toString('base64')}`;

let marca: Promise<Omit<Marca, 'dominio'>> | null = null;

/** El logo largo y su ícono (el cuadro de la izquierda de logo-largo.png, 288 × 288), al doble del tamaño en que se ven */
export function cargarMarca(): Promise<Omit<Marca, 'dominio'>> {
  marca ??= (async () => {
    const original = await readFile(MARCA);
    const [logoLargo, icono] = await Promise.all([
      sharp(original).resize({ height: 104 }).png().toBuffer(),
      sharp(original).extract({ left: 0, top: 0, width: 288, height: 288 }).resize(104, 104).png().toBuffer(),
    ]);
    return { logoLargo: comoData(logoLargo, 'png'), icono: comoData(icono, 'png') };
  })();
  return marca;
}

/** Una foto de la tienda lista para la tarjeta: cuadrada, sobre blanco y en JPEG del tamaño en que se dibuja */
export async function prepararFoto(buffer: Buffer, lado: number): Promise<string> {
  const jpeg = await sharp(buffer)
    .rotate()
    .resize(lado, lado, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 88 })
    .toBuffer();
  return comoData(jpeg, 'jpeg');
}

/** Cualquier pieza dibujada con las fuentes y la marca de la tienda, como JPEG */
export async function renderizarJpeg(pieza: ReactElement, { ancho, alto, calidad }: { ancho: number; alto: number; calidad: number }): Promise<Buffer> {
  const respuesta = new ImageResponse(pieza, { width: ancho, height: alto, fonts: await cargarFuentes() });
  const png = Buffer.from(await respuesta.arrayBuffer());
  return sharp(png).jpeg({ quality: calidad, mozjpeg: true }).toBuffer();
}

/** La tarjeta para compartir: 1200 × 630, liviana */
export function renderizarTarjeta(tarjeta: ReactElement): Promise<Buffer> {
  return renderizarJpeg(tarjeta, { ancho: ANCHO, alto: ALTO, calidad: 84 });
}
