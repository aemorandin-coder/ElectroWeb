import { NextRequest, NextResponse } from 'next/server';
import { aCotizacionPublica, buscarCotizacion } from '@/lib/cotizaciones';
import { empresaCotizacion, enlaceCotizacion } from '@/lib/cotizaciones/empresa';
import { exigirNumen, responder } from '@/lib/cotizaciones/numen';
import { presupuestoPdf } from '@/lib/cotizaciones/pdf';

// GET /api/numen/cotizaciones/<id>/pdf (C-182): el presupuesto en PDF, para que Numen lo mande por WhatsApp junto con
// el enlace. Solo las cotizaciones que creó Numen. ?tinta=bn: en blanco y negro.

export const dynamic = 'force-dynamic';

const ID = /^[a-z0-9]{10,40}$/;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const freno = exigirNumen(request);
  if (freno) return freno;
  const { id } = await params;
  const q = ID.test(id) ? await buscarCotizacion(id) : null;
  if (!q || q.externalRef === null) return responder({ error: 'Esa cotización no existe o no es de Numen.' }, 404);

  const publica = aCotizacionPublica(q);
  const pdf = await presupuestoPdf(publica, await empresaCotizacion(), {
    enlace: enlaceCotizacion(q.token),
    bn: request.nextUrl.searchParams.get('tinta') === 'bn',
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Presupuesto ${publica.number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
