// C-199: el flete de referencia de ZOOM para la ficha y el carrito, sin sesión. Decisiones de Andrés del 12/11:
// - estado y ciudad de ZOOM, retirando en su oficina, en dólares y bolívares;
// - si ZOOM no responde, un estimado propio por peso, marcado como aproximado;
// - cada paquete desde su origen (la tienda, Guanare; la ferretería, La Victoria).
// El peso, las medidas y el valor salen de la base: el navegador solo manda qué productos y cuántos. Solo servidor.

import { prisma } from '@/lib/prisma';
import { calculateOrder, roundMoney, toPricingSettings, type PricingLine } from '@/lib/pricing';
import { ciudadesZoom, oficinasZoom, tarifaZoom } from './zoom';

/**
 * Flete de ZOOM retirando en oficina, por kilos que cobra (el mayor entre el real y el volumétrico), sin el seguro. Es la
 * tabla del 10/11 (La Victoria a Caracas, consultada a su API); el 12/11, 5 kg salieron $20,97. Solo si ZOOM no responde.
 */
const TABLA_KG_USD: ReadonlyArray<readonly [number, number]> = [
  [0.5, 7.2], [1, 8.4], [2, 10.8], [3, 14.6], [5, 19.8], [8, 28.7], [10, 33.5], [15, 47.7], [20, 60.2], [25, 72.9],
];
/** El seguro de ZOOM: un porcentaje del valor declarado */
const SEGURO = 0.035;
export const ESTIMADO_ITEMS_MAX = 50;

/** El estimado propio: la tabla por kilos (interpolada; pasado el último punto, al mismo ritmo) más el seguro */
export function estimadoPropioUSD(kg: number, valorUSD: number): number {
  const k = Math.max(kg, 0.1);
  let base: number;
  if (k <= TABLA_KG_USD[0][0]) base = TABLA_KG_USD[0][1];
  else {
    const i = TABLA_KG_USD.findIndex(([x]) => x >= k);
    const [x0, y0] = i === -1 ? TABLA_KG_USD[TABLA_KG_USD.length - 2] : TABLA_KG_USD[i - 1];
    const [x1, y1] = i === -1 ? TABLA_KG_USD[TABLA_KG_USD.length - 1] : TABLA_KG_USD[i];
    base = y0 + ((y1 - y0) * (k - x0)) / (x1 - x0);
  }
  return roundMoney(base + Math.max(valorUSD, 0) * SEGURO);
}

export interface EstimadoPaquete {
  /** Ciudad de ZOOM desde donde sale; null = la tienda */
  origen: string | null;
  origenNombre: string;
  /** Kilos que cobra ZOOM */
  pesoKg: number;
  totalUSD: number;
  totalBs: number | null;
  /** true: ZOOM no respondió y es el estimado propio */
  aproximado: boolean;
}

export interface EstimadoEnvio {
  ciudad: { codigo: string; nombre: string; estado: string } | null;
  paquetes: EstimadoPaquete[];
}

/** El flete de referencia de cada paquete hasta una ciudad de ZOOM, retirando en su oficina */
export async function estimarEnvio(items: Array<{ productId: string; quantity: number }>, ciudadCodigo: string): Promise<EstimadoEnvio> {
  const [productos, settings, ciudades, oficinas] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: [...new Set(items.map((i) => i.productId))] }, status: 'PUBLISHED', productType: 'PHYSICAL', deletedAt: null },
      select: {
        id: true, name: true, priceUSD: true, weightKg: true, dimensions: true, isConsolidable: true, freeShipping: true,
        supplier: { select: { dispatchCityCode: true, dispatchCityName: true } },
      },
    }),
    prisma.companySettings.findUnique({ where: { id: 'default' } }),
    ciudadesZoom(),
    oficinasZoom(ciudadCodigo),
  ]);
  const porId = new Map(productos.map((p) => [p.id, p]));
  const lineas: PricingLine[] = items.flatMap((i) => {
    const p = porId.get(i.productId);
    if (!p) return [];
    return [{
      productId: p.id, name: p.name, productType: 'PHYSICAL' as const, unitPriceUSD: Number(p.priceUSD), quantity: i.quantity,
      weightKg: p.weightKg === null ? null : Number(p.weightKg), dimensions: p.dimensions, isConsolidable: p.isConsolidable,
      shippingCostUSD: 0, freeShipping: p.freeShipping, discountPercent: 0,
      origen: p.supplier?.dispatchCityCode ?? null, origenNombre: p.supplier?.dispatchCityName ?? null,
    }];
  });
  const ciudad = ciudades?.find((c) => c.codigo === ciudadCodigo) ?? null;
  if (lineas.length === 0) return { ciudad, paquetes: [] };

  const calculo = calculateOrder(lineas, toPricingSettings(settings), 'SHIPPING');
  const tasa = Number(settings?.exchangeRateVES ?? 0);
  // Para la referencia basta una oficina de la ciudad; si ZOOM rechaza la primera, se prueba la siguiente
  const codigosOficina = (oficinas ?? []).slice(0, 2).map((o) => o.codigo);

  const paquetes = await Promise.all(calculo.paquetes.map(async (paquete): Promise<EstimadoPaquete> => {
    const valorUSD = paquete.totals.subtotalUSD;
    const pesoKg = paquete.shipping.totalWeight;
    let totalBs: number | null = null;
    for (const oficina of codigosOficina) {
      const tarifa = await tarifaZoom({
        ciudad: ciudadCodigo, oficina, modo: 'OFFICE', pesoKg, piezas: paquete.shipping.pieces,
        valorDeclaradoBs: tasa > 0 ? valorUSD * tasa : 0, origen: paquete.origen,
      });
      if (tarifa) { totalBs = roundMoney(tarifa.totalBs); break; }
    }
    if (totalBs !== null && tasa > 0) {
      return { origen: paquete.origen, origenNombre: paquete.origenNombre, pesoKg, totalUSD: roundMoney(totalBs / tasa), totalBs, aproximado: false };
    }
    const totalUSD = estimadoPropioUSD(pesoKg, valorUSD);
    return { origen: paquete.origen, origenNombre: paquete.origenNombre, pesoKg, totalUSD, totalBs: tasa > 0 ? roundMoney(totalUSD * tasa) : null, aproximado: true };
  }));
  return { ciudad, paquetes };
}
