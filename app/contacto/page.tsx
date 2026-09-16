import type { ReactNode } from 'react';
import { getPublicSettings } from '@/lib/site-settings';
import PublicHeader from '@/components/public/PublicHeader';
import PageHeader from '@/components/ui/PageHeader';
import { FiExternalLink, FiMail, FiMapPin, FiMessageCircle, FiPhone } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import ContactForm from '@/components/contact/ContactForm';
import BusinessHours from '@/components/contact/BusinessHours';
import Footer from '@/components/Footer';
import { adminIconChip } from '@/lib/admin-ui';

export const revalidate = 0;

type Canal = {
  clave: string;
  icono: ReactNode;
  titulo: string;
  valor: ReactNode;
  detalle: string;
  href?: string;
  externo?: boolean;
  ancho?: boolean;
};

export default async function ContactoPage() {
  const settings = await getPublicSettings();

  const ubicacion = [settings?.address, [settings?.city, settings?.state].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ');

  // Antes estos canales solo se veían desde md: en el teléfono la página era solo el formulario.
  const canales: Canal[] = [
    settings?.whatsapp && {
      clave: 'whatsapp',
      icono: <FaWhatsapp className="h-5 w-5" aria-hidden="true" />,
      titulo: 'WhatsApp',
      valor: settings.whatsapp,
      detalle: 'Respuesta inmediata en horario laboral',
      // wa.me solo acepta dígitos: con "+" o guiones el enlace no abría el chat
      href: `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`,
      externo: true,
    },
    settings?.email && {
      clave: 'email',
      icono: <FiMail className="h-5 w-5" aria-hidden="true" />,
      titulo: 'Email',
      valor: settings.email,
      detalle: 'Envíanos un correo electrónico',
      href: `mailto:${settings.email}`,
    },
    settings?.phone && {
      clave: 'telefono',
      icono: <FiPhone className="h-5 w-5" aria-hidden="true" />,
      titulo: 'Teléfono',
      valor: settings.phone,
      detalle: 'Llámanos en horario de oficina',
      href: `tel:${settings.phone.replace(/[^\d+]/g, '')}`,
    },
    {
      clave: 'ubicacion',
      icono: <FiMapPin className="h-5 w-5" aria-hidden="true" />,
      titulo: 'Ubicación',
      valor: ubicacion || 'Venezuela',
      detalle: ubicacion ? 'Venezuela' : 'Envíos a todo el país',
      ancho: true,
    },
  ].filter(Boolean) as Canal[];

  return (
    <div className="min-h-dvh bg-white">
      <PublicHeader />

      <PageHeader
        breadcrumbs={[{ label: 'Contacto' }]}
        icon={<FiMessageCircle />}
        eyebrow="Estamos para ayudarte"
        title="Contáctanos"
        description="Escríbenos por el canal que prefieras y te respondemos lo antes posible."
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <section aria-label="Canales de contacto" className="space-y-2 sm:space-y-3 lg:col-span-5">
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-1">
              {canales.map((canal) => {
                const contenido = (
                  <>
                    <span className={adminIconChip('brand')}>{canal.icono}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{canal.titulo}</span>
                      <span className={`block text-sm font-medium text-brand-600 ${canal.href ? 'truncate' : 'line-clamp-2'}`}>{canal.valor}</span>
                      {/* En el teléfono basta con canal y dato: la descripción aparece desde sm */}
                      <span className="hidden truncate text-xs text-muted sm:block">{canal.detalle}</span>
                    </span>
                    {canal.externo && <FiExternalLink className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
                  </>
                );
                const clases = 'flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 sm:p-3';
                return (
                  <li key={canal.clave} className={canal.ancho ? 'sm:col-span-2 lg:col-span-1' : undefined}>
                    {canal.href ? (
                      <a
                        href={canal.href}
                        {...(canal.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className={`${clases} transition-colors hover:border-brand-200 hover:bg-brand-50`}
                      >
                        {contenido}
                      </a>
                    ) : (
                      <div className={clases}>{contenido}</div>
                    )}
                  </li>
                );
              })}
            </ul>

            <BusinessHours businessHours={settings.businessHours ? JSON.stringify(settings.businessHours) : null} />
          </section>

          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
