import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

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
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role,
              userType: (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? 'admin' : 'customer',
              permissions: [], // Add permissions logic if needed based on role
            };
          }
        }

        throw new Error('Credenciales inválidas');
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
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
        token.userType = (user as any).userType;
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
          },
        });

        if (dbUser) {
          token.name = dbUser.name;
          token.image = dbUser.image;
          token.role = dbUser.role;
          token.userType = (dbUser.role === 'ADMIN' || dbUser.role === 'SUPER_ADMIN') ? 'admin' : 'customer';
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions;
        (session.user as any).userType = token.userType;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
