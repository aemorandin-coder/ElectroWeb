import type { ComponentType } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import { FiChevronRight, FiCreditCard, FiDollarSign, FiShield, FiSmartphone, FiTruck } from 'react-icons/fi';
import { SiBinance, SiPaypal, SiZelle } from 'react-icons/si';
import Container from '@/components/ui/Container';
import type { PaymentMethodKind } from '@/lib/queries/home';

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

// Etiqueta e ícono por tipo de método de pago (el tipo lo elige el admin en Métodos de pago)
const PAYMENT_LABELS: Record<PaymentMethodKind, { label: string; Icon: IconType }> = {
  MOBILE_PAYMENT: { label: 'Pago Móvil', Icon: FiSmartphone },
  BANK_TRANSFER: { label: 'Transferencia', Icon: FiCreditCard },
  ZELLE: { label: 'Zelle', Icon: SiZelle },
  ZINLI: { label: 'Zinli', Icon: FiCreditCard },
  PAYPAL: { label: 'PayPal', Icon: SiPaypal },
  CRYPTO: { label: 'Binance / Cripto', Icon: SiBinance },
  CASH: { label: 'Efectivo', Icon: FiDollarSign },
  MERCANTIL_PANAMA: { label: 'Mercantil Panamá', Icon: FiCreditCard },
};

interface TrustBarProps {
  whatsapp?: string | null;
  /** Tipos de métodos de pago activos, en el orden del admin */
  paymentMethods: PaymentMethodKind[];
}

/** "Compra con confianza": arriba las garantías de la tienda y abajo las formas de pago activas. */
export default function TrustBar({ whatsapp, paymentMethods }: TrustBarProps) {
  const waNumber = whatsapp?.replace(/\D/g, '');
  const promises: Array<{ Icon: IconType; title: string; text: string; href?: string }> = [
    { Icon: FiTruck, title: 'Envíos nacionales', text: 'Despachamos a toda Venezuela' },
    { Icon: FiShield, title: 'Garantía', text: 'Respaldo en todas tus compras' },
    { Icon: FaWhatsapp, title: 'Soporte por WhatsApp', text: 'Te ayudamos a elegir', href: waNumber ? `https://wa.me/${waNumber}` : undefined },
  ];

  return (
    <section aria-labelledby="confianza-title" className="bg-surface py-6 lg:py-8">
      <Container>
        <h2 id="confianza-title" className="mb-4 text-xl font-bold text-ink lg:text-2xl">Compra con confianza</h2>

        <ul className="grid gap-3 sm:grid-cols-3">
          {promises.map(({ Icon, title, text, href }) => {
            const content = (
              <>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{title}</span>
                  <span className="block text-xs text-muted">{text}</span>
                </span>
                {href && <FiChevronRight className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />}
              </>
            );
            const boxClass = 'flex h-full items-center gap-3 rounded-xl border border-line bg-white p-4';
            return (
              <li key={title}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className={`${boxClass} hover:border-brand-200 focus-visible:outline-2 focus-visible:outline-brand-500`}>
                    {content}
                  </a>
                ) : (
                  <div className={boxClass}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>

        {paymentMethods.length > 0 && (
          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white p-4 lg:flex-row lg:items-center lg:gap-6">
            <div className="shrink-0 lg:w-56">
              <h3 className="text-sm font-semibold text-ink">Formas de pago</h3>
              <p className="text-xs text-muted">Precios en dólares y en bolívares a tasa BCV</p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {paymentMethods.map((kind) => {
                const { label, Icon } = PAYMENT_LABELS[kind];
                return (
                  <li key={kind} className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink">
                    <Icon className="h-4 w-4 text-brand-600" aria-hidden />
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Container>
    </section>
  );
}
