// Respaldos automáticos a Google Drive (C-165). Solo servidor.
//
// Un respaldo es: volcar la base (pg_dump) → comprobar que el volcado se puede leer → cifrarlo con la clave pública del
// dueño → subirlo a Drive → comprobar que Drive lo guardó completo (tamaño y MD5). Los domingos y al respaldar a mano
// también se empaquetan las fotos subidas y las constancias firmadas. Solo cuenta como hecho lo que pasó las cinco cosas.
// PM2 corre una sola instancia (OPERACION.md): `enCurso` basta para que no se pisen dos respaldos.
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import type { BackupRun, BackupSettings } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { emitAdminEvent } from '@/lib/admin-events';
import { hoyCaracas } from '@/lib/pago-movil/monto';
import { cifrarArchivo } from './formato';
import { empaquetarArchivos, revisarEmpaque, revisarVolcado, volcarBase } from './volcado';
import {
  borrarArchivo, carpetaExiste, crearCarpeta, datosDeArchivo, DriveError, subirArchivo, tokenDeAcceso, type CredencialesDrive,
} from './drive';
import { leerSecreto } from './secreto';
import { formatearBytes } from './texto';

export type TipoRespaldo = 'DB' | 'FILES';
export type Disparo = 'CRON' | 'MANUAL';

const MAX_FALLAS_POR_DIA = 3;
/** Aunque pasen los días de retención, nunca se borran los últimos respaldos buenos de cada tipo. */
const MINIMO_A_CONSERVAR = 3;
export const NOMBRE_CARPETA_DRIVE = 'Respaldos ElectroShop';
const DIA_MS = 24 * 60 * 60_000;

let enCurso = false;

export function hayRespaldoEnCurso(): boolean {
  return enCurso;
}

export async function leerAjustes(): Promise<BackupSettings> {
  return prisma.backupSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
}

export function credencialesDe(a: BackupSettings): CredencialesDrive | null {
  const clientSecret = leerSecreto(a.driveClientSecret);
  const refreshToken = leerSecreto(a.driveRefreshToken);
  if (!a.driveClientId || !clientSecret || !refreshToken) return null;
  return { clientId: a.driveClientId, clientSecret, refreshToken };
}

/** Lo que falta para poder respaldar, o null si está todo. */
export function problemaDeConfiguracion(a: BackupSettings): string | null {
  if (!a.publicKeyPem) return 'Falta crear la clave del respaldo.';
  if (!a.driveRefreshToken || !a.driveFolderId) return 'Falta conectar Google Drive.';
  if (!credencialesDe(a)) return 'Drive está conectado pero su permiso ya no se puede leer: vuelve a conectarlo.';
  return null;
}

function partesCaracas(ahora: Date): Record<string, string> {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(ahora);
  return Object.fromEntries(partes.map((p) => [p.type, p.value]));
}

/** Hora (0 a 23) en Venezuela. */
export function horaCaracas(ahora: Date = new Date()): number {
  return Number(partesCaracas(ahora).hour) % 24;
}

export function esDomingoCaracas(ahora: Date = new Date()): boolean {
  return partesCaracas(ahora).weekday === 'Sun';
}

function marcaDeNombre(ahora: Date): string {
  const p = partesCaracas(ahora);
  return `${p.year}-${p.month}-${p.day}-${String(Number(p.hour) % 24).padStart(2, '0')}${p.minute}`;
}

