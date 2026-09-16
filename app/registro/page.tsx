import { connection } from 'next/server';
import { googleHabilitado } from '@/lib/auth-social';
import RegistroCliente from './RegistroCliente';

export default async function RegistroPage() {
  // Se lee en cada visita: poner las claves de Google en el .env y reiniciar basta para que aparezca el botón (C-85)
  await connection();
  return <RegistroCliente google={googleHabilitado()} />;
}
