// Volcado de la base y empaquetado de archivos para los respaldos (C-165). Solo servidor.
// Los programas se lanzan sin shell y la contraseña de la base va en el entorno del proceso, nunca en los argumentos
// (que cualquiera ve con `ps`).
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

export interface ConexionBase {
  host: string;
  port: string;
  user: string;
  database: string;
  schema: string | null;
  env: Record<string, string>;
}

/** Parte la DATABASE_URL de Prisma (con `?schema=public` y demás) en lo que pide pg_dump. */
export function conexionDeUrl(url: string | undefined): ConexionBase {
  if (!url) throw new Error('DATABASE_URL no está configurada.');
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error('DATABASE_URL no tiene un formato válido.');
  }
  const database = decodeURIComponent(u.pathname.replace(/^\//, ''));
  if (!database) throw new Error('DATABASE_URL no dice a qué base conectarse.');
  const schema = u.searchParams.get('schema');
  if (schema && !/^[A-Za-z0-9_]+$/.test(schema)) throw new Error('El esquema de DATABASE_URL tiene caracteres no permitidos.');
  const env: Record<string, string> = {};
  if (u.password) env.PGPASSWORD = decodeURIComponent(u.password);
  const ssl = u.searchParams.get('sslmode');
  if (ssl) env.PGSSLMODE = ssl;
  return {
    host: u.searchParams.get('host') || u.hostname || 'localhost',
    port: u.port || '5432',
    user: decodeURIComponent(u.username),
    database,
    schema,
    env,
  };
}

interface Corrida {
  codigo: number;
  stdout: string;
  stderr: string;
}

function correr(programa: string, args: string[], env: Record<string, string> = {}, limite = 200_000): Promise<Corrida> {
  return new Promise((resolve, reject) => {
    const hijo = spawn(programa, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    hijo.stdout.on('data', (d: Buffer) => { if (stdout.length < limite) stdout += d.toString('utf8'); });
    hijo.stderr.on('data', (d: Buffer) => { if (stderr.length < 8_000) stderr += d.toString('utf8'); });
    hijo.on('error', (error: NodeJS.ErrnoException) => {
      reject(new Error(error.code === 'ENOENT' ? `${programa} no está instalado en el servidor.` : `No se pudo lanzar ${programa}: ${error.message}`));
    });
    hijo.on('close', (codigo) => resolve({ codigo: codigo ?? -1, stdout, stderr }));
  });
}

/** Recorta lo que dice un programa para guardarlo como error: una línea útil, sin saltos largos. */
function resumir(texto: string): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > 300 ? `${limpio.slice(0, 300)}…` : limpio;
}

/** pg_dump en formato personalizado (comprimido, restaurable con pg_restore) hacia `destino`. */
export async function volcarBase(url: string | undefined, destino: string): Promise<void> {
  const c = conexionDeUrl(url);
  const args = ['-Fc', '-h', c.host, '-p', c.port, '-U', c.user, '-f', destino];
  if (c.schema) args.push('-n', c.schema);
  args.push(c.database);
  const r = await correr('pg_dump', args, c.env);
  if (r.codigo !== 0) throw new Error(`pg_dump falló (${r.codigo}): ${resumir(r.stderr) || 'sin mensaje'}`);
}

/** Lee el índice del volcado con pg_restore --list: si no se puede leer, el respaldo no sirve. Devuelve cuántas tablas con datos trae. */
export async function revisarVolcado(archivo: string): Promise<number> {
  const r = await correr('pg_restore', ['--list', archivo]);
  if (r.codigo !== 0) throw new Error(`El volcado no se puede leer (pg_restore ${r.codigo}): ${resumir(r.stderr) || 'sin mensaje'}`);
  const tablas = r.stdout.split('\n').filter((linea) => / TABLE DATA /.test(linea)).length;
  if (tablas === 0) throw new Error('El volcado no trae ninguna tabla.');
  return tablas;
}

/** Carpetas con archivos que no están en la base: constancias firmadas, fotos de garantía, de productos y de ElectroStudio. */
export const CARPETAS_DE_ARCHIVOS = ['private-uploads', path.join('public', 'uploads')];

/** Empaqueta (tar.gz) las carpetas que existan. Devuelve false si no hay ninguna. */
export async function empaquetarArchivos(destino: string, raiz = process.cwd()): Promise<boolean> {
  // turbopackIgnore: la ruta es dinámica a propósito (las carpetas de archivos subidos); sin esto el build rastrea todo el proyecto
  const carpetas = CARPETAS_DE_ARCHIVOS.filter((carpeta) => existsSync(path.join(/* turbopackIgnore: true */ raiz, carpeta)));
  if (carpetas.length === 0) return false;
  const r = await correr('tar', ['-czf', destino, '-C', raiz, ...carpetas]);
  // tar sale con 1 si un archivo cambió mientras se leía (alguien subió una foto): el resto quedó bien
  if (r.codigo !== 0 && r.codigo !== 1) throw new Error(`tar falló (${r.codigo}): ${resumir(r.stderr) || 'sin mensaje'}`);
  return true;
}

/** El tar.gz se puede leer de punta a punta. */
export async function revisarEmpaque(archivo: string): Promise<number> {
  const r = await correr('tar', ['-tzf', archivo], {}, 4_000_000);
  if (r.codigo !== 0) throw new Error(`El paquete de archivos no se puede leer (tar ${r.codigo}): ${resumir(r.stderr) || 'sin mensaje'}`);
  return r.stdout.split('\n').filter((linea) => linea && !linea.endsWith('/')).length;
}
