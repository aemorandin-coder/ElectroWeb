// Registro de clientes (C-84): las mismas reglas en la pantalla y en el servidor.
// Antes la pantalla aceptaba contraseñas de 6 caracteres y cédulas con "P" que el servidor rechazaba
// después del captcha, y el servidor aceptaba cédulas con "G" que la pantalla no dejaba escribir.
// Sin imports del servidor: este archivo también se carga en el navegador.

import { z } from 'zod';

export const PAISES_TELEFONO = [
  { codigo: '+58', corto: 'VE', pais: 'Venezuela' },
  { codigo: '+57', corto: 'CO', pais: 'Colombia' },
  { codigo: '+1', corto: 'US', pais: 'Estados Unidos' },
  { codigo: '+34', corto: 'ES', pais: 'España' },
  { codigo: '+507', corto: 'PA', pais: 'Panamá' },
  { codigo: '+55', corto: 'BR', pais: 'Brasil' },
  { codigo: '+56', corto: 'CL', pais: 'Chile' },
  { codigo: '+54', corto: 'AR', pais: 'Argentina' },
  { codigo: '+51', corto: 'PE', pais: 'Perú' },
  { codigo: '+593', corto: 'EC', pais: 'Ecuador' },
] as const;

export const TIPOS_DOCUMENTO = [
  { letra: 'V', nombre: 'Venezolano' },
  { letra: 'E', nombre: 'Extranjero' },
  { letra: 'P', nombre: 'Pasaporte' },
  { letra: 'J', nombre: 'Jurídico (RIF)' },
  { letra: 'G', nombre: 'Gobierno (RIF)' },
] as const;

export const REGLAS_CONTRASENA = [
  { id: 'largo', texto: '8 caracteres o más', cumple: (v: string) => v.length >= 8 },
  { id: 'mayuscula', texto: 'Una mayúscula', cumple: (v: string) => /[A-Z]/.test(v) },
  { id: 'minuscula', texto: 'Una minúscula', cumple: (v: string) => /[a-z]/.test(v) },
  { id: 'numero', texto: 'Un número', cumple: (v: string) => /\d/.test(v) },
] as const;

const CORREO = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

type Lectura = { ok: true; valor: string } | { ok: false; error: string };

/** "V-12345678". Acepta "v12345678", "V 12.345.678" o "V-12345678". El pasaporte admite letras. */
export function leerDocumento(valor: string): Lectura {
  const limpio = valor.toUpperCase().replace(/[\s.]/g, '');
  if (!limpio) return { ok: false, error: 'Escribe tu número de cédula' };
  const partes = limpio.match(/^([VEJGP])-?([A-Z0-9-]+)$/);
  if (!partes) return { ok: false, error: 'Elige el tipo y escribe el número, por ejemplo V-12345678' };
  const [, letra, resto] = partes;
  const numero = resto.replace(/-/g, '');
  if (!numero) return { ok: false, error: 'Escribe tu número de cédula' };
  if (letra === 'P') {
    if (!/^[A-Z0-9]{5,15}$/.test(numero)) return { ok: false, error: 'El pasaporte debe tener entre 5 y 15 letras o números' };
  } else if (!/^\d{5,10}$/.test(numero)) {
    return { ok: false, error: 'La cédula debe tener entre 5 y 10 números' };
  }
  return { ok: true, valor: `${letra}-${numero}` };
}

/** "+58 4121234567": código del país y dígitos, sin el 0 inicial en Venezuela (el formato que usa WhatsApp). */
export function leerTelefono(valor: string): Lectura {
  const partes = valor.trim().match(/^(\+\d{1,4})\s*([\d\s()-]*)$/);
  if (!partes) return { ok: false, error: 'Escribe tu número de teléfono' };
  const pais = PAISES_TELEFONO.find((p) => p.codigo === partes[1]);
  if (!pais) return { ok: false, error: 'Elige el código de tu país' };
  let digitos = partes[2].replace(/\D/g, '');
  if (!digitos) return { ok: false, error: 'Escribe tu número de teléfono' };
  if (pais.codigo === '+58') {
    if (digitos.startsWith('0')) digitos = digitos.slice(1);
    if (!/^4\d{9}$/.test(digitos)) return { ok: false, error: 'Escribe un celular venezolano, por ejemplo 0412 123 4567' };
  } else if (digitos.length < 6 || digitos.length > 14) {
    return { ok: false, error: 'El número debe tener entre 6 y 14 dígitos' };
  }
  return { ok: true, valor: `${pais.codigo} ${digitos}` };
}

function conLectura(leer: (valor: string) => Lectura) {
  return z.string({ error: 'Campo requerido' }).transform((valor, ctx) => {
    const lectura = leer(valor);
    if (!lectura.ok) {
      ctx.addIssue({ code: 'custom', message: lectura.error });
      return z.NEVER;
    }
    return lectura.valor;
  });
}

export const nombreSchema = z
  .string({ error: 'Escribe tu nombre y apellido' })
  .transform((v) => v.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
  .pipe(
    z
      .string()
      .min(1, 'Escribe tu nombre y apellido')
      .max(80, 'El nombre es muy largo')
      // Letras de cualquier idioma, espacios, guion, apóstrofo y punto: "María-José O'Brien" es un nombre válido
      .regex(/^\p{L}[\p{L}\s'.,-]*$/u, 'Usa solo letras, espacios, guion o apóstrofo')
      .refine((v) => v.split(' ').filter((p) => p.length > 1).length >= 2, 'Escribe tu nombre y tu apellido')
  );

export const correoSchema = z
  .string({ error: 'Escribe tu correo' })
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.string().min(1, 'Escribe tu correo').max(255, 'El correo es muy largo').regex(CORREO, 'Escribe un correo válido, por ejemplo nombre@gmail.com'));

export const contrasenaSchema = z
  .string({ error: 'Escribe una contraseña' })
  .max(128, 'La contraseña es muy larga')
  .superRefine((v, ctx) => {
    const falla = REGLAS_CONTRASENA.find((regla) => !regla.cumple(v));
    if (falla) ctx.addIssue({ code: 'custom', message: v ? `A tu contraseña le falta: ${falla.texto.toLowerCase()}` : 'Escribe una contraseña' });
  });

export const documentoSchema = conLectura(leerDocumento);
export const telefonoSchema = conLectura(leerTelefono);

// Sin cédula desde C-85: se pide en la primera compra (checkout) y se puede escribir en el perfil
export const registroSchema = z.object({
  name: nombreSchema,
  email: correoSchema,
  phone: telefonoSchema,
  password: contrasenaSchema,
  acceptTerms: z.literal(true, { error: 'Acepta los términos para crear tu cuenta' }),
});

export type CampoRegistro = keyof typeof registroSchema.shape;

// Errores de tipeo frecuentes en el dominio del correo
const DOMINIOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.es': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com', 'homail.com': 'hotmail.com', 'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'icloud.con': 'icloud.com',
};

/** "ana@gmial.com" → "ana@gmail.com". null si el dominio no parece un error de tipeo. */
export function sugerirCorreo(valor: string): string | null {
  const correo = valor.trim().toLowerCase();
  const arroba = correo.lastIndexOf('@');
  if (arroba < 1) return null;
  const correcto = DOMINIOS[correo.slice(arroba + 1)];
  return correcto ? `${correo.slice(0, arroba)}@${correcto}` : null;
}
