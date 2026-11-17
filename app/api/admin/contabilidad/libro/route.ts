import { NextRequest, NextResponse } from 'next/server';
import { libroVentasXlsx } from '@/lib/contabilidad/libro-excel';
import { periodoDe } from '@/lib/contabilidad/montos';
import { sesionCon } from '@/lib/contabilidad/ruta';
import { datosEmpresa, libroDeVentas } from '@/lib/contabilidad/servidor';
import { TIPO_XLSX } from '@/lib/excel/xlsx';
import { rangoMes } from '@/lib/relacion-ventas';

/**
 * GET /api/admin/contabilidad/libro?mes=2026-11 (C-230): el libro de ventas del mes en Excel, con las columnas que pidió la
 * contadora. Lo descargan el dueño y la contadora (VER_CONTABILIDAD); quien solo factura, no.
 */
export async function GET(request: NextRequest) {
  const s = await sesionCon('VER_CONTABILIDAD');
  if (s instanceof NextResponse) return s;
  const pedido = request.nextUrl.searchParams.get('mes');
  const actual = periodoDe(new Date());
  if (pedido !== null && (!rangoMes(pedido) || pedido > actual)) {
    return NextResponse.json({ error: 'El mes no es válido: va como 2026-11 y no puede ser uno que no ha llegado.', campo: 'mes' }, { status: 400 });
  }
  const mes = pedido ?? actual;
  const [libro, empresa] = await Promise.all([libroDeVentas(mes), datosEmpresa()]);
  const archivo = libroVentasXlsx(libro, { nombre: empresa.nombre || 'Electro Shop', rif: empresa.rif });
  return new NextResponse(new Uint8Array(archivo.datos), {
    headers: {
      'Content-Type': TIPO_XLSX,
      'Content-Disposition': `attachment; filename="${archivo.nombre}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
