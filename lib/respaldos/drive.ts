// Google Drive para los respaldos (C-165). Solo servidor. Sin librerías: la API REST con fetch.
// El permiso que se pide es `drive.file`: la tienda solo ve y toca los archivos que ella misma creó en Drive, nunca el
// resto de la cuenta. Los tokens no se escriben en ningún mensaje de error.
import { open } from 'fs/promises';

const AUTORIZAR = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/drive/v3';
const SUBIDA = 'https://www.googleapis.com/upload/drive/v3/files';
export const PERMISO_DRIVE = 'https://www.googleapis.com/auth/drive.file';

/** Trozo de subida: múltiplo de 256 KiB, como pide Drive. */
const TROZO = 8 * 1024 * 1024;
const REINTENTOS = 3;

export class DriveError extends Error {
  /** true si hay que volver a conectar Drive (permiso revocado o vencido, o cliente borrado) */
  reautorizar: boolean;
  constructor(mensaje: string, reautorizar = false) {
    super(mensaje);
    this.name = 'DriveError';
    this.reautorizar = reautorizar;
  }
}

export interface CredencialesDrive {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface ArchivoDrive {
  id: string;
  name: string;
  size: number;
  md5Checksum: string | null;
  createdTime: string | null;
}

interface ErrorGoogle {
  error?: string | { message?: string; errors?: { reason?: string }[] };
  error_description?: string;
}

/** Traduce la respuesta de error de Google a una frase que el dueño pueda entender. */
async function errorDeGoogle(respuesta: Response, accion: string): Promise<DriveError> {
  let cuerpo: ErrorGoogle = {};
  try { cuerpo = (await respuesta.json()) as ErrorGoogle; } catch { /* sin cuerpo */ }
  const razon = typeof cuerpo.error === 'object' ? cuerpo.error?.errors?.[0]?.reason : cuerpo.error;
  const mensaje = typeof cuerpo.error === 'object' ? cuerpo.error?.message : cuerpo.error_description;
  if (razon === 'invalid_grant') return new DriveError('Google ya no acepta el permiso de Drive (se revocó o venció). Vuelve a conectar Drive.', true);
  if (razon === 'invalid_client' || razon === 'unauthorized_client') return new DriveError('El ID o el secreto del cliente de Google no son correctos.', true);
  if (razon === 'storageQuotaExceeded') return new DriveError('Tu Drive se quedó sin espacio.');
  if (razon === 'accessNotConfigured' || razon === 'SERVICE_DISABLED') return new DriveError('La API de Google Drive no está activada en el proyecto de Google Cloud.');
  if (respuesta.status === 401) return new DriveError('Google rechazó el permiso de Drive. Vuelve a conectar Drive.', true);
  return new DriveError(`Drive no pudo ${accion} (${respuesta.status}${razon ? `: ${razon}` : ''}${mensaje ? ` · ${mensaje.slice(0, 160)}` : ''}).`);
}

async function pedir(url: string, init: RequestInit, accion: string, ms = 30_000): Promise<Response> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
  } catch (error) {
    const causa = error instanceof Error ? error.name : 'error';
    throw new DriveError(`No se pudo hablar con Google para ${accion} (${causa}).`);
  }
  if (!respuesta.ok && respuesta.status !== 308) throw await errorDeGoogle(respuesta, accion);
  return respuesta;
}

export function urlDeAutorizacion(p: { clientId: string; redirectUri: string; state: string }): string {
  const q = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: 'code',
    scope: PERMISO_DRIVE,
    access_type: 'offline',
    // Sin esto Google no devuelve el refresh_token si la cuenta ya había dado permiso antes
    prompt: 'consent',
    state: p.state,
  });
  return `${AUTORIZAR}?${q.toString()}`;
}

function cuerpoToken(datos: Record<string, string>): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(datos).toString() };
}

/** Cambia el código que devolvió Google por el permiso duradero (refresh token). */
export async function canjearCodigo(p: { clientId: string; clientSecret: string; redirectUri: string; code: string }): Promise<{ refreshToken: string; accessToken: string }> {
  const r = await pedir(TOKEN, cuerpoToken({ client_id: p.clientId, client_secret: p.clientSecret, redirect_uri: p.redirectUri, code: p.code, grant_type: 'authorization_code' }), 'conectar');
  const d = (await r.json()) as { refresh_token?: string; access_token?: string; scope?: string };
  if (!d.refresh_token || !d.access_token) throw new DriveError('Google no entregó el permiso permanente. Quita el acceso de ElectroShop en tu cuenta de Google y vuelve a conectar.', true);
  if (d.scope && !d.scope.split(' ').includes(PERMISO_DRIVE)) throw new DriveError('Falta marcar el permiso de Drive en la pantalla de Google. Vuelve a conectar y déjalo marcado.', true);
  return { refreshToken: d.refresh_token, accessToken: d.access_token };
}

