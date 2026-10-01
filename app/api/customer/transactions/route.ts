import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { aMovimientoDTO, numeroDeOrden } from '@/lib/dto/movimiento';

// GET /api/customer/transactions — los movimientos de Puntos ES del cliente (C-139).
// ?tipo=RECHARGE|PURCHASE|REFUND|DEPOSIT · ?cursor=<id del último que ya tiene> · ?limite=20 (máximo 50)
// La primera página (sin cursor) trae también el resumen: Puntos ES, recargado, usado y recargas por confirmar.
// Antes devolvía las filas de Prisma tal cual (con `metadata`) y aceptaba cualquier `limit`.

const FILTROS: Record<string, Prisma.TransactionWhereInput> = {
  RECHARGE: { type: 'RECHARGE' },
  PURCHASE: { type: 'PURCHASE' },
  REFUND: { type: 'REFUND' },
  // Abonos que no son recargas ni devoluciones: gift cards canjeadas, comisiones y ajustes de la tienda
  DEPOSIT: { type: { in: ['DEPOSIT', 'BONUS'] } },
};
const LIMITE_MAXIMO = 50;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const userId = session.user.id;
    const params = req.nextUrl.searchParams;
    const tipo = params.get('tipo') ?? '';
    if (tipo && !FILTROS[tipo]) return NextResponse.json({ error: 'Filtro inválido' }, { status: 400 });
    const cursor = params.get('cursor');
    if (cursor && !/^[a-z0-9]{10,40}$/.test(cursor)) return NextResponse.json({ error: 'Cursor inválido' }, { status: 400 });
    const limite = Math.min(LIMITE_MAXIMO, Math.max(1, Number.parseInt(params.get('limite') ?? '', 10) || 20));

    const saldo = await prisma.userBalance.findUnique({
      where: { userId },
      select: { id: true, balance: true, totalRecharges: true, totalSpent: true },
    });
    const resumenVacio = { puntos: 0, recargado: 0, usado: 0, porConfirmar: { cantidad: 0, monto: 0 } };
    if (!saldo) {
      return NextResponse.json({ movimientos: [], siguiente: null, ...(cursor ? {} : { resumen: resumenVacio }) });
    }

    // El cursor tiene que ser un movimiento de este cliente: con uno ajeno Prisma respondería vacío, pero se dice claro
    if (cursor && !(await prisma.transaction.count({ where: { id: cursor, balanceId: saldo.id } }))) {
      return NextResponse.json({ error: 'Cursor inválido' }, { status: 400 });
    }

    const [filas, pendientes] = await Promise.all([
      prisma.transaction.findMany({
        where: { balanceId: saldo.id, ...(tipo ? FILTROS[tipo] : {}) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limite + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      cursor
        ? null
        : prisma.transaction.aggregate({
            where: { balanceId: saldo.id, type: 'RECHARGE', status: 'PENDING' },
            _count: true,
            _sum: { amount: true },
          }),
    ]);
    const hayMas = filas.length > limite;
    const pagina = hayMas ? filas.slice(0, limite) : filas;

    // Enlace al pedido: solo órdenes de este cliente (el número sale de la referencia o de la descripción)
    const numeros = [...new Set(pagina.map(numeroDeOrden).filter((n): n is string => Boolean(n)))];
    const ordenes = numeros.length
      ? await prisma.order.findMany({ where: { userId, orderNumber: { in: numeros } }, select: { id: true, orderNumber: true } })
      : [];
    const pedidos = new Map(ordenes.map((o) => [o.orderNumber, o.id]));

    return NextResponse.json({
      movimientos: pagina.map((tx) => aMovimientoDTO(tx, pedidos)),
      siguiente: hayMas ? pagina[pagina.length - 1].id : null,
      ...(pendientes
        ? {
            resumen: {
              puntos: Number(saldo.balance),
              recargado: Number(saldo.totalRecharges),
              usado: Number(saldo.totalSpent),
              porConfirmar: { cantidad: pendientes._count, monto: Number(pendientes._sum.amount ?? 0) },
            },
          }
        : {}),
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Error al obtener tus movimientos' }, { status: 500 });
  }
}
