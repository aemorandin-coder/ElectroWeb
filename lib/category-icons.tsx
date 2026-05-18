import {
  FiMonitor, FiCpu, FiHardDrive, FiSmartphone, FiHeadphones,
  FiWifi, FiCamera, FiPrinter, FiBattery, FiSliders,
  FiMic, FiVolume2, FiPackage, FiShield, FiWatch,
  FiServer, FiSettings, FiGrid,
} from 'react-icons/fi';
import { MdGamepad, MdSportsEsports } from 'react-icons/md';
import type { ComponentType, SVGAttributes } from 'react';

type IconComponent = ComponentType<SVGAttributes<SVGElement> & { className?: string }>;

// ─── Preset icon list ───────────────────────────────────────────────────────

export const ICON_OPTIONS: { name: string; label: string; Icon: IconComponent }[] = [
  { name: 'FiMonitor',       label: 'PC / Monitor',   Icon: FiMonitor },
  { name: 'FiSmartphone',    label: 'Smartphones',    Icon: FiSmartphone },
  { name: 'FiCpu',           label: 'Componentes',    Icon: FiCpu },
  { name: 'FiHardDrive',     label: 'Almacenamiento', Icon: FiHardDrive },
  { name: 'FiHeadphones',    label: 'Audio',          Icon: FiHeadphones },
  { name: 'FiWifi',          label: 'Redes',          Icon: FiWifi },
  { name: 'FiCamera',        label: 'Fotografía',     Icon: FiCamera },
  { name: 'FiPrinter',       label: 'Impresoras',     Icon: FiPrinter },
  { name: 'FiBattery',       label: 'Energía',        Icon: FiBattery },
  { name: 'FiSliders',       label: 'Accesorios',     Icon: FiSliders },
  { name: 'FiMic',           label: 'Micrófonos',     Icon: FiMic },
  { name: 'FiVolume2',       label: 'Parlantes',      Icon: FiVolume2 },
  { name: 'FiPackage',       label: 'General',        Icon: FiPackage },
  { name: 'FiShield',        label: 'Seguridad',      Icon: FiShield },
  { name: 'FiWatch',         label: 'Wearables',      Icon: FiWatch },
  { name: 'FiServer',        label: 'Servidores',     Icon: FiServer },
  { name: 'FiSettings',      label: 'Herramientas',   Icon: FiSettings },
  { name: 'FiGrid',          label: 'Otros',          Icon: FiGrid },
  { name: 'MdGamepad',       label: 'Gaming',         Icon: MdGamepad },
  { name: 'MdSportsEsports', label: 'Esports',        Icon: MdSportsEsports },
];

// Synchronous lookup map for preset icons
const ICON_MAP: Record<string, IconComponent> = Object.fromEntries(
  ICON_OPTIONS.map(o => [o.name, o.Icon])
);

/** Synchronous lookup — returns FiGrid if not found in presets. */
export function getCategoryIcon(name: string | null | undefined): IconComponent {
  return (name && ICON_MAP[name]) ? ICON_MAP[name] : FiGrid;
}

export function getAutoIcon(categoryName: string): string {
  const n = categoryName.toLowerCase();
  if (/laptop|notebook|computad|desktop|pc\b|monitor/.test(n)) return 'FiMonitor';
  if (/celular|móvil|movil|teléfono|telefono|smartphone/.test(n)) return 'FiSmartphone';
  if (/componente|procesador|cpu|tarjeta (madre|gráfica|video)/.test(n)) return 'FiCpu';
  if (/disco|almacen|ssd|hdd|memoria/.test(n)) return 'FiHardDrive';
  if (/audio|auricular|headphone|audifonos/.test(n)) return 'FiHeadphones';
  if (/\bred\b|router|wifi|switch\b|cable|internet|modem/.test(n)) return 'FiWifi';
  if (/cámara|camara|foto|video/.test(n)) return 'FiCamera';
  if (/impres|printer|toner|cartucho/.test(n)) return 'FiPrinter';
  if (/batería|bateria|ups|pila|carga|energía|energia/.test(n)) return 'FiBattery';
  if (/gaming|gamer|juego|consola|videojuego/.test(n)) return 'MdGamepad';
  if (/micrófono|microfono/.test(n)) return 'FiMic';
  if (/parlan|speaker|sonido/.test(n)) return 'FiVolume2';
  if (/seguridad|vigilancia/.test(n)) return 'FiShield';
  if (/smartwatch|reloj|wearable/.test(n)) return 'FiWatch';
  if (/servidor|server|nas/.test(n)) return 'FiServer';
  if (/acceso|periféri|teclado|mouse|ratón/.test(n)) return 'FiSliders';
  return 'FiGrid';
}

// ─── Dynamic icon loading (any react-icons / lucide library) ────────────────

// Icon name prefix → react-icons sub-package key
const PREFIX_LIBRARY: Record<string, string> = {
  Fi: 'fi', Gi: 'gi', Md: 'md', Si: 'si', Fa: 'fa',
  Bs: 'bs', Hi: 'hi', Io: 'io5', Ri: 'ri', Tb: 'tb',
  Bi: 'bi', Ai: 'ai', Ci: 'ci', Pi: 'pi', Ti: 'ti',
  Wi: 'wi', Cg: 'cg', Im: 'im', Sl: 'sl', Di: 'di',
  Gr: 'gr', Lu: 'lu', Vsc: 'vsc', Lia: 'lia',
};

