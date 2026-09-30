import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { INTERNAL_SPEC_KEYS, parseSpecsObject } from '@/lib/product-specs';
import { claveNombre, combinarSugerencias, formaPreferida } from '@/lib/spec-sugerencias';

// GET /api/admin/products/spec-sugerencias?categoryId=… (C-136): nombres y valores de especificaciones que más usan
// los productos de esa categoría, más la lista base según el tipo de categoría. Solo lectura.

const VALORES_POR_NOMBRE = 6;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const categoryId = new URL(request.url).searchParams.get('categoryId')?.slice(0, 40) ?? '';
  const categoria = categoryId
    ? await prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } })
    : null;

  const productos = categoria
    ? await prisma.product.findMany({
        where: { categoryId, productType: 'PHYSICAL' },
        select: { specs: true },
        orderBy: { updatedAt: 'desc' },
        take: 300,
      })
    : [];

  // Cuántos productos usan cada nombre (juntando "TAMAÑO" y "Tamaño") y con qué valores
  const conteo = new Map<string, { nombres: Map<string, number>; usos: number; valores: Map<string, number> }>();
  const internas = new Set<string>(INTERNAL_SPEC_KEYS);
  for (const p of productos) {
    for (const [nombre, valor] of Object.entries(parseSpecsObject(p.specs))) {
      if (internas.has(nombre) || typeof valor !== 'string' || !valor.trim() || nombre.length > 60) continue;
      const clave = claveNombre(nombre);
      const fila = conteo.get(clave) ?? { nombres: new Map(), usos: 0, valores: new Map() };
      fila.usos += 1;
      fila.nombres.set(nombre.trim(), (fila.nombres.get(nombre.trim()) ?? 0) + 1);
      const v = valor.trim().slice(0, 80);
      fila.valores.set(v, (fila.valores.get(v) ?? 0) + 1);
      conteo.set(clave, fila);
    }
  }
  const masUsado = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || formaPreferida(a[0], b[0])).map(([k]) => k);
  const aprendido = [...conteo.values()]
    .sort((a, b) => b.usos - a.usos)
    .map((fila) => ({ nombre: masUsado(fila.nombres)[0], valores: masUsado(fila.valores).slice(0, VALORES_POR_NOMBRE) }));

  return NextResponse.json(combinarSugerencias(categoria?.name ?? '', aprendido));
}
