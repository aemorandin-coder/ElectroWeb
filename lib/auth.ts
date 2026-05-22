import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { headers } from 'next/headers';

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
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

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
              console.log(`[AUTH] SUPER_ADMIN session cleared for: ${user.email}`);
            }

            // Update last login info
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
                where: { userId: user.id },
                create: {
                  userId: user.id,
                  lastLoginAt: new Date(),
                  lastLoginDevice: deviceString,
                  lastLoginIp: ip,
                },
                update: {
                  lastLoginAt: new Date(),
                  lastLoginDevice: deviceString,
                  lastLoginIp: ip,
                },
              });
            } catch (err) {
              console.error('Failed to update last login info:', err);
            }

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
