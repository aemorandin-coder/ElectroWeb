// API pública de ZOOM (C-100): ciudades, oficinas, tarifa de referencia y rastreo. Solo servidor.
// No pide credenciales. Producción: https://api.zoom.red/canguroazul (probada el 22/09).
// Pruebas: https://sandbox.zoom.red/baaszoom/public/canguroazul (ZOOM_API_URL).
// Crear guías es otra API, privada, que ZOOM da a clientes corporativos (fase 2).

import { ZOOM_CIUDAD_ORIGEN, capitalizarNombre as capitalizar, nombreEstado } from '@/lib/envios/empresas';

const BASE_URL = (process.env.ZOOM_API_URL || 'https://api.zoom.red/canguroazul').replace(/\/+$/, '');
const TIMEOUT_MS = 8000;
const LISTAS_TTL_MS = 24 * 60 * 60 * 1000;

export interface CiudadZoom {
  codigo: string;
  nombre: string;
  estado: string;
}

export interface OficinaEnvio {
  codigo: string;
  nombre: string;
  direccion: string;
}

export interface TarifaZoom {
  totalBs: number;
}

export interface EventoRastreo {
  codigo: string | null;
  descripcion: string;
  lugar: string | null;
  fecha: Date;
}

interface RespuestaZoom<T> {
  codrespuesta?: string;
  mensaje?: string;
  entidadRespuesta?: T | string | string[] | Record<string, unknown>;
}

