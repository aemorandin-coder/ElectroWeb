// C-288 · Cada vez que una regla de la tienda cambió o frenó lo que respondió Claude, queda anotado (modelo IaAtajada) para
// mostrarlo en Configuración → IA · Claude: qué traía, qué quedó y de qué producto o respuesta se trataba. Solo servidor.
//
// Se escribe sin esperar y sin lanzar nunca: anotar una atajada no puede romper lo que se estaba haciendo. Y nunca guarda un
// dato personal: lo que traía y la referencia pasan por enmascararDatosPersonales (correos, teléfonos y cédulas).

import { prisma } from '@/lib/prisma';
import { enmascararDatosPersonales, recortar } from './limpieza';
import type { Cambio, UsoRegistro } from './reglas';

/** Por cada respuesta, hasta cuántos cambios se anotan (una descripción no tiene cincuenta atajadas) */
const MAXIMO_POR_RESPUESTA = 30;

/** "Pedro Rodríguez Pérez" → "Pedro R.": para decir de quién era una respuesta sin dar su nombre completo */
export function nombreCorto(nombre: string): string {
  const [primero, segundo] = nombre.trim().split(/\s+/);
  if (!primero) return 'cliente';
  return segundo ? `${primero} ${segundo[0].toUpperCase()}.` : primero;
}

export function registrarAtajadas(uso: UsoRegistro | 'plantilla', cambios: readonly Cambio[], referencia?: string | null): void {
  // Las pruebas de Configuración no cuentan: se devuelven a la pantalla, pero no se anotan
  if (uso === 'prueba' || cambios.length === 0) return;
  const ref = referencia ? recortar(enmascararDatosPersonales(referencia), 120) : null;
  const filas = cambios.slice(0, MAXIMO_POR_RESPUESTA).map((c) => ({
    uso,
    regla: c.regla,
    accion: c.accion,
    antes: recortar(enmascararDatosPersonales(c.antes)),
    despues: c.despues === null ? null : recortar(enmascararDatosPersonales(c.despues)),
    referencia: ref,
  }));
  void prisma.iaAtajada.createMany({ data: filas }).catch(() => console.error('[ia] no se pudo anotar una atajada'));
}
