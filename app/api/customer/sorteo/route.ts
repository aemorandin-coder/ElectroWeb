// C-212: los boletos del cliente en el sorteo vigente, para la tarjeta de Mi panel. Sin sorteo activo: { sorteo: null }.
// C-263: y sus boletos épicos (`mis`, la lista blanca de lib/dto/sorteo.ts): solo los de la sesión, nunca los de otro
// cliente (la ruta no recibe a quién: lo dice la sesión). Sin los nombres de los amigos, como C-262.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { misBoletosPublicos } from '@/lib/dto/sorteo';
import { siteUrl } from '@/lib/seo';
import { boletosDeCliente, getSorteoVigente } from '@/lib/sorteo/servidor';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const sorteo = await getSorteoVigente();
  if (!sorteo) return NextResponse.json({ sorteo: null });
  const boletos = await boletosDeCliente(sorteo, session.user.id);
  return NextResponse.json({
    sorteo: {
      titulo: sorteo.titulo, premio: sorteo.premio, resultadoEl: sorteo.resultadoEl.toISOString(), cerrado: new Date() > sorteo.hasta, sorteado: Boolean(sorteo.sorteadoAt),
      // C-221: la tarjeta decía "$10" fijo; si el panel cambia el mínimo o apaga las invitaciones, dice lo de verdad
      compraMinimaUSD: Number(sorteo.compraMinimaUSD), topeInvitar: sorteo.topeInvitar,
      // C-297: cuántos da una compra de la mínima
      boletosPorCompra: sorteo.boletosPorCompra,
    },
    total: boletos.total,
    // C-262: cuánto falta para el próximo boleto por invitar y cuántos amigos todavía no cuentan (sin sus nombres: la lista
    // con los nombres está en /sorteo)
    invitar: {
      porInvitar: boletos.porInvitar,
      tope: boletos.tope,
      faltanParaProximo: boletos.faltanParaProximo,
      pendientes: boletos.amigos.filter((a) => a.estado === 'falta-activar' || a.estado === 'falta-telefono').length,
    },
    mis: misBoletosPublicos(sorteo, boletos, siteUrl(), { nombres: false }),
  });
}
