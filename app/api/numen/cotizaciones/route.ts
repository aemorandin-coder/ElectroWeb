import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { aCotizacionNumen, buscarCotizacion, buscarCotizacionPorRef, buscarCotizaciones, crearCotizacion } from '@/lib/cotizaciones';
import { aplicarAccion } from '@/lib/cotizaciones/acciones';
import { cotizacionSchema, totalesCotizacion } from '@/lib/cotizaciones/core';
import { autorSchema, correoDesdeNumen, errorDeValidacion, exigirNumen, registrarDeNumen, responder } from '@/lib/cotizaciones/numen';
import { getPublicSettings } from '@/lib/site-settings';

// Numen (C-181) crea cotizaciones y pregunta cómo van, de servidor a servidor con NUMEN_API_KEY.
// Los precios los pone el equipo en Numen, como en el panel; los totales, el IVA y el número los pone la tienda.
//   GET  /api/numen/cotizaciones?refs=a,b,c   el estado de varias (las de Numen, hasta 100)
//   POST /api/numen/cotizaciones              crea una; con `enviar` el cliente ya puede abrirla, con `correo` le llega

export const dynamic = 'force-dynamic';

const REF = /^[A-Za-z0-9_-]{4,60}$/;

export async function GET(request: NextRequest) {
  const freno = exigirNumen(request);
  if (freno) return freno;
  const refs = (request.nextUrl.searchParams.get('refs') ?? '').split(',').map((r) => r.trim()).filter((r) => REF.test(r));
  if (refs.length === 0 || refs.length > 100) return responder({ error: 'Pide entre 1 y 100 cotizaciones (refs=a,b,c)' }, 400);
  const filas = await buscarCotizaciones({ externalRef: { in: refs } }, 100);
  return responder({ cotizaciones: filas.map(aCotizacionNumen) });
}

const crearSchema = z.object({
  ref: z.string().regex(REF, 'La referencia de Numen no es válida'),
  autor: autorSchema,
  enviar: z.boolean().default(false),
  correo: z.boolean().default(false),
  cotizacion: cotizacionSchema,
});

export async function POST(request: NextRequest) {
  const freno = exigirNumen(request);
  if (freno) return freno;
  const datos = crearSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return errorDeValidacion(datos.error);
  const { ref, autor, enviar, correo, cotizacion: entrada } = datos.data;

  // Si Numen reintenta (se cortó la red), recibe la que ya se creó
  const ya = await buscarCotizacionPorRef(ref);
  if (ya) return responder({ cotizacion: aCotizacionNumen(ya), yaExistia: true });

  if (enviar) {
    // Lo mismo que pide "enviar" (lib/cotizaciones/acciones.ts), antes de crearla: no queda una a medias
    const s = await getPublicSettings();
    const { totalUSD } = totalesCotizacion(entrada.items, s.taxEnabled ? s.taxPercent : 0, entrada.advancePercent, entrada.ivaRetentionPercent);
    if (entrada.items.length === 0) return responder({ error: 'Agrega al menos una línea antes.' }, 400);
    if (!(totalUSD > 0)) return responder({ error: 'El total no puede ser $0: revisa los precios.' }, 400);
  }

  let creada;
  try {
    creada = await crearCotizacion(entrada, { status: 'DRAFT', externalRef: ref });
  } catch (e) {
    // Dos pedidos iguales a la vez: el segundo choca con la referencia y recibe la del primero
    const otra = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' ? await buscarCotizacionPorRef(ref) : null;
    if (otra) return responder({ cotizacion: aCotizacionNumen(otra), yaExistia: true });
    throw e;
  }
  if (enviar) {
    const r = await aplicarAccion(creada, 'enviar', autor);
    if (!r.ok) return responder({ error: r.error, cotizacion: aCotizacionNumen(creada) }, r.status);
  }
  const q = (await buscarCotizacion(creada.id)) ?? creada;
  const envio = correo && enviar ? await correoDesdeNumen(q) : null;
  await registrarDeNumen(request, 'ORDER_CREATED', q.id, autor, {
    accion: enviar ? 'Numen creó y envió una cotización' : 'Numen creó una cotización',
    numero: q.number,
    cliente: q.clientName,
    ...(envio?.enviado ? { correo: envio.a } : {}),
  });
  const final = envio?.enviado ? ((await buscarCotizacion(q.id)) ?? q) : q;
  return responder({ cotizacion: aCotizacionNumen(final), ...(envio ? { correo: envio } : {}) }, 201);
}
