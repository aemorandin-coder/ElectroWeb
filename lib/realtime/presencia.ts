// C-169: quién tiene abierto un recurso para editarlo. Solo servidor.
//
// Como el bus (`bus.ts`), vive en memoria porque la tienda corre en UN proceso de PM2: no hace falta Redis. Si algún día hay
// varias instancias, este archivo cambia junto con el bus. Cada pestaña abierta avisa que sigue ahí cada 20 s; sin avisos
// durante 60 s se la da por cerrada (un navegador que se apagó no avisa).

import { publicar } from './bus';
import type { PersonaEnLinea } from './eventos';

const CADUCA_MS = 60_000;
const BARRER_CADA_MS = 15_000;
const MAXIMO_RECURSOS = 2_000;

interface Pestana { userId: string; nombre: string; desde: number; latido: number; detalle?: string }

const global = globalThis as unknown as { __electroshopPresencia?: Map<string, Map<string, Pestana>>; __electroshopPresenciaBarrido?: ReturnType<typeof setInterval> };
const recursos = global.__electroshopPresencia ?? (global.__electroshopPresencia = new Map());

function personas(recurso: string): PersonaEnLinea[] {
  const porUsuario = new Map<string, PersonaEnLinea>();
  for (const p of recursos.get(recurso)?.values() ?? []) {
    const previa = porUsuario.get(p.userId);
    // Dos pestañas de la misma persona cuentan como una; vale la que lo abrió primero (y el detalle de la que avisó más reciente)
    if (!previa || new Date(previa.desde).getTime() > p.desde) {
      porUsuario.set(p.userId, { id: p.userId, nombre: p.nombre, desde: new Date(p.desde).toISOString(), ...(p.detalle ? { donde: p.detalle } : {}) });
    } else if (p.detalle && !previa.donde) {
      previa.donde = p.detalle;
    }
  }
  return [...porUsuario.values()].sort((a, b) => a.desde.localeCompare(b.desde));
}

function avisar(recurso: string): void {
  publicar({ tipo: 'admin:presencia', recurso, editores: personas(recurso) });
}

function barrer(): void {
  const ahora = Date.now();
  for (const [recurso, pestanas] of recursos) {
    let cambio = false;
    for (const [id, p] of pestanas) {
      if (ahora - p.latido > CADUCA_MS) {
        pestanas.delete(id);
        cambio = true;
      }
    }
    if (pestanas.size === 0) recursos.delete(recurso);
    if (cambio) avisar(recurso);
  }
}

function asegurarBarrido(): void {
  if (global.__electroshopPresenciaBarrido) return;
  const intervalo = setInterval(barrer, BARRER_CADA_MS);
  intervalo.unref?.();
  global.__electroshopPresenciaBarrido = intervalo;
}

/** Quién tiene el recurso abierto, sin contar a `excepto` (la persona que pregunta) */
export function editoresDe(recurso: string, excepto?: string): PersonaEnLinea[] {
  return personas(recurso).filter((p) => p.id !== excepto);
}

/** La pestaña `pestana` de `usuario` abrió el recurso (o sigue ahí). Devuelve quiénes más lo tienen abierto. */
export function marcarPresente(recurso: string, pestana: string, usuario: { id: string; nombre: string }, detalle?: string): PersonaEnLinea[] {
  asegurarBarrido();
  let pestanas = recursos.get(recurso);
  if (!pestanas) {
    // Tope contra quien invente recursos sin fin
    if (recursos.size >= MAXIMO_RECURSOS) return [];
    pestanas = new Map();
    recursos.set(recurso, pestanas);
  }
  const ahora = Date.now();
  const previa = pestanas.get(pestana);
  const nueva = !previa || previa.userId !== usuario.id;
  pestanas.set(pestana, { userId: usuario.id, nombre: usuario.nombre, desde: previa && !nueva ? previa.desde : ahora, latido: ahora, ...(detalle ? { detalle } : {}) });
  // Se avisa cuando se abre una pestaña o cambia lo que está haciendo: los latidos iguales no cambian a nadie
  if (nueva || previa?.detalle !== detalle) avisar(recurso);
  return editoresDe(recurso, usuario.id);
}

/** La pestaña se cerró */
export function marcarAusente(recurso: string, pestana: string): void {
  const pestanas = recursos.get(recurso);
  if (!pestanas?.delete(pestana)) return;
  if (pestanas.size === 0) recursos.delete(recurso);
  avisar(recurso);
}

/** Todos los recursos de un tipo (`product`) que alguien tiene abierto ahora, para pintar "Luis está editando" en una lista */
export function presentesDeTipo(tipo: string, excepto?: string): Record<string, PersonaEnLinea[]> {
  const salida: Record<string, PersonaEnLinea[]> = {};
  for (const recurso of recursos.keys()) {
    if (!recurso.startsWith(`${tipo}:`)) continue;
    const editores = editoresDe(recurso, excepto);
    if (editores.length > 0) salida[recurso] = editores;
  }
  return salida;
}

/** Todo lo que hay abierto ahora, sin contar a `excepto`. Quien lo pide filtra por permisos (cada recurso pide el suyo). */
export function todosLosPresentes(excepto?: string): Record<string, PersonaEnLinea[]> {
  const salida: Record<string, PersonaEnLinea[]> = {};
  for (const recurso of recursos.keys()) {
    const editores = editoresDe(recurso, excepto);
    if (editores.length > 0) salida[recurso] = editores;
  }
  return salida;
}
