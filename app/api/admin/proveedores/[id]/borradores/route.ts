import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { checkRateLimit } from '@/lib/rate-limit';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import {
  DESCRIPCION_MAX, PUBLICAR_LOTE, completarConLaWeb, listarBorradores, marcarRevisado, publicarListos,
} from '@/lib/proveedores/borradores';

type Ctx = { params: Promise<{ id: string }> };

// C-204: los borradores de un proveedor, para terminarlos en lote (lib/proveedores/borradores.ts).
// GET → la lista de control de cada uno.
// POST:
// - completar {id}: lo busca en la web (C-155) y llena lo vacío; queda "por revisar".
// - revisado {id, desde, descripcion?}: lo que trajo la web ya se miró (y, si viene, la descripción corregida).
// - publicar {ids}: publica los que estén listos; el servidor revisa cada uno otra vez.

async function autorizar(params: Ctx['params']) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS') || !session?.user?.id) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 }) } as const;
  }
  const { id } = await params;
  const proveedor = await prisma.supplier.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!proveedor) return { error: NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 }) } as const;
  return { session, proveedor } as const;
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const a = await autorizar(params);
  if ('error' in a) return a.error;
  try {
    return NextResponse.json(await listarBorradores(a.proveedor.id), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Borradores del proveedor:', error);
    return NextResponse.json({ error: 'No se pudieron cargar los borradores' }, { status: 500 });
  }
}

const idValido = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]{10,40}$/i.test(v);

export async function POST(request: NextRequest, { params }: Ctx) {
  const a = await autorizar(params);
  if ('error' in a) return a.error;
  const { session, proveedor } = a;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });

  try {
    if (body.accion === 'completar') {
      if (!idValido(body.id)) return NextResponse.json({ error: 'Producto inválido' }, { status: 400 });
      // El mismo cupo que la búsqueda del asistente: cada una lee hasta doce páginas ajenas y gasta cupo de la IA
      const limite = checkRateLimit(session.user.id, 'admin:productos:buscar-web', { maxRequests: 6, windowSeconds: 60 });
      if (!limite.success) {
        return NextResponse.json({ error: `Demasiadas búsquedas seguidas. Espera ${limite.resetIn} s.`, esperar: limite.resetIn }, { status: 429 });
      }
      const r = await completarConLaWeb(proveedor.id, body.id);
      if (r.estado !== 'ok') {
        return r.estado === 'no-esta'
          ? NextResponse.json({ error: 'Ya no es un borrador de este proveedor' }, { status: 404 })
          : NextResponse.json({ error: 'Otra persona lo cambió mientras se buscaba: no se tocó' }, { status: 409 });
      }
      if (r.llenado.length > 0) {
        await registrarAccionAdmin(session, 'PRODUCT_UPDATED', { type: 'PRODUCT', id: r.fila.id }, {
          producto: r.fila.name, campos: r.llenado, origen: 'Búsqueda en la web (lista de control)', proveedor: proveedor.name,
        }, request);
      }
      return NextResponse.json(r);
    }

    if (body.accion === 'revisado') {
      if (!idValido(body.id) || typeof body.desde !== 'string') return NextResponse.json({ error: 'Producto inválido' }, { status: 400 });
      let descripcion: string | null = null;
      if (body.descripcion !== undefined) {
        if (typeof body.descripcion !== 'string') return NextResponse.json({ error: 'Descripción inválida' }, { status: 400 });
        descripcion = body.descripcion.replace(/\r\n/g, '\n').trim();
        if (descripcion.length > DESCRIPCION_MAX) return NextResponse.json({ error: `La descripción pasa de ${DESCRIPCION_MAX} caracteres` }, { status: 400 });
      }
      const r = await marcarRevisado(proveedor.id, body.id, body.desde, descripcion);
      if (r.estado !== 'ok') {
        return r.estado === 'no-esta'
          ? NextResponse.json({ error: 'Ya no es un borrador de este proveedor' }, { status: 404 })
          : NextResponse.json({ error: 'Otra persona lo cambió: vuelve a cargar la lista' }, { status: 409 });
      }
      await registrarAccionAdmin(session, 'PRODUCT_UPDATED', { type: 'PRODUCT', id: r.fila.id }, {
        producto: r.fila.name, campos: descripcion !== null ? ['descripción', 'revisado'] : ['revisado'], origen: 'Lista de control',
      }, request);
      return NextResponse.json(r);
    }

    if (body.accion === 'publicar') {
      const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter(idValido))] : [];
      if (ids.length === 0 || ids.length > PUBLICAR_LOTE) return NextResponse.json({ error: `De 1 a ${PUBLICAR_LOTE} productos por envío` }, { status: 400 });
      const r = await publicarListos(proveedor.id, ids);
      if (r.publicados > 0) {
        revalidateStorefront();
        await registrarAccionAdmin(session, 'PRODUCT_UPDATED', { type: 'PRODUCT' }, {
          accion: 'Publicados en lote (lista de control)', proveedor: proveedor.name, productos: r.publicados, nombres: r.nombres,
        }, request);
      }
      return NextResponse.json(r);
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (error) {
    console.error('Borradores del proveedor:', error);
    return NextResponse.json({ error: 'No se pudo completar' }, { status: 500 });
  }
}
