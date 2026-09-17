import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { isAuthorized } from '@/lib/auth-helpers';
import { createNotification } from '@/lib/notifications';
import { emitAdminEvent } from '@/lib/admin-events';
import { formatUSD } from '@/lib/currency';
import { verifyCaptcha } from '@/lib/captcha';
import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/lib/rate-limit';
import { z } from 'zod';

// Solo usuarios con cuenta (decisión de Andrés, C-08): máximo 5 solicitudes por hora por usuario
const PRODUCT_REQUEST_LIMIT = { maxRequests: 5, windowSeconds: 3600 };

const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max).optional());

const productRequestSchema = z.object({
  customerName: z.string().trim().min(2, 'Ingresa tu nombre').max(100),
  customerEmail: z.string().trim().email('Correo inválido').max(200),
  customerPhone: optionalText(30),
  productName: z.string().trim().min(2, 'Indica el producto que buscas').max(150),
  description: optionalText(2000),
  category: optionalText(60),
  estimatedBudget: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().finite().min(0).max(10_000_000).optional()
  ),
});

// GET - Get all product requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // SEGURIDAD: incluye nombre, correo y teléfono de los clientes; solo para el admin
    // (Solicitudes usa MANAGE_PRODUCTS y Mensajes y Alertas MANAGE_CONTENT)
    if (!isAuthorized(session, 'MANAGE_PRODUCTS') && !isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Prisma.ProductRequestWhereInput = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    const requests = await prisma.productRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching product requests:', error);
    return NextResponse.json({ error: 'Error al obtener solicitudes' }, { status: 500 });
  }
}

// POST - Create new product request
export async function POST(request: NextRequest) {
  try {
    // Solo con cuenta: responde 401 en JSON (el formulario muestra el mensaje)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Inicia sesión para solicitar un producto.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    // SEGURIDAD: el captcha se verifica en el servidor, no solo en el navegador
    const captcha = await verifyCaptcha(body?.captchaToken, getClientIP(request));
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: captcha.status });
    }

    // El formulario envía productDescription; se acepta también description
    const parsed = productRequestSchema.safeParse({
      ...body,
      description: body?.productDescription ?? body?.description,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: issue.message, field: issue.path[0] }, { status: 400 });
    }
    const data = parsed.data;

    // Solo cuentan las solicitudes válidas (un error de tipeo no gasta intentos)
    const rateLimit = checkRateLimit(userId, 'product-requests:create', PRODUCT_REQUEST_LIMIT);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Ya enviaste varias solicitudes. Intenta de nuevo en una hora.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit, PRODUCT_REQUEST_LIMIT) }
      );
    }

    const productRequest = await prisma.productRequest.create({
      data: {
        userId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone ?? null,
        productName: data.productName,
        description: data.description ?? null,
        category: data.category ?? null,
        estimatedBudget: data.estimatedBudget ?? null,
        status: 'PENDING',
      },
    });

    await createNotification({
      userId,
      type: 'SYSTEM_UPDATE',
      title: 'Solicitud de producto recibida',
      message: `Tu solicitud para "${data.productName}" ha sido recibida. Te notificaremos cuando tengamos novedades.`,
      link: `/customer`,
    });

    // Antes de C-73 el equipo no se enteraba: la función que avisaba a los admins nunca se llamaba
    emitAdminEvent({
      type: 'PRODUCT_REQUESTED',
      title: `Solicitud de producto · ${data.productName}`.slice(0, 150),
      summary: `${data.customerName} busca un producto que no está en el catálogo`,
      fields: [
        ['Producto', data.productName],
        ['Detalle', data.description?.slice(0, 300)],
        ['Presupuesto', data.estimatedBudget ? formatUSD(data.estimatedBudget) : null],
        ['Contacto', [data.customerEmail, data.customerPhone].filter(Boolean).join(' · ')],
      ],
      link: '/admin/inquiries',
    });

    return NextResponse.json(productRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating product request:', error);
    return NextResponse.json({ error: 'Error al crear solicitud' }, { status: 500 });
  }
}

// PATCH - Update product request
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const body = await request.json();

    const productRequest = await prisma.productRequest.update({
      where: { id },
      data: {
        status: body.status,
        adminNotes: body.adminNotes,
      },
    });

    return NextResponse.json(productRequest);
  } catch (error) {
    console.error('Error updating product request:', error);
    return NextResponse.json({ error: 'Error al actualizar solicitud' }, { status: 500 });
  }
}

// DELETE - Delete product request
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.productRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product request:', error);
    return NextResponse.json({ error: 'Error al eliminar solicitud' }, { status: 500 });
  }
}
