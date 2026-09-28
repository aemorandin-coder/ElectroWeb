// Marca de campaña de ElectroStudio (C-113): cada historia lleva ?es=<código> en su enlace y su QR.
// Módulo sin dependencias: lo usan proxy.ts, el rastreador de visitas y la API de órdenes.

/** 6 letras y números sin los que se confunden (0, o, 1, l) */
export const FLYER_CODE = /^[a-km-np-z2-9]{6}$/;
export const isFlyerCode = (v: unknown): v is string => typeof v === 'string' && FLYER_CODE.test(v);

/** Cookie con la última historia por la que llegó la persona: la compra que haga en los próximos 7 días se le atribuye */
export const STUDIO_COOKIE = 'electroshop_es';
export const STUDIO_COOKIE_DAYS = 7;
