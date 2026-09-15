import { getPublicSettings } from '@/lib/site-settings';
import PublicHeader from '@/components/public/PublicHeader';
import PageHeader from '@/components/ui/PageHeader';
import { FiMessageCircle } from 'react-icons/fi';
import ContactForm from '@/components/contact/ContactForm';
import BusinessHours from '@/components/contact/BusinessHours';
import Footer from '@/components/Footer';

export const revalidate = 0;

export default async function ContactoPage() {
  const settings = await getPublicSettings();

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

      {/* Main Content */}
      <main className="bg-white max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* 1. VISTA MÓVIL: Solo Formulario */}
          <div className="md:hidden">
            <ContactForm />
          </div>

          {/* 2. VISTA ESCRITORIO: Lista Vertical Estilo Original */}
          <div className="hidden md:block space-y-4">
            {/* WhatsApp Desktop */}
            {settings?.whatsapp && (
              <a
                href={`https://wa.me/${settings.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative overflow-hidden"
              >
                
                <div className="relative flex items-start gap-4 p-5 bg-white rounded-2xl border border-line shadow-xs hover:border-brand-200 transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                    <svg className="w-7 h-7 text-brand-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-ink mb-1">WhatsApp</h3>
                    <p className="text-sm text-muted mb-2">Respuesta inmediata en horario laboral</p>
                    <span className="text-sm font-semibold text-brand-500 group-hover:text-brand-600">
                      {settings.whatsapp}
                    </span>
                  </div>
                  <svg className="w-5 h-5 text-muted group-hover:text-brand-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            )}

            {/* Email Desktop */}
            {settings?.email && (
              <a
                href={`mailto:${settings.email}`}
                className="group block relative overflow-hidden"
              >
                
                <div className="relative flex items-start gap-4 p-5 bg-white rounded-2xl border border-line shadow-xs hover:border-brand-200 transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                    <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-ink mb-1">Email</h3>
                    <p className="text-sm text-muted mb-2">Envíanos un correo electrónico</p>
                    <span className="text-sm font-semibold text-brand-500">
                      {settings.email}
                    </span>
                  </div>
                </div>
              </a>
            )}

            {/* Phone Desktop */}
            {settings?.phone && (
              <a
                href={`tel:${settings.phone}`}
                className="group block relative overflow-hidden"
              >
                
                <div className="relative flex items-start gap-4 p-5 bg-white rounded-2xl border border-line shadow-xs hover:border-brand-200 transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                    <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-ink mb-1">Teléfono</h3>
                    <p className="text-sm text-muted mb-2">Llámanos en horario de oficina</p>
                    <span className="text-sm font-semibold text-brand-500">
                      {settings.phone}
                    </span>
                  </div>
                </div>
              </a>
            )}

            {/* Location Desktop */}
            <div className="relative overflow-hidden">
              <div className="relative flex items-start gap-4 p-5 bg-white rounded-2xl border border-line shadow-xs">
                <div className="flex-shrink-0 w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                  <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-ink mb-1">Ubicación</h3>
                  <p className="text-sm text-muted">
                    {settings?.address && <>{settings.address}<br /></>}
                    {settings?.city && <>{settings.city}, </>}{settings?.state}<br />
                    Venezuela
                  </p>
                </div>
              </div>
            </div>

            <BusinessHours businessHours={settings.businessHours ? JSON.stringify(settings.businessHours) : null} />
          </div>

          {/* Form for Desktop only (Mobile already has form at top) */}
          <div className="hidden md:block w-full">
            <ContactForm />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
