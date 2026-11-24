// G-76: Adaptador agnóstico de Imprenta Digital autorizada por el SENIAT (Providencia SNAT/2026/00093).
// En ambiente SANDBOX simula el timbrado con asignación de número de control y formato válido para pruebas previas a abril 2027.
// En ambiente PRODUCCION consume la API REST configurada usando la credencial IMPRENTA_DIGITAL_API_KEY del .env (nunca en BD).

import type { Renglon, TotalesFactura } from '@/lib/contabilidad/montos';

export interface PayloadImprentaDigital {
  tipo: 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO';
  serie: string;
  numero: number;
  fecha: string;
  hora: string;
  monedaOperacion: 'VES' | 'USD';
  tasaBcv: number;
  comprador: {
    tipo: 'PERSONA' | 'EMPRESA';
    nombre: string;
    documento: string;
    domicilio: string;
    telefono: string;
  };
  condicionPago: 'CONTADO' | 'CREDITO';
  renglones: Renglon[];
  totales: TotalesFactura;
  alicuota: number;
  facturaAfectada?: {
    numero: string;
    numeroControl: string;
    fecha: string;
    totalBs: number;
  };
  llaveIdempotencia: string;
}

export type RespuestaImprenta = {
  ok: true;
  proveedor: string;
  numeroControl: string;
  idExterno: string;
  qrVerificacion: string | null;
  estadoTransmision: 'TIMBRADO';
} | {
  ok: false;
  error: string;
};

export interface ConfigEmisorImprenta {
  imprentaProveedor: string | null;
  imprentaAmbiente: 'SANDBOX' | 'PRODUCCION';
  imprentaApiUrl: string | null;
}

export async function timbrarConImprentaDigital(
  payload: PayloadImprentaDigital,
  config: ConfigEmisorImprenta,
): Promise<RespuestaImprenta> {
  const proveedor = config.imprentaProveedor || 'GENERICO_REST';

  if (config.imprentaAmbiente !== 'PRODUCCION') {
    // Sandbox local: asigna control correlativo de prueba sin llamar a red externa
    const sufijo = String(payload.numero).padStart(6, '0');
    return {
      ok: true,
      proveedor: `${proveedor}_SANDBOX`,
      numeroControl: `00-${sufijo}`,
      idExterno: `SBX-${payload.tipo}-${payload.serie}${payload.numero}-${Date.now().toString(36).toUpperCase()}`,
      qrVerificacion: `https://verificacion.sandbox.seniat.local/${payload.serie}-${payload.numero}`,
      estadoTransmision: 'TIMBRADO',
    };
  }

  const apiKey = process.env.IMPRENTA_DIGITAL_API_KEY?.trim();
  if (!config.imprentaApiUrl || !apiKey) {
    return {
      ok: false,
      error: 'Falta configurar la URL de la imprenta digital o IMPRENTA_DIGITAL_API_KEY en el .env del servidor.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const endpoint = `${config.imprentaApiUrl.replace(/\/$/, '')}/v1/documentos`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Idempotency-Key': payload.llaveIdempotencia,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !body || typeof body.numeroControl !== 'string' || !body.numeroControl.trim()) {
      const detalle = typeof body?.error === 'string' ? body.error : `Respuesta HTTP ${res.status} de la imprenta digital.`;
      return { ok: false, error: detalle };
    }
    return {
      ok: true,
      proveedor,
      numeroControl: body.numeroControl.trim(),
      idExterno: typeof body.idExterno === 'string' ? body.idExterno : `${proveedor}-${payload.numero}`,
      qrVerificacion: typeof body.qrVerificacion === 'string' ? body.qrVerificacion : null,
      estadoTransmision: 'TIMBRADO',
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error && err.name === 'AbortError'
        ? 'La imprenta digital tardó más de 15 segundos en responder.'
        : 'No se pudo conectar con la imprenta digital.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function probarConexionImprenta(config: ConfigEmisorImprenta): Promise<{ ok: boolean; mensaje: string }> {
  const proveedor = config.imprentaProveedor || 'GENERICO_REST';
  if (config.imprentaAmbiente !== 'PRODUCCION') {
    return {
      ok: true,
      mensaje: `Modo Sandbox activo (${proveedor}): listo para simular timbrado y asignar controles de prueba sin costo.`,
    };
  }
  const apiKey = process.env.IMPRENTA_DIGITAL_API_KEY?.trim();
  if (!config.imprentaApiUrl || !apiKey) {
    return {
      ok: false,
      mensaje: 'En Producción necesitas la URL HTTPS de tu imprenta y la variable IMPRENTA_DIGITAL_API_KEY en el .env del servidor.',
    };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${config.imprentaApiUrl.replace(/\/$/, '')}/v1/health`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    return res.ok
      ? { ok: true, mensaje: `Conexión verificada con ${proveedor} (HTTP ${res.status}).` }
      : { ok: false, mensaje: `La imprenta respondió HTTP ${res.status}. Revisa URL y clave en .env.` };
  } catch {
    return { ok: false, mensaje: 'No se pudo alcanzar el servidor de la imprenta digital.' };
  } finally {
    clearTimeout(timeout);
  }
}
