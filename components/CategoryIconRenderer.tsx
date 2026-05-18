'use client';

import { useState, useEffect, type ComponentType, type SVGAttributes } from 'react';
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
  const [Icon, setIcon] = useState<IconComponent>(() => {
    const preset = getCategoryIcon(iconName);
    return preset;
  });

  useEffect(() => {
    if (!iconName) { setIcon(() => FiGrid); return; }

    const preset = getCategoryIcon(iconName);
    // getCategoryIcon returns FiGrid as fallback — check if it actually matched
    if (preset !== FiGrid) { setIcon(() => preset); return; }

    // Not in preset list — load dynamically
    loadIconDynamic(iconName).then(dyn => {
      if (dyn) setIcon(() => dyn);
    });
  }, [iconName]);

  return <Icon className={className} />;
}
