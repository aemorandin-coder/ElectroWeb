// G-76: Orquestador de Contabilidad 2.0 (ConfigContable, Obligaciones, Compras/Gastos, Hoja de IVA + Cierre con candado,
// Movimientos web + Puntos ES + Costo/Margen exclusivo del Dueño, y alertas del cron). Solo servidor.

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { describirPago } from '@/lib/order-pago';
import { rangoMes } from '@/lib/relacion-ventas';
import { sendToTelegramChats } from '@/lib/telegram/service';
import {
  CHECKLIST_2027_BASE, compraGastoDTO, configContableDTO, obligacionDTO, periodoDTO, type CompraGastoDTO,
  type ConfigContableDTO, type MovimientosMesDTO, type ObligacionFiscalDTO, type PeriodoContableDTO,
} from '@/lib/dto/contabilidad';
import { fechaDesdeTexto, hoyVe, nombreMes, periodoDe, r2, venceDiaMesSiguiente, venceIva } from './montos';
import { libroDeVentas, tasaYAlicuota, type Resultado } from './servidor';
import type { ConfigContableInput } from './esquemas';
import { firmaDe } from './mesa';

const falla = (status: number, error: string, campo?: string) => ({ ok: false as const, status, error, campo });

// ── Configuración contable y transición 2027 ─────────────────────────────────────────────

export async function obtenerConfigContable(): Promise<ConfigContableDTO> {
  const row = await prisma.configContable.upsert({
    where: { id: 'default' },
    create: { id: 'default', checklist2027: CHECKLIST_2027_BASE as unknown as Prisma.InputJsonValue },
    update: {},
  });
  return configContableDTO(row);
}

export async function guardarConfigContable(datos: ConfigContableInput, userId: string): Promise<ConfigContableDTO> {
  const venceAlq = datos.alquilerVenceEl ? fechaDesdeTexto(datos.alquilerVenceEl) : null;
  const row = await prisma.configContable.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      canalEmision: datos.canalEmision,
      imprentaProveedor: datos.imprentaProveedor ?? null,
      imprentaAmbiente: datos.imprentaAmbiente,
      imprentaSerieDigital: datos.imprentaSerieDigital,
      imprentaProximoNumero: datos.imprentaProximoNumero,
      imprentaApiUrl: datos.imprentaApiUrl || null,
      alcaldiaAlicuota: datos.alcaldiaAlicuota.toFixed(2),
      alcaldiaMinimoBs: datos.alcaldiaMinimoBs.toFixed(2),
      alcaldiaDiaLimite: datos.alcaldiaDiaLimite,
      ivaDiaLimite: datos.ivaDiaLimite,
      alquilerArrendador: datos.alquilerArrendador || null,
      alquilerRif: datos.alquilerRif || null,
      alquilerTipo: datos.alquilerTipo,
      alquilerCanonUSD: datos.alquilerCanonUSD.toFixed(2),
      alquilerConIva: datos.alquilerConIva,
      alquilerDiaPago: datos.alquilerDiaPago,
      alquilerVenceEl: venceAlq,
      pensionesPorcentaje: datos.pensionesPorcentaje.toFixed(2),
      pensionesDiaLimite: datos.pensionesDiaLimite,
      nominaBaseMinimaUSD: datos.nominaBaseMinimaUSD.toFixed(2),
      checklist2027: (datos.checklist2027 ?? CHECKLIST_2027_BASE) as unknown as Prisma.InputJsonValue,
      avisosTelegram: datos.avisosTelegram,
      updatedById: userId,
    },
    update: {
      canalEmision: datos.canalEmision,
      imprentaProveedor: datos.imprentaProveedor ?? null,
      imprentaAmbiente: datos.imprentaAmbiente,
      imprentaSerieDigital: datos.imprentaSerieDigital,
      imprentaProximoNumero: datos.imprentaProximoNumero,
      imprentaApiUrl: datos.imprentaApiUrl || null,
      alcaldiaAlicuota: datos.alcaldiaAlicuota.toFixed(2),
      alcaldiaMinimoBs: datos.alcaldiaMinimoBs.toFixed(2),
      alcaldiaDiaLimite: datos.alcaldiaDiaLimite,
      ivaDiaLimite: datos.ivaDiaLimite,
      alquilerArrendador: datos.alquilerArrendador || null,
      alquilerRif: datos.alquilerRif || null,
      alquilerTipo: datos.alquilerTipo,
      alquilerCanonUSD: datos.alquilerCanonUSD.toFixed(2),
      alquilerConIva: datos.alquilerConIva,
      alquilerDiaPago: datos.alquilerDiaPago,
      alquilerVenceEl: venceAlq,
      pensionesPorcentaje: datos.pensionesPorcentaje.toFixed(2),
      pensionesDiaLimite: datos.pensionesDiaLimite,
      nominaBaseMinimaUSD: datos.nominaBaseMinimaUSD.toFixed(2),
      ...(datos.checklist2027 ? { checklist2027: datos.checklist2027 as unknown as Prisma.InputJsonValue } : {}),
      avisosTelegram: datos.avisosTelegram,
      updatedById: userId,
    },
  });
  return configContableDTO(row);
}

