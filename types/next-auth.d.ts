import type { Role } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

// C-111: antes importaba UserRole y AdminPermission, que no existen en Prisma. Con skipLibCheck el error no se
// veía y los tipos quedaban en `any`: por eso lib/auth.ts estaba lleno de `as any`.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      permissions: string[];
      userType?: 'admin' | 'customer';
      emailVerified?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    role: Role;
    permissions: string[];
    userType?: 'admin' | 'customer';
    emailVerified?: boolean;
    sessionVersion?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    permissions: string[];
    userType?: 'admin' | 'customer';
    image?: string | null;
    emailVerified?: boolean;
    sessionVersion?: number;
    /** C-140: id de la fila en user_sessions */
    sid?: string;
  }
}
