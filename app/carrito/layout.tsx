import { Metadata } from 'next';

export const metadata: Metadata = {
  // C-258: la plantilla de app/layout.tsx ya agrega " | Electro Shop" (salía dos veces)
  title: 'Carrito de compras',
  description: 'Revisa tu carrito de compras y procede al pago de forma segura.',
};

export default function CarritoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
