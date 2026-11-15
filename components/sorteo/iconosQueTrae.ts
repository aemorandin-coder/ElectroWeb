// C-253: el ícono de cada cosa de "Lo que trae" el premio (el banner de /sorteo y el paso del panel). Se elige por lo que
// dice (lib/sorteo/premio.ts), para que el equipo solo escriba.
import {
  IconoCableUsb, IconoCheck, IconoControl, IconoDiscoDuro, IconoGarantia, IconoVideojuegos, type IconType,
} from '@/components/iconos';
import { iconoQueTrae, type IconoQueTrae } from '@/lib/sorteo/premio';

const ICONOS: Record<IconoQueTrae, IconType> = {
  disco: IconoDiscoDuro, control: IconoControl, cable: IconoCableUsb, juego: IconoVideojuegos, garantia: IconoGarantia, otro: IconoCheck,
};

export const iconoDeCosa = (texto: string): IconType => ICONOS[iconoQueTrae(texto)];
