// C-214: los productos de la tienda que nombra un texto ("¿tienen el taladro de 650 W Emtop?"), para que la IA conteste
// con el precio y la existencia reales. Sin IA: cuenta las palabras del nombre que aparecen en el texto. Solo servidor.

import { prisma } from '@/lib/prisma';
import { visibleProducts } from '@/lib/queries/home';

/** Palabras que no dicen qué producto es */
const VACIAS = new Set(`
  hola buenas buenos dias tardes noches gracias favor quisiera quiero queria necesito busco tienen tiene tienes hay
  precio precios cuanto cuesta cuestan costo vale valen disponible disponibles existencia stock envio envios enviar
  mandan manda llega llegar para por con sin que los las del una uno unos unas como esta este estos estas ese esa
  eso son mas menos muy bien saber informacion info pregunta consulta producto productos articulo modelo marca
  ustedes usted mismo misma tambien pero porque cuando donde desde hasta sobre entre todo toda todos todas otro otra
  ciudad estado tienda compra comprar pago pagar pedido orden zoom mrw dolares bolivares
`.split(/\s+/).filter(Boolean));

export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9ñ]+/g, ' ').trim();
}

/** Las palabras que cuentan: de 3 letras o más, o con números ("20v", "1/2" queda "1 2"), sin las vacías */
function palabras(texto: string): string[] {
  return normalizar(texto).split(' ').filter((p) => (p.length >= 3 || /\d/.test(p)) && !VACIAS.has(p));
}

export interface ProductoMencionado {
  id: string;
  nombre: string;
  slug: string;
  precioUSD: number;
  stock: number;
  digital: boolean;
  /** Las palabras del nombre que están en el texto */
  coincide: string[];
}

/**
 * Hasta `maximo` productos visibles cuyo nombre aparece en el texto: al menos dos palabras del nombre, o una que lo
 * distingue (un modelo con letras y números, o una palabra de 6 letras o más, como "hidrolavadora").
 */
export async function productosMencionados(texto: string, maximo = 4): Promise<ProductoMencionado[]> {
  const delTexto = new Set(palabras(texto));
  if (delTexto.size === 0) return [];
  const productos = await prisma.product.findMany({
    where: await visibleProducts(),
    select: { id: true, name: true, slug: true, priceUSD: true, stock: true, productType: true },
    take: 5000,
  });
  const puntuados = productos.flatMap((p) => {
    const coincide = [...new Set(palabras(p.name))].filter((w) => delTexto.has(w));
    // Fuerte: un modelo o una medida con letras ("pce011", "20v") o una palabra larga ("hidrolavadora"). Un número solo
    // ("20") no basta: lo comparten la batería y la hidrolavadora de 20 V
    const fuerte = coincide.some((w) => (/\d/.test(w) && /[a-z]/.test(w)) || (!/\d/.test(w) && w.length >= 6));
    if (coincide.length < 2 && !fuerte) return [];
    const puntos = coincide.length + (fuerte ? 1 : 0);
    return [{ puntos, p: { id: p.id, nombre: p.name, slug: p.slug, precioUSD: Number(p.priceUSD), stock: p.stock, digital: p.productType === 'DIGITAL', coincide } }];
  });
  return puntuados.sort((a, b) => b.puntos - a.puntos).slice(0, maximo).map((x) => x.p);
}
