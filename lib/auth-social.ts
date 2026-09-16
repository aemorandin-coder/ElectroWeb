import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { emitAdminEvent } from '@/lib/admin-events';
import { buscarUsuarioPorCorreo, normalizarCorreo } from '@/lib/correo';

/**
 * Registro e inicio con Google (C-85). Decisiones de Andrés del 16/09:
 * - Si ya existe una cuenta con ese correo, se vincula sola (Google solo entrega correos verificados).
 * - Teléfono y cédula no vienen de Google: se piden en la primera compra.
 * - Los administradores NO entran con Google, ni con una cuenta vinculada antes de ser admin.
 *
 * El botón solo aparece si GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET existen en el entorno.
 */

export function googleHabilitado(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export type MotivoRechazoSocial = 'admin' | 'correo-no-verificado' | 'sin-correo';

export type ResultadoSocial =
  | { ok: true; userId: string; nuevo: boolean }
  | { ok: false; motivo: MotivoRechazoSocial };

export interface DatosProveedor {
  provider: string;
  providerAccountId: string;
  email: string | null | undefined;
  emailVerificado: boolean;
  nombre: string | null | undefined;
  imagen: string | null | undefined;
  /** Código de promotor de la cookie electroshop_ref, sin validar */
  codigoReferido?: string | null;
  /** account.type de NextAuth ('oauth') */
  tipoCuenta?: string;
}

const esAdmin = (role: string) => role === 'ADMIN' || role === 'SUPER_ADMIN';

/** Nombre para la cuenta: sin HTML ni espacios de más; si Google no lo trae, la parte del correo antes de la @. */
function nombreLimpio(nombre: string | null | undefined, email: string): string {
  const limpio = (nombre ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return limpio || email.split('@')[0].slice(0, 80);
}

/** Solo fotos https (la de Google): nunca otro esquema. */
function imagenSegura(imagen: string | null | undefined): string | null {
  return imagen && /^https:\/\/[^\s]+$/i.test(imagen) && imagen.length <= 500 ? imagen : null;
}

async function referidoValido(codigo: string | null | undefined): Promise<string | null> {
  if (!codigo || !/^[A-Z0-9_-]{3,20}$/.test(codigo)) return null;
  const promotor = await prisma.influencer.findUnique({ where: { code: codigo, status: 'ACTIVE' }, select: { id: true } });
  return promotor ? codigo : null;
}

function datosCuenta(d: DatosProveedor, userId: string): Prisma.AccountUncheckedCreateInput {
  // Solo se guarda el vínculo: la tienda no usa los tokens de Google
  return { userId, type: d.tipoCuenta ?? 'oauth', provider: d.provider, providerAccountId: d.providerAccountId };
}

/**
 * Decide a qué usuario de la tienda entra quien viene de un proveedor social, creándolo o vinculándolo si hace falta.
 * No lanza por reglas de negocio: devuelve el motivo para mostrarlo en el login.
 */
export async function entrarConProveedor(d: DatosProveedor): Promise<ResultadoSocial> {
  const email = normalizarCorreo(d.email);
  if (!email) return { ok: false, motivo: 'sin-correo' };
  if (!d.emailVerificado) return { ok: false, motivo: 'correo-no-verificado' };

  // 1. Cuenta ya vinculada
  const vinculada = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: d.provider, providerAccountId: d.providerAccountId } },
    select: { user: { select: { id: true, role: true } } },
  });
  if (vinculada) {
    if (esAdmin(vinculada.user.role)) return { ok: false, motivo: 'admin' };
    return { ok: true, userId: vinculada.user.id, nuevo: false };
  }

  // 2. Cuenta existente con el mismo correo: se vincula
  const existente = await buscarUsuarioPorCorreo(email);
  if (existente) {
    if (esAdmin(existente.role)) return { ok: false, motivo: 'admin' };
    await prisma.$transaction(async (tx) => {
      await tx.account.upsert({
        where: { provider_providerAccountId: { provider: d.provider, providerAccountId: d.providerAccountId } },
        create: datosCuenta(d, existente.id),
        update: {},
      });
      const cambios: Prisma.UserUpdateInput = {};
      if (!existente.emailVerified) {
        // Google confirmó el correo. Si la cuenta nunca se verificó, pudo crearla otra persona con el correo
        // del dueño para esperarlo adentro: su contraseña deja de servir y sus sesiones se cierran.
        // El dueño entra con Google o crea una contraseña nueva con "¿La olvidaste?".
        cambios.emailVerified = new Date();
        cambios.password = null;
        cambios.sessionVersion = { increment: 1 };
      }
      if (!existente.image && imagenSegura(d.imagen)) cambios.image = imagenSegura(d.imagen);
      if (Object.keys(cambios).length) await tx.user.update({ where: { id: existente.id }, data: cambios });
    });
    return { ok: true, userId: existente.id, nuevo: false };
  }

  // 3. Cliente nuevo
  const referido = await referidoValido(d.codigoReferido);
  const nombre = nombreLimpio(d.nombre, email);
  let userId: string;
  try {
    const creado = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: nombre,
          email,
          emailVerified: new Date(),
          image: imagenSegura(d.imagen),
          password: null,
          referredByCode: referido,
          profile: { create: {} },
        },
        select: { id: true },
      });
      await tx.account.create({ data: datosCuenta(d, user.id) });
      return user;
    });
    userId = creado.id;
  } catch (error) {
    // Dos pestañas volviendo de Google a la vez: la otra ya creó la cuenta
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const otra = await buscarUsuarioPorCorreo(email);
      if (otra && !esAdmin(otra.role)) return { ok: true, userId: otra.id, nuevo: false };
    }
    throw error;
  }

  await bienvenidaCliente(userId, nombre, email, referido, d.provider);
  return { ok: true, userId, nuevo: true };
}

const NOMBRE_PROVEEDOR: Record<string, string> = { google: 'Google', facebook: 'Facebook', apple: 'Apple' };

/** Lo mismo que hace el registro con correo después de crear la cuenta (sin enlace de verificación). */
async function bienvenidaCliente(userId: string, nombre: string, email: string, referido: string | null, provider: string) {
  if (referido) {
    const { recordRegistration } = await import('@/lib/influencer-commission');
    recordRegistration(userId).catch(() => {});
  }

  try {
    await prisma.notification.createMany({
      data: [
        {
          userId,
          type: 'SYSTEM',
          title: 'Bienvenido a Electro Shop',
          message: `Hola ${nombre}, tu cuenta está lista. En tu primera compra te pediremos tu teléfono y tu cédula.`,
          link: '/customer/profile',
          icon: 'FiUser',
        },
        {
          userId,
          type: 'PROMOTION',
          title: 'Descubre los descuentos exclusivos',
          message: 'Guarda productos en tu Lista de Deseos y solicita descuentos especiales. Nuestro equipo revisará tu solicitud y te notificará cuando sea aprobada.',
          link: '/customer/wishlist',
          icon: 'FiPercent',
        },
      ],
    });
  } catch (error) {
    console.error('Error creando notificaciones de bienvenida:', error);
  }

  const origen = NOMBRE_PROVEEDOR[provider] ?? provider;
  emitAdminEvent({
    type: 'CUSTOMER_REGISTERED',
    title: `Cliente nuevo · ${nombre}`,
    summary: `${nombre} creó una cuenta con ${origen}`,
    fields: [
      ['Correo', email],
      ['Llegó por', referido ? `${origen} · promotor ${referido}` : origen],
    ],
    link: '/admin/customers',
  });
}
