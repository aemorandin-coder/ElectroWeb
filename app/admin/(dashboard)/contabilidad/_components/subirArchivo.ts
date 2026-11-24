export async function subirArchivoContable(file: File, tipo: string): Promise<{ ok: true; archivo: string } | { ok: false; error: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('tipo', tipo);

  try {
    const r = await fetch('/api/admin/contabilidad/archivos', { method: 'POST', body: form });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.archivo) {
      return { ok: false, error: d?.error ?? 'No se pudo subir el archivo. Usa PDF, PNG, JPG o WebP.' };
    }
    return { ok: true, archivo: String(d.archivo) };
  } catch {
    return { ok: false, error: 'Sin conexión al subir el archivo.' };
  }
}

export function enlaceArchivoContable(nombre: string | null | undefined): string | null {
  if (!nombre) return null;
  return `/api/admin/contabilidad/archivos/${encodeURIComponent(nombre)}`;
}
