import type { ComponentType } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import { FiDollarSign, FiShield, FiSmartphone, FiTruck } from 'react-icons/fi';
import { SiBinance, SiPaypal, SiZelle } from 'react-icons/si';
import Container from '@/components/ui/Container';

interface TrustItem {
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  text: string;
  href?: string;
}

/** Barra de confianza: formas de pago, envíos, garantía y soporte (reemplaza "¿Cómo funciona?"). */
export default function TrustBar({ whatsapp }: { whatsapp?: string | null }) {
  const waNumber = whatsapp?.replace(/\D/g, '');
  const items: TrustItem[] = [
    { Icon: FiSmartphone, title: 'Pago Móvil', text: 'Paga desde tu banco' },
    { Icon: SiBinance, title: 'Binance', text: 'Pago con cripto' },
    { Icon: SiZelle, title: 'Zelle', text: 'Transferencia en dólares' },
    { Icon: SiPaypal, title: 'PayPal', text: 'Pago internacional' },
    { Icon: FiDollarSign, title: 'Efectivo', text: 'Divisas en tienda' },
    { Icon: FiTruck, title: 'Envíos nacionales', text: 'A toda Venezuela' },
    { Icon: FiShield, title: 'Garantía', text: 'Respaldo en tus compras' },
    { Icon: FaWhatsapp, title: 'Soporte por WhatsApp', text: 'Te ayudamos a elegir', href: waNumber ? `https://wa.me/${waNumber}` : undefined },
  ];

  return (
    <section aria-labelledby="confianza-title" className="bg-surface py-6 lg:py-8">
      <Container>
        <h2 id="confianza-title" className="mb-4 text-xl font-bold text-ink lg:text-2xl">Compra con confianza</h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map(({ Icon, title, text, href }) => {
            const content = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{title}</span>
                  <span className="block text-xs text-muted">{text}</span>
                </span>
              </>
            );
            return (
              <li key={title}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="flex h-full items-center gap-3 rounded-xl border border-line bg-white p-3 hover:border-brand-200 focus-visible:outline-2 focus-visible:outline-brand-500">
                    {content}
                  </a>
                ) : (
                  <div className="flex h-full items-center gap-3 rounded-xl border border-line bg-white p-3">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
