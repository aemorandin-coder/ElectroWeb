import { Metadata } from 'next';

export const metadata: Metadata = {
  // C-258: la plantilla de app/layout.tsx ya agrega " | Electro Shop" (salía dos veces)
  title: 'Checkout',
  description: 'Finaliza tu compra de forma segura con nuestros métodos de pago.',
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
