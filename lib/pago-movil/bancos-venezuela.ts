/**
 * Lista de bancos de Venezuela con sus códigos para Pago Móvil
 * Fuente: Banco Central de Venezuela
 */

export interface BancoVenezuela {
  codigo: string;
  nombre: string;
  nombreCorto: string;
}

export const BANCOS_VENEZUELA: BancoVenezuela[] = [
  { codigo: '0102', nombre: 'Banco de Venezuela', nombreCorto: 'Venezuela' },
  { codigo: '0104', nombre: 'Venezolano de Crédito', nombreCorto: 'Venezolano de Crédito' },
  { codigo: '0105', nombre: 'Mercantil', nombreCorto: 'Mercantil' },
  { codigo: '0108', nombre: 'Provincial', nombreCorto: 'Provincial' },
  { codigo: '0114', nombre: 'Bancaribe', nombreCorto: 'Bancaribe' },
  { codigo: '0115', nombre: 'Exterior', nombreCorto: 'Exterior' },
  { codigo: '0128', nombre: 'Caroní', nombreCorto: 'Caroní' },
  { codigo: '0134', nombre: 'Banesco', nombreCorto: 'Banesco' },
  { codigo: '0137', nombre: 'Sofitasa', nombreCorto: 'Sofitasa' },
  { codigo: '0138', nombre: 'Banco Plaza', nombreCorto: 'Plaza' },
  { codigo: '0146', nombre: 'Banco de la Gente Emprendedora', nombreCorto: 'Bangente' },
  { codigo: '0151', nombre: 'Fondo Común', nombreCorto: 'Fondo Común' },
  { codigo: '0156', nombre: '100% Banco', nombreCorto: '100% Banco' },
  { codigo: '0157', nombre: 'Delsur', nombreCorto: 'Delsur' },
  { codigo: '0163', nombre: 'Del Tesoro', nombreCorto: 'Tesoro' },
  { codigo: '0166', nombre: 'Agrícola de Venezuela', nombreCorto: 'Agrícola' },
  { codigo: '0168', nombre: 'Bancrecer', nombreCorto: 'Bancrecer' },
  { codigo: '0169', nombre: 'Mi Banco', nombreCorto: 'Mi Banco' },
  { codigo: '0171', nombre: 'Activo', nombreCorto: 'Activo' },
  { codigo: '0172', nombre: 'Bancamiga', nombreCorto: 'Bancamiga' },
  { codigo: '0173', nombre: 'Internacional de Desarrollo', nombreCorto: 'BID' },
  { codigo: '0174', nombre: 'Banplus', nombreCorto: 'Banplus' },
  { codigo: '0175', nombre: 'Bicentenario', nombreCorto: 'Bicentenario' },
  { codigo: '0177', nombre: 'BANFANB', nombreCorto: 'BANFANB' },
  { codigo: '0191', nombre: 'BNC', nombreCorto: 'BNC' },
];

/**
 * Obtener banco por código
 */
export function getBancoPorCodigo(codigo: string): BancoVenezuela | undefined {
  return BANCOS_VENEZUELA.find(banco => banco.codigo === codigo);
}

/**
 * Validar formato de teléfono venezolano
 * Formato esperado: 04XX-XXXXXXX o 04XXXXXXXXX
 */
export function validarTelefonoVenezolano(telefono: string): boolean {
  const telefonoLimpio = telefono.replace(/[-\s]/g, '');
  return /^04\d{9}$/.test(telefonoLimpio);
}

/**
 * Formatear teléfono para API (sin guiones ni espacios)
 */
export function formatearTelefonoParaAPI(telefono: string): string {
  return telefono.replace(/[-\s]/g, '');
}

/**
 * Validar formato de cédula venezolana
 * Formato esperado: V12345678 o E12345678
 */
export function validarCedulaVenezolana(cedula: string): boolean {
  return /^[VvEe]\d{6,9}$/.test(cedula.toUpperCase().replace(/[-\s]/g, ''));
}

/**
 * Formatear cédula para API
 */
export function formatearCedulaParaAPI(cedula: string): string {
  const cedulaLimpia = cedula.toUpperCase().replace(/[-\s]/g, '');
  // Asegurar que comience con V o E
  if (/^\d/.test(cedulaLimpia)) {
    return 'V' + cedulaLimpia;
  }
  return cedulaLimpia;
}

/**
 * Validar formato de referencia de pago móvil
 * Las referencias suelen ser de 4 a 8 dígitos
 */
export function validarReferencia(referencia: string): boolean {
  const referenciaLimpia = referencia.replace(/\s/g, '');
  return /^\d{4,8}$/.test(referenciaLimpia);
}

/**
 * Formatear fecha para API BDV
 * Formato requerido: YYYY-MM-DD
 */
export function formatearFechaParaAPI(fecha: Date | string): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return date.toISOString().split('T')[0];
}

/**
 * Formatear monto para API BDV
 * Formato requerido: "150.00" (string con 2 decimales)
 */
export function formatearMontoParaAPI(monto: number): string {
  return monto.toFixed(2);
}
