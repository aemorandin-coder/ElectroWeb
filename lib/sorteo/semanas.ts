// C-297: las semanas del sorteo, de lunes a domingo en hora de Venezuela, recortadas a sus fechas (la primera y la última
// pueden ser más cortas). Cada una puede tener su producto estrella (Marketing → Sorteo). Módulo puro: días como
// '2026-11-16', sin la base.

/** Un día más `n` días ('2026-11-16' + 6 → '2026-11-22') */
export function sumarDias(dia: string, n: number): string {
  const fecha = new Date(`${dia}T12:00:00-04:00`);
  fecha.setUTCDate(fecha.getUTCDate() + n);
  return new Date(fecha.getTime() - 4 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 0 domingo … 6 sábado, del día en Venezuela */
const diaDeLaSemana = (dia: string) => new Date(`${dia}T12:00:00-04:00`).getUTCDay();

export interface Semana {
  desde: string;
  hasta: string;
}

/** Las semanas entre dos días (incluidos): cada una termina el domingo o el último día */
export function semanasEntre(desde: string, hasta: string): Semana[] {
  const semanas: Semana[] = [];
  let dia = desde;
  for (let i = 0; dia <= hasta && i < 60; i++) {
    const domingo = sumarDias(dia, (7 - diaDeLaSemana(dia)) % 7);
    const fin = domingo > hasta ? hasta : domingo;
    semanas.push({ desde: dia, hasta: fin });
    dia = sumarDias(fin, 1);
  }
  return semanas;
}
