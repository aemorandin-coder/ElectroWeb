import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/auth-helpers';
import {
  calcularHojaIva, listarCompras, obtenerMovimientosMes, sincronizarObligacionesMes,
} from '@/lib/contabilidad/hub';
import { contadoraConFirma, firmaDe } from '@/lib/contabilidad/mesa';
import { periodoDe } from '@/lib/contabilidad/montos';
import { paqueteContableXlsx } from '@/lib/contabilidad/paquete-excel';
import { sesionCon } from '@/lib/contabilidad/ruta';
import { datosEmpresa, libroDeVentas } from '@/lib/contabilidad/servidor';
import { TIPO_XLSX } from '@/lib/excel/xlsx';
import { rangoMes } from '@/lib/relacion-ventas';

/** GET /api/admin/contabilidad/paquete?mes=YYYY-MM (G-76): paquete Excel integral de 5 pestañas. */
export async function GET(request: NextRequest) {
  const s = await sesionCon('VER_CONTABILIDAD');
  if (s instanceof NextResponse) return s;
  const pedido = request.nextUrl.searchParams.get('mes');
  const actual = periodoDe(new Date());
  if (pedido !== null && (!rangoMes(pedido) || pedido > actual)) {
    return NextResponse.json({ error: 'El mes no es válido (YYYY-MM).', campo: 'mes' }, { status: 400 });
  }
  const mes = pedido ?? actual;
  const esContadora = !isAuthorized(s.session, 'CONFIG_CONTABLE');

  const [libro, compras, iva, obligaciones, movimientos, empresa, mia, contadora] = await Promise.all([
    libroDeVentas(mes),
    listarCompras(mes),
    calcularHojaIva(mes),
    sincronizarObligacionesMes(mes),
    obtenerMovimientosMes(mes, false), // Jamás van costos en el paquete de Excel
    datosEmpresa(),
    esContadora ? firmaDe(s.usuarioId) : Promise.resolve(null),
    esContadora ? Promise.resolve(null) : contadoraConFirma(),
  ]);

  const firma = esContadora ? mia : contadora?.firma ?? null;
  const archivo = paqueteContableXlsx({
    libro,
    compras: compras.items,
    iva,
    obligaciones,
    movimientos,
    empresa: { nombre: empresa.nombre || 'Electro Shop', rif: empresa.rif },
    firma,
  });

  return new NextResponse(new Uint8Array(archivo.datos), {
    headers: {
      'Content-Type': TIPO_XLSX,
      'Content-Disposition': `attachment; filename="${archivo.nombre}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
