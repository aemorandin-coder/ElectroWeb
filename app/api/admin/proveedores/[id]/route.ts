import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { DESCUENTO_MAX } from '@/lib/proveedores/lista';
import { leerNombreProveedor, leerPorcentaje } from '@/lib/proveedores/servidor';
import { esLaDeSiempre, leerTerminos } from '@/lib/proveedores/no-se-envia';
import { ciudadesZoom } from '@/lib/envios/zoom';
import { DOMICILIO_MAX, RAZON_SOCIAL_MAX, limpiarTexto, normalizarRif } from '@/lib/proveedores/fiscal';
import { CORREOS_MAX, leerCorreos } from '@/lib/proveedores/contacto';

type Ctx = { params: Promise<{ id: string }> };

// C-196: cambiar el nombre, el descuento o las notas de un proveedor. C-204: y la lista de lo que no se envía.
// C-199: y desde qué ciudad de ZOOM despacha él mismo (null = sus productos salen de la tienda). C-227: y su contacto de despacho
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  const { id } = await params;
  const actual = await prisma.supplier.findUnique({ where: { id } });
  if (!actual) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const data: { name?: string; discountPercent?: number; pricesIncludeTax?: boolean; notes?: string | null; noShipTerms?: string[]; dispatchCityCode?: string | null; dispatchCityName?: string | null; dispatchStateName?: string | null; contactName?: string | null; contactEmail?: string | null; contactWhatsapp?: string | null; legalName?: string | null; taxId?: string | null; fiscalAddress?: string | null } = {};
  if (body?.name !== undefined) {
    const name = leerNombreProveedor(body.name);
    if (!name) return NextResponse.json({ error: 'El nombre del proveedor lleva de 2 a 80 caracteres' }, { status: 400 });
    const repetido = await prisma.supplier.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, NOT: { id } }, select: { id: true } });
    if (repetido) return NextResponse.json({ error: 'Ya hay un proveedor con ese nombre' }, { status: 409 });
    data.name = name;
  }
  if (body?.discountPercent !== undefined) {
    const d = leerPorcentaje(body.discountPercent, DESCUENTO_MAX);
    if (d === null) return NextResponse.json({ error: `El descuento va de 0 a ${DESCUENTO_MAX} %` }, { status: 400 });
    data.discountPercent = d;
  }
  if (body?.pricesIncludeTax !== undefined) {
    if (typeof body.pricesIncludeTax !== 'boolean') return NextResponse.json({ error: 'IVA incluido: sí o no' }, { status: 400 });
    data.pricesIncludeTax = body.pricesIncludeTax;
  }
  if (body?.notes !== undefined) data.notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) || null : null;
  if (body?.noShipTerms !== undefined) {
    const terminos = leerTerminos(body.noShipTerms);
    if (terminos === null) return NextResponse.json({ error: 'La lista de lo que no se envía: hasta 120 palabras o frases' }, { status: 400 });
    // La de siempre se guarda vacía: si la lista de siempre mejora, la toma sola
    data.noShipTerms = esLaDeSiempre(terminos) ? [] : terminos;
  }
  if (body?.dispatchCityCode !== undefined) {
    if (body.dispatchCityCode === null || body.dispatchCityCode === '') {
      data.dispatchCityCode = null;
      data.dispatchCityName = null;
      data.dispatchStateName = null;
    } else {
      // La ciudad tiene que estar en la lista de ZOOM (con cobro a destino): el nombre sale de ahí, no del navegador
      const ciudad = typeof body.dispatchCityCode === 'string' && /^\d{1,6}$/.test(body.dispatchCityCode)
        ? (await ciudadesZoom())?.find((c) => c.codigo === body.dispatchCityCode) ?? null
        : null;
      if (!ciudad) return NextResponse.json({ error: 'Esa ciudad no está en la lista de ZOOM' }, { status: 400 });
      data.dispatchCityCode = ciudad.codigo;
      data.dispatchCityName = ciudad.nombre;
      // C-222: el estado, para "Desde Aragua" en la tarjeta y el filtro del catálogo
      data.dispatchStateName = ciudad.estado;
    }
  }
  // C-227: a quién le llegan sus ventas ("¡Se vendió su producto!") y su WhatsApp. Vacío = sin cargar
  if (body?.contactName !== undefined) {
    const nombre = typeof body.contactName === 'string' ? body.contactName.trim().replace(/\s+/g, ' ') : '';
    if (nombre.length > 80) return NextResponse.json({ error: 'El nombre del contacto lleva hasta 80 caracteres' }, { status: 400 });
    data.contactName = nombre || null;
  }
  if (body?.contactEmail !== undefined) {
    // C-246: hasta 3 correos de despacho, separados por coma: cada venta les llega a todos
    const correos = leerCorreos(body.contactEmail ?? '');
    if (correos === null) return NextResponse.json({ error: `Revisa los correos de despacho: hasta ${CORREOS_MAX}, separados por coma` }, { status: 400 });
    data.contactEmail = correos.length > 0 ? correos.join(', ') : null;
  }
  if (body?.contactWhatsapp !== undefined) {
    const numero = typeof body.contactWhatsapp === 'string' ? body.contactWhatsapp.trim() : '';
    const digitos = numero.replace(/\D/g, '');
    if (numero && (!/^[+\d\s()-]+$/.test(numero) || digitos.length < 10 || digitos.length > 15)) {
      return NextResponse.json({ error: 'El WhatsApp lleva de 10 a 15 dígitos, con el código del país (+58)' }, { status: 400 });
    }
    data.contactWhatsapp = numero || null;
  }
  // C-246: sus datos fiscales, como en su RIF. Vacío = sin cargar
  if (body?.legalName !== undefined) {
    const razon = limpiarTexto(body.legalName ?? '', RAZON_SOCIAL_MAX);
    if (razon === null) return NextResponse.json({ error: `La razón social lleva hasta ${RAZON_SOCIAL_MAX} caracteres` }, { status: 400 });
    data.legalName = razon || null;
  }
  if (body?.taxId !== undefined) {
    const escrito = typeof body.taxId === 'string' ? body.taxId.trim() : '';
    const rif = escrito ? normalizarRif(escrito) : null;
    if (escrito && !rif) return NextResponse.json({ error: 'El RIF lleva una letra y 9 números, como J-30838235-3' }, { status: 400 });
    data.taxId = rif;
  }
  if (body?.fiscalAddress !== undefined) {
    const domicilio = limpiarTexto(body.fiscalAddress ?? '', DOMICILIO_MAX);
    if (domicilio === null) return NextResponse.json({ error: `El domicilio fiscal lleva hasta ${DOMICILIO_MAX} caracteres` }, { status: 400 });
    data.fiscalAddress = domicilio || null;
  }
  const guardado = await prisma.supplier.update({ where: { id }, data });
  await registrarAccionAdmin(session, 'PANEL_RECORD_UPDATED', { type: 'SUPPLIER', id }, {
    accion: 'Proveedor cambiado', proveedor: guardado.name,
    ...(data.discountPercent !== undefined && data.discountPercent !== Number(actual.discountPercent) ? { descuento: { antes: Number(actual.discountPercent), despues: data.discountPercent } } : {}),
    ...(data.noShipTerms !== undefined ? { noSeEnvia: data.noShipTerms.length === 0 ? 'la lista de siempre' : data.noShipTerms } : {}),
    ...(data.dispatchCityCode !== undefined ? { despachaDesde: { antes: actual.dispatchCityName ?? 'la tienda', despues: data.dispatchCityName ?? 'la tienda' } } : {}),
    ...(data.contactEmail !== undefined && data.contactEmail !== actual.contactEmail ? { correoDeDespacho: { antes: actual.contactEmail, despues: data.contactEmail } } : {}),
    ...(data.taxId !== undefined && data.taxId !== actual.taxId ? { rif: { antes: actual.taxId, despues: data.taxId } } : {}),
    ...(data.legalName !== undefined && data.legalName !== actual.legalName ? { razonSocial: { antes: actual.legalName, despues: data.legalName } } : {}),
  }, request);
  // C-199: cambia de dónde salen sus productos publicados (la ficha, la tarjeta y el envío)
  if (data.dispatchCityCode !== undefined && data.dispatchCityCode !== actual.dispatchCityCode) revalidateStorefront();
  return NextResponse.json({ id: guardado.id, name: guardado.name, discountPercent: Number(guardado.discountPercent), pricesIncludeTax: guardado.pricesIncludeTax, notes: guardado.notes, noShipTerms: guardado.noShipTerms, dispatchCityCode: guardado.dispatchCityCode, dispatchCityName: guardado.dispatchCityName, contactName: guardado.contactName, contactEmail: guardado.contactEmail, contactWhatsapp: guardado.contactWhatsapp, bienvenidaAt: guardado.bienvenidaAt, legalName: guardado.legalName, taxId: guardado.taxId, fiscalAddress: guardado.fiscalAddress });
}

// Se borra solo si no tiene productos (ni en la papelera): el costo y el código de cada producto dependen de él
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  const { id } = await params;
  const proveedor = await prisma.supplier.findUnique({ where: { id }, select: { name: true, _count: { select: { products: true } } } });
  if (!proveedor) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
  if (proveedor._count.products > 0) {
    return NextResponse.json({ error: `Tiene ${proveedor._count.products} ${proveedor._count.products === 1 ? 'producto' : 'productos'}: cámbialos de proveedor primero` }, { status: 409 });
  }
  await prisma.supplier.delete({ where: { id } });
  await registrarAccionAdmin(session, 'PANEL_RECORD_UPDATED', { type: 'SUPPLIER', id }, { accion: 'Proveedor borrado', proveedor: proveedor.name }, request);
  return NextResponse.json({ ok: true });
}
