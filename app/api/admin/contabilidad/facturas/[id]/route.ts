import { NextResponse } from 'next/server';
import { LEER_FACTURAS, sesionCon } from '@/lib/contabilidad/ruta';
import { facturaPorId } from '@/lib/contabilidad/servidor';

/** GET /api/admin/contabilidad/facturas/[id] (C-229): una factura registrada, con su talonario y sus órdenes. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await sesionCon(LEER_FACTURAS);
  if (s instanceof NextResponse) return s;
  const { id } = await params;
  const factura = await facturaPorId(id);
  if (!factura) return NextResponse.json({ error: 'No se encontró la factura.' }, { status: 404 });
  return NextResponse.json({ factura });
}