// ── Compras y Gastos (Libro de Compras y Crédito Fiscal) ─────────────────────────────────

export async function listarCompras(periodo: string): Promise<{ items: CompraGastoDTO[]; creditoFiscalBs: number; totalComprasBs: number; pendientesRevision: number }> {
  const rows = await prisma.compraGasto.findMany({
    where: { periodo },
    orderBy: [{ fechaEmision: 'desc' }, { createdAt: 'desc' }],
  });
  const items = rows.map(compraGastoDTO);
  const creditoFiscalBs = r2(items.filter((i) => i.estadoRevision !== 'FALTA_ALGO').reduce((s, i) => s + i.ivaBs, 0));
  const totalComprasBs = r2(items.reduce((s, i) => s + i.totalBs, 0));
  const pendientesRevision = items.filter((i) => i.estadoRevision !== 'REVISADA').length;
  return { items, creditoFiscalBs, totalComprasBs, pendientesRevision };
}

export async function crearCompra(
  datos: {
    fechaEmision: string;
    proveedorNombre: string;
    proveedorRif: string;
    supplierId?: string;
    numeroFactura: string;
    numeroControl: string;
    categoria: string;
    descripcion?: string;
    baseBs: number;
    alicuota: number;
    ivaBs: number;
    exentoBs: number;
    retencionIslrBs?: number;
    comprobanteIslr?: string;
    archivoPrivado?: string;
  },
  userId: string,
): Promise<Resultado<CompraGastoDTO>> {
  const fecha = fechaDesdeTexto(datos.fechaEmision);
  if (!fecha) return falla(400, 'La fecha de la factura no es válida.', 'fechaEmision');
  const periodo = periodoDe(fecha);
  const cierre = await prisma.periodoContable.findUnique({ where: { periodo }, select: { estado: true } });
  if (cierre?.estado === 'CERRADO') return falla(409, `El mes ${nombreMes(periodo)} está cerrado.`, 'fechaEmision');

  const totalBs = r2(datos.baseBs + datos.ivaBs + datos.exentoBs);
  const creado = await prisma.compraGasto.create({
    data: {
      periodo,
      fechaEmision: fecha,
      proveedorNombre: datos.proveedorNombre,
      proveedorRif: datos.proveedorRif,
      supplierId: datos.supplierId || null,
      numeroFactura: datos.numeroFactura,
      numeroControl: datos.numeroControl,
      categoria: datos.categoria,
      descripcion: datos.descripcion || null,
      baseBs: datos.baseBs.toFixed(2),
      alicuota: datos.alicuota.toFixed(2),
      ivaBs: datos.ivaBs.toFixed(2),
      exentoBs: datos.exentoBs.toFixed(2),
      totalBs: totalBs.toFixed(2),
      retencionIslrBs: (datos.retencionIslrBs ?? 0).toFixed(2),
      comprobanteIslr: datos.comprobanteIslr || null,
      archivoPrivado: datos.archivoPrivado || null,
      creadoPorId: userId,
    },
  });
  return { ok: true, datos: compraGastoDTO(creado) };
}

