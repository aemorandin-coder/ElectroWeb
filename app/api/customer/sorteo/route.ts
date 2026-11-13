// C-212: los boletos del cliente en el sorteo vigente, para la tarjeta de Mi panel. Sin sorteo activo: { sorteo: null }.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { boletosDeCliente, getSorteoVigente } from '@/lib/sorteo/servidor';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const sorteo = await getSorteoVigente();
  if (!sorteo) return NextResponse.json({ sorteo: null });
  const boletos = await boletosDeCliente(sorteo, session.user.id);
  return NextResponse.json({
    sorteo: { titulo: sorteo.titulo, premio: sorteo.premio, resultadoEl: sorteo.resultadoEl.toISOString(), cerrado: new Date() > sorteo.hasta, sorteado: Boolean(sorteo.sorteadoAt) },
    total: boletos.total,
  });
}
