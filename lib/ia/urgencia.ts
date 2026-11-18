// C-215 · Las consultas y los "Solicitar producto" por urgencia (Andrés, 13/11, la idea B: "los ordena por urgencia y
// busca si ya lo tienes en la tienda"). Solo servidor.
//
// - Claude lee los pendientes de una vez y dice, de cada uno, qué tan urgente es, de qué trata y por qué; de cada
//   solicitud, si lo pedido ya está en la tienda. Queda guardado en la base: no se vuelve a pagar cada vez que alguien
//   abre la pantalla. Lo nuevo se revisa solo al llegar (after, en las rutas que lo crean).
// - La tienda le da el contexto: si quien escribe tiene órdenes abiertas o una garantía, y los productos de la tienda que
//   nombra (lib/ia/productos-mencionados.ts). Un producto que no estaba entre los candidatos no se guarda.
// - A Claude le llegan el asunto, el mensaje y lo pedido: no el nombre, el correo ni el teléfono.
// - C-218: también busca en las listas guardadas de los proveedores (la ferretería): si lo pedido no está en la tienda pero
//   sí en su lista, lo dice ("La ferretería lo tiene").

import { prisma } from '@/lib/prisma';
import { formatUSD } from '@/lib/currency';
import { iaDisponible, pedirJSON, type OpcionesDeUso } from '@/lib/ia/pedir';
import { INSTRUCCIONES_DE_FABRICA } from '@/lib/ia/fabrica';
import { productosMencionados, type ProductoMencionado } from '@/lib/ia/productos-mencionados';
import { articulosMencionados, type ArticuloMencionado } from '@/lib/proveedores/articulos';
import { revisarUrgenciaIa } from '@/lib/ia/revisar';
import { limpiarTextoIA } from '@/lib/ia/texto';
import { ETIQUETA_ESTADO } from '@/lib/order-admin';

export const URGENCIAS = ['alta', 'media', 'baja'] as const;
export const TIPOS = ['orden', 'garantia', 'compra', 'pregunta', 'reclamo', 'otro', 'spam'] as const;
const COINCIDE = ['igual', 'parecido', 'ninguno'] as const;
/** Por vuelta: lo que cabe en una respuesta rápida (bajo los 60 s de nginx) */
const POR_VUELTA = 20;
const DIA = 86_400_000;
const ABIERTAS = ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED'] as const;


const ESQUEMA = {
  type: 'object',
  properties: {
    mensajes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { clave: { type: 'string' }, urgencia: { type: 'string', enum: [...URGENCIAS] }, tipo: { type: 'string', enum: [...TIPOS] }, motivo: { type: 'string' } },
        required: ['clave', 'urgencia', 'tipo', 'motivo'],
        additionalProperties: false,
      },
    },
    solicitudes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          clave: { type: 'string' }, urgencia: { type: 'string', enum: [...URGENCIAS] }, motivo: { type: 'string' },
          coincide: { type: 'string', enum: [...COINCIDE] }, producto: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          articulo: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
        required: ['clave', 'urgencia', 'motivo', 'coincide', 'producto', 'articulo'],
        additionalProperties: false,
      },
    },
  },
  required: ['mensajes', 'solicitudes'],
  additionalProperties: false,
};

/** Lo que se le manda a Claude: los mensajes y las solicitudes pendientes, cada uno ya escrito en su línea */
function armarPedido(mensajes: string[], solicitudes: string[]): string {
  return [
    `Mensajes del formulario de contacto (${mensajes.length}):`,
    ...(mensajes.length ? mensajes : ['- Ninguno.']),
    '',
    `Solicitudes de producto (${solicitudes.length}):`,
    ...(solicitudes.length ? solicitudes : ['- Ninguna.']),
  ].join('\n');
}

const dias = (d: Date) => Math.floor((Date.now() - d.getTime()) / DIA);
const hace = (d: Date) => { const n = dias(d); return n === 0 ? 'hoy' : n === 1 ? 'hace 1 día' : `hace ${n} días`; };
const enLista = <T extends string>(lista: readonly T[], valor: unknown): T | null => (lista as readonly unknown[]).includes(valor) ? (valor as T) : null;

