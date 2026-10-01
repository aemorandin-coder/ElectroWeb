import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { cookies } from 'next/headers';
import { entrarConProveedor, googleHabilitado } from '@/lib/auth-social';
import { prisma } from '@/lib/prisma';
import { buscarUsuarioPorCorreo, normalizarCorreo } from '@/lib/correo';
import { verifyCaptcha } from '@/lib/captcha';
import { estadoLogin, registrarAcierto, registrarFallo } from '@/lib/login-guard';
import * as bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { ipParaRegistro } from '@/lib/ip';
import { createAuditLog, getSeverityForAction, type AuditAction } from '@/lib/audit-log';
import { describirDispositivo } from '@/lib/dispositivo';
import { abrirSesion, sesionValida } from '@/lib/sesiones';
import { estadoDosPasos, verificarCodigo } from '@/lib/dos-pasos';

/** Inicios de sesión en la bitácora (C-104): Reportes → Seguridad cuenta aciertos, fallos y bloqueos por IP. */
async function registrarEnBitacora(action: AuditAction, datos: { userId?: string; email?: string | null; details?: Record<string, unknown> }) {
  let ipAddress = 'desconocida';
  let userAgent = 'Desconocido';
  try {
    const reqHeaders = await headers();
    ipAddress = ipParaRegistro(reqHeaders);
    userAgent = reqHeaders.get('user-agent') || userAgent;
  } catch {
    // Fuera de una petición (pruebas)
  }
  await createAuditLog({
    action,
    userId: datos.userId,
    userEmail: datos.email ?? undefined,
    targetType: 'USER',
    targetId: datos.userId,
    details: datos.details,
    ipAddress,
    userAgent,
    severity: getSeverityForAction(action),
  });
}

/** Último acceso (dispositivo e IP). Lo usan el login con correo y el de Google. */
async function registrarAcceso(userId: string, isAdmin: boolean, email: string | null, metodo: 'contraseña' | 'google') {
  await registrarEnBitacora('AUTH_LOGIN_SUCCESS', { userId, email, details: { metodo, panel: isAdmin } });
  try {
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get('user-agent') || 'Desconocido';
    const ip = ipParaRegistro(reqHeaders);

    const deviceString = describirDispositivo(userAgent);

    await prisma.profile.upsert({
      where: { userId },
      create: { userId, lastLoginAt: new Date(), lastLoginDevice: deviceString, lastLoginIp: ip },
      update: { lastLoginAt: new Date(), lastLoginDevice: deviceString, lastLoginIp: ip },
    });
    // El aviso de entrada al panel (con "No fui yo") lo manda lib/sesiones.ts, que ya conoce la sesión (C-140)
  } catch (err) {
    console.error('Failed to update last login info:', err);
  }
}

/** IP de quien intenta entrar (misma fuente que el resto de los límites; ver lib/login-guard.ts). */
async function ipDeLaPeticion(): Promise<string> {
  try {
    const reqHeaders = await headers();
    return ipParaRegistro(reqHeaders);
  } catch {
    return 'desconocida';
  }
}

/**
 * Estado de la cuenta al entrar, con contraseña o con Google (C-80):
 * - SUSPENDED: la desactivó la tienda (C-92). No entra.
 * - DEACTIVATED: la desactivó el propio cliente en Configuración, que le promete "podrás reactivarla
 *   iniciando sesión". Entrar la reactiva.
 * - PENDING_DELETION: entra; Configuración le muestra cómo cancelar la eliminación.
 */
