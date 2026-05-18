'use client';

import { useParams } from 'next/navigation';
import ProductWizard from '../_components/ProductWizard';

export default function EditProductPage() {
  const params = useParams();
  return <ProductWizard productId={params.id as string} />;
}
