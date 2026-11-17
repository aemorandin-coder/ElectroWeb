// C-217 · Campañas de correo con Claude (Andrés, 13/11, la idea C: "le das el objetivo ('gift cards para Navidad') y arma
// el asunto y el texto con tus productos reales"). Solo servidor.
//
// - La tienda elige los candidatos (los que nombra el objetivo, los de las categorías que nombra, los destacados, las
//   ofertas y lo nuevo) y Claude escoge hasta 4 y escribe: asunto, vista previa, título, introducción, por qué cada
//   producto y el cierre.
// - Los bloques los arma la tienda: la foto, el nombre, el precio (y el de antes) y el enlace de cada producto salen de la
//   base, no de la IA. Un producto que no estaba entre los candidatos no entra.
// - Lo que se sabe de la tienda (envío gratis, las fechas de Navidad, el sorteo) va como datos para que no invente.
// - El resultado llena el editor: no se guarda ni se envía hasta que una persona lo revisa.

import { prisma } from '@/lib/prisma';
import { formatUSD } from '@/lib/currency';
import { campanaSchema, type Bloque } from '@/lib/email-campaigns';
import { INSTRUCCIONES_DE_FABRICA } from '@/lib/ia/fabrica';
import { pedirJSON } from '@/lib/ia/claude';
import { normalizar, productosMencionados } from '@/lib/ia/productos-mencionados';
import { revisarCampanaIa } from '@/lib/ia/revisar';
import { limpiarTextoIA } from '@/lib/ia/texto';
import { diaConNombre } from '@/lib/navidad';
import { visibleProducts } from '@/lib/queries/home';
import { getPublicSettings } from '@/lib/site-settings';
import { getSorteoVigente } from '@/lib/sorteo/servidor';

const MAX_PRODUCTOS = 4;
const CANDIDATOS = 40;
const DESTINOS = ['catalogo', 'ofertas', 'categoria', 'regalos', 'sorteo'] as const;
type Destino = (typeof DESTINOS)[number];

export interface BorradorCampana {
  subject: string;
  preheader: string;
  bloques: Bloque[];
  /** Los productos que eligió, para decir en el panel qué usó */
  productos: Array<{ nombre: string; precioUSD: number }>;
  firma: string;
}

const seleccion = {
  id: true, name: true, slug: true, priceUSD: true, compareAtPriceUSD: true, stock: true, productType: true, mainImage: true,
  category: { select: { name: true, slug: true } },
} as const;

/** Los productos que puede usar: lo que el objetivo nombra primero, después sus categorías, las ofertas, lo destacado y lo nuevo */
async function candidatos(objetivo: string) {
  const palabras = new Set(normalizar(objetivo).split(' ').filter((w) => w.length >= 4));
  const categorias = (await prisma.category.findMany({ select: { id: true, name: true } }))
    .filter((c) => normalizar(c.name).split(' ').some((w) => w.length >= 4 && palabras.has(w)))
    .map((c) => c.id);
  const nombrados = await productosMencionados(objetivo, 10);
  const [porNombre, deCategorias, ofertas, destacados, nuevos] = await Promise.all([
    nombrados.length ? prisma.product.findMany({ where: { id: { in: nombrados.map((p) => p.id) } }, select: seleccion }) : [],
    categorias.length ? prisma.product.findMany({ where: await visibleProducts({ categoryId: { in: categorias } }), select: seleccion, orderBy: [{ isFeatured: 'desc' }, { publishedAt: { sort: 'desc', nulls: 'last' } }], take: 15 }) : [],
    prisma.product.findMany({ where: await visibleProducts({ compareAtPriceUSD: { not: null } }), select: seleccion, take: 10 }),
    prisma.product.findMany({ where: await visibleProducts({ isFeatured: true }), select: seleccion, take: 10 }),
    prisma.product.findMany({ where: await visibleProducts(), select: seleccion, orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } }, take: 10 }),
  ]);
  const vistos = new Map<string, (typeof nuevos)[number]>();
  for (const p of [...porNombre, ...deCategorias, ...ofertas.filter((o) => Number(o.compareAtPriceUSD) > Number(o.priceUSD)), ...destacados, ...nuevos]) {
    if (!vistos.has(p.id)) vistos.set(p.id, p);
  }
  return [...vistos.values()].slice(0, CANDIDATOS);
}