async function cuentaPuedeEntrar(userId: string): Promise<boolean> {
  const perfil = await prisma.profile.findUnique({ where: { userId }, select: { accountStatus: true } });
  if (perfil?.accountStatus === 'SUSPENDED') return false;
  if (perfil?.accountStatus === 'DEACTIVATED') {
    await prisma.profile.update({ where: { userId }, data: { accountStatus: 'ACTIVE', deactivatedAt: null } });
  }
  return true;
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
        captchaToken: { label: 'Captcha', type: 'text' },
        // C-141: el código de 6 dígitos de la app (o uno de respaldo) de los admin con dos pasos
        codigo: { label: 'Código', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        // Límite de intentos en el servidor (C-80): espera progresiva y, tras 2 fallos, captcha obligatorio
        const correo = normalizarCorreo(credentials.email);
        const ip = await ipDeLaPeticion();
        const estado = estadoLogin(correo, ip);
        if (estado.esperar > 0) throw new Error(`DEMASIADOS_INTENTOS:${estado.esperar}`);
        if (estado.pideCaptcha && !(await verifyCaptcha(credentials.captchaToken, ip)).ok) {
          throw new Error('CAPTCHA_REQUERIDO');
        }

        // Unified login: check User table for both admins and customers
        // Sin distinguir mayúsculas ni espacios: el registro guarda el correo en minúsculas (C-83)
        const user = await buscarUsuarioPorCorreo(correo);

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
            if (!(await cuentaPuedeEntrar(user.id))) {
              await registrarEnBitacora('SECURITY_ACCESS_DENIED', { userId: user.id, email: user.email, details: { motivo: 'Cuenta suspendida' } });
              throw new Error('CUENTA_SUSPENDIDA');
            }

            const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

            // C-141: con dos pasos activos, la contraseña sola no alcanza. Un código equivocado cuenta como fallo
            // (mismo límite de intentos que la contraseña). Sin dos pasos, el admin entra solo a configurarlos.
            let dosPasos = false;
            if (isAdmin && (await estadoDosPasos(user.id)).activo) {
              const codigo = credentials.codigo?.trim();
              if (!codigo) throw new Error('CODIGO_REQUERIDO');
              if (!(await verificarCodigo(user.id, codigo))) {
                const esperar = registrarFallo(correo, ip);
                await registrarEnBitacora(esperar > 0 ? 'AUTH_LOGIN_BLOCKED' : 'AUTH_LOGIN_FAILED', {
                  userId: user.id,
                  email: correo,
                  details: { motivo: 'Código de dos pasos equivocado', ...(esperar > 0 ? { esperaSegundos: esperar } : {}) },
                });
                throw new Error(esperar > 0 ? `DEMASIADOS_INTENTOS:${esperar}` : 'CODIGO_INVALIDO');
              }
              dosPasos = true;
            }
            registrarAcierto(correo);

            await registrarAcceso(user.id, isAdmin, user.email, 'contraseña');

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
              dosPasos,
            };
          }
        }

        const esperar = registrarFallo(correo, ip);
        // Una fila por fallo; el bloqueo se anota una vez (los intentos durante la espera se cortan arriba, sin fila)
        await registrarEnBitacora(esperar > 0 ? 'AUTH_LOGIN_BLOCKED' : 'AUTH_LOGIN_FAILED', {
          userId: user?.id,
          email: correo,
          details: { cuentaExiste: Boolean(user), ...(esperar > 0 ? { esperaSegundos: esperar } : {}) },
        });
        throw new Error(esperar > 0 ? `DEMASIADOS_INTENTOS:${esperar}` : 'Credenciales invalidas');
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
      if (!(await cuentaPuedeEntrar(dbUser.id))) {
        await registrarEnBitacora('SECURITY_ACCESS_DENIED', { userId: dbUser.id, email: dbUser.email, details: { motivo: 'Cuenta suspendida', metodo: 'google' } });
        return '/login?error=cuenta-suspendida';
      }

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
      await registrarAcceso(dbUser.id, false, dbUser.email, 'google');
      return true;
    },
    async jwt({ token, user, trigger, account }) {
      if (user) {
        token.id = user.id;
        token.image = user.image;
        token.role = user.role;
        token.permissions = user.permissions;
        token.userType = user.userType;
        token.emailVerified = Boolean(user.emailVerified);
        token.sessionVersion = user.sessionVersion;
        token.dosPasos = Boolean(user.dosPasos);
        // C-140: cada inicio de sesión tiene su fila (dispositivo, vencimiento, cierre); el token lleva su id
        token.sid = await abrirSesion({
          userId: user.id,
          esAdmin: user.userType === 'admin',
          metodo: account?.provider === 'google' ? 'google' : 'contraseña',
          version: user.sessionVersion ?? 0,
        });
      } else if (token.id) {
        // Cerrada, vencida, versión vieja, admin sin uso o cuenta suspendida (lib/sesiones.ts).
        // Token vacío = sesión inválida: NextAuth la cierra en el próximo pedido
        if (!(await sesionValida(token))) return {} as unknown as JWT;
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
          // C-141: al activar los dos pasos la sesión pasa a verificada sin volver a entrar
          if (token.userType === 'admin') token.dosPasos = (await estadoDosPasos(dbUser.id)).activo;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!token || !token.id) {
        // Sin token no hay sesión; NextAuth acepta null aunque su tipo no lo diga
        return null as unknown as Session;
      }
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.permissions = token.permissions;
        session.user.userType = token.userType;
        session.user.image = token.image;
        session.user.emailVerified = token.emailVerified;
        session.user.dosPasos = Boolean(token.dosPasos);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // debug solo en dev — evita logs de CLIENT_FETCH_ERROR en producción
  debug: false,
};