/** Un token de acceso nuevo (dura una hora) a partir del permiso duradero. */
export async function tokenDeAcceso(c: CredencialesDrive): Promise<string> {
  const r = await pedir(TOKEN, cuerpoToken({ client_id: c.clientId, client_secret: c.clientSecret, refresh_token: c.refreshToken, grant_type: 'refresh_token' }), 'renovar el permiso');
  const d = (await r.json()) as { access_token?: string };
  if (!d.access_token) throw new DriveError('Google no entregó un permiso de acceso.', true);
  return d.access_token;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function datosDeCuenta(token: string): Promise<{ email: string | null; usadoBytes: number | null; limiteBytes: number | null }> {
  const r = await pedir(`${API}/about?fields=user(emailAddress),storageQuota(limit,usage)`, { headers: auth(token) }, 'leer la cuenta');
  const d = (await r.json()) as { user?: { emailAddress?: string }; storageQuota?: { limit?: string; usage?: string } };
  const num = (v?: string) => (v && Number.isFinite(Number(v)) ? Number(v) : null);
  return { email: d.user?.emailAddress ?? null, usadoBytes: num(d.storageQuota?.usage), limiteBytes: num(d.storageQuota?.limit) };
}

export async function crearCarpeta(token: string, nombre: string): Promise<string> {
  const r = await pedir(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nombre, mimeType: 'application/vnd.google-apps.folder' }),
  }, 'crear la carpeta');
  const d = (await r.json()) as { id?: string };
  if (!d.id) throw new DriveError('Drive no devolvió la carpeta creada.');
  return d.id;
}

/** La carpeta sigue existiendo y no está en la papelera. */
export async function carpetaExiste(token: string, id: string): Promise<boolean> {
  const respuesta = await fetch(`${API}/files/${encodeURIComponent(id)}?fields=id,trashed`, { headers: auth(token), signal: AbortSignal.timeout(30_000) }).catch(() => null);
  if (!respuesta) throw new DriveError('No se pudo hablar con Google para revisar la carpeta.');
  if (respuesta.status === 404) return false;
  if (!respuesta.ok) throw await errorDeGoogle(respuesta, 'revisar la carpeta');
  const d = (await respuesta.json()) as { trashed?: boolean };
  return d.trashed !== true;
}

const dormir = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Sube un archivo en trozos (subida reanudable): un corte de red no obliga a empezar de cero. */
export async function subirArchivo(token: string, p: { ruta: string; nombre: string; carpetaId: string; tamano: number }): Promise<ArchivoDrive> {
  const inicio = await pedir(`${SUBIDA}?uploadType=resumable&fields=id,name,size,md5Checksum,createdTime`, {
    method: 'POST',
    headers: { ...auth(token), 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'application/octet-stream', 'X-Upload-Content-Length': String(p.tamano) },
    body: JSON.stringify({ name: p.nombre, parents: [p.carpetaId] }),
  }, 'empezar la subida');
  const sesion = inicio.headers.get('location');
  if (!sesion) throw new DriveError('Drive no abrió la sesión de subida.');

  const archivo = await open(p.ruta, 'r');
  try {
    let desde = 0;
    while (desde < p.tamano) {
      const hasta = Math.min(desde + TROZO, p.tamano);
      const trozo = Buffer.alloc(hasta - desde);
      await archivo.read(trozo, 0, trozo.length, desde);

      let respuesta: Response | null = null;
      for (let intento = 1; intento <= REINTENTOS && !respuesta; intento++) {
        try {
          const r = await fetch(sesion, {
            method: 'PUT',
            headers: { 'Content-Range': `bytes ${desde}-${hasta - 1}/${p.tamano}` },
            body: trozo,
            signal: AbortSignal.timeout(120_000),
          });
          if (r.ok || r.status === 308) respuesta = r;
          else if (r.status >= 500 || r.status === 429) await dormir(1000 * intento);
          else throw await errorDeGoogle(r, 'subir el archivo');
        } catch (error) {
          if (error instanceof DriveError) throw error;
          if (intento === REINTENTOS) throw new DriveError('Se cortó la conexión con Google al subir el archivo.');
          await dormir(1000 * intento);
        }
      }
      if (!respuesta) throw new DriveError('Drive no aceptó el archivo después de varios intentos.');

      if (respuesta.status === 308) {
        // Drive dice hasta dónde recibió: puede ser menos que lo enviado
        const recibido = /bytes=0-(\d+)/.exec(respuesta.headers.get('range') ?? '')?.[1];
        desde = recibido === undefined ? 0 : Number(recibido) + 1;
        continue;
      }
      const d = (await respuesta.json()) as { id?: string; name?: string; size?: string; md5Checksum?: string; createdTime?: string };
      if (!d.id) throw new DriveError('Drive no confirmó el archivo subido.');
      return { id: d.id, name: d.name ?? p.nombre, size: Number(d.size ?? p.tamano), md5Checksum: d.md5Checksum ?? null, createdTime: d.createdTime ?? null };
    }
  } finally {
    await archivo.close();
  }
  throw new DriveError('La subida terminó sin que Drive confirmara el archivo.');
}

