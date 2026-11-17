// C-281 (A-08): el mensaje de un pedido del panel que falló, para el aviso. Antes Consultas, Solicitudes y Verificaciones
// no decían nada si el servidor respondía con un error: el botón volvía como si nada. Es el de Reseñas, para todo el panel.

/** Mensaje del servidor, con el detalle técnico si lo trae (solo lo reciben los admins). */
export async function mensajeError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
  const base = data?.error || fallback;
  return data?.detail ? `${base}: ${data.detail}` : base;
}