/** ¿Toca el respaldo del día? Lo consulta el cron cada hora; la hora y el encendido se cambian desde el panel. */
export async function decidirRespaldoDelDia(ahora: Date = new Date()): Promise<{ correr: boolean; motivo: string }> {
  const a = await leerAjustes();
  if (!a.enabled) return { correr: false, motivo: 'apagado' };
  if (enCurso) return { correr: false, motivo: 'en_curso' };
  if (horaCaracas(ahora) < a.hour) return { correr: false, motivo: 'todavia_no' };
  const hoy = hoyCaracas(ahora);
  const recientes = await prisma.backupRun.findMany({
    where: { kind: 'DB', startedAt: { gte: new Date(ahora.getTime() - 2 * DIA_MS) } },
    select: { status: true, startedAt: true },
  });
  const deHoy = recientes.filter((r) => hoyCaracas(r.startedAt) === hoy);
  if (deHoy.some((r) => r.status === 'OK')) return { correr: false, motivo: 'ya_hecho' };
  if (deHoy.filter((r) => r.status === 'FAILED').length >= MAX_FALLAS_POR_DIA) return { correr: false, motivo: 'demasiadas_fallas' };
  return { correr: true, motivo: 'toca' };
}

export interface DriveListo {
  token: string;
  carpetaId: string;
}

/** Token de acceso y carpeta: si la carpeta se borró en Drive, se crea otra. Anota en los ajustes si el permiso ya no sirve. */
export async function prepararDrive(a: BackupSettings): Promise<DriveListo> {
  const cred = credencialesDe(a);
  if (!cred) throw new DriveError('Drive no está conectado.', true);
  let token: string;
  try {
    token = await tokenDeAcceso(cred);
  } catch (error) {
    if (error instanceof DriveError && error.reautorizar) {
      await prisma.backupSettings.update({ where: { id: 'default' }, data: { driveError: error.message } });
    }
    throw error;
  }
  let carpetaId = a.driveFolderId;
  if (!carpetaId || !(await carpetaExiste(token, carpetaId))) {
    carpetaId = await crearCarpeta(token, NOMBRE_CARPETA_DRIVE);
    await prisma.backupSettings.update({ where: { id: 'default' }, data: { driveFolderId: carpetaId, driveError: null } });
  } else if (a.driveError) {
    await prisma.backupSettings.update({ where: { id: 'default' }, data: { driveError: null } });
  }
  return { token, carpetaId };
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : 'Error desconocido.';
}

/** Un respaldo de un tipo, de punta a punta. Nunca lanza: deja la fila en OK o FAILED. null si no había nada que respaldar. */
async function respaldarTipo(a: BackupSettings, drive: DriveListo, tipo: TipoRespaldo, disparo: Disparo): Promise<BackupRun | null> {
  const run = await prisma.backupRun.create({ data: { kind: tipo, trigger: disparo } });
  let carpetaTemporal: string | null = null;
  try {
    carpetaTemporal = await mkdtemp(path.join(process.env.RESPALDOS_DIR_TEMPORAL || os.tmpdir(), 'esbk-'));
    const crudo = path.join(carpetaTemporal, tipo === 'DB' ? 'base.dump' : 'archivos.tar.gz');
    const cifrado = path.join(carpetaTemporal, 'salida.enc');
    let items: number;
    if (tipo === 'DB') {
      await volcarBase(process.env.DATABASE_URL, crudo);
      items = await revisarVolcado(crudo);
    } else {
      if (!(await empaquetarArchivos(crudo))) {
        await prisma.backupRun.delete({ where: { id: run.id } });
        return null;
      }
      items = await revisarEmpaque(crudo);
    }
    const { sizeBytes, md5 } = await cifrarArchivo(crudo, cifrado, a.publicKeyPem as string);
    await rm(crudo, { force: true });

    const nombre = `electroshop-${tipo === 'DB' ? 'base' : 'archivos'}-${marcaDeNombre(new Date())}${tipo === 'DB' ? '.dump' : '.tar.gz'}.enc`;
    const subido = await subirArchivo(drive.token, { ruta: cifrado, nombre, carpetaId: drive.carpetaId, tamano: sizeBytes });
    // Drive calcula su propio MD5 de lo que guardó: si coincide con el nuestro, el archivo llegó entero
    let md5Drive = subido.md5Checksum;
    if (!md5Drive) md5Drive = (await datosDeArchivo(drive.token, subido.id))?.md5Checksum ?? null;
    if (subido.size !== sizeBytes || md5Drive !== md5) {
      await borrarArchivo(drive.token, subido.id).catch(() => undefined);
      throw new Error(`Drive guardó el archivo pero no coincide con el original (tamaño ${subido.size} de ${sizeBytes}, huella ${md5Drive ? 'distinta' : 'ausente'}). Se borró esa copia.`);
    }
    return await prisma.backupRun.update({
      where: { id: run.id },
      data: { status: 'OK', finishedAt: new Date(), fileName: nombre, sizeBytes: BigInt(sizeBytes), md5, driveFileId: subido.id, items, verifiedAt: new Date(), verifiedOk: true },
    });
  } catch (error) {
    return await prisma.backupRun.update({ where: { id: run.id }, data: { status: 'FAILED', finishedAt: new Date(), error: mensajeDe(error) } });
  } finally {
    if (carpetaTemporal) await rm(carpetaTemporal, { recursive: true, force: true });
  }
}

