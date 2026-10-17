// Los datos de la tienda que lleva el presupuesto (C-148b; C-182 los comparte la hoja y el PDF). Solo en el servidor.
import { prisma } from '@/lib/prisma';
import { getPublicSettings } from '@/lib/site-settings';

export interface EmpresaCotizacion {
  /** El nombre de la marca, como en el encabezado de la tienda ("Electro Shop") */
  marca: string;
  /** El ícono de la tienda (Configuración → logo) */
  logo: string | null;
  /** La razón social, para las firmas y la línea del RIF */
  nombre: string;
  lema: string | null;
  rif: string | null;
  direccion: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  sitio: string;
  tasaVES: number;
  /** Los métodos de pago activos con sus datos para pagar, como en el pago de la tienda (decisión de Andrés del 01/10) */
  pagos: { nombre: string; lineas: string[] }[];
  /** "Guanare - Portuguesa", para el sello */
  lugar: string | null;
  /** Imagen del sello firmado (Configuración → Negocio). Sin ella se dibuja el sello con los datos de la empresa.
   *  Se pide al doble de su tamaño en pantalla para que salga nítida al imprimir. */
  selloFirmado: string | null;
}

const base = () => (process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshopve.com').replace(/\/$/, '');

/** El enlace que abre el cliente para ver y aprobar su presupuesto */
export const enlaceCotizacion = (token: string) => `${base()}/cotizacion/${token}`;

export async function empresaCotizacion(): Promise<EmpresaCotizacion> {
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
  return {
    marca: settings.companyName,
    logo: settings.logo,
    nombre: settings.legalName || settings.companyName,
    lema: settings.tagline,
    rif: settings.rif,
    direccion: [settings.address, settings.city, settings.state].filter(Boolean).join(', ') || null,
    telefono: settings.phone,
    whatsapp: settings.whatsapp,
    correo: settings.email,
    sitio: base().replace(/^https?:\/\//, ''),
    tasaVES: settings.exchangeRateVES,
    pagos,
    lugar: [settings.city, settings.state].filter(Boolean).join(' - ') || null,
    selloFirmado: sello?.quoteStamp || null,
  };
}
