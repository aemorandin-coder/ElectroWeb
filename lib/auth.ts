import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { cookies } from 'next/headers';
import { entrarConProveedor, googleHabilitado } from '@/lib/auth-social';
import { emitAdminEvent } from '@/lib/admin-events';
import { prisma } from '@/lib/prisma';
import { buscarUsuarioPorCorreo } from '@/lib/correo';
import * as bcrypt from 'bcryptjs';
import { headers } from 'next/headers';

/** Último acceso (dispositivo e IP) y aviso al equipo si entra un admin. Lo usan el login con correo y el de Google. */
async function registrarAcceso(userId: string, nombre: string, isAdmin: boolean, role: string) {
  try {
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get('user-agent') || 'Desconocido';
    const ip = reqHeaders.get('x-forwarded-for')?.split(',')[0] || reqHeaders.get('x-real-ip') || '127.0.0.1';

    let device = 'Desconocido';
    if (userAgent.includes('Windows')) device = 'Windows';
    else if (userAgent.includes('Macintosh')) device = 'macOS';
    else if (userAgent.includes('iPhone')) device = 'iPhone';
    else if (userAgent.includes('iPad')) device = 'iPad';
    else if (userAgent.includes('Android')) device = 'Android';
    else if (userAgent.includes('Linux')) device = 'Linux';

    let browser = '';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    const deviceString = browser ? `${device} (${browser})` : device;

    await prisma.profile.upsert({
      where: { userId },
      create: { userId, lastLoginAt: new Date(), lastLoginDevice: deviceString, lastLoginIp: ip },
      update: { lastLoginAt: new Date(), lastLoginDevice: deviceString, lastLoginIp: ip },
    });
    if (isAdmin) {
      emitAdminEvent({
        type: 'ADMIN_LOGIN',
        title: `Inicio de sesión · ${nombre}`,
        summary: 'Entró al panel de administración',
        fields: [['Dispositivo', deviceString], ['IP', ip], ['Rol', role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin']],
        link: '/admin',
      });
    }
  } catch (err) {
    console.error('Failed to update last login info:', err);
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'unified-credentials',
      name: 'Unified Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        userType: { label: 'User Type', type: 'text' }, // Kept for compatibility but ignored logic-wise
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        // Unified login: check User table for both admins and customers
        // Sin distinguir mayúsculas ni espacios: el registro guarda el correo en minúsculas (C-83)
        const user = await buscarUsuarioPorCorreo(credentials.email);

        // Cuenta creada con Google (sin contraseña): decirlo en vez de "incorrectos" (C-85)
        if (user && !user.password) {
          throw new Error('CUENTA_SOCIAL');
        }

        if (user && user.password) {
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (isPasswordValid) {
            const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

            // SUPER_ADMIN single session rule: delete all previous sessions
            if (user.role === 'SUPER_ADMIN') {
              await prisma.session.deleteMany({
                where: { userId: user.id },
              });
            }

            await registrarAcceso(user.id, user.name || user.email || '', isAdmin, user.role);

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role,
              userType: isAdmin ? 'admin' : 'customer',
              emailVerified: user.emailVerified ? true : false,
              permissions: [],
              sessionVersion: user.sessionVersion,
            };
          }
        }

        throw new Error('Credenciales invalidas');
      },
    }),
    // C-85: solo existe si las dos variables están en el entorno
    ...(googleHabilitado()
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            authorization: { params: { prompt: 'select_account' } },
          }),
        ]
      : []),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider === 'unified-credentials') return true;

      // Google (C-85): crea, vincula o rechaza. `user` es el mismo objeto que recibe jwt(): se completa con la cuenta de la tienda.
      let referido: string | null = null;
      try {
        referido = (await cookies()).get('electroshop_ref')?.value ?? null;
      } catch {
        // Fuera de una petición (pruebas): sin código de promotor
      }
      const resultado = await entrarConProveedor({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        email: user.email,
        emailVerificado: (profile as { email_verified?: boolean } | undefined)?.email_verified === true,
        nombre: user.name,
        imagen: user.image,
        codigoReferido: referido,
        tipoCuenta: account.type,
      });
      if (!resultado.ok) return `/login?error=${account.provider}-${resultado.motivo}`;

      const dbUser = await prisma.user.findUnique({
        where: { id: resultado.userId },
        select: { id: true, name: true, email: true, image: true, role: true, emailVerified: true, sessionVersion: true },
      });
      if (!dbUser) return `/login?error=${account.provider}-sin-correo`;

      Object.assign(user, {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        image: dbUser.image,
        role: dbUser.role,
        userType: 'customer',
        emailVerified: Boolean(dbUser.emailVerified),
        permissions: [],
        sessionVersion: dbUser.sessionVersion,
      });
      await registrarAcceso(dbUser.id, dbUser.name || dbUser.email || '', false, dbUser.role);
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.image = (user as any).image;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
        token.userType = (user as any).userType;
        token.emailVerified = (user as any).emailVerified;
        token.sessionVersion = (user as any).sessionVersion;
      } else if (token.id) {
        // Validate sessionVersion is still valid on subsequent requests
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { sessionVersion: true }
        });
        const tokenVersion = token.sessionVersion !== undefined ? token.sessionVersion : 0;
        if (!dbUser || dbUser.sessionVersion !== tokenVersion) {
          return {} as any;
        }
      }

      // Refresh token on each request to keep session alive
      if (trigger === 'update') {
        // Refresh user data from User table
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            emailVerified: true,
            sessionVersion: true,
          },
        });

        if (dbUser) {
          token.name = dbUser.name;
          token.image = dbUser.image;
          token.role = dbUser.role;
          token.userType = (dbUser.role === 'ADMIN' || dbUser.role === 'SUPER_ADMIN') ? 'admin' : 'customer';
          token.emailVerified = dbUser.emailVerified ? true : false;
          token.sessionVersion = dbUser.sessionVersion;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!token || !token.id) {
        return null as any;
      }
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions;
        (session.user as any).userType = token.userType;
        (session.user as any).image = token.image;
        (session.user as any).emailVerified = token.emailVerified;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // debug solo en dev — evita logs de CLIENT_FETCH_ERROR en producción
  debug: false,
};
