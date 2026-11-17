// C-276: lo que el panel ve de un cliente, en lista blanca. Nunca salen la clave, la IP (del perfil ni de las sesiones), los
// tokens, la versión de sesión, las rutas de los archivos de firma ni el carrito tal como lo guardó el navegador.

export type EstadoEmpresa = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type EstadoCuenta = 'ACTIVE' | 'DEACTIVATED' | 'PENDING_DELETION' | 'SUSPENDED';

/** Los sellos de confianza: lo que se sabe de verdad de la cuenta */
export interface SellosCliente {
  correo: boolean;
  telefono: boolean;
  cedula: boolean;
  /** Firmó la versión vigente de los términos de los Puntos ES */
  terminos: boolean;
  /** null: no es empresa */
  empresa: EstadoEmpresa | null;
  google: boolean;
}

export interface FilaCliente {
  id: string;
  nombre: string | null;
  correo: string | null;
  foto: string | null;
  registro: string;
  empresa: string | null;
  sellos: SellosCliente;
  cuenta: EstadoCuenta;
  ultimoIngreso: { en: string; dispositivo: string | null } | null;
  pedidos: number;
  activos: number;
  gastado: number;
  puntos: number;
}

export function estadoEmpresa(valor: string | null | undefined): EstadoEmpresa {
  return valor === 'PENDING' || valor === 'APPROVED' || valor === 'REJECTED' ? valor : 'NONE';
}

export function estadoCuenta(valor: string | null | undefined): EstadoCuenta {
  return valor === 'DEACTIVATED' || valor === 'PENDING_DELETION' || valor === 'SUSPENDED' ? valor : 'ACTIVE';
}

export const NOMBRE_CUENTA: Record<EstadoCuenta, string> = {
  ACTIVE: 'Activa',
  DEACTIVATED: 'La desactivó el cliente',
  PENDING_DELETION: 'Pidió eliminarla',
  SUSPENDED: 'Suspendida',
};