export async function revisarCompra(
  id: string,
  datos: { estadoRevision: 'PENDIENTE' | 'REVISADA' | 'FALTA_ALGO'; notaRevision?: string },
  userId: string,
): Promise<Resultado<CompraGastoDTO>> {
  const existe = await prisma.compraGasto.findUnique({ where: { id } });
  if (!existe) return falla(404, 'No se encontró la factura de compra.');
  const cierre = await prisma.periodoContable.findUnique({ where: { periodo: existe.periodo }, select: { estado: true } });
  if (cierre?.estado === 'CERRADO') return falla(409, `El mes ${nombreMes(existe.periodo)} está cerrado.`);

  const act = await prisma.compraGasto.update({
    where: { id },
    data: {
      estadoRevision: datos.estadoRevision,
      notaRevision: datos.notaRevision || null,
      revisadaPorId: userId,
      revisadaEl: new Date(),
    },
  });
  return { ok: true, datos: compraGastoDTO(act) };
}

// ── Hoja de IVA (Forma 99030) y Cierre Mensual ───────────────────────────────────────────

function mesAnteriorDe(periodo: string): string {
  const [a, m] = periodo.split('-').map(Number);
  const prevM = m === 1 ? 12 : m - 1;
  const prevA = m === 1 ? a - 1 : a;
  return `${prevA}-${String(prevM).padStart(2, '0')}`;
}

export async function calcularHojaIva(periodo: string): Promise<PeriodoContableDTO> {
  const [libro, compras, anterior, existente] = await Promise.all([
    libroDeVentas(periodo),
    listarCompras(periodo),
    prisma.periodoContable.findUnique({ where: { periodo: mesAnteriorDe(periodo) }, select: { nuevoExcedenteBs: true } }),
    prisma.periodoContable.findUnique({ where: { periodo } }),
  ]);

  if (existente?.estado === 'CERRADO') return periodoDTO(existente);

  const excedenteAnterior = existente
    ? Number(existente.excedenteAnteriorBs)
    : Number(anterior?.nuevoExcedenteBs ?? 0);
  const debito = libro.totales.ivaBs;
  const credito = compras.creditoFiscalBs;
  const retenido = libro.totales.ivaRetenidoBs;
  const saldo = r2(debito - credito - excedenteAnterior - retenido);
  const ivaAPagar = saldo > 0 ? saldo : 0;
  const nuevoExcedente = saldo < 0 ? Math.abs(saldo) : 0;

  const up = await prisma.periodoContable.upsert({
    where: { periodo },
    create: {
      periodo,
      excedenteAnteriorBs: excedenteAnterior.toFixed(2),
      debitoFiscalBs: debito.toFixed(2),
      creditoFiscalBs: credito.toFixed(2),
      retencionesIvaBs: retenido.toFixed(2),
      ivaAPagarBs: ivaAPagar.toFixed(2),
      nuevoExcedenteBs: nuevoExcedente.toFixed(2),
    },
    update: {
      debitoFiscalBs: debito.toFixed(2),
      creditoFiscalBs: credito.toFixed(2),
      retencionesIvaBs: retenido.toFixed(2),
      ivaAPagarBs: ivaAPagar.toFixed(2),
      nuevoExcedenteBs: nuevoExcedente.toFixed(2),
    },
  });
  return periodoDTO(up);
}

