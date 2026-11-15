// C-255 (el equipo, 15/11, viendo /sorteo: "donde dice 'Sony' me gustaría que apareciera el logo corto de PS4"): el logotipo
// oficial de PS4 o PS5 dentro de una línea de texto, del alto de la letra y de su color (blanco en el banner), como en la
// píldora de la bandera del inicio. Las marcas son de Sony: lo dice el aviso de la página.
// El dibujo ocupa 24 × 5,13 de su cuadro de 24: se recorta a esa franja, así su alto es el de las mayúsculas (0,72 em de
// Inter) y se apoya en la línea del texto. Es decorativo: quien lo usa deja la palabra para los lectores. Sin hooks.
import { SiPlaystation4, SiPlaystation5 } from 'react-icons/si';
import type { LogoDePremio } from '@/lib/sorteo/premio';

export default function LogoCorto({ logo }: { logo: LogoDePremio }) {
  const Letras = logo === 'ps4' ? SiPlaystation4 : SiPlaystation5;
  return (
    <span aria-hidden="true" className="relative inline-block aspect-[24/5.13] h-[0.72em] overflow-hidden align-baseline">
      <Letras className="absolute inset-x-0 top-1/2 h-auto w-full -translate-y-1/2" />
    </span>
  );
}
