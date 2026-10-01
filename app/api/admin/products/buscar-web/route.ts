import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { buscarProductoEnLaWeb } from '@/lib/busqueda-web';

// POST /api/admin/products/buscar-web (C-155): busca un producto en la web y devuelve sugerencias para el asistente
// (marca, código de barras, peso y medidas de la caja, especificaciones y un borrador de descripción).
// No guarda nada: el asistente muestra lo hallado y quien edita el producto decide qué usar.
// La dirección de cada página la elige un buscador, no quien llama: aquí solo entran el nombre y el modelo.

const pedido = z.object({
  nombre: z.string().trim().min(3, 'Escribe el nombre del producto (al menos 3 letras)').max(150),
  modelo: z.string().trim().max(60).optional(),
  categoryId: z.string().trim().max(40).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS') || !session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  // Cada búsqueda lee hasta doce páginas ajenas y gasta cupo de la IA: 6 por minuto por persona alcanzan
  const limite = checkRateLimit(session.user.id, 'admin:productos:buscar-web', { maxRequests: 6, windowSeconds: 60 });
  if (!limite.success) {
    return NextResponse.json({ error: `Demasiadas búsquedas seguidas. Espera ${limite.resetIn} s y vuelve a intentar.` }, { status: 429 });
  }

  const datos = pedido.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message || 'Datos inválidos' }, { status: 400 });
  }
  const categoria = datos.data.categoryId
    ? await prisma.category.findUnique({ where: { id: datos.data.categoryId }, select: { name: true } })
    : null;

  try {
    const resultado = await buscarProductoEnLaWeb({ nombre: datos.data.nombre, modelo: datos.data.modelo, categoria: categoria?.name });
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error en la búsqueda web de un producto:', error);
    return NextResponse.json({ error: 'La búsqueda falló. El producto se puede llenar a mano.' }, { status: 502 });
  }
}
