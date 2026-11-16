// C-219: los correos del sorteo (C-212). Antes no había ninguno: el boleto se veía en Mi panel y al ganador se le escribía a
// mano. Los boletos no se guardan (se cuentan cada vez, reglas.ts), así que cada aviso calcula si con este hecho nació uno.
// Nunca lanzan: un correo que no sale no puede romper un pago, una verificación ni el sorteo.

import type { Sorteo } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { boletosDeCliente, cargarInvitaciones, cuentanDe, getSorteoVigente, repartir, resumenDelSorteo, type BoletosDeCliente } from './servidor';
import { logoDelNombreCorto, logoEnElPremio, partesDelPremio } from './premio';
import { boletosPorInvitar, correoTapado, faltanParaProximo } from './reglas';
import {
  correoBoletoSorteo, correoGanadorSorteo, correoRecordatorioSorteo, correoResultadoSorteo, type BoletoDelCorreo, type DatosSorteo,
} from '@/lib/email-templates/comunidad';
import { enviarAUsuario } from '@/lib/email-templates/enviar';
import { avisarAmigoListo, avisarAmigoYaNoSuma, avisarBoletoEnCampana } from './avisos';

function datosDe(s: Sorteo): DatosSorteo {
  // C-263: lo que necesitan el boleto épico (el logo o el nombre del premio) y Chispa (la compra mínima de verdad)
  const { nombre } = partesDelPremio(s.premio);
  const nombreCorto = s.nombreCorto?.trim() || null;
  return {
    titulo: s.titulo, premio: s.premio, imagen: s.imagen, resultadoEl: s.resultadoEl, minimoUSD: Number(s.compraMinimaUSD), tope: s.topeInvitar,
    logo: logoEnElPremio(nombre, nombreCorto)?.logo ?? logoDelNombreCorto(nombreCorto), nombreCorto: nombreCorto ?? nombre,
  };
}

/** C-263: el boleto que acaba de nacer, como lo ve el cliente en la tienda: el de esa compra, o el último de amigos */
function boletoDelCorreo(b: BoletosDeCliente, cual: { compra: string } | 'amigos'): BoletoDelCorreo | null {
  const i = cual === 'amigos'
    ? b.boletos.map((x) => x.tipo).lastIndexOf('amigos')
    : b.boletos.findIndex((x) => x.tipo === 'compra' && x.origen === `Compra ${cual.compra.split(' y ')[0]}`);
  if (i < 0 || !b.correo) return null;
  return { codigo: b.boletos[i].codigo, origen: b.boletos[i].origen, n: i + 1, correo: b.correo };
}
const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));
/** La misma pausa de las campañas entre correo y correo */
const PAUSA_MS = Number(process.env.CAMPAIGN_DELAY_MS ?? 1500);
const DIA_MS = 24 * 60 * 60 * 1000;
/** El recordatorio sale en los últimos días antes del cierre, una sola vez */
export const DIAS_RECORDATORIO = 3;

const sorteoAbierto = (s: Sorteo | null, ahora = new Date()): s is Sorteo => Boolean(s && !s.sorteadoAt && ahora >= s.desde && ahora <= s.hasta);

/**
 * Una orden quedó pagada. Si con ella se completa una compra con boleto, se le avisa al cliente. Una compra que llegó en
 * dos paquetes (C-199) es un solo boleto: avisa la orden que la completó (la última en pagarse), y no la otra.
 */
