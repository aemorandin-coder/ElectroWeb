import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout | Electro Shop',
  description: 'Finaliza tu compra de forma segura con nuestros métodos de pago.',
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
