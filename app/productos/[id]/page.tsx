import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import { parseProductImages } from '@/lib/product-utils';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${appUrl}/api/products/slug/${id}`, { cache: 'no-store' });

    if (!res.ok) {
      return {
        title: 'Producto no encontrado | Electro Shop',
        description: 'El producto que buscas no existe o ha sido removido.',
      };
    }

    const product = await res.json();

    return {
      title: product.seoTitle || `${product.name} | Electro Shop`,
      description:
        product.seoDescription ||
        product.description?.substring(0, 160) ||
        `Compra ${product.name} en Electro Shop.`,
      openGraph: {
        title: product.seoTitle || product.name,
        description: product.seoDescription || product.description?.substring(0, 160),
        images: product.seoImage
          ? [product.seoImage]
          : product.mainImage
          ? [product.mainImage]
          : [],
      },
    };
  } catch {
    return { title: 'Producto | Electro Shop' };
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  let product = null;
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${appUrl}/api/products/slug/${id}`, { cache: 'no-store' });

    if (!res.ok) notFound();

    const data = await res.json();

    data.images = parseProductImages(data.images);

    if (data.specs && typeof data.specs === 'string') {
      try {
        data.specs = JSON.parse(data.specs);
      } catch {
        data.specs = null;
      }
    }

    product = data;
  } catch {
    notFound();
  }

  if (!product) notFound();

  return <ProductClient initialProduct={product} />;
}
