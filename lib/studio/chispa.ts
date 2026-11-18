// C-195: las imágenes de Chispa para las historias de ElectroStudio y el popup navideño, una por pose, con y sin gorro,
// del mismo tamaño (600 × 735; arriba queda lugar para el gorro). Salen de chispa/mascota/chispa.js con Chrome.
// La carpeta lleva la versión de Chispa: el optimizador de imágenes guarda cada una 30 días (minimumCacheTTL en
// next.config.js), no se puede vaciar y el deploy copia su caché. Un dibujo nuevo va en otra carpeta y se cambia aquí.
// C-296: chispa-31, Chispa 3.1 (el logo oficial en la camisa). Se generan con chispa/herramientas/poses-web.mjs.
// Archivo aparte y sin dependencias: el popup de la tienda lo usa sin cargar el motor de las historias.
export const CHISPA_DIR = '/images/studio/chispa-31';

export const chispaSrc = (pose: string, gorro: boolean) => `${CHISPA_DIR}/${pose}${gorro ? '-gorro' : ''}.png`;