/** Lo que la tienda sabe de quien escribe (sin decir quién es): órdenes abiertas y garantías */
async function contextoDe(correos: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(correos.map((c) => c.trim().toLowerCase()))];
  const contexto = new Map<string, string>();
  await Promise.all(unicos.map(async (correo) => {
    const cuenta = await prisma.user.findFirst({ where: { email: { equals: correo, mode: 'insensitive' }, role: 'USER' }, select: { id: true } });
    const suyas = { OR: [...(cuenta ? [{ userId: cuenta.id }] : []), { guestEmail: { equals: correo, mode: 'insensitive' as const } }] };
    const [ordenes, garantias] = await Promise.all([
      prisma.order.findMany({ where: { AND: [suyas, { status: { in: [...ABIERTAS] } }] }, select: { status: true, paymentStatus: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 3 }),
      cuenta ? prisma.warrantyClaim.count({ where: { userId: cuenta.id, status: { notIn: ['RESOLVED', 'REJECTED'] } } }) : 0,
    ]);
    const partes = [
      cuenta ? 'tiene cuenta' : 'sin cuenta',
      ...ordenes.map((o) => `una orden ${ETIQUETA_ESTADO[o.status].toLowerCase()}${o.paymentStatus === 'PAID' ? ' y pagada' : ''} de ${hace(o.createdAt)}`),
      garantias ? `${garantias} garantía${garantias === 1 ? '' : 's'} abierta${garantias === 1 ? '' : 's'}` : null,
    ].filter(Boolean);
    contexto.set(correo, partes.join(', '));
  }));
  return contexto;
}

/**
 * Revisa con Claude los mensajes y solicitudes pendientes que no se han revisado (o los que se pasan) y guarda la
 * urgencia. Devuelve cuántos revisó. Lanza FallaIA si Claude no responde.
 */
export async function revisarUrgencia(cuales: { mensajes?: string[]; solicitudes?: string[] } = {}): Promise<{ mensajes: number; solicitudes: number }> {
  const elegidos = cuales.mensajes || cuales.solicitudes;
  const [mensajes, solicitudes] = await Promise.all([
    prisma.contactMessage.findMany({
      where: elegidos ? { id: { in: cuales.mensajes ?? [] } } : { status: { in: ['PENDING', 'READ'] }, iaRevisadoAt: null },
      orderBy: { createdAt: 'asc' },
      take: POR_VUELTA,
    }),
    prisma.productRequest.findMany({
      where: elegidos ? { id: { in: cuales.solicitudes ?? [] } } : { status: { in: ['PENDING', 'IN_PROGRESS'] }, iaRevisadoAt: null },
      orderBy: { createdAt: 'asc' },
      take: POR_VUELTA,
    }),
  ]);
  if (mensajes.length === 0 && solicitudes.length === 0) return { mensajes: 0, solicitudes: 0 };

  const contexto = await contextoDe([...mensajes.map((m) => m.email), ...solicitudes.map((s) => s.customerEmail)]);
  // Claves cortas: Claude las copia sin errores y no ve los id de la base
  const candidatos = new Map<string, Map<string, ProductoMencionado>>();
  const deProveedores = new Map<string, Map<string, ArticuloMencionado>>();
  const lineasSolicitudes = await Promise.all(solicitudes.map(async (s, i) => {
    const [productos, articulos] = await Promise.all([
      productosMencionados(`${s.productName} ${s.description ?? ''}`, 3),
      articulosMencionados(`${s.productName} ${s.description ?? ''}`, 3),
    ]);
    candidatos.set(`s${i + 1}`, new Map(productos.map((p, j) => [`p${j + 1}`, p])));
    deProveedores.set(`s${i + 1}`, new Map(articulos.map((a, j) => [`f${j + 1}`, a])));
    return [
      `[s${i + 1}] ${hace(s.createdAt)}. Pide: ${s.productName}.${s.description ? ` Detalle: ${s.description.slice(0, 400)}` : ''}${s.category ? ` Categoría: ${s.category}.` : ''}${s.estimatedBudget ? ` Presupuesto: ${formatUSD(Number(s.estimatedBudget))}.` : ''} Quien pide: ${contexto.get(s.customerEmail.trim().toLowerCase()) ?? 'sin datos'}.`,
      productos.length
        ? `  Productos de la tienda que se le parecen: ${productos.map((p, j) => `[p${j + 1}] ${p.nombre} (${formatUSD(p.precioUSD)}${p.digital ? '' : p.stock > 0 ? ', hay' : ', agotado'})`).join('; ')}.`
        : '  Ningún producto de la tienda se le parece.',
      articulos.length
        ? `  En la lista de un proveedor (no están en la tienda): ${articulos.map((a, j) => `[f${j + 1}] ${a.nombre} (código ${a.codigo}, ${a.existencia === null ? 'sin dato de existencia' : a.existencia > 0 ? `existencia ${a.existencia}` : 'sin existencia'})`).join('; ')}.`
        : null,
    ].filter(Boolean).join('\n');
  }));
  const pedido = armarPedido(
    mensajes.map((m, i) => `[m${i + 1}] ${hace(m.createdAt)}, ${m.status === 'PENDING' ? 'sin leer' : 'leído, sin responder'}. Quien escribe: ${contexto.get(m.email.trim().toLowerCase()) ?? 'sin datos'}.\n  Asunto: ${m.subject}\n  """${m.message.slice(0, 700)}"""`),
    lineasSolicitudes,
  );

  const { datos } = await pedirJSON({ donde: 'urgencia', uso: 'urgencia', deFabrica: INSTRUCCIONES_DE_FABRICA.urgencia, pedido, esquema: ESQUEMA, revisar: (d) => revisarUrgenciaIa(d) });
  const ahora = new Date();
  const cambios = [];
  let nMensajes = 0;
  let nSolicitudes = 0;
  for (const r of (Array.isArray(datos.mensajes) ? datos.mensajes : []) as Array<Record<string, unknown>>) {
    const m = typeof r.clave === 'string' ? mensajes[Number(r.clave.replace(/^m/, '')) - 1] : undefined;
    const urgencia = enLista(URGENCIAS, r.urgencia);
    if (!m || !urgencia || !/^m\d+$/.test(String(r.clave))) continue;
    nMensajes++;
    cambios.push(prisma.contactMessage.update({
      where: { id: m.id },
      data: { iaUrgencia: urgencia, iaTipo: enLista(TIPOS, r.tipo) ?? 'otro', iaMotivo: limpiarTextoIA(r.motivo, 160), iaRevisadoAt: ahora },
    }));
  }
  for (const r of (Array.isArray(datos.solicitudes) ? datos.solicitudes : []) as Array<Record<string, unknown>>) {
    const clave = typeof r.clave === 'string' && /^s\d+$/.test(r.clave) ? r.clave : null;
    const s = clave ? solicitudes[Number(clave.slice(1)) - 1] : undefined;
    const urgencia = enLista(URGENCIAS, r.urgencia);
    if (!clave || !s || !urgencia) continue;
    const producto = typeof r.producto === 'string' ? candidatos.get(clave)?.get(r.producto) : undefined;
    const coincide = producto ? enLista(COINCIDE, r.coincide) : 'ninguno';
    const articulo = typeof r.articulo === 'string' ? deProveedores.get(clave)?.get(r.articulo) : undefined;
    nSolicitudes++;
    cambios.push(prisma.productRequest.update({
      where: { id: s.id },
      data: {
        iaUrgencia: urgencia, iaMotivo: limpiarTextoIA(r.motivo, 160), iaRevisadoAt: ahora,
        iaCoincide: coincide === 'igual' || coincide === 'parecido' ? coincide : 'ninguno',
        iaProductoId: coincide === 'igual' || coincide === 'parecido' ? producto!.id : null,
        iaArticuloId: articulo?.id ?? null,
      },
    }));
  }
  await prisma.$transaction(cambios);
  return { mensajes: nMensajes, solicitudes: nSolicitudes };
}

