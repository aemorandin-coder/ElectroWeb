'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Studio from '../_components/Studio';

// Editor de una historia de ElectroStudio (C-116). ?paso=2 abre directo en ese paso.
export default function StudioEditorPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense>
      <Studio id={id} />
    </Suspense>
  );
}