/** Borra de Drive los respaldos viejos (nunca los últimos 3 de cada tipo) y poda el historial. */
export async function aplicarRetencion(a: BackupSettings, token: string): Promise<number> {
  const limite = Date.now() - a.retentionDays * DIA_MS;
  let borrados = 0;
  for (const tipo of ['DB', 'FILES'] as const) {
    const buenos = await prisma.backupRun.findMany({
      where: { kind: tipo, status: 'OK', deletedAt: null, driveFileId: { not: null } },
      orderBy: { startedAt: 'desc' },
    });
    for (const viejo of buenos.slice(MINIMO_A_CONSERVAR).filter((r) => r.startedAt.getTime() < limite)) {
      try {
        await borrarArchivo(token, viejo.driveFileId as string);
        await prisma.backupRun.update({ where: { id: viejo.id }, data: { deletedAt: new Date() } });
        borrados++;
      } catch (error) {
        console.error('[RESPALDOS] No se pudo borrar un respaldo viejo:', mensajeDe(error));
      }
    }
  }
  await prisma.backupRun
    .deleteMany({ where: { startedAt: { lt: new Date(Date.now() - 180 * DIA_MS) }, OR: [{ deletedAt: { not: null } }, { status: 'FAILED' }] } })
    .catch(() => undefined);
  return borrados;
}

export interface ResultadoRespaldo {
  estado: 'ok' | 'fallo' | 'ocupado' | 'sin_configurar';
  mensaje?: string;
  corridas: BackupRun[];
}

/** Hace el respaldo ahora. Se llama desde el cron (después de decidir) o desde el botón "Respaldar ahora". */
export async function ejecutarRespaldo(disparo: Disparo): Promise<ResultadoRespaldo> {
  if (enCurso) return { estado: 'ocupado', mensaje: 'Ya hay un respaldo en marcha.', corridas: [] };
  enCurso = true;
  try {
    // Con una sola instancia, una fila en RUNNING que este proceso no está ejecutando quedó a medias (reinicio, deploy)
    await prisma.backupRun.updateMany({
      where: { status: 'RUNNING' },
      data: { status: 'FAILED', finishedAt: new Date(), error: 'Se interrumpió: el servidor se reinició a mitad del respaldo.' },
    });
    const a = await leerAjustes();
    const problema = problemaDeConfiguracion(a);
    if (problema) {
      if (disparo === 'CRON') await registrarFalla('DB', disparo, problema);
      return { estado: 'sin_configurar', mensaje: problema, corridas: [] };
    }

    let drive: DriveListo;
    try {
      drive = await prepararDrive(a);
    } catch (error) {
      const mensaje = mensajeDe(error);
      await registrarFalla('DB', disparo, mensaje);
      return { estado: 'fallo', mensaje, corridas: [] };
    }

    const tipos: TipoRespaldo[] = ['DB'];
    if (a.includeFiles && (disparo === 'MANUAL' || esDomingoCaracas())) tipos.push('FILES');

    const corridas: BackupRun[] = [];
    for (const tipo of tipos) {
      const corrida = await respaldarTipo(a, drive, tipo, disparo);
      if (corrida) corridas.push(corrida);
    }
    const fallas = corridas.filter((c) => c.status === 'FAILED');
    for (const c of fallas) avisarFalla(c.kind as TipoRespaldo, c.error ?? 'Error desconocido.');

    const buenas = corridas.filter((c) => c.status === 'OK');
    if (buenas.length > 0) {
      await aplicarRetencion(a, drive.token).catch((error) => console.error('[RESPALDOS] Retención:', mensajeDe(error)));
      if (fallas.length === 0) {
        emitAdminEvent({
          type: 'BACKUP_OK',
          title: 'Respaldo hecho',
          summary: 'El respaldo quedó guardado y comprobado en Google Drive.',
          fields: buenas.map((c) => [c.kind === 'DB' ? 'Base de datos' : 'Fotos y constancias', formatearBytes(c.sizeBytes)]),
          link: '/admin/settings#respaldos',
        });
      }
    }
    return { estado: fallas.length > 0 ? 'fallo' : 'ok', mensaje: fallas[0]?.error ?? undefined, corridas };
  } catch (error) {
    // Un error de la propia base o del servidor: queda en el registro del servidor y se avisa
    console.error('[RESPALDOS] Error inesperado:', error);
    const mensaje = mensajeDe(error);
    avisarFalla('DB', mensaje);
    return { estado: 'fallo', mensaje, corridas: [] };
  } finally {
    enCurso = false;
  }
}

