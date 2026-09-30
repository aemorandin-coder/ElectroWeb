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
      /** C-141: el admin entró con dos pasos (sin eso no tiene permisos) */
      dosPasos?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    role: Role;
    permissions: string[];
    userType?: 'admin' | 'customer';
    emailVerified?: boolean;
    sessionVersion?: number;
    dosPasos?: boolean;
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
    /** C-141: el admin tiene los dos pasos activos y entró con ellos */
    dosPasos?: boolean;
  }
}
