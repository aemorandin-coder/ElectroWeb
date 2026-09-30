import { hoyCaracas, montoParaAPI } from './monto';

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

/** Celulares venezolanos: Movilnet (0416, 0426), Movistar (0414, 0424) y Digitel (0412, 0422). */
const CELULAR_VE = /^04(12|14|16|22|24|26)\d{7}$/;

/**
 * Teléfono venezolano en el formato del BDV: 11 dígitos con el 0 inicial ("04121234567").
 * C-130: el perfil guarda "+58 4121234567" (a veces "+58 04121234567") y el checkout mandaba
 * "584121234567" al banco, que respondía "Formato de teléfono inválido".
 * Acepta "+58 0412…", "58412…", "0058412…", "0412-123.45.67" y "4121234567". No valida: ver validarTelefonoVenezolano.
 */
export function normalizarTelefonoVE(telefono: string): string {
  let digitos = String(telefono ?? '').replace(/\D/g, '');
  if (digitos.startsWith('0058')) digitos = digitos.slice(2);
  if (digitos.startsWith('580')) digitos = digitos.slice(2);
  else if (digitos.startsWith('58')) digitos = `0${digitos.slice(2)}`;
  else if (digitos.startsWith('4')) digitos = `0${digitos}`;
  return digitos;
}

/** Para un campo de texto: normaliza mientras se escribe o se pega, con 11 dígitos como máximo. */
export function mascaraTelefonoVE(valor: string): string {
  return normalizarTelefonoVE(valor).slice(0, 11);
}

/** Celular venezolano válido para Pago Móvil, en cualquiera de los formatos de normalizarTelefonoVE. */
export function validarTelefonoVenezolano(telefono: string): boolean {
  return CELULAR_VE.test(normalizarTelefonoVE(telefono));
}

/** Teléfono para la API del BDV: "04121234567". */
export function formatearTelefonoParaAPI(telefono: string): string {
  return normalizarTelefonoVE(telefono);
}

/**
 * Cédula en el formato del BDV: letra y dígitos, sin guiones, puntos ni espacios ("v-19.855.597" → "V19855597").
 * Sin letra se asume V. No valida: ver validarCedulaVenezolana.
 */
export function normalizarCedulaVE(cedula: string): string {
  // Solo salen separadores: quitar letras convertiría un RIF "J-…" en una cédula "V…"
  const limpia = String(cedula ?? '').toUpperCase().replace(/[\s.\-_/]/g, '');
  return /^\d/.test(limpia) ? `V${limpia}` : limpia;
}

/** Cédula venezolana: V o E y 6 a 9 dígitos, en cualquiera de los formatos de normalizarCedulaVE. */
export function validarCedulaVenezolana(cedula: string): boolean {
  return /^[VE]\d{6,9}$/.test(normalizarCedulaVE(cedula));
}

/** Cédula para la API del BDV: "V12345678". */
export function formatearCedulaParaAPI(cedula: string): string {
  return normalizarCedulaVE(cedula);
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
  // C-125: "2026-09-29" se manda tal cual. Pasarlo por Date y toISOString lo movía de día según la hora
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fecha)) return fecha.slice(0, 10);
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return hoyCaracas(date);
}

/**
 * Formatear monto para API BDV
 * Formato requerido: "150.00" (string con 2 decimales)
 */
export function formatearMontoParaAPI(monto: number): string {
  // C-125: céntimos exactos. toFixed(2) redondeaba el binario: 37.595 salía "37.59" y la pantalla decía 37,60
  return montoParaAPI(monto);
}
