import { createElement } from 'react';
import { getCategoryIcon } from '@/lib/category-icons';

interface Props {
  iconName: string | null | undefined;
  className?: string;
}

/**
 * El ícono de una categoría por el nombre que guarda: del pack ("IconoConsola") o de antes ("GiGameConsole").
 * C-189: solo íconos del pack propio, sin cargar ninguna librería. Ya no necesita el navegador: en un Server Component
 * se dibuja en el servidor. Un nombre desconocido se ve como "Otros".
 */
export default function CategoryIconRenderer({ iconName, className }: Props) {
  // createElement: el ícono se elige en cada render (C-111, regla static-components)
  return createElement(getCategoryIcon(iconName), { className });
}
