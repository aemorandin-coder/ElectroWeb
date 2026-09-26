'use client';

import { createElement, useState, useEffect, type ComponentType, type SVGAttributes } from 'react';
import { FiGrid } from 'react-icons/fi';
import { getCategoryIcon, loadIconDynamic } from '@/lib/category-icons';

type IconComponent = ComponentType<SVGAttributes<SVGElement> & { className?: string }>;

interface Props {
  iconName: string | null | undefined;
  className?: string;
}

/**
 * Renders any react-icons icon by name — presets render instantly,
 * custom imports (GiLaptop, FaBeer, TbDrone…) are loaded client-side
 * as a separate webpack chunk on first use.
 */
export default function CategoryIconRenderer({ iconName, className }: Props) {
  // Los íconos del listado se resuelven al instante; los demás se cargan una vez y se guardan por nombre.
  // C-111: antes un efecto copiaba el ícono a un estado en cada cambio (render extra y regla set-state-in-effect).
  const preset = iconName ? getCategoryIcon(iconName) : FiGrid;
  const esPreset = !iconName || preset !== FiGrid;
  const [dinamico, setDinamico] = useState<{ name: string; Icon: IconComponent } | null>(null);

  useEffect(() => {
    if (esPreset || !iconName) return;
    let vigente = true;
    loadIconDynamic(iconName).then((dyn) => {
      if (vigente && dyn) setDinamico({ name: iconName, Icon: dyn as IconComponent });
    });
    return () => {
      vigente = false;
    };
  }, [iconName, esPreset]);

  const Icon: IconComponent = esPreset ? preset : dinamico?.name === iconName ? dinamico.Icon : FiGrid;
  return createElement(Icon, { className });
}