/** Los archivos de la carpeta (solo los que creó la tienda: es lo único que el permiso deja ver). */
export async function listarArchivos(token: string, carpetaId: string): Promise<ArchivoDrive[]> {
  const salida: ArchivoDrive[] = [];
  let pagina: string | undefined;
  do {
    const q = new URLSearchParams({
      q: `'${carpetaId.replace(/[^A-Za-z0-9_-]/g, '')}' in parents and trashed = false`,
      fields: 'nextPageToken,files(id,name,size,md5Checksum,createdTime)',
      pageSize: '200',
      orderBy: 'createdTime desc',
    });
    if (pagina) q.set('pageToken', pagina);
    const r = await pedir(`${API}/files?${q.toString()}`, { headers: auth(token) }, 'listar los respaldos');
    const d = (await r.json()) as { nextPageToken?: string; files?: { id: string; name: string; size?: string; md5Checksum?: string; createdTime?: string }[] };
    for (const f of d.files ?? []) salida.push({ id: f.id, name: f.name, size: Number(f.size ?? 0), md5Checksum: f.md5Checksum ?? null, createdTime: f.createdTime ?? null });
    pagina = d.nextPageToken;
  } while (pagina);
  return salida;
}

/** null si el archivo ya no existe (o está en la papelera). */
export async function datosDeArchivo(token: string, id: string): Promise<ArchivoDrive | null> {
  const respuesta = await fetch(`${API}/files/${encodeURIComponent(id)}?fields=id,name,size,md5Checksum,createdTime,trashed`, { headers: auth(token), signal: AbortSignal.timeout(30_000) }).catch(() => null);
  if (!respuesta) throw new DriveError('No se pudo hablar con Google para revisar el archivo.');
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw await errorDeGoogle(respuesta, 'revisar el archivo');
  const d = (await respuesta.json()) as { id: string; name: string; size?: string; md5Checksum?: string; createdTime?: string; trashed?: boolean };
  if (d.trashed) return null;
  return { id: d.id, name: d.name, size: Number(d.size ?? 0), md5Checksum: d.md5Checksum ?? null, createdTime: d.createdTime ?? null };
}

/** Borra el archivo de Drive (definitivo, no va a la papelera). Un archivo que ya no está cuenta como borrado. */
export async function borrarArchivo(token: string, id: string): Promise<void> {
  const respuesta = await fetch(`${API}/files/${encodeURIComponent(id)}`, { method: 'DELETE', headers: auth(token), signal: AbortSignal.timeout(30_000) }).catch(() => null);
  if (!respuesta) throw new DriveError('No se pudo hablar con Google para borrar el archivo.');
  if (respuesta.status === 404 || respuesta.ok) return;
  throw await errorDeGoogle(respuesta, 'borrar el archivo');
}

/** Le avisa a Google que el permiso ya no se usa. Si falla no importa: el dueño también puede quitarlo en su cuenta de Google. */
export async function revocarPermiso(refreshToken: string): Promise<void> {
  await fetch('https://oauth2.googleapis.com/revoke', cuerpoToken({ token: refreshToken }) as RequestInit & { signal?: AbortSignal }).catch(() => undefined);
}
