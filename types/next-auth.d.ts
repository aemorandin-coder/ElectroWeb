import { UserRole, AdminPermission } from '@prisma/client';
import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      permissions: AdminPermission[];
      userType?: 'admin' | 'customer';
    } & DefaultSession['user'];
  }

  interface User {
    role: UserRole;
    permissions: AdminPermission[];
    userType?: 'admin' | 'customer';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    permissions: AdminPermission[];
    userType?: 'admin' | 'customer';
  }
}
