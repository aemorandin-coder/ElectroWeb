// Una verificación a la vez por referencia (C-129). Solo servidor.
//
// Dos pestañas (o dos clientes) verificando la misma referencia al mismo tiempo pasaban las dos la búsqueda de
// "ya usada" antes de que la otra guardara, y quedaban dos pagos verificados con el mismo dinero: dos recargas
// acreditadas con un solo Pago Móvil. El índice único que lo evitaría en la base sigue pendiente (hay duplicados
// viejos que revisar), así que se ordenan aquí. La tienda corre en un solo proceso de PM2: alcanza con memoria.

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

/** Clave de un Pago Móvil: la referencia la pone el banco que envía, así que dos bancos pueden repetirla. */
export function clavePago(referencia: string, bancoOrigen: string): string {
  return `${bancoOrigen.trim()}:${referencia.trim()}`;
}