const ESQUEMA = {
  type: 'object',
  properties: {
    asunto: { type: 'string' },
    preheader: { type: 'string' },
    titulo: { type: 'string' },
    intro: { type: 'string' },
    productos: {
      type: 'array',
      items: { type: 'object', properties: { clave: { type: 'string' }, texto: { type: 'string' } }, required: ['clave', 'texto'], additionalProperties: false },
    },
    cierre: { type: 'string' },
    boton: {
      type: 'object',
      properties: { texto: { type: 'string' }, destino: { type: 'string', enum: [...DESTINOS] } },
      required: ['texto', 'destino'],
      additionalProperties: false,
    },
  },
  required: ['asunto', 'preheader', 'titulo', 'intro', 'productos', 'cierre', 'boton'],
  additionalProperties: false,
};

/** El borrador de una campaña para un objetivo. Lanza FallaIA si Claude no responde; null si no hay productos visibles */
export async function redactarCampana(objetivo: string): Promise<BorradorCampana | null> {
  const [productos, settings, sorteo] = await Promise.all([candidatos(objetivo), getPublicSettings(), getSorteoVigente()]);
  if (productos.length === 0) return null;
  const porClave = new Map(productos.map((p, i) => [`p${i + 1}`, p]));
  const datosTienda = [
    settings.freeDeliveryThresholdUSD ? `Envío gratis en compras desde ${formatUSD(settings.freeDeliveryThresholdUSD)} de lo que sale de Guanare; lo demás va por ZOOM o MRW con cobro a destino.` : 'Envíos a todo el país por ZOOM o MRW, con cobro a destino.',
    settings.entregaNavidad?.envio ? `Para que un envío llegue antes de Navidad hay que comprar hasta el ${diaConNombre(settings.entregaNavidad.envio)}.` : null,
    settings.entregaNavidad?.local ? `En Guanare, con delivery o retiro, hasta el ${diaConNombre(settings.entregaNavidad.local)}.` : null,
    sorteo && !sorteo.sorteadoAt ? `Hay un sorteo: ${sorteo.premio}. Cada compra pagada de ${formatUSD(Number(sorteo.compraMinimaUSD))} o más es un boleto; el resultado se da el ${new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', timeZone: 'America/Caracas' }).format(sorteo.resultadoEl)}.` : null,
  ].filter(Boolean);
  const pedido = [
    `Objetivo de la campaña: """${objetivo.slice(0, 600)}"""`,
    '',
    'Lo que se sabe de la tienda:',
    ...datosTienda.map((d) => `- ${d}`),
    '',
    'Productos (clave · nombre · categoría · precio):',
    ...productos.map((p, i) => {
      const antes = p.compareAtPriceUSD && Number(p.compareAtPriceUSD) > Number(p.priceUSD) ? `, antes ${formatUSD(Number(p.compareAtPriceUSD))}` : '';
      const hay = p.productType === 'DIGITAL' ? 'digital, llega por correo' : p.stock > 0 ? 'hay disponible' : 'agotado';
      return `- p${i + 1} · ${p.name} · ${p.category?.name ?? 'sin categoría'} · ${p.productType === 'DIGITAL' ? 'desde ' : ''}${formatUSD(Number(p.priceUSD))}${antes} (${hay})`;
    }),
  ].join('\n');

  // C-288: la tienda comprueba la respuesta: asunto de 6 a 9 palabras sin gritos, sin precios en el texto, y productos solo de la
  // lista (sin repetir, con existencia y hasta 4)
  const { datos, firma } = await pedirJSON({
    donde: 'campaña de correo', uso: 'campana', deFabrica: INSTRUCCIONES_DE_FABRICA.campana, pedido, esquema: ESQUEMA,
    referencia: objetivo.slice(0, 60),
    revisar: (d, { frases }) => revisarCampanaIa(d, {
      productos: new Map(productos.map((p, i) => [`p${i + 1}`, { disponible: p.productType === 'DIGITAL' || p.stock > 0 }])),
      datos: pedido,
      frases,
    }),
  });

  // Los productos que eligió, solo de la lista, sin repetir, con existencia (o digitales) y hasta 4
  const elegidos: Array<{ p: (typeof productos)[number]; texto: string }> = [];
  for (const x of (Array.isArray(datos.productos) ? datos.productos : []) as Array<{ clave?: unknown; texto?: unknown }>) {
    const p = typeof x.clave === 'string' ? porClave.get(x.clave) : undefined;
    if (!p || elegidos.some((e) => e.p.id === p.id) || (p.productType !== 'DIGITAL' && p.stock <= 0)) continue;
    elegidos.push({ p, texto: limpiarTextoIA(x.texto, 300) });
    if (elegidos.length === MAX_PRODUCTOS) break;
  }

  const boton = (datos.boton ?? {}) as { texto?: unknown; destino?: unknown };
  const destino: Destino = (DESTINOS as readonly unknown[]).includes(boton.destino) ? (boton.destino as Destino) : 'catalogo';
  const categoria = elegidos[0]?.p.category?.slug;
  const url = destino === 'ofertas' ? '/productos?oferta=1'
    : destino === 'categoria' && categoria ? `/categorias/${categoria}`
      : destino === 'regalos' ? '/ideas-para-regalar'
        : destino === 'sorteo' && sorteo && !sorteo.sorteadoAt ? '/sorteo'
          : '/productos';

  const bloques: Bloque[] = [
    { tipo: 'titulo', texto: limpiarTextoIA(datos.titulo, 150) || 'Hola, {nombre}' },
    { tipo: 'texto', texto: limpiarTextoIA(datos.intro, 1200) },
  ];
  for (const { p, texto } of elegidos) {
    // La foto, si está en la tienda (las de afuera no se mandan en un correo)
    if (p.mainImage && /^\/(api\/)?uploads\//.test(p.mainImage)) bloques.push({ tipo: 'imagen', url: p.mainImage, alt: p.name.slice(0, 150), enlace: `/productos/${p.slug}` });
    const antes = p.compareAtPriceUSD && Number(p.compareAtPriceUSD) > Number(p.priceUSD) ? ` (antes ${formatUSD(Number(p.compareAtPriceUSD))})` : '';
    bloques.push({ tipo: 'texto', texto: `${p.name}\n${p.productType === 'DIGITAL' ? 'Desde ' : ''}${formatUSD(Number(p.priceUSD))}${antes}${texto ? `\n${texto}` : ''}` });
    bloques.push({ tipo: 'boton', texto: 'Ver producto', url: `/productos/${p.slug}` });
  }
  const cierre = limpiarTextoIA(datos.cierre, 800);
  if (cierre) bloques.push({ tipo: 'texto', texto: cierre });
  bloques.push({ tipo: 'boton', texto: limpiarTextoIA(boton.texto, 40) || 'Ver la tienda', url });

  // Lo que no pase la validación de las campañas (un bloque vacío, una foto que no sirve) se queda afuera
  const validos = bloques.filter((b) => campanaSchema.shape.bloques.element.safeParse(b).success);
  const subject = limpiarTextoIA(datos.asunto, 150) || objetivo.slice(0, 150);
  return {
    subject: subject.length >= 3 ? subject : 'Novedades de Electro Shop',
    preheader: limpiarTextoIA(datos.preheader, 200),
    bloques: validos,
    productos: elegidos.map(({ p }) => ({ nombre: p.name, precioUSD: Number(p.priceUSD) })),
    firma,
  };
}
