'use client';

import { Suspense } from 'react';
import StudioWizard from '../_components/StudioWizard';

// Asistente de "Nueva historia" de ElectroStudio (C-116, G-71 con useSearchParams en Suspense)
export default function StudioNewPage() {
  return (
    <Suspense>
      <StudioWizard />
    </Suspense>
  );
}
