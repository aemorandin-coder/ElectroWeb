// C-204: las fotos van con el Excel (decisión de Andrés del 12/11). Se sueltan juntos (o se elige la carpeta), la vista
// previa muestra la foto de cada fila y, al crear, cada producto ya queda con las suyas. Las fotos se llaman con el
// código del proveedor: "R023127.jpg", "R023127-2.jpg" (lib/proveedores/lista.ts, codigoDeFoto).

import { codigoDeFoto } from '@/lib/proveedores/lista';
import { uploadProductPhoto } from '@/lib/product-photo-upload';

export const FOTOS_MAX = 8;
/** Más que esto en una carpeta es otra cosa (un respaldo entero): se corta */
export const FOTOS_CARPETA_MAX = 2_000;

export interface FotoSuelta {
  file: File;
  /** La carpeta de donde salió ("1 - Para subir"); '' si se eligió suelta */
  carpeta: string;
}

const HOJA = /\.(xls|xlsx|csv)$/i;
const FOTO = /\.(jpe?g|png|webp)$/i;
const OCULTO = /(^|\/)(\.|thumbs\.db$|desktop\.ini$)/i;

export const esHoja = (f: File) => HOJA.test(f.name);
export const esFoto = (f: File) => FOTO.test(f.name) && !OCULTO.test(f.name);

/** La carpeta inmediata de un archivo por su ruta ("Fotos/1 - Para subir/R023127.jpg" → "1 - Para subir") */
function carpetaDe(ruta: string): string {
  const partes = ruta.split('/').filter(Boolean);
  return partes.length >= 2 ? partes[partes.length - 2] : '';
}

/** De un <input type="file"> (con carpeta o sin ella): las hojas y las fotos, cada una con su carpeta */
export function archivosDelInput(lista: FileList | null): { hojas: File[]; fotos: FotoSuelta[] } {
  const hojas: File[] = [], fotos: FotoSuelta[] = [];
  for (const file of Array.from(lista ?? [])) {
    const ruta = (file as File & { webkitRelativePath?: string }).webkitRelativePath || '';
    if (OCULTO.test(ruta)) continue;
    if (esHoja(file)) hojas.push(file);
    else if (esFoto(file) && fotos.length < FOTOS_CARPETA_MAX) fotos.push({ file, carpeta: carpetaDe(ruta) });
  }
  return { hojas, fotos };
}

/**
 * Lo que se suelta en la pantalla, con las carpetas adentro (recorridas). Las entradas se piden de una vez, dentro del
 * evento: el navegador las invalida apenas termina.
 */
export async function archivosDeLaCaida(dt: DataTransfer): Promise<{ hojas: File[]; fotos: FotoSuelta[] }> {
  const entradas = Array.from(dt.items ?? [])
    .map((i) => (typeof i.webkitGetAsEntry === 'function' ? i.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => e !== null);
  if (entradas.length === 0) return archivosDelInput(dt.files);
  const hojas: File[] = [], fotos: FotoSuelta[] = [];
  const leer = async (e: FileSystemEntry): Promise<void> => {
    if (OCULTO.test(e.fullPath) || fotos.length >= FOTOS_CARPETA_MAX) return;
    if (e.isFile) {
      const file = await new Promise<File>((ok, mal) => (e as FileSystemFileEntry).file(ok, mal));
      if (esHoja(file)) hojas.push(file);
      else if (esFoto(file)) fotos.push({ file, carpeta: carpetaDe(e.fullPath) });
      return;
    }
    if (e.isDirectory) {
      const lector = (e as FileSystemDirectoryEntry).createReader();
      // readEntries entrega de a 100: se pide hasta que llegue vacío
      for (;;) {
        const lote = await new Promise<FileSystemEntry[]>((ok, mal) => lector.readEntries(ok, mal));
        if (lote.length === 0) break;
        for (const x of lote) await leer(x);
      }
    }
  };
  for (const e of entradas) await leer(e);
  return { hojas, fotos };
}

export interface FotosAgrupadas {
  /** Código de la fila → sus fotos, la principal primero */
  porCodigo: Map<string, File[]>;
  /** Fotos que no son de ningún código de la lista */
  sueltas: string[];
  /** El mismo nombre en dos carpetas (una limpia y su original, por ejemplo): no se sube ninguna de las dos */
  repetidas: string[];
}

/** Las fotos de cada código de la lista. Sin distinguir mayúsculas: "r023127.JPG" es de R023127 */
export function agruparFotos(fotos: FotoSuelta[], codigos: Iterable<string>): FotosAgrupadas {
  const porMayuscula = new Map<string, string>();
  for (const c of codigos) porMayuscula.set(c.toUpperCase(), c);
  const veces = new Map<string, number>();
  for (const f of fotos) {
    const k = f.file.name.replace(/\.[a-z0-9]{2,5}$/i, '').trim().toUpperCase();
    veces.set(k, (veces.get(k) ?? 0) + 1);
  }
  const grupos = new Map<string, Array<{ file: File; orden: number }>>();
  const sueltas: string[] = [], repetidas = new Set<string>();
  for (const f of fotos) {
    const n = codigoDeFoto(f.file.name);
    if ((veces.get(n.entero.toUpperCase()) ?? 0) > 1) { repetidas.add(f.file.name); continue; }
    const entero = porMayuscula.get(n.entero.toUpperCase());
    const base = n.base ? porMayuscula.get(n.base.toUpperCase()) : undefined;
    const codigo = entero ?? base;
    if (!codigo) { sueltas.push(f.file.name); continue; }
    grupos.set(codigo, [...(grupos.get(codigo) ?? []), { file: f.file, orden: entero ? 0 : n.orden }]);
  }
  const porCodigo = new Map<string, File[]>();
  for (const [codigo, lista] of grupos) {
    porCodigo.set(codigo, lista.sort((a, b) => a.orden - b.orden || a.file.name.localeCompare(b.file.name)).map((x) => x.file).slice(0, FOTOS_MAX));
  }
  return { porCodigo, sueltas, repetidas: [...repetidas] };
}

/**
 * Sube fotos a un producto: con el fondo blanco y la cinta ES de siempre, agregadas a las que tenga (hasta 8). Devuelve
 * cuántas subió. Guarda con la versión que leyó: si otra persona lo cambió en el medio, falla y no pisa nada.
 */
export async function subirFotosAProducto(productoId: string, fotos: File[], avisar?: (texto: string) => void): Promise<number> {
  const r = await fetch(`/api/products/${productoId}`);
  const actual = await r.json().catch(() => null);
  if (!r.ok || !actual) throw new Error('no se pudo leer el producto');
  const previas: string[] = Array.isArray(actual.images) ? actual.images : (() => { try { return JSON.parse(actual.images || '[]'); } catch { return []; } })();
  const lugar = Math.max(0, FOTOS_MAX - previas.length);
  if (lugar === 0) throw new Error(`ya tiene ${FOTOS_MAX} fotos`);
  const urls: string[] = [];
  for (const f of fotos.slice(0, lugar)) {
    const subida = await uploadProductPhoto(f, { badge: true, onWait: (s) => avisar?.(`el servidor pide esperar ${s} s`) });
    urls.push(subida.url);
  }
  if (urls.length === 0) return 0;
  const p = await fetch(`/api/products/${productoId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: [...previas, ...urls], baseUpdatedAt: actual.updatedAt }),
  });
  if (!p.ok) throw new Error((await p.json().catch(() => ({}))).error || 'no se guardaron');
  return urls.length;
}
