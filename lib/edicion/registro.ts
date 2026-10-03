// C-170: el guardado con versión de CUALQUIER registro editable del panel (promotor, categoría, oferta, cotización…). Solo servidor.
//
// Es lo que C-169 hizo para los productos, en piezas chicas para repetirlo sin copiar código:
//   1. exigirVersion(body.baseUpdatedAt)         → la versión con que el editor abrió el registro (428 si falta, 400 si no es fecha)
//   2. dentro de la transacción, antes de escribir: updateMany({ where: { id, updatedAt: base }, data: { updatedAt: new Date() } })
//      Si no cuenta ninguna fila, otro guardó antes → respuestaCambiado() (409 con el registro como está ahora y quién lo cambió)
//      o respuestaNoExiste() (404) si ya no hay registro.
//   3. registrarCambio() deja en la bitácora quién cambió qué, y avisa en vivo a quien lo tenga abierto.

import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { publicarRecursoCambiado } from '@/lib/realtime/bus';
import { leerVersionBase, nombreDeSesion, ultimoCambio } from './servidor';

export function exigirVersion(valor: unknown): { base: Date } | { respuesta: NextResponse } {
  const base = leerVersionBase(valor);
  if (base === 'invalida') return { respuesta: NextResponse.json({ error: 'Versión inválida' }, { status: 400 }) };
  if (base === null) {
    return { respuesta: NextResponse.json({ error: 'Falta la versión con la que abriste esto. Recarga la página para editarlo.', conflicto: 'sin_version' }, { status: 428 }) };
  }
  return { base };
}

/** `tipo` = el targetType de la bitácora ('INFLUENCER', 'CATEGORY'…). `etiqueta` = cómo se llama en una frase ("promotor", "cotización"). */
export async function respuestaCambiado(args: { tipo: string; id: string; etiqueta: string; femenino?: boolean; actual: unknown }) {
  const por = await ultimoCambio(args.tipo, args.id, ['PANEL_RECORD_UPDATED']);
  return NextResponse.json({
    error: `${por?.nombre ?? 'Otra persona'} cambió ${args.femenino ? 'esta' : 'este'} ${args.etiqueta} mientras ${args.femenino ? 'la' : 'lo'} editabas`,
    conflicto: 'cambiado',
    por,
    actual: args.actual,
  }, { status: 409 });
}

export function respuestaNoExiste(etiqueta: string) {
  return NextResponse.json({ error: `Este ${etiqueta} ya no existe`, conflicto: 'no_existe' }, { status: 404 });
}

/** Una aprobación, rechazo o cambio de estado que otra persona ya hizo (la segunda no repite correos ni avisos) */
export async function respuestaYaResuelto(args: { tipo: string; id: string; que: string }) {
  const por = await ultimoCambio(args.tipo, args.id, ['PANEL_RECORD_UPDATED', 'PANEL_RECORD_RESOLVED']);
  return NextResponse.json({
    error: `${por?.nombre ?? 'Otra persona'} ya ${args.que}`,
    conflicto: 'ya_resuelto',
    por,
  }, { status: 409 });
}

/** Bitácora + aviso en vivo después de un guardado que sí entró */
export async function registrarCambio(args: {
  session: Session | null;
  request: Request;
  recurso: string;
  tipo: string;
  id: string;
  nombre: string;
  campos: string[];
  accion?: 'PANEL_RECORD_UPDATED' | 'PANEL_RECORD_RESOLVED';
}) {
  const quien = { id: args.session?.user?.id ?? '', nombre: nombreDeSesion(args.session) };
  await registrarAccionAdmin(args.session, args.accion ?? 'PANEL_RECORD_UPDATED', { type: args.tipo, id: args.id }, { registro: args.nombre, campos: args.campos }, args.request);
  publicarRecursoCambiado(args.recurso, 'actualizado', quien, args.campos);
}
