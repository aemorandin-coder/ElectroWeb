import { Metadata } from 'next';
import { generateProductMetadata } from '@/lib/product-metadata';

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    return generateProductMetadata({ params });
}

export default function ProductLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
