import { connection } from 'next/server';
import { googleHabilitado } from '@/lib/auth-social';
import type { Metadata } from 'next';
import LoginCliente from './LoginCliente';

// C-149: fuera de los buscadores (salía con el título de la portada)
export const metadata: Metadata = { title: 'Iniciar sesión', robots: { index: false, follow: true } };

export default async function LoginPage() {
  // Se lee en cada visita: poner las claves de Google en el .env y reiniciar basta para que aparezca el botón (C-85)
  await connection();
  return <LoginCliente google={googleHabilitado()} />;
}
