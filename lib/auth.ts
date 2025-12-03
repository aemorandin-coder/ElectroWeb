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
        userType: { label: 'User Type', type: 'text' }, // 'admin' or 'customer'
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const userType = credentials.userType || 'customer'; // Default to customer

        if (userType === 'admin') {
          // Try admin login
          const adminUser = await prisma.adminUser.findUnique({
            where: { email: credentials.email },
          });

          if (adminUser && adminUser.isActive) {
            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              adminUser.password
            );

            if (isPasswordValid) {
              await prisma.adminUser.update({
                where: { id: adminUser.id },
                data: { lastLogin: new Date() },
              });

              return {
                id: adminUser.id,
                email: adminUser.email,
                name: adminUser.name,
                role: adminUser.role,
                permissions: adminUser.permissions,
                userType: 'admin',
              };
            }
          }
        } else {
          // Try customer login
          const customer = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (customer) {
            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              customer.password
            );

            if (isPasswordValid) {
              return {
                id: customer.id,
                email: customer.email,
                name: customer.name,
                image: customer.image,
                userType: 'customer',
                role: 'CUSTOMER',
                permissions: [],
              };
            }
          }
        }

        throw new Error('Invalid credentials');
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
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
        const userType = token.userType as string;
        
        if (userType === 'admin') {
          // Refresh admin user data
          const adminUser = await prisma.adminUser.findUnique({
            where: { id: token.id as string },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              permissions: true,
              isActive: true,
            },
          });
          
          if (adminUser && adminUser.isActive) {
            token.role = adminUser.role;
            token.permissions = adminUser.permissions;
          }
        } else {
          // Refresh customer data
          const customer = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
            },
          });
          
          if (customer) {
            token.name = customer.name;
            token.image = customer.image;
          }
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