export async function actualizarPeriodoContable(
  periodo: string,
  datos: {
    accion: 'ACTUALIZAR_EXCEDENTE' | 'DECLARAR' | 'PAGAR' | 'CERRAR' | 'REABRIR';
    excedenteAnteriorBs?: number;
    numeroPlanillaIva?: string;
    planillaIvaPrivada?: string;
    comprobantePagoIvaPrivado?: string;
  },
  userId: string,
  esDueno: boolean,
): Promise<Resultado<PeriodoContableDTO>> {
  const actual = await calcularHojaIva(periodo);
  if (datos.accion === 'REABRIR') {
    if (!esDueno) return falla(403, 'Solo el dueño puede reabrir un mes cerrado.');
    const act = await prisma.periodoContable.update({
      where: { periodo },
      data: { estado: actual.declaradoEl ? 'DECLARADO' : 'ABIERTO', cerradoEl: null, cerradoPorId: null },
    });
    return { ok: true, datos: periodoDTO(act) };
  }

  if (actual.estado === 'CERRADO') return falla(409, 'Este mes ya está cerrado y firmado.');

  if (datos.accion === 'ACTUALIZAR_EXCEDENTE') {
    const exc = datos.excedenteAnteriorBs ?? 0;
    await prisma.periodoContable.update({ where: { periodo }, data: { excedenteAnteriorBs: exc.toFixed(2) } });
    return { ok: true, datos: await calcularHojaIva(periodo) };
  }

  if (datos.accion === 'DECLARAR') {
    const act = await prisma.periodoContable.update({
      where: { periodo },
      data: {
        estado: 'DECLARADO',
        numeroPlanillaIva: datos.numeroPlanillaIva || actual.numeroPlanillaIva,
        planillaIvaPrivada: datos.planillaIvaPrivada || actual.planillaIvaPrivada,
        declaradoEl: new Date(),
      },
    });
    await prisma.obligacionFiscal.updateMany({
      where: { periodo, tipo: 'IVA', estado: { not: 'PAGADA' } },
      data: {
        estado: 'LISTA_PAGAR',
        quienToca: 'DUENO',
        numeroPlanilla: datos.numeroPlanillaIva || actual.numeroPlanillaIva,
        ...(datos.planillaIvaPrivada ? { planillaPrivada: datos.planillaIvaPrivada } : {}),
      },
    });
    return { ok: true, datos: periodoDTO(act) };
  }

  if (datos.accion === 'PAGAR') {
    const act = await prisma.periodoContable.update({
      where: { periodo },
      data: {
        comprobantePagoIvaPrivado: datos.comprobantePagoIvaPrivado || actual.comprobantePagoIvaPrivado,
        pagadoEl: new Date(),
      },
    });
    await prisma.obligacionFiscal.updateMany({
      where: { periodo, tipo: 'IVA' },
      data: {
        estado: 'PAGADA',
        quienToca: 'LISTO',
        pagadaEl: new Date(),
        ...(datos.comprobantePagoIvaPrivado ? { comprobantePagoPrivado: datos.comprobantePagoIvaPrivado } : {}),
      },
    });
    return { ok: true, datos: periodoDTO(act) };
  }

  // CERRAR
  const firma = await firmaDe(userId);
  if (!firma && !esDueno) {
    return falla(400, 'Dibuja primero tu firma y C.P.C. en tu mesa antes de firmar el cierre del mes.');
  }
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const act = await prisma.periodoContable.update({
    where: { periodo },
    data: {
      estado: 'CERRADO',
      cerradoEl: new Date(),
      cerradoPorId: userId,
      firmaNombre: firma?.nombre ?? u?.name ?? 'Dirección',
      firmaTitulo: firma?.titulo ?? 'Super Admin',
      firmaCpc: firma?.cpc ?? null,
    },
  });
  return { ok: true, datos: periodoDTO(act) };
}

// ── Calendario de Obligaciones ───────────────────────────────────────────────────────────

