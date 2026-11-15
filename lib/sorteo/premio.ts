// C-253: cómo se lee el premio en el banner de /sorteo (el equipo eligió la C2 el 15/11 viendo las maquetas).
// - El nombre y su etiqueta: lo que va entre paréntesis al final ("PlayStation 4 Sony (Remanufacturada)") sale aparte, en
//   pequeño, y el nombre queda grande. Así el equipo lo escribe como lo dice ("tal como es") y en los correos se lee igual.
// - "Lo que trae": cada cosa con su ícono, elegido por lo que dice (sin pedirle al equipo que elija uno).
// Sin React: lo usan la página, el panel y la API.

export interface CosaQueTrae { texto: string; detalle: string }

/** Hasta cuántas cosas se muestran en "Lo que trae" */
export const MAX_QUE_TRAE = 4;

/** El nombre del premio y, si termina en "(…)", eso como etiqueta */
export function partesDelPremio(premio: string): { nombre: string; etiqueta: string | null } {
  const limpio = premio.trim();
  const m = /^(.*\S)\s*\(([^()]{2,40})\)$/.exec(limpio);
  if (!m) return { nombre: limpio, etiqueta: null };
  return { nombre: m[1].trim(), etiqueta: m[2].trim() };
}

/** Lo que guarda la base (JSON) como una lista segura: lo que no tenga la forma esperada no se muestra */
export function leerQueTrae(valor: unknown): CosaQueTrae[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .map((v) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null))
    .filter((v): v is Record<string, unknown> => v !== null && typeof v.texto === 'string' && v.texto.trim().length > 0)
    .map((v) => ({ texto: String(v.texto).trim(), detalle: typeof v.detalle === 'string' ? v.detalle.trim() : '' }))
    .slice(0, MAX_QUE_TRAE);
}

export type IconoQueTrae = 'disco' | 'control' | 'cable' | 'juego' | 'garantia' | 'otro';

export type LogoDePremio = 'ps4' | 'ps5';

/** El logo oficial que se muestra en lugar del nombre corto, si es una consola que lo tiene ("PS4", "PS 5") */
export function logoDelNombreCorto(nombreCorto: string | null | undefined): LogoDePremio | null {
  const t = (nombreCorto ?? '').toLowerCase().replace(/\s+/g, '');
  if (t === 'ps4' || t === 'playstation4') return 'ps4';
  if (t === 'ps5' || t === 'playstation5') return 'ps5';
  return null;
}

/**
 * El aviso de marcas de /sorteo: de quién son las marcas que se nombran y que el sorteo no es de ellas. Se arma con lo que
 * dice el premio. Con una marca que no se reconoce, queda el aviso general.
 */
export function avisoDeMarcas(...textos: Array<string | null | undefined>): string {
  const t = textos.filter(Boolean).join(' ').toLowerCase();
  const general = 'Las marcas, nombres y logos de los productos son de sus dueños y se usan solo para decir qué se sortea.';
  if (/playstation|\bps\s?[2-5]\b|sony|dualshock|dualsense/.test(t)) {
    return 'Sony, PlayStation, PS4, PS5, DualShock y sus logos son marcas registradas de Sony Interactive Entertainment Inc. '
      + 'Electro Shop no está afiliada a Sony, y este sorteo no está patrocinado, avalado ni administrado por Sony. ' + general;
  }
  if (/nintendo|switch/.test(t)) {
    return 'Nintendo, Nintendo Switch y sus logos son marcas registradas de Nintendo. Electro Shop no está afiliada a Nintendo, '
      + 'y este sorteo no está patrocinado, avalado ni administrado por Nintendo. ' + general;
  }
  if (/xbox|microsoft/.test(t)) {
    return 'Xbox, Microsoft y sus logos son marcas registradas de Microsoft Corporation. Electro Shop no está afiliada a Microsoft, '
      + 'y este sorteo no está patrocinado, avalado ni administrado por Microsoft. ' + general;
  }
  return `${general} Ninguna de ellas patrocina, avala ni administra este sorteo.`;
}

/** El ícono de una cosa, por lo que dice. El orden importa: "1000 GB para muchos juegos" es el disco, no un juego */
export function iconoQueTrae(texto: string): IconoQueTrae {
  const t = texto.toLowerCase();
  if (/\b\d+\s*(gb|tb)\b|almacenamiento|disco/.test(t)) return 'disco';
  if (/control|mando|joystick/.test(t)) return 'control';
  if (/cable|hdmi|cargador|corriente|poder|adaptador/.test(t)) return 'cable';
  if (/juego/.test(t)) return 'juego';
  if (/garant/.test(t)) return 'garantia';
  return 'otro';
}