async function llamar<T>(metodo: string, params: Record<string, string>): Promise<RespuestaZoom<T> | null> {
  const query = new URLSearchParams(params).toString();
  try {
    const response = await fetch(`${BASE_URL}/${metodo}${query ? `?${query}` : ''}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as RespuestaZoom<T>;
  } catch (error) {
    console.error(`ZOOM ${metodo} no respondió:`, error instanceof Error ? error.message : error);
    return null;
  }
}

// Caché en memoria del proceso: ciudades y oficinas cambian poco y el checkout las pide a cada rato.
const cache = new Map<string, { expira: number; valor: unknown }>();

async function conCache<T>(clave: string, cargar: () => Promise<T | null>): Promise<T | null> {
  const guardado = cache.get(clave);
  if (guardado && guardado.expira > Date.now()) return guardado.valor as T;
  const valor = await cargar();
  if (valor !== null) {
    cache.set(clave, { expira: Date.now() + LISTAS_TTL_MS, valor });
    return valor;
  }
  // Si ZOOM no responde, mejor la lista de ayer que nada
  return guardado ? (guardado.valor as T) : null;
}

const texto = (valor: unknown) => (typeof valor === 'string' ? valor.trim() : typeof valor === 'number' ? String(valor) : '');

/** "8.613,15" → 8613.15 */
export function montoZoom(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  const limpio = texto(valor).replace(/\./g, '').replace(',', '.');
  const n = Number(limpio);
  return Number.isFinite(n) ? n : NaN;
}

/** Ciudades con servicio de cobro a destino (el flete lo paga quien recibe). */
export async function ciudadesZoom(): Promise<CiudadZoom[] | null> {
  return conCache('ciudades', async () => {
    const data = await llamar<Array<Record<string, unknown>>>('getCiudades', { filtro: 'cod' });
    if (data?.codrespuesta !== 'COD_000' || !Array.isArray(data.entidadRespuesta)) return null;
    return (data.entidadRespuesta as Array<Record<string, unknown>>)
      .map((c) => ({ codigo: texto(c.codciudad), nombre: capitalizar(texto(c.nombre_ciudad)), estado: nombreEstado(texto(c.nombre_estado)) }))
      .filter((c) => c.codigo && c.nombre && c.estado)
      .sort((a, b) => a.estado.localeCompare(b.estado, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
  });
}

/** Oficinas donde se puede retirar un envío con cobro a destino en esa ciudad. */
export async function oficinasZoom(codigoCiudad: string): Promise<OficinaEnvio[] | null> {
  if (!/^\d{1,6}$/.test(codigoCiudad)) return [];
  return conCache(`oficinas:${codigoCiudad}`, async () => {
    const data = await llamar<Array<Record<string, unknown>>>('getOficinasGE', {
      codigo_ciudad_destino: codigoCiudad,
      tipo_tarifa: '1',
      modalidad_tarifa: '1',
    });
    if (data?.codrespuesta !== 'COD_000' || !Array.isArray(data.entidadRespuesta)) return null;
    return (data.entidadRespuesta as Array<Record<string, unknown>>)
      .map((o) => ({ codigo: texto(o.codoficina), nombre: capitalizar(texto(o.nombre)), direccion: texto(o.direccion) }))
      .filter((o) => o.codigo && o.nombre)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  });
}

/**
 * Lo que ZOOM le cobrará al cliente al recibir (cobro a destino), en bolívares. Es una referencia:
 * la tarifa final la calcula ZOOM al crear la guía.
 */
export async function tarifaZoom(params: {
  ciudad: string;
  oficina?: string | null;
  modo: 'OFFICE' | 'DOOR';
  pesoKg: number;
  piezas: number;
  valorDeclaradoBs: number;
}): Promise<TarifaZoom | null> {
  const base: Record<string, string> = {
    tipo_tarifa: '1',
    modalidad_tarifa: params.modo === 'DOOR' ? '2' : '1',
    ciudad_remitente: ZOOM_CIUDAD_ORIGEN,
    ciudad_destinatario: params.ciudad,
    cantidad_piezas: String(Math.max(1, Math.round(params.piezas))),
    peso: String(Math.max(0.1, Math.round(params.pesoKg * 100) / 100)),
    codpais: '0',
    tipo_envio: '2',
  };
  if (params.modo === 'OFFICE' && params.oficina) base.oficina_retirar = params.oficina;

  const consultar = (valor: number) => llamar<Record<string, unknown>>('CalcularTarifa', {
    ...base,
    valor_declarado: String(Math.round(valor)),
  });

  let data = await consultar(params.valorDeclaradoBs);
  // ZOOM exige un valor declarado entre un mínimo y un máximo que cambian con la tasa: se ajusta y se reintenta una vez
  if (data?.codrespuesta === 'CODE_002' && Array.isArray(data.entidadRespuesta)) {
    const mensaje = String(data.entidadRespuesta[0] ?? '');
    const limites = [...mensaje.matchAll(/Bs\.\s*([\d.,]+)/g)].map((m) => montoZoom(m[1])).filter(Number.isFinite);
    if (limites.length >= 2) {
      const [minimo, maximo] = limites;
      data = await consultar(Math.min(Math.max(params.valorDeclaradoBs, minimo), maximo));
    }
  }
  if (data?.codrespuesta !== 'COD_000' || !data.entidadRespuesta || typeof data.entidadRespuesta !== 'object' || Array.isArray(data.entidadRespuesta)) {
    return null;
  }
  const totalBs = montoZoom((data.entidadRespuesta as Record<string, unknown>).total);
  return Number.isFinite(totalBs) && totalBs > 0 ? { totalBs } : null;
}

/** "22/09/2026" o "2026-09-22" más "14:30" → Date. Sin hora válida, mediodía (para no cambiar de día). */
function fechaEvento(fecha: string, hora: string): Date | null {
  let y: number, m: number, d: number;
  const dmy = fecha.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  const ymd = fecha.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dmy) [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else if (ymd) [y, m, d] = [Number(ymd[1]), Number(ymd[2]), Number(ymd[3])];
  else return null;
  const hm = hora.match(/(\d{1,2}):(\d{2})/);
  const [hh, mm] = hm ? [Number(hm[1]), Number(hm[2])] : [12, 0];
  // Hora de Venezuela (UTC-4, sin horario de verano)
  const fechaUtc = new Date(Date.UTC(y, m - 1, d, hh + 4, mm));
  return Number.isNaN(fechaUtc.getTime()) ? null : fechaUtc;
}

/**
 * Historial de una guía ZOOM. `null` si ZOOM no respondió; `[]` si todavía no tiene movimientos
 * (o la guía no existe).
 */
export async function rastreoZoom(guia: string): Promise<EventoRastreo[] | null> {
  const codigo = guia.trim();
  if (!/^[A-Za-z0-9-]{4,30}$/.test(codigo)) return [];
  const data = await llamar<Array<Record<string, unknown>>>('getInfoTracking', {
    tipo_busqueda: '1',
    codigo,
    codigo_cliente: process.env.ZOOM_CODIGO_CLIENTE || '1',
  });
  if (!data) return null;
  if (!Array.isArray(data.entidadRespuesta)) return [];
  const eventos: EventoRastreo[] = [];
  for (const fila of data.entidadRespuesta as Array<Record<string, unknown>>) {
    const descripcion = capitalizar(texto(fila.descripcion_estatus));
    const fecha = fechaEvento(texto(fila.fecha), texto(fila.hora));
    if (!descripcion || !fecha) continue;
    const receptor = texto(fila.receptor);
    eventos.push({
      codigo: texto(fila.codigo_estatus) || texto(fila.siglas) || null,
      descripcion: receptor && /entregad/i.test(descripcion) ? `${descripcion} (recibió ${capitalizar(receptor)})` : descripcion,
      lugar: capitalizar(texto(fila.siglas)) || null,
      fecha,
    });
  }
  return eventos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

/** ZOOM dice que el paquete ya lo recibió el cliente. */
export function eventoEsEntrega(descripcion: string): boolean {
  return /entregad/i.test(descripcion) && !/no\s+entregad|devuelt/i.test(descripcion);
}

/** El paquete está en la oficina esperando al cliente. */
export function eventoEsEnOficina(descripcion: string): boolean {
  return /disponible|para\s+retir|en\s+oficina\s+destino|oficina\s+de\s+destino/i.test(descripcion);
}