export function getIconLibrary(iconName: string): string | null {
  // Check 3-letter prefixes first (Vsc, Lia…)
  if (PREFIX_LIBRARY[iconName.substring(0, 3)]) return PREFIX_LIBRARY[iconName.substring(0, 3)];
  return PREFIX_LIBRARY[iconName.substring(0, 2)] || null;
}

/** Parse "import { GiLaptop } from 'react-icons/gi'" OR just "GiLaptop" */
export function parseImportStatement(input: string): { iconName: string; library: string } | null {
  const full = input.match(/\{\s*([A-Za-z0-9]+)\s*\}\s+from\s+['"]([^'"]+)['"]/);
  if (full) return { iconName: full[1].trim(), library: full[2].trim() };
  if (/^[A-Z][A-Za-z0-9]+$/.test(input.trim())) {
    const name = input.trim();
    const lib = getIconLibrary(name);
    if (lib) return { iconName: name, library: `react-icons/${lib}` };
  }
  return null;
}

/**
 * Dynamically load any react-icons icon by name.
 * Works in both browser (client components) and Node.js (server components).
 * Each library is a separate webpack chunk — only downloaded when needed.
 */
export async function loadIconDynamic(iconName: string): Promise<IconComponent | null> {
  // Preset cache hit — no async needed
  if (ICON_MAP[iconName]) return ICON_MAP[iconName];

  const lib = getIconLibrary(iconName);
  if (!lib) return null;

  try {
    // Static import() paths so webpack can create per-library code-split chunks
    let mod: Record<string, unknown>;
    switch (lib) {
      case 'gi':  mod = await import('react-icons/gi');  break;
      case 'fa':  mod = await import('react-icons/fa');  break;
      case 'fa6': mod = await import('react-icons/fa6'); break;
      case 'bs':  mod = await import('react-icons/bs');  break;
      case 'hi':  mod = await import('react-icons/hi');  break;
      case 'io5': mod = await import('react-icons/io5'); break;
      case 'ri':  mod = await import('react-icons/ri');  break;
      case 'tb':  mod = await import('react-icons/tb');  break;
      case 'bi':  mod = await import('react-icons/bi');  break;
      case 'ai':  mod = await import('react-icons/ai');  break;
      case 'si':  mod = await import('react-icons/si');  break;
      case 'pi':  mod = await import('react-icons/pi');  break;
      case 'ti':  mod = await import('react-icons/ti');  break;
      case 'wi':  mod = await import('react-icons/wi');  break;
      case 'cg':  mod = await import('react-icons/cg');  break;
      case 'ci':  mod = await import('react-icons/ci');  break;
      case 'di':  mod = await import('react-icons/di');  break;
      case 'gr':  mod = await import('react-icons/gr');  break;
      case 'im':  mod = await import('react-icons/im');  break;
      case 'sl':  mod = await import('react-icons/sl');  break;
      case 'vsc': mod = await import('react-icons/vsc'); break;
      case 'lu': mod = await import('lucide-react'); break;
      default: return null;
    }
    return (mod[iconName] as IconComponent) ?? null;
  } catch {
    return null;
  }
}

// ─── Color system ────────────────────────────────────────────────────────────

export const COLOR_OPTIONS = [
  { name: 'blue',   label: 'Azul',         from: '#3b82f6', to: '#2563eb', swatch: '#3b82f6', text: '#2563eb' },
  { name: 'purple', label: 'Morado',        from: '#a855f7', to: '#9333ea', swatch: '#a855f7', text: '#9333ea' },
  { name: 'green',  label: 'Verde',         from: '#10b981', to: '#059669', swatch: '#10b981', text: '#059669' },
  { name: 'red',    label: 'Rojo',          from: '#ef4444', to: '#dc2626', swatch: '#ef4444', text: '#dc2626' },
  { name: 'orange', label: 'Naranja',       from: '#f97316', to: '#ea580c', swatch: '#f97316', text: '#ea580c' },
  { name: 'cyan',   label: 'Cian',          from: '#06b6d4', to: '#0891b2', swatch: '#06b6d4', text: '#0891b2' },
  { name: 'amber',  label: 'Ámbar',         from: '#f59e0b', to: '#d97706', swatch: '#f59e0b', text: '#d97706' },
  { name: 'indigo', label: 'Índigo',        from: '#6366f1', to: '#4f46e5', swatch: '#6366f1', text: '#4f46e5' },
  { name: 'rose',   label: 'Rosa',          from: '#f43f5e', to: '#e11d48', swatch: '#f43f5e', text: '#e11d48' },
  { name: 'teal',   label: 'Verde Azulado', from: '#14b8a6', to: '#0d9488', swatch: '#14b8a6', text: '#0d9488' },
];

const AUTO_COLORS = COLOR_OPTIONS.map(c => c.name);

export function getAutoColor(index: number): string {
  return AUTO_COLORS[index % AUTO_COLORS.length];
}

export function getCategoryColor(color: string | null | undefined, index = 0) {
  if (!color) {
    const key = getAutoColor(index);
    return COLOR_OPTIONS.find(c => c.name === key) || COLOR_OPTIONS[0];
  }
  if (color.startsWith('#')) {
    return { name: 'custom', label: 'Personalizado', from: color, to: color, swatch: color, text: color };
  }
  return COLOR_OPTIONS.find(c => c.name === color) || COLOR_OPTIONS[0];
}
