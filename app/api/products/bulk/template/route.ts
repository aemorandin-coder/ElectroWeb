import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any).permissions?.includes('MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Template CSV con columnas en español
    const template = `nombre,sku,descripcion,categoria,precioUSD,stock,stockMinimo,activo,destacado,imagenes
Laptop Gaming ROG,SKU-001,"Laptop de alto rendimiento para gaming",Laptops,1299.99,10,2,true,true,"https://example.com/img1.jpg,https://example.com/img2.jpg"
Mouse Inalámbrico MX,SKU-002,"Mouse ergonómico inalámbrico",Accesorios,79.99,50,10,true,false,https://example.com/mouse.jpg
Teclado Mecánico RGB,SKU-003,"Teclado mecánico con iluminación RGB",Accesorios,149.99,30,5,true,true,"https://example.com/keyboard1.jpg,https://example.com/keyboard2.jpg,https://example.com/keyboard3.jpg"`;

    return new NextResponse(template, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="plantilla_productos.csv"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json({ error: 'Error al generar plantilla' }, { status: 500 });
  }
}
