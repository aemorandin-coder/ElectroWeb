import { NextRequest } from 'next/server';
import { z } from 'zod';
import { aCotizacionNumen, buscarCotizacion, guardarCotizacion } from '@/lib/cotizaciones';
import { ACCIONES_COTIZACION, aplicarAccion } from '@/lib/cotizaciones/acciones';
import { cotizacionSchema } from '@/lib/cotizaciones/core';
import { autorSchema, correoDesdeNumen, errorDeValidacion, exigirNumen, registrarDeNumen, responder } from '@/lib/cotizaciones/numen';
import { leerVersionBase } from '@/lib/edicion/servidor';
import { publicarRecursoCambiado } from '@/lib/realtime/bus';

// Una cotización de Numen (C-181). Solo las que creó Numen: las del panel no se tocan desde aquí.
//   GET    su estado
//   PUT    cambiarla (con la versión que leyó Numen; aprobada ya no se cambia)
//   PATCH  enviar, rechazar ("no se concretó"), reabrir, aprobar (el cliente dijo que sí por WhatsApp) o correo

export const dynamic = 'force-dynamic';

const ID = /^[a-z0-9]{10,40}$/;
type Contexto = { params: Promise<{ id: string }> };
const noExiste = () => responder({ error: 'Esa cotización no existe o no es de Numen.' }, 404);

async function deNumen(id: string) {
  if (!ID.test(id)) return null;
  const q = await buscarCotizacion(id);
  return q && q.externalRef !== null ? q : null;
}

export async function GET(request: NextRequest, { params }: Contexto) {
  const freno = exigirNumen(request);
  if (freno) return freno;
  const q = await deNumen((await params).id);
  return q ? responder({ cotizacion: aCotizacionNumen(q) }) : noExiste();
}

const cambiarSchema = z.object({ autor: autorSchema, baseUpdatedAt: z.string(), cotizacion: cotizacionSchema });

export async function PUT(request: NextRequest, { params }: Contexto) {
  const freno = exigirNumen(request);
  if (freno) return freno;
  const actual = await deNumen((await params).id);
  if (!actual) return noExiste();
  const datos = cambiarSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return errorDeValidacion(datos.error);
  const base = leerVersionBase(datos.data.baseUpdatedAt);
  if (base === null || base === 'invalida') return responder({ error: 'Versión inválida' }, 400);

  const guardada = await guardarCotizacion(actual.id, datos.data.cotizacion, base);
  if (!guardada) {
    const ahora = (await buscarCotizacion(actual.id)) ?? actual;
    const error = ahora.status === 'APPROVED'
      ? 'Esta cotización ya fue aprobada por el cliente y no se puede cambiar. Haz una nueva.'
      : 'La cotización cambió en la tienda desde que Numen la leyó. Vuelve a leerla antes de cambiarla.';
    return responder({ error, conflicto: ahora.status === 'APPROVED' ? 'aprobada' : 'cambiado', cotizacion: aCotizacionNumen(ahora) }, 409);
  }
  await registrarDeNumen(request, 'PANEL_RECORD_UPDATED', actual.id, datos.data.autor, { accion: 'Numen cambió la cotización', numero: actual.number });
  // Quien la tenga abierta en el panel se entera, como cuando la cambia otra persona del equipo (C-170)
  publicarRecursoCambiado(`quote:${actual.id}`, 'actualizado', { id: 'numen', nombre: `${datos.data.autor} (Numen)` }, ['datos o líneas']);
  return responder({ cotizacion: aCotizacionNumen(guardada) });
}

const accionSchema = z.object({ autor: autorSchema, accion: z.enum([...ACCIONES_COTIZACION, 'correo']) });

export async function PATCH(request: NextRequest, { params }: Contexto) {
  const freno = exigirNumen(request);
  if (freno) return freno;
  const actual = await deNumen((await params).id);
  if (!actual) return noExiste();
  const datos = accionSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return errorDeValidacion(datos.error);
  const { autor, accion } = datos.data;

  if (accion === 'correo') {
    const envio = await correoDesdeNumen(actual);
    if (!envio.enviado) return responder({ error: envio.error }, 409);
    await registrarDeNumen(request, 'ORDER_STATUS_CHANGED', actual.id, autor, { numero: actual.number, accion: 'Numen mandó la cotización por correo', a: envio.a });
  } else {
    const r = await aplicarAccion(actual, accion, `${autor} desde Numen`);
    if (!r.ok) return responder({ error: r.error }, r.status);
    await registrarDeNumen(request, 'ORDER_STATUS_CHANGED', actual.id, autor, { numero: actual.number, de: r.de, a: r.a, ...r.extra.inventario, ...(r.extra.devuelto ? { devuelto: r.extra.devuelto } : {}) });
  }
  const q = (await buscarCotizacion(actual.id)) ?? actual;
  return responder({ cotizacion: aCotizacionNumen(q) });
}
