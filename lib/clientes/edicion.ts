// C-276: los datos de un cliente que el equipo puede cambiar desde "Editar" (los mismos que cambiaba la ventana vieja:
// nombre, correo, teléfono, WhatsApp, tipo, empresa y RIF). El estado de la verificación de la empresa y su nota van por
// Verificaciones (PATCH /api/admin/verifications), que avisa al cliente y no deja que dos personas la resuelvan dos veces.
// Módulo puro: lo usan la página (servidor), el asistente (cliente) y la API.

export const CAMPOS_EDITABLES = ['nombre', 'correo', 'telefono', 'whatsapp', 'tipo', 'empresa', 'rif'] as const;
export type CampoEditable = (typeof CAMPOS_EDITABLES)[number];

export type DatosEditables = Record<CampoEditable, string>;

export const NOMBRE_CAMPO: Record<CampoEditable, string> = {
  nombre: 'Nombre', correo: 'Correo', telefono: 'Teléfono', whatsapp: 'WhatsApp', tipo: 'Tipo de cliente', empresa: 'Empresa', rif: 'RIF',
};

export const TIPOS = { PERSON: 'Persona', COMPANY: 'Empresa' } as const;

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO = /^\+?[\d\s()-]{7,20}$/;
const RIF = /^[JGVEPC]-?\d{6,9}-?\d?$/i;

/** Lo que está mal en un campo, o null. Igual en el asistente y en el servidor. */
export function problemaDe(campo: CampoEditable, valor: string, datos: DatosEditables): string | null {
  const v = valor.trim();
  switch (campo) {
    case 'nombre':
      return v.length < 2 ? 'Escribe su nombre' : v.length > 80 ? 'El nombre va hasta 80 letras' : null;
    case 'correo':
      return !CORREO.test(v) ? 'Ese correo no está bien escrito' : v.length > 120 ? 'El correo va hasta 120 letras' : null;
    case 'telefono':
    case 'whatsapp':
      return v && !TELEFONO.test(v) ? 'Escribe solo el número, por ejemplo 0414-1234567' : null;
    case 'tipo':
      return v in TIPOS ? null : 'Elige si es persona o empresa';
    case 'empresa':
      return datos.tipo === 'COMPANY' && v.length < 2 ? 'Escribe el nombre de la empresa' : v.length > 120 ? 'El nombre va hasta 120 letras' : null;
    case 'rif':
      return v && !RIF.test(v) ? 'El RIF va como J-12345678-9' : null;
  }
}

/** Cómo se ve un valor en "antes → después" */
export function valorLegible(campo: CampoEditable, valor: string): string {
  if (campo === 'tipo') return TIPOS[valor as keyof typeof TIPOS] ?? valor;
  return valor.trim() || 'Sin dato';
}
