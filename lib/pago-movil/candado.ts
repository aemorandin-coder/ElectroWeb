// Una verificación a la vez por pago (C-129, S-01). Solo servidor.
//
// Dos pestañas (o dos clientes) verificando el mismo pago al mismo tiempo pasaban las dos la búsqueda de "ya usado"
// antes de que la otra guardara, y quedaban dos pagos verificados con el mismo dinero: dos recargas acreditadas con un
// solo Pago Móvil. Aquí se ordenan los de un mismo proceso: la tienda corre en uno solo de PM2, y alcanza con memoria.
// La clave es `claveDeCandado` (lib/pago-movil/referencia.ts: banco y últimos 4 dígitos). No hay índice único en la base
// (el pago se reconoce por banco, referencia y monto, no por una sola columna): lo que protege al guardar, aunque otro
// proceso gane la carrera, es el candado de transacción de la base que toma el alta (app/api/pago-movil/verificar).

const enCurso = new Map<string, Promise<unknown>>();

export async function unaALaVez<T>(clave: string, tarea: () => Promise<T>): Promise<T> {
  const anterior = enCurso.get(clave) ?? Promise.resolve();
  const actual = anterior.catch(() => undefined).then(tarea);
  enCurso.set(clave, actual);
  try {
    return await actual;
  } finally {
    // Solo la última de la fila limpia la entrada
    if (enCurso.get(clave) === actual) enCurso.delete(clave);
  }
}