export async function sincronizarObligacionesMes(periodo: string): Promise<ObligacionFiscalDTO[]> {
  const [cfg, libro, iva, { tasa }] = await Promise.all([
    obtenerConfigContable(),
    libroDeVentas(periodo),
    calcularHojaIva(periodo),
    tasaYAlicuota(),
  ]);

  const netoGravadoYExento = r2(libro.totales.baseBs + libro.totales.exentoBs);
  const alcaldiaCalc = r2(Math.max((netoGravadoYExento * cfg.alcaldiaAlicuota) / 100, cfg.alcaldiaMinimoBs));
  const canonBs = tasa ? r2(cfg.alquilerCanonUSD * tasa) : 0;
  const retPct = cfg.alquilerTipo === 'PERSONA' ? 0.03 : 0.05;
  const alquilerNetoBs = r2(canonBs * (1 - retPct));

  const plantilla: Array<{
    tipo: string;
    titulo: string;
    detalle: string;
    vence: string;
    montoBs: number;
    montoUSD: number | null;
    quienToca: 'CONTADORA' | 'DUENO';
  }> = [
    {
      tipo: 'ALCALDIA',
      titulo: 'Alcaldía de Guanare · Actividades económicas',
      detalle: `Alícuota ${cfg.alcaldiaAlicuota} % sobre ingresos brutos (mínimo ${cfg.alcaldiaMinimoBs.toFixed(2)} Bs)`,
      vence: venceDiaMesSiguiente(periodo, cfg.alcaldiaDiaLimite),
      montoBs: alcaldiaCalc,
      montoUSD: null,
      quienToca: 'CONTADORA',
    },
    {
      tipo: 'IVA',
      titulo: 'IVA mensual · Forma 99030 (SENIAT)',
      detalle: `Débito ${iva.debitoFiscalBs.toFixed(2)} − Crédito ${iva.creditoFiscalBs.toFixed(2)} − Ret. ${iva.retencionesIvaBs.toFixed(2)}`,
      vence: venceIva(periodo, cfg.ivaDiaLimite),
      montoBs: iva.ivaAPagarBs,
      montoUSD: null,
      quienToca: iva.estado === 'DECLARADO' ? 'DUENO' : 'CONTADORA',
    },
    {
      tipo: 'PENSIONES',
      titulo: `Contribución Especial Pensiones (${cfg.pensionesPorcentaje} %)`,
      detalle: 'Totales de salarios y bonos no salariales del mes',
      vence: venceDiaMesSiguiente(periodo, cfg.pensionesDiaLimite),
      montoBs: 0,
      montoUSD: null,
      quienToca: 'CONTADORA',
    },
    {
      tipo: 'ALQUILER_ISLR',
      titulo: `Alquiler del local + Retención ISLR (${cfg.alquilerTipo === 'PERSONA' ? '3 %' : '5 %'})`,
      detalle: cfg.alquilerArrendador ? `${cfg.alquilerArrendador} (${cfg.alquilerRif ?? 'Sin RIF'})` : 'Configura el contrato en Ajustes de contabilidad',
      vence: venceDiaMesSiguiente(periodo, cfg.alquilerDiaPago),
      montoBs: alquilerNetoBs,
      montoUSD: cfg.alquilerCanonUSD || null,
      quienToca: 'DUENO',
    },
  ];

  const existentes = await prisma.obligacionFiscal.findMany({ where: { periodo } });
  const porTipo = new Map(existentes.map((e) => [e.tipo, e]));

  for (const item of plantilla) {
    const actual = porTipo.get(item.tipo);
    const fechaVence = fechaDesdeTexto(item.vence)!;
    if (!actual) {
      await prisma.obligacionFiscal.create({
        data: {
          periodo,
          tipo: item.tipo,
          titulo: item.titulo,
          detalle: item.detalle,
          venceEl: fechaVence,
          montoBs: item.montoBs.toFixed(2),
          montoUSD: item.montoUSD === null ? null : item.montoUSD.toFixed(2),
          estado: 'POR_CALCULAR',
          quienToca: item.quienToca,
        },
      });
    } else if (actual.estado === 'POR_CALCULAR') {
      await prisma.obligacionFiscal.update({
        where: { id: actual.id },
        data: {
          titulo: item.titulo,
          detalle: item.detalle,
          venceEl: fechaVence,
          ...(item.tipo !== 'PENSIONES' ? { montoBs: item.montoBs.toFixed(2) } : {}),
        },
      });
    }
  }

  const finales = await prisma.obligacionFiscal.findMany({ where: { periodo }, orderBy: { venceEl: 'asc' } });
  return finales.map(obligacionDTO);
}

