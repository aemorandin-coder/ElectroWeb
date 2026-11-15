import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { googleHabilitado } from '@/lib/auth-social';
import type { Metadata } from 'next';
import LoginCliente from './LoginCliente';

// C-149: fuera de los buscadores (salía con el título de la portada)
export const metadata: Metadata = { title: 'Iniciar sesión', robots: { index: false, follow: true } };

export default async function LoginPage() {
  // Se lee en cada visita: poner las claves de Google en el .env y reiniciar basta para que aparezca el botón (C-85)
  await connection();
  // C-258: sin la cookie de sesión no hay nada que verificar: el formulario sale de una vez (antes, "Verificando sesión…"
  // hasta que respondía /api/auth/session o pasaban 800 ms, también en la página que llega del servidor)
  const conCookie = (await cookies()).getAll().some((c) => c.name.includes('next-auth.session-token'));
  return <LoginCliente google={googleHabilitado()} conCookie={conCookie} />;
}
