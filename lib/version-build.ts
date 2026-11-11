// C-168: qué versión es este código. Los valores los fija `next.config.js` al compilar (sirven igual en el navegador y en el
// servidor). Lo que se compara para saber si hay una versión nueva es `id`: cambia con cada compilación.

export interface VersionBuild {
  /** `package.json`, p. ej. 1.0.0-rc.4 */
  version: string;
  /** Commit corto con el que se compiló (vacío si el servidor no tiene git) */
  commit: string;
  /** Lo que diría `git describe --tags --always` al compilar */
  describe: string;
  /** Hora de la compilación (ISO) */
  construidoEn: string;
  /** Identifica esta compilación */
  id: string;
}

// Cada variable se lee por su nombre completo: Next solo reemplaza `process.env.NEXT_PUBLIC_X` escrito tal cual
const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';
const commit = process.env.NEXT_PUBLIC_APP_COMMIT || '';
const describe = process.env.NEXT_PUBLIC_APP_DESCRIBE || '';
const construidoEn = process.env.NEXT_PUBLIC_APP_BUILT_AT || '';

export const VERSION_BUILD: VersionBuild = {
  version,
  commit,
  describe,
  construidoEn,
  id: `${version}|${commit}|${construidoEn}`,
};

// C-203: cada pedido del router dice de qué versión es la pestaña, y proxy.ts lo compara con la suya. Una pestaña abierta
// antes de un deploy recibe una respuesta vacía y Next carga la página entera, en vez de mezclar el código de las dos
// versiones (el 11/11: "getCategoryIconOption is not a function" en Categorías del panel, y archivos que ya no existían).
// Sin el deploymentId de Next: ese le pone ?dpl= a cada archivo y a cada foto, y después de un deploy todo se baja de nuevo.
export const CABECERA_VERSION = 'x-es-version';
/** Va en una cabecera y dentro de un <script>: solo letras, números y . | : - */
export const VERSION_PESTANA = VERSION_BUILD.id.replace(/[^\w.|:-]/g, '');

/**
 * Pone la versión en los fetch a una página del mismo sitio: los del router de Next al navegar y en el prefetch (la tienda
 * solo hace fetch a /api). Va en línea en <head> del layout raíz, antes que Next. Next llama a window.fetch en cada pedido
 * (next/dist/client/components/segment-cache/fetch.js): si eso cambiara, cada clic recargaría la página entera.
 */
export const GUION_VERSION_PESTANA = `(function(){var v=${JSON.stringify(VERSION_PESTANA)},f=window.fetch;if(!f)return;`
  + `window.fetch=function(i,o){try{if(!(i instanceof Request)){var u=new URL(String(i),location.href);`
  + `if(u.origin===location.origin&&u.pathname.indexOf('/api/')!==0&&u.pathname.indexOf('/_next/')!==0){`
  + `var h=new Headers(o&&o.headers);h.set(${JSON.stringify(CABECERA_VERSION)},v);o=Object.assign({},o,{headers:h});}}}catch(e){}`
  + `return f(i,o);};})();`;
