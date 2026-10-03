// C-169: recursos del panel que se pueden editar entre varios (presencia y avisos de cambio). Módulo puro.
//
// Un recurso se nombra `tipo:identificador`: `product:ckx12…`, `setting:envios`, `influencer:ckx…`. El tipo dice qué
// permiso hace falta para verlo: sin ese permiso, ni se anota la presencia ni llegan los avisos del recurso.

const PERMISO_POR_TIPO: Record<string, string> = {
  // C-174: en qué sector del panel está cada persona (la marquesina del equipo). Lo ve cualquier administrador con los dos pasos
  seccion: 'VIEW_DASHBOARD',
  product: 'MANAGE_PRODUCTS',
  category: 'MANAGE_PRODUCTS',
  // Lo más sensible solo para el dueño (SOLO_DUENO en lib/auth-helpers.ts)
  setting: 'MANAGE_SETTINGS',
  payment: 'MANAGE_SETTINGS',
  legal: 'MANAGE_USERS',
  influencer: 'MANAGE_CONTENT',
  promotion: 'MANAGE_CONTENT',
  course: 'MANAGE_CONTENT',
  studio: 'MANAGE_CONTENT',
  quote: 'MANAGE_ORDERS',
  order: 'MANAGE_ORDERS',
};

const FORMA = /^([a-z]+):([A-Za-z0-9_.-]{1,80})$/;

/** Permiso que pide el recurso, o null si el nombre no es de un recurso conocido */
export function permisoDeRecurso(recurso: string): string | null {
  const m = FORMA.exec(recurso);
  return m ? (PERMISO_POR_TIPO[m[1]] ?? null) : null;
}
