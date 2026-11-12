import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { getPublicSettings } from '@/lib/site-settings';
import { LISTA_MAX_FILAS, LOTE_ACTUALIZAR, LOTE_CREAR, LOTE_REVISAR, limpiarCodigo } from '@/lib/proveedores/lista';
import {
  actualizarDesdeLista, agotadosFueraDeLista, crearDesdeLista, leerFilasEntrada, leerOpciones, productosPorCodigo,
} from '@/lib/proveedores/servidor';
import { esLaDeSiempre, leerTerminos, terminosEfectivos } from '@/lib/proveedores/no-se-envia';

type Ctx = { params: Promise<{ id: string }> };

// C-196: la lista del proveedor (su Excel), leída en el navegador y aplicada aquí por partes:
// - revisar: qué códigos ya están en la tienda.
// - crear: los nuevos, en borrador, con costo, precio sugerido y existencia. C-204: menos lo que no se envía (la lista
//   que manda la pantalla, `noSeEnvia`, se guarda con el proveedor como el descuento).
// - actualizar: costo, existencia y (si se pide) precio de los que ya están.
// - agotados: los suyos que ya no salen en su lista; con `aplicar`, quedan en 0.
// El costo, el precio y la existencia se calculan aquí con lo que diga la base; la pantalla solo manda la lista.
export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  const { id } = await params;
  const proveedor = await prisma.supplier.findUnique({ where: { id }, select: { id: true, name: true, discountPercent: true, pricesIncludeTax: true, noShipTerms: true } });
  if (!proveedor) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });

  try {
    if (body.accion === 'revisar') {
      const codigos = Array.isArray(body.codigos) ? body.codigos.map(limpiarCodigo).filter((c): c is string => c !== null) : [];
      if (codigos.length === 0 || codigos.length > LOTE_REVISAR) return NextResponse.json({ error: `De 1 a ${LOTE_REVISAR} códigos por envío` }, { status: 400 });
      return NextResponse.json({ enTienda: Object.fromEntries(await productosPorCodigo(proveedor.id, codigos)) });
    }

    if (body.accion === 'agotados') {
      const codigos = Array.isArray(body.codigos) ? body.codigos.map(limpiarCodigo).filter((c): c is string => c !== null) : [];
      if (codigos.length === 0 || codigos.length > LISTA_MAX_FILAS) return NextResponse.json({ error: 'Falta la lista de códigos' }, { status: 400 });
      const aplicar = body.aplicar === true;
      const r = await agotadosFueraDeLista(proveedor.id, codigos, aplicar);
      if (aplicar && r.cantidad > 0) {
        if (r.tocaTienda) revalidateStorefront();
        await registrarAccionAdmin(session, 'PRODUCT_STOCK_CHANGED', { type: 'PRODUCT' }, {
          origen: 'Lista del proveedor', proveedor: proveedor.name, accion: 'Sin existencia: ya no están en su lista', productos: r.cantidad, nombres: r.nombres,
        }, request);
      }
      return NextResponse.json({ cantidad: r.cantidad, nombres: r.nombres, aplicado: aplicar });
    }

    const settings = await getPublicSettings();
    const opciones = leerOpciones(body, settings.taxEnabled ? settings.taxPercent : 0);
    if ('error' in opciones) return NextResponse.json({ error: opciones.error }, { status: 400 });
    // El descuento del acuerdo y si su lista trae el IVA se recuerdan para la próxima lista
    if (opciones.descuento !== Number(proveedor.discountPercent) || opciones.ivaIncluido !== proveedor.pricesIncludeTax) {
      await prisma.supplier.update({ where: { id: proveedor.id }, data: { discountPercent: opciones.descuento, pricesIncludeTax: opciones.ivaIncluido } });
    }

    if (body.accion === 'crear') {
      const leidas = leerFilasEntrada(body.filas, LOTE_CREAR);
      if ('error' in leidas) return NextResponse.json({ error: leidas.error }, { status: 400 });
      const categoria = typeof body.categoryId === 'string' && body.categoryId ? body.categoryId : null;
      if (categoria && !(await prisma.category.findUnique({ where: { id: categoria }, select: { id: true } }))) {
        return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 400 });
      }
      let terminos = proveedor.noShipTerms;
      if (body.noSeEnvia !== undefined) {
        const leidos = leerTerminos(body.noSeEnvia);
        if (leidos === null) return NextResponse.json({ error: 'La lista de lo que no se envía: hasta 120 palabras o frases' }, { status: 400 });
        const guardar = esLaDeSiempre(leidos) ? [] : leidos;
        if (guardar.join('\n') !== proveedor.noShipTerms.join('\n')) await prisma.supplier.update({ where: { id: proveedor.id }, data: { noShipTerms: guardar } });
        terminos = guardar;
      }
      const r = await crearDesdeLista(proveedor, leidas.filas, opciones, categoria, terminosEfectivos(terminos));
      if (r.creados.length > 0) {
        await registrarAccionAdmin(session, 'PRODUCT_CREATED', { type: 'PRODUCT', id: r.creados.length === 1 ? r.creados[0].id : undefined }, {
          origen: 'Lista del proveedor', proveedor: proveedor.name, productos: r.creados.length, codigos: r.creados.slice(0, 30).map((c) => c.codigo),
          descuento: opciones.descuento, ivaIncluido: opciones.ivaIncluido, margen: opciones.margen, reserva: opciones.reserva,
        }, request);
      }
      return NextResponse.json(r);
    }

    if (body.accion === 'actualizar') {
      const leidas = leerFilasEntrada(body.filas, LOTE_ACTUALIZAR);
      if ('error' in leidas) return NextResponse.json({ error: leidas.error }, { status: 400 });
      const que = { costo: body.costo !== false, existencia: body.existencia !== false, precio: body.precio === true };
      const r = await actualizarDesdeLista(proveedor.id, leidas.filas, opciones, que);
      if (r.tocaTienda) revalidateStorefront();
      if (r.actualizados > 0) {
        await registrarAccionAdmin(session, 'PRODUCT_STOCK_CHANGED', { type: 'PRODUCT' }, {
          origen: 'Lista del proveedor', proveedor: proveedor.name, productos: r.actualizados, costo: que.costo, existencia: que.existencia, precio: que.precio,
          descuento: opciones.descuento, ivaIncluido: opciones.ivaIncluido, reserva: opciones.reserva,
        }, request);
      }
      if (r.precios.length > 0) {
        await registrarAccionAdmin(session, 'PRODUCT_PRICE_CHANGED', { type: 'PRODUCT', id: r.precios.length === 1 ? r.precios[0].id : undefined }, {
          origen: 'Lista del proveedor', proveedor: proveedor.name, margen: opciones.margen, productos: r.precios.length, cambios: r.precios.slice(0, 30),
        }, request);
      }
      return NextResponse.json({ actualizados: r.actualizados, sinCambios: r.sinCambios, noEstan: r.noEstan, precios: r.precios.length });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (error) {
    console.error('Lista del proveedor:', error);
    return NextResponse.json({ error: 'No se pudo procesar la lista' }, { status: 500 });
  }
}
