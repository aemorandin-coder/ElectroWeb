'use client';

import type { ReactNode } from 'react';
import { StudioProvider } from './_components/StudioContext';

// ElectroStudio (C-112): inicio en /admin/studio y editor en /admin/studio/<id>, con el mismo estado (C-116)
export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioProvider>{children}</StudioProvider>;
}