export async function actualizarObligacion(
  datos: {
    id: string;
    estado?: 'POR_CALCULAR' | 'LISTA_PAGAR' | 'PAGADA';
    montoBs?: number;
    montoUSD?: number | null;
    numeroPlanilla?: string | null;
    comprobanteIslr?: string | null;
    planillaPrivada?: string;
    comprobantePagoPrivado?: string;
    nominaEmpleados?: number | null;
    nominaSalariosBs?: number | null;
    nominaBonosBs?: number | null;
  },
  userId: string,
): Promise<Resultado<ObligacionFiscalDTO>> {
  const actual = await prisma.obligacionFiscal.findUnique({ where: { id: datos.id } });
  if (!actual) return falla(404, 'No se encontró la obligación.');

  const cfg = await obtenerConfigContable();
  let montoBs = datos.montoBs ?? Number(actual.montoBs);
  if (actual.tipo === 'PENSIONES' && (datos.nominaSalariosBs !== undefined || datos.nominaBonosBs !== undefined)) {
    const sal = datos.nominaSalariosBs ?? Number(actual.nominaSalariosBs ?? 0);
    const bon = datos.nominaBonosBs ?? Number(actual.nominaBonosBs ?? 0);
    montoBs = r2(((sal + bon) * cfg.pensionesPorcentaje) / 100);
  }

  const nuevoEstado = datos.estado ?? (actual.estado as 'POR_CALCULAR' | 'LISTA_PAGAR' | 'PAGADA');
  const quienToca = nuevoEstado === 'PAGADA' ? 'LISTO' : nuevoEstado === 'LISTA_PAGAR' ? 'DUENO' : 'CONTADORA';

  const act = await prisma.obligacionFiscal.update({
    where: { id: datos.id },
    data: {
      estado: nuevoEstado,
      quienToca,
      montoBs: montoBs.toFixed(2),
      ...(datos.montoUSD !== undefined ? { montoUSD: datos.montoUSD === null ? null : datos.montoUSD.toFixed(2) } : {}),
      ...(datos.numeroPlanilla !== undefined ? { numeroPlanilla: datos.numeroPlanilla } : {}),
      ...(datos.comprobanteIslr !== undefined ? { comprobanteIslr: datos.comprobanteIslr } : {}),
      ...(datos.planillaPrivada ? { planillaPrivada: datos.planillaPrivada } : {}),
      ...(datos.comprobantePagoPrivado ? { comprobantePagoPrivado: datos.comprobantePagoPrivado } : {}),
      ...(datos.nominaEmpleados !== undefined ? { nominaEmpleados: datos.nominaEmpleados } : {}),
      ...(datos.nominaSalariosBs !== undefined ? { nominaSalariosBs: datos.nominaSalariosBs === null ? null : datos.nominaSalariosBs.toFixed(2) } : {}),
      ...(datos.nominaBonosBs !== undefined ? { nominaBonosBs: datos.nominaBonosBs === null ? null : datos.nominaBonosBs.toFixed(2) } : {}),
      ...(nuevoEstado === 'PAGADA' && !actual.pagadaEl ? { pagadaEl: new Date() } : {}),
      actualizadoPorId: userId,
    },
  });
  return { ok: true, datos: obligacionDTO(act) };
}

// ── Movimientos de la web, Puntos ES y Costo/Margen (solo Dueño) ─────────────────────────

