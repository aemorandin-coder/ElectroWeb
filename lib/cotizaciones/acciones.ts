// Enviar, aprobar, cerrar y reabrir una cotización (C-148, C-148b). La usan el panel y Numen (C-181), así las dos
// entradas siguen las mismas reglas. Quien llama registra la acción en el historial.
import { prisma } from '@/lib/prisma';
import { aprobarCotizacion, buscarCotizacion, cerrarCotizacion, resumenInventario } from './index';

export const ACCIONES_COTIZACION = ['enviar', 'rechazar', 'reabrir', 'aprobar'] as const;
export type AccionCotizacion = (typeof ACCIONES_COTIZACION)[number];

type Cotizacion = NonNullable<Awaited<ReturnType<typeof buscarCotizacion>>>;

export type ResultadoAccion =
  | { ok: false; status: number; error: string }
  | { ok: true; de: string; a: string; extra: { inventario?: { descontado: string; faltante: string }; devuelto?: string } };

const yaAprobada = { ok: false as const, status: 409, error: 'Esta cotización ya fue aprobada. Si no se concretó, márcala así para devolver el inventario.' };

/** `registradaPor`: quién del equipo anota la aprobación (el cliente dijo que sí por WhatsApp o en persona). */
export async function aplicarAccion(actual: Cotizacion, accion: AccionCotizacion, registradaPor: string): Promise<ResultadoAccion> {
  const id = actual.id;
  if (accion === 'enviar' || accion === 'aprobar') {
    if (actual.status === 'APPROVED') return yaAprobada;
    if (actual.items.length === 0) return { ok: false, status: 400, error: 'Agrega al menos una línea antes.' };
    if (!(Number(actual.totalUSD) > 0)) return { ok: false, status: 400, error: 'El total no puede ser $0: revisa los precios.' };
  }

  if (accion === 'aprobar') {
    // Descuenta el inventario igual que el enlace (C-148b)
    const persona = actual.contactName || actual.clientName;
    const aprobada = await aprobarCotizacion(
      id,
      { nombre: `${persona} (registrada por ${registradaPor})`, documento: actual.clientDoc, ip: null },
      { estados: ['REQUESTED', 'DRAFT', 'SENT'] },
    );
    if (!aprobada) return yaAprobada;
    return { ok: true, de: actual.status, a: 'APPROVED', extra: { inventario: resumenInventario(aprobada.movimientos) } };
  }

  if (accion === 'rechazar') {
    // También desde aprobada: devuelve al inventario lo que se había descontado
    const cerrada = await cerrarCotizacion(id);
    if (!cerrada) return { ok: false, status: 409, error: 'Esta cotización ya estaba cerrada.' };
    const devuelto = cerrada.devuelto.map((m) => `${m.descontado} × ${m.title}`).join(', ');
    return { ok: true, de: actual.status, a: 'REJECTED', extra: devuelto ? { devuelto } : {} };
  }

  // enviar o reabrir: nunca sobre una aprobada (tiene inventario descontado)
  if (actual.status === 'APPROVED') return yaAprobada;
  // Enviar de nuevo reinicia la validez. Volver a borrador apaga el enlace, pero conserva que el cliente ya la vio
  const cambio = accion === 'enviar' ? { status: 'SENT', sentAt: new Date() } : { status: 'DRAFT' };
  const r = await prisma.quote.updateMany({ where: { id, status: { not: 'APPROVED' } }, data: cambio });
  if (r.count !== 1) return yaAprobada;
  return { ok: true, de: actual.status, a: cambio.status, extra: {} };
}
