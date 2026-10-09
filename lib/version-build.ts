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
