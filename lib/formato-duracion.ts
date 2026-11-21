interface DurationUnits {
  hours?: number;
  minutes?: number;
}

interface DurationFormatterLike {
  format: (units: DurationUnits) => string;
}

interface IntlWithDurationFormat {
  DurationFormat?: new (
    locales?: string | string[],
    options?: { style?: 'long' | 'short' | 'narrow' | 'digital' }
  ) => DurationFormatterLike;
}

/** Formatea duraciones en español usando `Intl.DurationFormat` cuando está disponible, con respaldo exacto. */
export function formatDuracionHorasMinutos(totalMinutos: number): string {
  const minutos = Math.max(0, Math.round(totalMinutos));
  const hours = Math.floor(minutos / 60);
  const minutes = minutos % 60;

  const ctor = (Intl as IntlWithDurationFormat).DurationFormat;
  if (typeof ctor === 'function') {
    const units: DurationUnits = hours > 0 ? (minutes > 0 ? { hours, minutes } : { hours }) : { minutes };
    return new ctor('es', { style: 'narrow' }).format(units);
  }

  return hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim() : `${minutes}m`;
}
