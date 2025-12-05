import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authorized to manage users
    if (!isAuthorized(session, 'MANAGE_USERS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      role: 'USER', // Only show actual customers, not admins
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get customers with order counts and totals
    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          orders: {
            select: {
              id: true,
              totalUSD: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Calculate stats for each customer
    const customersWithStats = customers.map((customer) => {
      const orders = customer.orders || [];
      const totalSpent = orders.reduce((sum, order) => sum + Number(order.totalUSD || 0), 0);
      const orderCount = orders.length;
      const activeOrders = orders.filter((o) =>
        ['PENDING', 'PROCESSING', 'SHIPPED'].includes(o.status)
      ).length;

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        image: customer.image,
        createdAt: customer.createdAt,
        orderCount,
        totalSpent,
        activeOrders,
      };
    });

    // Calculate overall stats
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [totalCustomers, thisMonthCustomers, activeCustomers] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({
        where: {
          role: 'USER',
          createdAt: {
            gte: thisMonth,
          },
        },
      }),
      prisma.user.count({
        where: {
          role: 'USER',
          orders: {
            some: {
              status: {
                in: ['PENDING', 'PROCESSING', 'SHIPPED'],
              },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      customers: customersWithStats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: totalCustomers,
        thisMonth: thisMonthCustomers,
        active: activeCustomers,
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

