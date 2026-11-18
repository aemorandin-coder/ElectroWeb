// C-292 · Los proveedores de IA que puede usar la tienda (el equipo, 18/11: "mañana la puedo cambiar por otra IA, Gemini o
// Grok"). Módulo puro: lo usan el servidor y la pantalla de Ajustes → IA.
//
// - Anthropic (Claude) trae su lista de modelos con precio (lib/ia/precios.ts), su esfuerzo y su búsqueda web.
// - Google (Gemini), xAI (Grok) y Groq hablan el formato de OpenAI (lib/ia/proveedores/compatible.ts). Sus modelos cambian
//   seguido y las páginas que los comparan no coinciden: la lista la trae el propio proveedor al conectar la clave, y el
//   precio lo escribe el equipo de la página oficial (sin precio, el consumo cuenta solo los tokens).
// - Las instrucciones y las reglas son de la tienda (lib/ia/reglas.ts, revisar.ts): valen igual para cualquier motor.

import { MODELOS_IA, type InfoModelo } from '../precios';

export type IdProveedor = 'anthropic' | 'google' | 'xai' | 'groq';
export const IDS_PROVEEDOR: readonly IdProveedor[] = ['anthropic', 'google', 'xai', 'groq'];
export const esProveedor = (valor: unknown): valor is IdProveedor => IDS_PROVEEDOR.includes(valor as IdProveedor);

export interface InfoProveedor {
  id: IdProveedor;
  /** La empresa: "Anthropic" */
  empresa: string;
  /** El nombre del motor: "Claude" */
  motor: string;
  /** Para qué conviene, en una línea */
  para: string;
  /** Dónde se saca la clave */
  consola: string;
  /** La página oficial de precios */
  precios: string;
  /** Cómo empieza la clave, para el ejemplo del campo */
  ejemploClave: string;
  /** La forma de la clave: se rechaza antes de probarla si no la tiene */
  formaClave: RegExp;
  /** Busca en la web por su cuenta (Buscar en la web, cuando la tienda no encuentra páginas) */
  buscaEnLaWeb: boolean;
  /** Tiene niveles de esfuerzo */
  tieneEsfuerzo: boolean;
  /** Los modelos con su precio, si la tienda los conoce; null: los trae el proveedor al conectar la clave */
  modelos: readonly InfoModelo[] | null;
  /** La dirección de su API compatible con OpenAI (null en Anthropic) */
  base: string | null;
  /** Hay una variable del servidor con su clave (.env) */
  variableDeClave: string | null;
}

export const PROVEEDORES: readonly InfoProveedor[] = [
  {
    id: 'anthropic',
    empresa: 'Anthropic',
    motor: 'Claude',
    para: 'El de hoy. Busca en la web por su cuenta y sigue bien las reglas.',
    consola: 'https://console.anthropic.com/settings/keys',
    precios: 'https://www.anthropic.com/pricing#api',
    ejemploClave: 'sk-ant-…',
    formaClave: /^sk-ant-[A-Za-z0-9_-]{20,}$/,
    buscaEnLaWeb: true,
    tieneEsfuerzo: true,
    modelos: MODELOS_IA,
    base: null,
    variableDeClave: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'google',
    empresa: 'Google',
    motor: 'Gemini',
    para: 'La IA de Google. La clave sale de Google AI Studio.',
    consola: 'https://aistudio.google.com/apikey',
    precios: 'https://ai.google.dev/gemini-api/docs/pricing',
    ejemploClave: 'AIza…',
    formaClave: /^[A-Za-z0-9_.-]{20,200}$/,
    buscaEnLaWeb: false,
    tieneEsfuerzo: false,
    modelos: null,
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    variableDeClave: null,
  },
  {
    id: 'xai',
    empresa: 'xAI',
    motor: 'Grok',
    para: 'La IA de xAI. La clave sale de su consola.',
    consola: 'https://console.x.ai',
    precios: 'https://docs.x.ai/docs/models',
    ejemploClave: 'xai-…',
    formaClave: /^[A-Za-z0-9_.-]{20,200}$/,
    buscaEnLaWeb: false,
    tieneEsfuerzo: false,
    modelos: null,
    base: 'https://api.x.ai/v1',
    variableDeClave: null,
  },
  {
    id: 'groq',
    empresa: 'Groq',
    motor: 'Groq',
    para: 'Modelos abiertos muy rápidos. Hoy es el respaldo de Buscar en la web.',
    consola: 'https://console.groq.com/keys',
    precios: 'https://groq.com/pricing',
    ejemploClave: 'gsk_…',
    formaClave: /^[A-Za-z0-9_.-]{20,200}$/,
    buscaEnLaWeb: false,
    tieneEsfuerzo: false,
    modelos: null,
    base: 'https://api.groq.com/openai/v1',
    variableDeClave: 'GROQ_API_KEY',
  },
];

export function infoProveedor(id: IdProveedor): InfoProveedor {
  return PROVEEDORES.find((p) => p.id === id) ?? PROVEEDORES[0];
}

/** "Claude Haiku 5.5", "Gemini · gemini-x-flash": el nombre del motor para el resultado ("Lo redactó …") */
export function nombreDelMotor(proveedor: IdProveedor, modelo: string): string {
  const info = infoProveedor(proveedor);
  const conocido = info.modelos?.find((m) => m.id === modelo);
  return conocido ? conocido.nombre : `${info.motor} · ${modelo}`;
}

/** C-292: por qué no sirvió un resultado (el botón "No sirvió" de cada resultado de la IA) */
export const MOTIVOS_NO_SIRVIO = [
  { id: 'datos', texto: 'Datos equivocados' },
  { id: 'invento', texto: 'Inventó algo' },
  { id: 'escrito', texto: 'Mal escrito' },
  { id: 'largo', texto: 'Muy largo o muy corto' },
  { id: 'otro', texto: 'Otra cosa' },
] as const;
export type MotivoNoSirvio = (typeof MOTIVOS_NO_SIRVIO)[number]['id'];