export async function obtenerMovimientosMes(periodo: string, incluirCostos: boolean): Promise<MovimientosMesDTO> {
  const rango = rangoMes(periodo);
  if (!rango) {
    return {
      periodo,
      totalCobradoUSD: 0,
      totalCobradoBs: 0,
      porMetodo: [],
      puntosES: { recargasUSD: 0, consumosUSD: 0, devolucionesUSD: 0, comisionesPromotoresUSD: 0, pasivoCierreUSD: 0 },
      giftCards: { emitidasCantidad: 0, emitidasUSD: 0, canjeadasUSD: 0 },
      costos: null,
    };
  }
  const enRango = { gte: rango.desde, lt: rango.hasta };

  const [ordenes, txs, comisiones, pasivoAgg, giftEmitidas, giftCanjes] = await Promise.all([
    prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
        OR: [{ paidAt: enRango }, { paidAt: null, createdAt: enRango }],
      },
      select: {
        paymentMethod: true,
        pointsUSD: true,
        totalUSD: true,
        totalVES: true,
        subtotalUSD: true,
        discountUSD: true,
        ...(incluirCostos
          ? {
              items: {
                select: {
                  quantity: true,
                  supplierCostUSD: true,
                  product: { select: { costPerItem: true } },
                },
              },
            }
          : {}),
      },
    }),
    prisma.transaction.findMany({
      where: { status: 'COMPLETED', createdAt: enRango },
      select: { type: true, amount: true },
    }),
    prisma.referralConversion.aggregate({
      where: { status: 'APPROVED', approvedAt: enRango },
      _sum: { commission: true },
    }),
    prisma.userBalance.aggregate({ _sum: { balance: true } }),
    prisma.giftCard.aggregate({
      where: { createdAt: enRango },
      _count: { _all: true },
      _sum: { amountUSD: true },
    }),
    prisma.giftCardTransaction.aggregate({
      where: { type: { in: ['USAGE', 'REDEMPTION'] }, createdAt: enRango },
      _sum: { amountUSD: true },
    }),
  ]);

  const metodosMap = new Map<string, { ordenes: number; totalUSD: number; totalBs: number }>();
  let totalCobradoUSD = 0;
  let totalCobradoBs = 0;
  let ventasNetasSinIvaUSD = 0;
  let costoMercanciaUSD = 0;
  let ordenesSinCosto = 0;

  for (const o of ordenes) {
    const usd = Number(o.totalUSD) || 0;
    const bs = Number(o.totalVES) || 0;
    totalCobradoUSD = r2(totalCobradoUSD + usd);
    totalCobradoBs = r2(totalCobradoBs + bs);

    const etiqueta = describirPago(o.paymentMethod, [], { puntosUSD: Number(o.pointsUSD) || 0 }).titulo;
    const prev = metodosMap.get(etiqueta) ?? { ordenes: 0, totalUSD: 0, totalBs: 0 };
    metodosMap.set(etiqueta, {
      ordenes: prev.ordenes + 1,
      totalUSD: r2(prev.totalUSD + usd),
      totalBs: r2(prev.totalBs + bs),
    });

    if (incluirCostos && 'items' in o && Array.isArray(o.items)) {
      const subNeto = Math.max(0, (Number(o.subtotalUSD) || 0) - (Number(o.discountUSD) || 0));
      ventasNetasSinIvaUSD = r2(ventasNetasSinIvaUSD + subNeto);
      let faltaAlguno = false;
      for (const item of o.items as Array<{ quantity: number; supplierCostUSD: unknown; product?: { costPerItem: unknown } | null }>) {
        const unitCost = Number(item.supplierCostUSD ?? item.product?.costPerItem ?? 0);
        if (unitCost > 0) costoMercanciaUSD = r2(costoMercanciaUSD + unitCost * item.quantity);
        else faltaAlguno = true;
      }
      if (faltaAlguno) ordenesSinCosto++;
    }
  }

  let recargasUSD = 0;
  let consumosUSD = 0;
  let devolucionesUSD = 0;
  for (const tx of txs) {
    const monto = Math.abs(Number(tx.amount) || 0);
    if (tx.type === 'DEPOSIT') recargasUSD = r2(recargasUSD + monto);
    else if (tx.type === 'PURCHASE') consumosUSD = r2(consumosUSD + monto);
    else if (tx.type === 'REFUND') devolucionesUSD = r2(devolucionesUSD + monto);
  }

  const costos = incluirCostos
    ? {
        ventasNetasSinIvaUSD,
        costoMercanciaUSD,
        margenBrutoUSD: r2(ventasNetasSinIvaUSD - costoMercanciaUSD),
        margenPorcentaje: ventasNetasSinIvaUSD > 0 ? r2(((ventasNetasSinIvaUSD - costoMercanciaUSD) / ventasNetasSinIvaUSD) * 100) : 0,
        ordenesSinCosto,
      }
    : null;

  return {
    periodo,
    totalCobradoUSD,
    totalCobradoBs,
    porMetodo: [...metodosMap.entries()]
      .map(([metodo, v]) => ({ metodo, ...v }))
      .sort((a, b) => b.totalUSD - a.totalUSD),
    puntosES: {
      recargasUSD,
      consumosUSD,
      devolucionesUSD,
      comisionesPromotoresUSD: r2(Number(comisiones._sum?.commission ?? 0)),
      pasivoCierreUSD: r2(Number(pasivoAgg._sum?.balance ?? 0)),
    },
    giftCards: {
      emitidasCantidad: giftEmitidas._count?._all ?? 0,
      emitidasUSD: r2(Number(giftEmitidas._sum?.amountUSD ?? 0)),
      canjeadasUSD: r2(Math.abs(Number(giftCanjes._sum?.amountUSD ?? 0))),
    },
    costos,
  };
}