/** Para las rutas que crean un mensaje o una solicitud: lo revisa después de responder, sin hacer esperar a nadie */
export async function revisarAlLlegar(cual: { mensaje?: string; solicitud?: string }): Promise<void> {
  if (!(await iaDisponible('urgencia'))) return;
  try {
    await revisarUrgencia({ mensajes: cual.mensaje ? [cual.mensaje] : [], solicitudes: cual.solicitud ? [cual.solicitud] : [] });
  } catch {
    // pedirJSON ya lo dejó en el registro; queda sin revisar y entra en la próxima vuelta del botón
  }
}

/**
 * Para probar las instrucciones en Configuración: la urgencia de un mensaje que se escribe ahí, sin guardar nada y sin tocar
 * ningún mensaje real. Lo que cambia respecto a la de siempre es que no hay quién escribe (ni sus órdenes ni sus garantías).
 */
export async function probarUrgencia(mensaje: string, opciones: OpcionesDeUso): Promise<{ urgencia: string; tipo: string; motivo: string } | null> {
  const pedido = armarPedido([`[m1] hoy, sin leer. Quien escribe: sin datos.\n  Asunto: Mensaje de prueba\n  """${mensaje.slice(0, 700)}"""`], []);
  const { datos } = await pedirJSON({ donde: 'urgencia (prueba)', uso: 'urgencia', deFabrica: INSTRUCCIONES_DE_FABRICA.urgencia, pedido, esquema: ESQUEMA, revisar: (d) => revisarUrgenciaIa(d), ...opciones });
  const fila = (Array.isArray(datos.mensajes) ? datos.mensajes : [])[0] as Record<string, unknown> | undefined;
  if (!fila) return null;
  return { urgencia: String(fila.urgencia ?? 'media'), tipo: enLista(TIPOS, fila.tipo) ?? 'otro', motivo: limpiarTextoIA(fila.motivo, 160) };
}
