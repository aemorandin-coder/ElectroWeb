import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Carrito de Compras | Electro Shop',
  description: 'Revisa tu carrito de compras y procede al pago de forma segura.',
};

export default function CarritoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
