/**
 * Servicio de verificación de Pago Móvil con el Banco de Venezuela
 * API de Conciliación BDV
 */

import {
    formatearTelefonoParaAPI,
    formatearCedulaParaAPI,
    formatearFechaParaAPI,
    formatearMontoParaAPI,
} from './bancos-venezuela';

// URLs de la API del BDV
const BDV_API_URL_PRODUCCION = 'https://bdvconciliacion.banvenez.com/getMovement';
const BDV_API_URL_CALIDAD = 'https://bdvconciliacionqa.banvenez.com:444/getMovement/v2';

// Códigos de respuesta del BDV
export const BDV_RESPONSE_CODES = {
    SUCCESS: 1000,           // Pago verificado exitosamente
    NOT_FOUND: 1010,         // Pago no encontrado o datos inválidos
    BAD_REQUEST: 400,        // Error en formato de la solicitud
} as const;

export interface VerificarPagoParams {
    telefonoPagador: string;     // Teléfono desde donde se hizo el pago
    bancoOrigen: string;         // Código del banco (4 dígitos, ej: "0134")
    referencia: string;          // Número de referencia del pago
    fechaPago: Date | string;    // Fecha del pago
    importe: number;             // Monto del pago
    cedulaPagador?: string;      // Cédula del pagador (opcional)
    reqCed?: boolean;            // Si true, valida la cédula (solo BDV-BDV)
}

export interface VerificarPagoResponse {
    success: boolean;
    verified: boolean;
    code: number;
    message: string;
    amount?: string;
    rawResponse?: any;
}

/**
 * Verificar un pago móvil con la API del Banco de Venezuela
 */
export async function verificarPagoMovil(
    params: VerificarPagoParams,
    options?: { usarAmbienteCalidad?: boolean }
): Promise<VerificarPagoResponse> {
    const apiKey = process.env.BDV_API_KEY;
    const telefonoComercio = process.env.BDV_TELEFONO_COMERCIO;

    if (!apiKey) {
        console.error('BDV_API_KEY no está configurada');
        return {
            success: false,
            verified: false,
            code: 500,
            message: 'Error de configuración del servidor: API Key no configurada',
        };
    }

    if (!telefonoComercio) {
        console.error('BDV_TELEFONO_COMERCIO no está configurado');
        return {
            success: false,
            verified: false,
            code: 500,
            message: 'Error de configuración del servidor: Teléfono comercio no configurado',
        };
    }

    // Determinar URL según ambiente
    const usarCalidad = options?.usarAmbienteCalidad || process.env.BDV_AMBIENTE === 'CALIDAD';
    const apiUrl = usarCalidad ? BDV_API_URL_CALIDAD : BDV_API_URL_PRODUCCION;

    // Preparar el body de la solicitud
    const requestBody = {
        cedulaPagador: params.cedulaPagador
            ? formatearCedulaParaAPI(params.cedulaPagador)
            : '',
        telefonoPagador: formatearTelefonoParaAPI(params.telefonoPagador),
        telefonoDestino: formatearTelefonoParaAPI(telefonoComercio),
        referencia: params.referencia.trim(),
        fechaPago: formatearFechaParaAPI(params.fechaPago),
        importe: formatearMontoParaAPI(params.importe),
        bancoOrigen: params.bancoOrigen,
        reqCed: params.reqCed || false,
    };

    console.log('[BDV API] Verificando pago móvil:', {
        ...requestBody,
        apiUrl: usarCalidad ? 'CALIDAD' : 'PRODUCCION',
    });

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log('[BDV API] Respuesta:', data);

        // Verificar código de respuesta
        if (data.code === BDV_RESPONSE_CODES.SUCCESS) {
            return {
                success: true,
                verified: true,
                code: data.code,
                message: data.message || 'Pago verificado exitosamente',
                amount: data.data?.amount,
                rawResponse: data,
            };
        } else {
            return {
                success: true,
                verified: false,
                code: data.code,
                message: data.message || 'No se pudo verificar el pago',
                rawResponse: data,
            };
        }
    } catch (error) {
        console.error('[BDV API] Error al verificar pago:', error);
        return {
            success: false,
            verified: false,
            code: 500,
            message: 'Error al conectar con el Banco de Venezuela. Por favor, intente nuevamente.',
        };
    }
}

/**
 * Interpretar el código de error del BDV para mostrar mensaje amigable
 */
export function interpretarErrorBDV(code: number, message: string): string {
    if (code === BDV_RESPONSE_CODES.SUCCESS) {
        return 'Pago verificado correctamente';
    }

    const lowerMessage = message.toLowerCase();

    // Mensajes personalizados según el contenido del mensaje
    if (lowerMessage.includes('registro solicitado no existe') || lowerMessage.includes('no encontrado')) {
        return 'No se encontró el pago. Verifica que los datos ingresados sean correctos: referencia, fecha, monto y teléfono de origen.';
    }

    if (lowerMessage.includes('datos mandatorios') || lowerMessage.includes('null')) {
        return 'Faltan datos obligatorios. Por favor, completa todos los campos correctamente.';
    }

    if (lowerMessage.includes('cliente no afiliado')) {
        return 'Error de configuración del comercio. Por favor, contacta al soporte.';
    }

    if (lowerMessage.includes('transacción realizada') || lowerMessage.includes('transaccion realizada')) {
        // Este mensaje aparece cuando la transacción existe pero no coinciden algunos datos
        return 'La transacción existe pero no coincide con los datos proporcionados. Verifica el monto, referencia y fecha del pago.';
    }

    if (lowerMessage.includes('importe no coincide') || lowerMessage.includes('monto')) {
        return 'El monto del pago no coincide con el verificado. Verifica que el monto transferido sea exacto.';
    }

    if (lowerMessage.includes('fecha') || lowerMessage.includes('date')) {
        return 'La fecha del pago no coincide. Verifica que la fecha ingresada sea la correcta.';
    }

    if (lowerMessage.includes('referencia')) {
        return 'La referencia del pago no fue encontrada. Verifica el número de referencia ingresado.';
    }

    if (lowerMessage.includes('teléfono') || lowerMessage.includes('telefono') || lowerMessage.includes('phone')) {
        return 'El número de teléfono no coincide. Verifica que sea el teléfono desde donde realizaste el pago.';
    }

    if (lowerMessage.includes('banco')) {
        return 'El banco de origen no coincide. Verifica que hayas seleccionado el banco correcto.';
    }

    if (code === 400 || code === BDV_RESPONSE_CODES.BAD_REQUEST) {
        return 'Error en los datos enviados. Por favor, verifica que todos los campos estén correctos.';
    }

    if (code === 1010 || code === BDV_RESPONSE_CODES.NOT_FOUND) {
        return 'Pago no encontrado en el sistema bancario. Posibles causas: (1) Datos incorrectos (referencia, fecha, monto o teléfono), (2) El pago aún no ha sido procesado por el banco, o (3) El pago se realizó hace más de 30 días. Verifica los datos con tu comprobante.';
    }

    // Mensaje genérico con el código para debugging
    return `No se pudo verificar el pago (Código: ${code}). ${message || 'Por favor, revisa los datos e intenta nuevamente.'}`;
}
