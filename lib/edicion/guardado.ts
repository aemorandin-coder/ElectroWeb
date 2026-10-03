// C-170: enviar un guardado con la versión con que se abrió el registro y entender la respuesta del servidor. Cliente.
//
// Lo usan los editores del panel (promotores, categorías, ofertas, cotizaciones…). Las respuestas que importan:
//   409 `cambiado`     otra persona guardó antes: viene el registro como está ahora y quién fue → se combina (useConflictoDeFormulario)
//   404 `no_existe`    ya no existe (lo borraron)
//   409 `ya_resuelto`  otra persona ya hizo esa aprobación o ese cambio de estado
//   428 `sin_version`  el editor no mandó la versión (no debería pasar)

export type ConflictoServidor =
  | { tipo: 'cambiado'; error: string; por: { nombre: string; en: string } | null; actual: unknown }
  | { tipo: 'no_existe' | 'ya_resuelto' | 'sin_version'; error: string; por: { nombre: string; en: string } | null };

export type ResultadoGuardado<T = unknown> =
  | { ok: true; datos: T }
  | { ok: false; status: number; error: string; conflicto?: ConflictoServidor };

export async function enviarConVersion<T = unknown>(
  url: string,
  metodo: 'PATCH' | 'PUT' | 'POST',
  cuerpo: Record<string, unknown>,
  version: string | null | undefined,
): Promise<ResultadoGuardado<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(version ? { ...cuerpo, baseUpdatedAt: version } : cuerpo),
    });
  } catch {
    return { ok: false, status: 0, error: 'Error de conexión. Verifica tu internet.' };
  }
  const datos = (await res.json().catch(() => null)) as (Record<string, unknown> & { error?: string; conflicto?: string; por?: { nombre: string; en: string } | null; actual?: unknown }) | null;
  if (res.ok) return { ok: true, datos: datos as T };
  const error = datos?.error || 'No se pudo guardar';
  const tipo = datos?.conflicto;
  if (tipo === 'cambiado') return { ok: false, status: res.status, error, conflicto: { tipo, error, por: datos?.por ?? null, actual: datos?.actual } };
  if (tipo === 'no_existe' || tipo === 'ya_resuelto' || tipo === 'sin_version') return { ok: false, status: res.status, error, conflicto: { tipo, error, por: datos?.por ?? null } };
  return { ok: false, status: res.status, error };
}
