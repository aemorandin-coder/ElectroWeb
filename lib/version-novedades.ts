import { novedadesDesde } from '@/lib/modulos';

export interface NovedadHumanaPunto {
  modulo: string;
  texto: string;
}

export interface NovedadHumana {
  version: string;
  titulo: string;
  puntos: NovedadHumanaPunto[];
  restantes: number;
}

const MAX_PUNTOS = 3;

/** Convierte notas técnicas de versión en una línea clara y legible para el equipo. */
export function limpiarTextoNovedad(texto: string): string {
  let limpio = texto
    // Códigos internos de tarea (C-293, G-72, etc.)
    .replace(/\b[CG]-\d+[a-z]?\b[:·\-\s]*/gi, '')
    // Paréntesis con jerga de programación, props, archivos o tablas
    .replace(/\([^)]*(?:\bprop\b|\.tsx?|\.css|\broute\b|\bprisma\b|\bAPI\b|\bhook\b|\bBD\b|\btabla\b|\bcommit\b|app\/|components\/|lib\/)[^)]*\)/gi, '')
    // Rutas de código expuestas fuera de paréntesis
    .replace(/(?:app|components|lib|scripts|docs)\/[\w./-]+/g, '')
    // Comillas invertidas alrededor de nombres sueltos
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

  if (!limpio) return 'Mejoras generales de estabilidad y diseño.';

  limpio = limpio.charAt(0).toUpperCase() + limpio.slice(1);
  if (limpio.length > 130) {
    const corte = limpio.lastIndexOf(' ', 126);
    limpio = `${limpio.slice(0, corte > 60 ? corte : 126).trim()}…`;
  } else if (!/[.!?…]$/.test(limpio)) {
    limpio = `${limpio}.`;
  }
  return limpio;
}

/** Devuelve las novedades pendientes redactadas en lenguaje natural para la Campana. */
export function novedadesHumanasDesde(visto: string | null, actual: string): NovedadHumana | null {
  const novedades = novedadesDesde(visto, actual);
  if (novedades.length === 0) return null;

  const puntos: NovedadHumanaPunto[] = novedades.slice(0, MAX_PUNTOS).map(({ modulo, cambios }) => ({
    modulo: modulo.nombre,
    texto: limpiarTextoNovedad(cambios[0]?.resumen ?? ''),
  }));

  return {
    version: actual,
    titulo: 'Mejoras listas en el panel',
    puntos,
    restantes: Math.max(0, novedades.length - MAX_PUNTOS),
  };
}
