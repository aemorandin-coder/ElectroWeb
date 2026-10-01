import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { FiAlertTriangle, FiCheckCircle, FiEdit3, FiEye } from 'react-icons/fi';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { formatUSD } from '@/lib/currency';
import { getPublicSettings } from '@/lib/site-settings';
import { qrSvg } from '@/lib/qr';
import { aCotizacionPublica, cotizacionPorToken } from '@/lib/cotizaciones';
import DocumentoCotizacion, { type EmpresaCotizacion } from '@/components/cotizaciones/DocumentoCotizacion';
import { AprobarCotizacion, BotonImprimir } from '@/components/cotizaciones/AccionesCotizacion';
import { adminNotice } from '@/lib/admin-ui';

// La cotización que abre el cliente con su enlace (C-148): la lee, la imprime y la aprueba, sin cuenta.
// Un borrador solo lo ve el equipo (vista previa antes de enviarla).

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Presupuesto', robots: { index: false, follow: false } };

export default async function CotizacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let cotizacion = await cotizacionPorToken(token);
  let vistaPrevia = false;
  if (!cotizacion && /^[A-Za-z0-9_-]{16,40}$/.test(token)) {
    const session = await getServerSession(authOptions);
    if (isAuthorized(session, 'MANAGE_ORDERS')) {
      cotizacion = await prisma.quote.findUnique({ where: { token }, include: { items: { orderBy: { position: 'asc' } } } });
      vistaPrevia = Boolean(cotizacion);
    }
  }
  if (!cotizacion) notFound();

  // Los datos para pagar: los métodos activos de Métodos de Pago, con los mismos campos que ve el cliente al pagar en
  // la tienda (sin notas internas). Los ve quien tenga el enlace: decisión de Andrés del 01/10.
  const [settings, sello, metodos] = await Promise.all([
    getPublicSettings(),
    // El sello firmado no va en los settings públicos: solo lo ve quien abre un presupuesto
    prisma.companySettings.findUnique({ where: { id: 'default' }, select: { quoteStamp: true } }),
    prisma.companyPaymentMethod.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { name: true, bankName: true, accountNumber: true, accountType: true, holderName: true, holderId: true, phone: true, email: true, payId: true, walletAddress: true, network: true },
    }),
  ]);
  const pagos = metodos.map((m) => ({
    nombre: m.name,
    lineas: [
      m.bankName && `Banco: ${m.bankName}`,
      m.accountNumber && `Cuenta${m.accountType ? ` ${m.accountType.toLowerCase()}` : ''}: ${m.accountNumber}`,
      m.holderName && `Titular: ${m.holderName}`,
      m.holderId && `Cédula o RIF: ${m.holderId}`,
      m.phone && `Teléfono: ${m.phone}`,
      m.email && `Correo: ${m.email}`,
      m.payId && `ID de pago: ${m.payId}`,
      m.walletAddress && `Dirección${m.network ? ` (${m.network})` : ''}: ${m.walletAddress}`,
    ].filter((linea): linea is string => Boolean(linea)),
  }));
  const empresa: EmpresaCotizacion = {
    marca: settings.companyName,
    logo: settings.logo,
    nombre: settings.legalName || settings.companyName,
    lema: settings.tagline,
    rif: settings.rif,
    direccion: [settings.address, settings.city, settings.state].filter(Boolean).join(', ') || null,
    telefono: settings.phone,
    whatsapp: settings.whatsapp,
    correo: settings.email,
    sitio: (process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshopve.com').replace(/^https?:\/\//, ''),
    tasaVES: settings.exchangeRateVES,
    pagos,
    lugar: [settings.city, settings.state].filter(Boolean).join(' - ') || null,
    selloFirmado: sello?.quoteStamp || null,
  };
  const publica = aCotizacionPublica(cotizacion);
  const pendiente = publica.status === 'SENT';
  // En la hoja impresa sin aprobar: el código que lleva de vuelta a esta página
  const qr = pendiente ? qrSvg(`${(process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshopve.com').replace(/\/$/, '')}/cotizacion/${token}`) : null;

  return (
    <main className="documento-imprimible min-h-dvh bg-surface px-3 pb-28 pt-4 sm:px-6 sm:pt-8 lg:pb-8 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-4xl flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/" className="text-sm font-semibold text-brand-600 hover:text-brand-700">{empresa.nombre}</Link>
        <BotonImprimir pendiente={pendiente} />
      </div>

      {vistaPrevia && (
        <p className={`${adminNotice('warning')} mx-auto mb-4 flex max-w-4xl items-start gap-2 print:hidden`} role="status">
          <FiEye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Vista previa del equipo: el cliente todavía no puede abrir este enlace. Se activa al enviarla desde el panel.
        </p>
      )}
      {pendiente && (
        <div className={`${adminNotice('brand')} mx-auto mb-4 flex max-w-4xl items-start gap-2 print:hidden`} data-como-aprobar>
          <FiEdit3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <strong className="font-semibold">Este presupuesto se aprueba aquí mismo, sin imprimir ni firmar a mano.</strong>{' '}
            Revísalo y, si estás de acuerdo, <a href="#aprobar" className="font-semibold underline">escribe tu nombre y tu cédula o RIF al final de la página</a>.
            Queda registrado con la fecha y la hora, y después puedes imprimirlo o guardarlo en PDF ya aprobado.
          </p>
        </div>
      )}
      {publica.status === 'APPROVED' && (
        <p className={`${adminNotice('success')} mx-auto mb-4 flex max-w-4xl items-start gap-2 print:hidden`} role="status">
          <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Presupuesto aprobado. Te escribimos para coordinar el pago y la entrega. Ya puedes imprimirlo o guardarlo en PDF con la aprobación.
        </p>
      )}
      {publica.status === 'EXPIRED' && (
        <p className={`${adminNotice('danger')} mx-auto mb-4 flex max-w-4xl items-start gap-2 print:hidden`} role="status">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Este presupuesto venció: los precios y la disponibilidad pueden haber cambiado. Escríbenos y te lo actualizamos.
        </p>
      )}

      <DocumentoCotizacion cotizacion={publica} empresa={empresa} qr={qr} />

      {pendiente && <AprobarCotizacion token={token} total={formatUSD(publica.totales.totalUSD)} />}
    </main>
  );
}
