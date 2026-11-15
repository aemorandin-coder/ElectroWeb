import type { ComponentType } from 'react';
import Link from 'next/link';
import { IconoBillete, IconoChevronDerecha, IconoPagoMovil, IconoServicioTecnico, IconoTarjeta } from '@/components/iconos';
import { FaWhatsapp } from 'react-icons/fa6';
import { SiBinance, SiPaypal, SiZelle } from 'react-icons/si';
import Container from '@/components/ui/Container';
import type { PaymentMethodKind } from '@/lib/queries/home';
import { aniosDeLaTienda, ORIGEN_TIENDA_ESTADO } from '@/lib/origen';

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

// Etiqueta e ícono por tipo de método de pago (el tipo lo elige el admin en Métodos de pago)
export const PAYMENT_LABELS: Record<PaymentMethodKind, { label: string; Icon: IconType }> = {
  MOBILE_PAYMENT: { label: 'Pago Móvil', Icon: IconoPagoMovil },
  BANK_TRANSFER: { label: 'Transferencia', Icon: IconoTarjeta },
  BINANCE_PAY: { label: 'Binance Pay', Icon: SiBinance },
  ZELLE: { label: 'Zelle', Icon: SiZelle },
  ZINLI: { label: 'Zinli', Icon: IconoTarjeta },
  PAYPAL: { label: 'PayPal', Icon: SiPaypal },
  CRYPTO: { label: 'Cripto', Icon: SiBinance },
  CASH: { label: 'Efectivo', Icon: IconoBillete },
  MERCANTIL_PANAMA: { label: 'Mercantil Panamá', Icon: IconoTarjeta },
};

interface TrustBarProps {
  whatsapp?: string | null;
  /** Tipos de métodos de pago activos, en el orden del admin */
  paymentMethods: PaymentMethodKind[];
  /** C-224: el Pago Móvil se verifica con el banco (la conciliación del BDV configurada en el servidor) */
  pagoMovilVerificado?: boolean;
}

/**
 * C-224: "Por qué comprar en Electro Shop" (antes "Compra con confianza"): las tres cosas que nos hacen únicos hoy, que
 * eligió el equipo el 14/11 (C-220). Solo lo que la tienda cumple: el Pago Móvil confirmado por el banco sale si la
 * conciliación del BDV está configurada; si no, la atención por WhatsApp. Abajo, las formas de pago activas.
 */
export default function TrustBar({ whatsapp, paymentMethods, pagoMovilVerificado = false }: TrustBarProps) {
  const waNumber = whatsapp?.replace(/\D/g, '');
  const promises: Array<{ Icon: IconType; title: string; text: string; href?: string; externo?: boolean }> = [
    { Icon: IconoBillete, title: 'Sabes cuánto pagas antes de pagar', text: 'Precio en dólares y en bolívares a tasa BCV, con el IVA incluido, y tu envío calculado con ZOOM antes de pagar.' },
    pagoMovilVerificado
      ? { Icon: IconoPagoMovil, title: 'Tu Pago Móvil lo confirma el banco', text: 'No mandas capturas ni esperas a que alguien revise: verificamos tu pago con el Banco de Venezuela.' }
      : { Icon: FaWhatsapp, title: 'Te atendemos por WhatsApp', text: 'Personas de la tienda te ayudan a elegir y a comprar.', href: waNumber ? `https://wa.me/${waNumber}` : undefined, externo: true },
    { Icon: IconoServicioTecnico, title: 'Una tienda de verdad, con taller propio', text: `${aniosDeLaTienda()} años en ${ORIGEN_TIENDA_ESTADO}, ahora a toda Venezuela. Tu garantía la atiende nuestro servicio técnico.`, href: '/servicios' },
  ];

  return (
    <section aria-labelledby="confianza-title" className="bg-surface py-6 lg:py-8">
      <Container>
        <h2 id="confianza-title" className="mb-4 text-xl font-bold text-ink lg:text-2xl">Por qué comprar en Electro Shop</h2>

        <ul className="grid gap-3 sm:grid-cols-3">
          {promises.map(({ Icon, title, text, href, externo }) => {
            const content = (
              <>
                <span className="iconos-marca flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-950">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-ink">{title}</span>
                  <span className="mt-1 block text-sm text-ink-soft">{text}</span>
                </span>
                {href && <IconoChevronDerecha className="h-4 w-4 shrink-0 self-center text-brand-500" aria-hidden />}
              </>
            );
            const boxClass = 'flex h-full items-start gap-3 rounded-xl border border-line bg-white p-4 lg:p-5';
            const enlaceClass = `${boxClass} hover:border-brand-200 focus-visible:outline-2 focus-visible:outline-brand-500`;
            return (
              <li key={title}>
                {href && externo ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className={enlaceClass}>
                    {content}
                  </a>
                ) : href ? (
                  <Link href={href} className={enlaceClass}>{content}</Link>
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
