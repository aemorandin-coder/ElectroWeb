// Textos de los respaldos que comparten el servidor y el panel (C-165). Sin imports de servidor.

export function formatearBytes(bytes: number | bigint | null | undefined): string {
  const n = Number(bytes ?? 0);
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2).replace('.', ',')} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

/** 0 → "12:00 a. m.", 15 → "3:00 p. m." */
export function horaEnTexto(hora: number): string {
  const h12 = hora % 12 === 0 ? 12 : hora % 12;
  return `${h12}:00 ${hora < 12 ? 'a. m.' : 'p. m.'}`;
}
