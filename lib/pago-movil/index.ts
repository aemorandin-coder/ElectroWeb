/**
 * Módulo de Pago Móvil - Banco de Venezuela
 * Exporta todas las utilidades y componentes para verificación de pago móvil
 */

// Bancos y utilidades
export {
    BANCOS_VENEZUELA,
    getBancoPorCodigo,
    validarTelefonoVenezolano,
    formatearTelefonoParaAPI,
    validarCedulaVenezolana,
    formatearCedulaParaAPI,
    validarReferencia,
    formatearFechaParaAPI,
    formatearMontoParaAPI,
    type BancoVenezuela,
} from './bancos-venezuela';

// Servicio de verificación
export {
    verificarPagoMovil,
    interpretarErrorBDV,
    BDV_RESPONSE_CODES,
    type VerificarPagoParams,
    type VerificarPagoResponse,
} from './verificar-pago';
