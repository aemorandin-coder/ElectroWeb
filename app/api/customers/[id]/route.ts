import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { normalizarCorreo } from '@/lib/correo';
import { isAuthorized } from '@/lib/auth-helpers';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { fichaDelCliente } from '@/lib/clientes/ficha';
import { CAMPOS_EDITABLES, problemaDe, type CampoEditable, type DatosEditables } from '@/lib/clientes/edicion';
import { datosEditablesDe } from '@/lib/clientes/datos-editables';
import { reenviarActivacion } from '@/lib/clientes/activacion';

/**
 * C-141: esta API es solo de clientes. Antes aceptaba cualquier id: un Administrador podía cambiarle el correo
 * al dueño (y pedir después "recuperar contraseña") o borrar una cuenta del equipo. El equipo se maneja en Equipo.
 * (datosEditablesDe y fichaDelCliente buscan siempre role 'USER'.)
 */

// GET - La ficha del cliente (C-276: la misma lista blanca que la página; antes salía la fila de Prisma con el perfil entero)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_USERS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const { id } = await params;
    const ficha = await fichaDelCliente(id);
    if (!ficha) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    return NextResponse.json(ficha);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 });
  }
}

// PUT - Cambiar sus datos (C-276: "Editar" de la ficha).
// Llegan solo los campos que cambiaron, con el valor que tenían cuando se abrió el asistente (`antes`): si otra persona
// cambió ese mismo campo mientras tanto, no se pisa (409). Cambiar el correo lo deja sin verificar (la dirección nueva no
// está comprobada), anula los enlaces de activación y de clave que se mandaron a la anterior y le manda uno nuevo a la
// dirección nueva. Queda en la bitácora qué campos cambiaron (sin los valores).
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_USERS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const { id } = await params;
    const actual = await datosEditablesDe(id);
    if (!actual) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    const body = (await request.json().catch(() => null)) as { cambios?: Record<string, unknown>; antes?: Record<string, unknown> } | null;
    const cambiosRecibidos = body?.cambios && typeof body.cambios === 'object' ? body.cambios : {};
    const antes = body?.antes && typeof body.antes === 'object' ? body.antes : {};
    const campos = Object.keys(cambiosRecibidos).filter((c): c is CampoEditable => (CAMPOS_EDITABLES as readonly string[]).includes(c));
    if (campos.length === 0) return NextResponse.json({ error: 'No cambiaste nada' }, { status: 400 });

    const nuevos: DatosEditables = { ...actual };
    for (const c of campos) {
      const v = cambiosRecibidos[c];
      if (typeof v !== 'string') return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
      nuevos[c] = c === 'correo' ? normalizarCorreo(v) : c === 'rif' ? v.trim().toUpperCase() : v.trim();
    }
    // Lo que cambió otra persona mientras tanto
    const pisados = campos.filter((c) => typeof antes[c] === 'string' && (antes[c] as string).trim() !== actual[c].trim());
    if (pisados.length > 0) {
      return NextResponse.json({ error: 'Otra persona cambió estos datos mientras los editabas. Recarga para ver cómo quedaron.', conflicto: 'cambiado', campos: pisados }, { status: 409 });
    }
    for (const c of campos) {
      const problema = problemaDe(c, nuevos[c], nuevos);
      if (problema) return NextResponse.json({ error: problema, campo: c }, { status: 400 });
    }
    const cambiados = campos.filter((c) => nuevos[c] !== actual[c]);
    if (cambiados.length === 0) return NextResponse.json({ ok: true, campos: [] });

    const cambiaCorreo = cambiados.includes('correo');
    if (cambiaCorreo) {
      const otro = await prisma.user.findFirst({ where: { email: { equals: nuevos.correo, mode: 'insensitive' }, NOT: { id } }, select: { id: true } });
      if (otro) return NextResponse.json({ error: 'Ese correo ya lo usa otra cuenta', campo: 'correo' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          ...(cambiados.includes('nombre') && { name: nuevos.nombre }),
          ...(cambiaCorreo && { email: nuevos.correo, emailVerified: null }),
        },
      }),
      ...(cambiaCorreo ? [prisma.emailVerificationToken.deleteMany({ where: { userId: id } }), prisma.passwordResetToken.deleteMany({ where: { userId: id } })] : []),
      prisma.profile.upsert({
        where: { userId: id },
        update: {
          ...(cambiados.includes('telefono') && { phone: nuevos.telefono || null }),
          ...(cambiados.includes('whatsapp') && { whatsapp: nuevos.whatsapp || null }),
          ...(cambiados.includes('tipo') && { customerType: nuevos.tipo }),
          ...(cambiados.includes('empresa') && { companyName: nuevos.empresa || null }),
          ...(cambiados.includes('rif') && { taxId: nuevos.rif || null }),
        },
        create: {
          userId: id, phone: nuevos.telefono || null, whatsapp: nuevos.whatsapp || null, customerType: nuevos.tipo,
          companyName: nuevos.empresa || null, taxId: nuevos.rif || null,
        },
      }),
    ]);
    await registrarAccionAdmin(session, 'USER_UPDATED', { type: 'USER', id }, { cliente: cambiaCorreo ? nuevos.correo : actual.correo, campos: cambiados }, request);
    const activacion = cambiaCorreo ? await reenviarActivacion(id) : null;
    return NextResponse.json({ ok: true, campos: cambiados, correoSinVerificar: cambiaCorreo, activacionEnviada: activacion?.ok ?? false });
  } catch (error: unknown) {
    console.error('Error updating customer:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ese correo ya lo usa otra cuenta', campo: 'correo' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}

// DELETE - Borrar la cuenta. PLAN.md §7 (17/09): se borra solo si no tiene órdenes, Puntos ES, movimientos ni gift cards;
// si tiene algo, se suspende (C-276: antes solo miraba las órdenes). Las reseñas y las garantías tampoco dejan borrarla
// (la base no lo permite). Sus firmas de documentos se conservan (no dependen de la cuenta).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_USERS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const { id } = await params;
    const cliente = await prisma.user.findFirst({ where: { id, role: 'USER' }, select: { id: true, email: true, balance: { select: { balance: true, _count: { select: { transactions: true } } } } } });
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    const [pedidos, giftCards, resenas, garantias] = await Promise.all([
      prisma.order.count({ where: { userId: id } }),
      prisma.giftCard.count({ where: { OR: [{ purchasedBy: id }, { redeemedBy: id }] } }),
      prisma.review.count({ where: { userId: id } }),
      prisma.warrantyClaim.count({ where: { userId: id } }),
    ]);
    const motivos = [
      pedidos > 0 && 'pedidos',
      Number(cliente.balance?.balance ?? 0) > 0 && 'Puntos ES',
      (cliente.balance?._count.transactions ?? 0) > 0 && 'movimientos de Puntos ES',
      giftCards > 0 && 'gift cards',
      resenas > 0 && 'reseñas',
      garantias > 0 && 'garantías',
    ].filter((m): m is string => Boolean(m));
    if (motivos.length > 0) {
      return NextResponse.json({ error: `Tiene ${motivos.join(', ')}: se suspende en vez de borrarse.`, suspender: true, motivos }, { status: 409 });
    }

    await prisma.user.delete({ where: { id } });
    await registrarAccionAdmin(session, 'USER_DELETED', { type: 'USER', id }, { cliente: cliente.email }, request);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
  }
}
