import { clave } from './texto';
import type { EspecificacionWeb } from './tipos';

// Borrador de la descripción (C-155). Módulo puro.
// No se copia el texto de ninguna página: un texto repetido de otra tienda perjudica en Google (C-149) y es de otro.
// Se redacta con los datos hallados, y queda como borrador para que Andrés lo complete con sus palabras.

/** Cómo se dice cada dato dentro de una frase. null = no se menciona con ese valor */
const FRASES: Record<string, (valor: string) => string | null> = {
  conexion: (v) => `conexión ${minuscula(v)}`,
  conector: (v) => `conector ${v}`,
  capacidad: (v) => `${v} de capacidad`,
  almacenamiento: (v) => `${v} de almacenamiento`,
  ram: (v) => `${v} de RAM`,
  procesador: (v) => `procesador ${v}`,
  pantalla: (v) => `pantalla de ${v}`,
  interfaz: (v) => `interfaz ${v}`,
  formato: (v) => `formato ${v}`,
  microfono: (v) => (/^no\b/i.test(v) ? null : /^s[ií]$/i.test(v) ? 'micrófono' : `micrófono ${minuscula(v)}`),
  'largo del cable': (v) => `cable de ${v}`,
  switches: (v) => `switches ${v}`,
  iluminacion: (v) => (/^no\b/i.test(v) ? null : `iluminación ${minuscula(v)}`),
  bateria: (v) => `batería de ${v}`,
  bluetooth: (v) => `Bluetooth ${v}`,
  potencia: (v) => `${v} de potencia`,
  'velocidad de lectura': (v) => `lectura de hasta ${v}`,
  'velocidad de escritura': (v) => `escritura de hasta ${v}`,
  'numero de teclas': (v) => `${v} teclas`,
  dpi: (v) => `${v} DPI`,
  resolucion: (v) => `resolución ${v}`,
  'sistema operativo': (v) => `${v}`,
};

/** Baja la mayúscula inicial de una palabra corriente; deja las siglas y los modelos como están */
function minuscula(valor: string): string {
  const primera = valor.split(' ')[0];
  return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(primera) ? valor.charAt(0).toLowerCase() + valor.slice(1) : valor;
}

function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

export function redactarDescripcion(datos: { nombre: string; marca: string; especificaciones: EspecificacionWeb[] }): string {
  const nombre = datos.nombre.trim().replace(/[.\s]+$/, '');
  if (!nombre) return '';
  const frases: string[] = [];
  for (const e of datos.especificaciones) {
    const frase = FRASES[clave(e.nombre)]?.(e.valor.replace(/[.\s]+$/, ''));
    // Un valor largo ya es una frase: dentro de otra se lee mal
    if (frase && e.valor.length <= 40 && frases.length < 4) frases.push(frase);
  }
  // Con menos de dos datos no hay nada que redactar: mejor el campo vacío que una frase hueca
  if (frases.length < 2) return '';

  const conMarca = datos.marca && !clave(nombre).includes(clave(datos.marca)) ? `${nombre}, de ${datos.marca}` : nombre;
  const lineas = [`${conMarca}. Tiene ${enumerar(frases)}.`];
  const incluye = datos.especificaciones.find((e) => clave(e.nombre) === 'incluye');
  if (incluye && incluye.valor.length <= 100) lineas.push(`Incluye: ${minuscula(incluye.valor.replace(/[.\s]+$/, ''))}.`);
  return lineas.join('\n');
}