export async function avisarBoletoPorCompra(orderId: string): Promise<void> {
  try {
    const sorteo = await getSorteoVigente();
    if (!sorteoAbierto(sorteo)) return;
    const orden = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, orderNumber: true, createdAt: true, user: { select: { role: true } } },
    });
    if (!orden?.userId || orden.user?.role !== 'USER') return;
    if (orden.createdAt < sorteo.desde || orden.createdAt > sorteo.hasta) return;

    const boletos = await boletosDeCliente(sorteo, orden.userId);
    const compra = boletos.compras.find((c) => c.ordenes.split(' y ').includes(orden.orderNumber));
    if (!compra) return;
    const numeros = compra.ordenes.split(' y ');
    if (numeros.length > 1) {
      const pagos = await prisma.order.findMany({ where: { orderNumber: { in: numeros } }, select: { orderNumber: true, paidAt: true } });
      const ultima = pagos.sort((a, b) => (a.paidAt?.getTime() ?? 0) - (b.paidAt?.getTime() ?? 0) || a.orderNumber.localeCompare(b.orderNumber)).at(-1);
      if (ultima?.orderNumber !== orden.orderNumber) return;
    }
    await enviarAUsuario(orden.userId, (u) => correoBoletoSorteo({ nombre: u.name, sorteo: datosDe(sorteo), porque: 'compra', total: boletos.total, boleto: boletoDelCorreo(boletos, { compra: compra.ordenes }) }));
    // C-262: también a la campana de Mi panel
    await avisarBoletoEnCampana(orden.userId, 'compra', boletos.total);
  } catch (error) {
    console.error('[SORTEO] No se pudo avisar el boleto por compra:', error);
  }
}

/**
 * Un invitado verificó su correo, o (C-262) agregó su teléfono: el que entró con Google ya viene activado pero sin teléfono,
 * y antes nadie le avisaba a quien lo invitó. Si con eso quien lo invitó completa un par de amigos válidos (1 boleto por
 * cada 2, hasta el tope), se le avisa. Se cuenta igual que en Mi panel, con y sin este invitado.
 */
export async function avisarBoletoPorInvitados(invitadoUserId: string): Promise<void> {
  try {
    const sorteo = await getSorteoVigente();
    if (!sorteoAbierto(sorteo)) return;
    // C-264: se compara el reparto de todo el sorteo antes y después de este amigo. Así se entera quien lo invitó (el
    // boleto, "ya cuenta" o "no suma") y también otro participante al que, por esto, un amigo le deja de sumar: la misma
    // persona con otra cuenta, invitada antes por alguien más, ahora cuenta para ese alguien
    const invitaciones = await cargarInvitaciones(sorteo);
    const suya = invitaciones.find((i) => i.amigoId === invitadoUserId);
    if (!suya) return;
    const antes = repartir(invitaciones, invitadoUserId);
    const despues = repartir(invitaciones);
    const afectados = new Set(despues.filter((d, k) => d.estado !== antes[k].estado).map((d) => d.invitaId));
    afectados.add(suya.invitaId);
    const tope = sorteo.topeInvitar;

    for (const invitaId of afectados) {
      const quien = await prisma.participanteSorteo.findUnique({ where: { id: invitaId }, select: { userId: true } });
      if (!quien) continue;
      const validosAntes = cuentanDe(antes, invitaId);
      const validosDespues = cuentanDe(despues, invitaId);
      const ganoBoleto = boletosPorInvitar(validosDespues, tope) > boletosPorInvitar(validosAntes, tope);

      if (invitaId === suya.invitaId) {
        if (ganoBoleto) {
          const boletos = await boletosDeCliente(sorteo, quien.userId);
          await enviarAUsuario(quien.userId, (u) => correoBoletoSorteo({ nombre: u.name, sorteo: datosDe(sorteo), porque: 'invitados', total: boletos.total, boleto: boletoDelCorreo(boletos, 'amigos') }));
          // C-262: también a la campana de Mi panel
          await avisarBoletoEnCampana(quien.userId, 'invitados', boletos.total);
        } else {
          // C-262: no completó un par, pero quien invita se entera de que su amigo ya cuenta (y cuántos le faltan), o de por qué no
          const estado = despues.find((d) => d.amigoId === invitadoUserId)?.estado;
          if (estado) await avisarAmigoListo(quien.userId, suya.nombre, estado, faltanParaProximo(validosDespues, tope));
        }
      } else if (validosDespues < validosAntes) {
        // C-264: otro participante pierde a un amigo (contaba y ahora es repetido): se le dice, con sus boletos de ahora
        const perdido = despues.find((d, k) => d.invitaId === invitaId && antes[k].estado === 'cuenta' && d.estado === 'repetido');
        const perdioBoleto = boletosPorInvitar(validosDespues, tope) < boletosPorInvitar(validosAntes, tope);
        const boletos = await boletosDeCliente(sorteo, quien.userId);
        await avisarAmigoYaNoSuma(quien.userId, perdido?.nombre ?? null, perdioBoleto, boletos.total);
      }
    }
  } catch (error) {
    console.error('[SORTEO] No se pudo avisar el boleto por invitados:', error);
  }
}

