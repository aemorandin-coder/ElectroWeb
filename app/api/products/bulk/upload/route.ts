import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

interface ProductRow {
  nombre: string;
  sku: string;
  descripcion?: string;
  categoria?: string;
  precioUSD: string;
  stock: string;
  stockMinimo?: string;
  activo?: string;
  destacado?: string;
  imagenes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { csvData } = body;

    if (!csvData || !Array.isArray(csvData)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Obtener todas las categorías para mapeo
    const categories = await prisma.category.findMany();
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i] as ProductRow;

      try {
        // Validaciones básicas
        if (!row.nombre || !row.sku || !row.precioUSD) {
          results.failed++;
          results.errors.push({
            row: i + 2, // +2 porque la primera fila es header y arrays son 0-indexed
            error: 'Campos requeridos faltantes (nombre, sku, precioUSD)',
          });
          continue;
        }

        // Buscar categoría
        let categoryId = null;
        if (row.categoria) {
          categoryId = categoryMap.get(row.categoria.toLowerCase());
          if (!categoryId) {
            // Crear categoría si no existe
            const newCategory = await prisma.category.create({
              data: {
                name: row.categoria,
                slug: row.categoria
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-+|-+$/g, ''),
              },
            });
            categoryId = newCategory.id;
            categoryMap.set(row.categoria.toLowerCase(), categoryId);
          }
        }

        // Generar slug
        const slug = row.nombre
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Procesar imágenes (hasta 4)
        const images = row.imagenes
          ? row.imagenes
              .split(',')
              .map(url => url.trim())
              .filter(url => url)
              .slice(0, 4) // Máximo 4 imágenes
          : [];

        // Determinar status basado en el campo activo
        const isActive = row.activo?.toLowerCase() === 'true' || row.activo === '1';
        const productStatus = isActive ? 'PUBLISHED' : 'DRAFT';

        // Crear producto
        await prisma.product.create({
          data: {
            name: row.nombre,
            slug,
            sku: row.sku,
            description: row.descripcion || 'Sin descripción',
            priceUSD: parseFloat(row.precioUSD),
            stock: parseInt(row.stock) || 0,
            minStock: row.stockMinimo ? parseInt(row.stockMinimo) : 0,
            status: productStatus,
            isFeatured: row.destacado?.toLowerCase() === 'true' || row.destacado === '1',
            categoryId: categoryId!,
            images: JSON.stringify(images),
            mainImage: images.length > 0 ? images[0] : null,
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          error: error.message || 'Error desconocido',
          data: row,
        });
      }
    }

    return NextResponse.json({
      message: 'Carga masiva completada',
      results,
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    return NextResponse.json({ error: 'Error al procesar carga masiva' }, { status: 500 });
  }
}