async function registrarFalla(tipo: TipoRespaldo, disparo: Disparo, error: string): Promise<void> {
  await prisma.backupRun.create({ data: { kind: tipo, trigger: disparo, status: 'FAILED', finishedAt: new Date(), error } }).catch(() => undefined);
  avisarFalla(tipo, error);
}

function avisarFalla(tipo: TipoRespaldo, error: string): void {
  emitAdminEvent({
    type: 'BACKUP_FAILED',
    title: 'El respaldo falló',
    summary: 'No se pudo guardar el respaldo en Drive. Mientras no se arregle, no hay copia nueva de la tienda.',
    fields: [['Qué', tipo === 'DB' ? 'Base de datos' : 'Fotos y constancias'], ['Motivo', error]],
    link: '/admin/settings#respaldos',
    throttleKey: `backup-failed:${tipo}`,
    throttleMs: 30 * 60_000,
  });
}

export interface ResultadoVerificacion {
  tipo: TipoRespaldo;
  fileName: string | null;
  ok: boolean;
  detalle: string;
}

/** Comprueba en Drive el último respaldo bueno de cada tipo: que siga ahí y que su MD5 y su tamaño sean los de cuando se subió. */
export async function verificarUltimos(): Promise<ResultadoVerificacion[]> {
  const a = await leerAjustes();
  const drive = await prepararDrive(a);
  const salida: ResultadoVerificacion[] = [];
  for (const tipo of ['DB', 'FILES'] as const) {
    const ultimo = await prisma.backupRun.findFirst({
      where: { kind: tipo, status: 'OK', deletedAt: null, driveFileId: { not: null } },
      orderBy: { startedAt: 'desc' },
    });
    if (!ultimo) continue;
    const enDrive = await datosDeArchivo(drive.token, ultimo.driveFileId as string);
    let ok = false;
    let detalle: string;
    if (!enDrive) detalle = 'El archivo ya no está en Drive (se borró o está en la papelera).';
    else if (enDrive.md5Checksum !== ultimo.md5 || BigInt(enDrive.size) !== ultimo.sizeBytes) detalle = 'El archivo en Drive no coincide con el que se subió: está dañado o lo cambiaron.';
    else { ok = true; detalle = 'Está en Drive y su huella coincide con la de cuando se subió.'; }
    await prisma.backupRun.update({ where: { id: ultimo.id }, data: { verifiedAt: new Date(), verifiedOk: ok } });
    salida.push({ tipo, fileName: ultimo.fileName, ok, detalle });
  }
  return salida;
}