// ── Cron de alertas contables (campana + Telegram) ───────────────────────────────────────

export async function revisarAlertasContables(): Promise<{ revisadas: number; avisos: number; contingenciasPendientes: number }> {
  const ahora = new Date();
  const hoy = hoyVe(ahora);
  const periodoActual = hoy.slice(0, 7);
  await sincronizarObligacionesMes(periodoActual);

  const [cfg, obligaciones, contingencias] = await Promise.all([
    obtenerConfigContable(),
    prisma.obligacionFiscal.findMany({ where: { estado: { not: 'PAGADA' } } }),
    prisma.documentoFiscal.count({ where: { estado: 'EMITIDA', estadoTransmision: 'PENDIENTE_REPORTE' } }),
  ]);

  const destinatarios = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ACCOUNTANT'] } },
    select: { id: true },
  });

  const hoyMs = Date.UTC(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1, Number(hoy.slice(8, 10)));
  let avisos = 0;

  for (const ob of obligaciones) {
    const vIso = hoyVe(ob.venceEl);
    const vMs = Date.UTC(Number(vIso.slice(0, 4)), Number(vIso.slice(5, 7)) - 1, Number(vIso.slice(8, 10)));
    const dias = Math.round((vMs - hoyMs) / 86_400_000);

    let tipoAviso: 'aviso3DiasEl' | 'avisoDiaEl' | 'avisoVencidaEl' | null = null;
    let titulo = '';
    if (dias < 0 && !ob.avisoVencidaEl) {
      tipoAviso = 'avisoVencidaEl';
      titulo = `Vencida: ${ob.titulo}`;
    } else if (dias === 0 && !ob.avisoDiaEl) {
      tipoAviso = 'avisoDiaEl';
      titulo = `Vence hoy: ${ob.titulo}`;
    } else if (dias > 0 && dias <= 3 && !ob.aviso3DiasEl) {
      tipoAviso = 'aviso3DiasEl';
      titulo = `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}: ${ob.titulo}`;
    }

    if (!tipoAviso) continue;

    await prisma.obligacionFiscal.update({ where: { id: ob.id }, data: { [tipoAviso]: ahora } });
    if (destinatarios.length) {
      await prisma.notification.createMany({
        data: destinatarios.map((u) => ({
          userId: u.id,
          type: 'CONTABILIDAD_AVISO',
          title: titulo.slice(0, 150),
          message: `Vence el ${vIso.split('-').reverse().join('/')} · Monto estimado Bs. ${Number(ob.montoBs).toFixed(2)}`,
          link: `/admin/contabilidad?mes=${ob.periodo}&tab=resumen`,
          icon: 'calendario',
        })),
      });
    }
    if (cfg.avisosTelegram) {
      await sendToTelegramChats(
        `<b>CONTABILIDAD</b>\n<b>${titulo}</b>\nVence: ${vIso.split('-').reverse().join('/')}\nMonto: Bs. ${Number(ob.montoBs).toFixed(2)}`,
      ).catch(() => {});
    }
    avisos++;
  }

  return { revisadas: obligaciones.length, avisos, contingenciasPendientes: contingencias };
}