/**
 * El recordatorio, una sola vez y en los últimos días antes del cierre, a quien tiene boletos. Lo llama el cron una vez
 * al día. Se reclama con la columna `recordatorioAt` antes de enviar: dos corridas a la vez no lo mandan dos veces.
 * Devuelve a quiénes hay que escribirles (el envío, con pausa, lo hace `enviarRecordatorio` en segundo plano).
 */
export async function reclamarRecordatorio(ahora = new Date()): Promise<{ sorteo: Sorteo; participantes: Array<{ userId: string; boletos: number }> } | { motivo: string }> {
  const sorteo = await prisma.sorteo.findFirst({ where: { activo: true }, orderBy: { createdAt: 'desc' } });
  if (!sorteoAbierto(sorteo, ahora)) return { motivo: 'No hay un sorteo abierto' };
  if (sorteo.recordatorioAt) return { motivo: 'El recordatorio ya salió' };
  if (sorteo.hasta.getTime() - ahora.getTime() > DIAS_RECORDATORIO * DIA_MS) return { motivo: `Todavía faltan más de ${DIAS_RECORDATORIO} días para el cierre` };

  const reclamado = await prisma.sorteo.updateMany({ where: { id: sorteo.id, recordatorioAt: null }, data: { recordatorioAt: ahora } });
  if (reclamado.count !== 1) return { motivo: 'El recordatorio ya salió' };

  const { participantes } = await resumenDelSorteo(sorteo);
  return {
    sorteo,
    participantes: participantes.map((p) => ({ userId: p.userId, boletos: p.porCompra + p.porInvitar })).filter((p) => p.boletos > 0),
  };
}

export async function enviarRecordatorio(sorteo: Sorteo, participantes: Array<{ userId: string; boletos: number }>): Promise<void> {
  for (const p of participantes) {
    await enviarAUsuario(p.userId, (u) => correoRecordatorioSorteo({ nombre: u.name, sorteo: datosDe(sorteo), boletos: p.boletos, cierre: sorteo.hasta }));
    await esperar(PAUSA_MS);
  }
}

/**
 * Después de sortear: el correo al ganador (antes se le escribía a mano) y el resultado a los demás participantes, con el
 * correo del ganador tapado. Se llama una sola vez, desde la ruta de sortear, después de responder.
 */
export async function avisarResultadoSorteo(sorteoId: string): Promise<void> {
  try {
    const sorteo = await prisma.sorteo.findUnique({ where: { id: sorteoId } });
    if (!sorteo?.sorteadoAt || !sorteo.ganadorUserId || !sorteo.ganadorEmail) return;
    const datos = datosDe(sorteo);
    await enviarAUsuario(sorteo.ganadorUserId, (u) => correoGanadorSorteo({ nombre: u.name, sorteo: datos, detalle: sorteo.ganadorDetalle || '', codigo: sorteo.ganadorCodigo }));

    const { participantes } = await resumenDelSorteo(sorteo);
    const tapado = correoTapado(sorteo.ganadorEmail);
    for (const p of participantes) {
      if (p.userId === sorteo.ganadorUserId) continue;
      // C-263: "Ganó el boleto F3E-XEP de an***@gmail.com": cada uno lo compara con los suyos
      await enviarAUsuario(p.userId, (u) => correoResultadoSorteo({ nombre: u.name, sorteo: datos, ganadorTapado: tapado, boletos: sorteo.boletosAlSortear ?? 0, codigo: sorteo.ganadorCodigo }));
      await esperar(PAUSA_MS);
    }
  } catch (error) {
    console.error('[SORTEO] No se pudo avisar el resultado:', error);
  }
}
