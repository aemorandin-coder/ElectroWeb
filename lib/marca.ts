/**
 * C-243 · EL KIT DE MARCA DE ELECTRO SHOP
 *
 * La única fuente de los colores de la tienda, el panel, los correos, las imágenes para compartir y los documentos. Lo pidió
 * el equipo el 14/11 ("hay demasiada discrepancia de colores… ¿por qué no tenemos todos los chats un concepto claro?") y
 * eligió la paleta A viendo las maquetas: **solo los dos azules del logo y sus claros**. El azul noche (#0a1530) y el cian
 * (#22d3ee) no están en el logo; entraron al sacar el ámbar (C-192, C-216, C-226) y se fueron con esta tarea.
 *
 * Dónde vive cada color:
 * - la tienda y el panel: los tokens de `app/globals.css` (`brand-500`, `brand-700`…) y las piezas de `lib/admin-ui.ts`;
 * - los correos: `COLOR` de `lib/email-templates/estilo.ts` (en hex: el correo no lee variables);
 * - las imágenes para compartir: `C` de `lib/og/tarjetas.tsx`; los presupuestos en PDF: `lib/cotizaciones/pdf.ts`.
 * Todos usan estos mismos valores. La página del panel `/admin/marca` muestra el kit con las piezas de verdad, y
 * `npm run check:marca` rechaza lo que quede fuera (PLAN.md §1.0).
 * Lo que no es de la marca sino del arte de redes (ElectroStudio, Chispa) tiene su propia paleta y no entra aquí.
 */

export interface ColorDelKit {
  nombre: string;
  hex: string;
  /** La clase o el token de Tailwind */
  token: string;
  /** Para qué es */
  para: string;
  /** Lo que nunca hace, si hace falta decirlo */
  nunca?: string;
}

/** Los dos azules del logo: todo lo demás sale de ellos. */
export const LOGO = { azul: '#2a63cd', azulOscuro: '#1a3b7e' } as const;

export const PALETA: ColorDelKit[] = [
  {
    nombre: 'Azul de la marca', hex: '#2a63cd', token: 'brand-500',
    para: 'Lo que se toca: botones, enlaces y la barra de arriba. El estado que avanza. La placa del ícono de un aviso, con el ícono en blanco.',
  },
  {
    nombre: 'Azul oscuro del logo', hex: '#1a3b7e', token: 'brand-700',
    para: 'La pieza fuerte, una por pantalla o por correo (el sorteo, la gift card, el boleto, el certificado), y el sello de "te toca", con texto e ícono blancos.',
  },
  {
    nombre: 'Azul medio', hex: '#1e4ba3', token: 'brand-600',
    para: 'El paso entre los dos: el botón al pasar el ratón y los enlaces sobre blanco.',
  },
  {
    nombre: 'Azul de los rótulos', hex: '#aac1eb', token: 'brand-300',
    para: 'Rótulos y textos chicos sobre el azul oscuro ("SORTEO DE NAVIDAD", "BOLETOS").',
  },
  {
    nombre: 'Azul claro', hex: '#f4f7fc', token: 'brand-50',
    para: 'El fondo de un aviso y de la placa de un ícono suelto. Su borde, brand-200 (#d4e0f5).',
  },
  { nombre: 'Tinta', hex: '#212529', token: 'ink', para: 'Títulos y texto.' },
  { nombre: 'Gris', hex: '#6a6c6b', token: 'muted', para: 'Lo secundario: la línea bajo un título, una fecha, una nota.' },
  { nombre: 'Línea y fondo', hex: '#e9ecef', token: 'line · surface', para: 'Bordes de tarjetas y el fondo gris de la página (#f8f9fa).' },
  { nombre: 'Verde', hex: '#047857', token: 'success-strong', para: 'Lo hecho: pagado, entregado, al día. Lleno, con texto blanco.', nunca: 'Texto blanco sobre el verde claro.' },
  { nombre: 'Rojo', hex: '#dc2626', token: 'deal', para: 'Error, cancelado y el descuento.' },
  {
    nombre: 'Ámbar', hex: '#b45309', token: 'warning-strong',
    para: 'Solo un texto suelto ("Quedan 3") y las estrellas de las reseñas.',
    nunca: 'Ningún contenedor, píldora, monto, título ni frase destacada.',
  },
];

/** Los colores que salieron del kit: el control los rechaza en el código. */
export const FUERA_DEL_KIT = [
  { nombre: 'Azul noche', hex: '#0a1530', antes: 'brand-950', ahora: 'brand-700 (el azul oscuro del logo)' },
  { nombre: 'Cian', hex: '#22d3ee', antes: 'accent', ahora: 'blanco sobre el azul, o brand-300 en un rótulo' },
] as const;

/** Las reglas, en el orden en que se aplican. La página del kit y PLAN.md §1.0 dicen lo mismo. */
export const REGLAS: string[] = [
  'Una pantalla, una pieza fuerte: lo demás va en blanco, gris o azul claro.',
  'Lo que se toca es azul de la marca; lo que alguien tiene que hacer, el sello oscuro del logo con su ícono, y en bloque, el aviso azul claro con la placa azul.',
  'Los estados van llenos y con texto blanco: verde lo hecho, azul lo que avanza, rojo lo cancelado. Nunca el claro con letra del mismo color.',
  'Sobre el azul oscuro, el texto en blanco y los rótulos en brand-300. Nunca otro azul encima.',
  'Ningún color fuera de esta lista: ni azul noche, ni cian, ni indigo, ni violeta, ni contenedores ámbar.',
];
