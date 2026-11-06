import {
  IconoAudifonos, IconoBateria, IconoCableUsb, IconoCamaraFotos, IconoCamaraSeguridad, IconoCelularTableta, IconoChip,
  IconoCircuito, IconoConfiguracion, IconoConsola, IconoControl, IconoCuadricula, IconoDiscoDuro, IconoGarantia,
  IconoGiftCard, IconoImpresora, IconoLaptop, IconoMicrofono, IconoMonitor, IconoMouse, IconoPaquete, IconoParlante,
  IconoPcEscritorio, IconoRelojInteligente, IconoRouter, IconoServidor, IconoSoftware, IconoVideojuegos,
} from '@/components/iconos';
import type { ComponentType, SVGAttributes } from 'react';

type IconComponent = ComponentType<SVGAttributes<SVGElement> & { className?: string }>;

// ─── Preset icon list ───────────────────────────────────────────────────────
// C-188: las opciones fijas se dibujan con los íconos propios de Electro Shop. La categoría sigue guardando el mismo
// nombre (el de react-icons, "FiMonitor"), así que la base no cambia. Con el significado de categoría: FiSmartphone es
// "Celulares y tablets" y FiGift es "Gift cards". Las ocho últimas son los nombres que ya usan categorías de producción
// (antes no eran opciones y la tienda los bajaba de react-icons al abrir la página; FiGift salía como "Otros").
export const ICON_OPTIONS: { name: string; label: string; Icon: IconComponent }[] = [
  { name: 'FiMonitor',       label: 'PC / Monitor',   Icon: IconoMonitor },
  { name: 'FiSmartphone',    label: 'Smartphones',    Icon: IconoCelularTableta },
  { name: 'FiCpu',           label: 'Componentes',    Icon: IconoChip },
  { name: 'FiHardDrive',     label: 'Almacenamiento', Icon: IconoDiscoDuro },
  { name: 'FiHeadphones',    label: 'Audio',          Icon: IconoAudifonos },
  { name: 'FiWifi',          label: 'Redes',          Icon: IconoRouter },
  { name: 'FiCamera',        label: 'Fotografía',     Icon: IconoCamaraFotos },
  { name: 'FiPrinter',       label: 'Impresoras',     Icon: IconoImpresora },
  { name: 'FiBattery',       label: 'Energía',        Icon: IconoBateria },
  { name: 'FiSliders',       label: 'Accesorios',     Icon: IconoMouse },
  { name: 'FiMic',           label: 'Micrófonos',     Icon: IconoMicrofono },
  { name: 'FiVolume2',       label: 'Parlantes',      Icon: IconoParlante },
  { name: 'FiPackage',       label: 'General',        Icon: IconoPaquete },
  { name: 'FiShield',        label: 'Seguridad',      Icon: IconoGarantia },
  { name: 'FiWatch',         label: 'Wearables',      Icon: IconoRelojInteligente },
  { name: 'FiServer',        label: 'Servidores',     Icon: IconoServidor },
  { name: 'FiSettings',      label: 'Herramientas',   Icon: IconoConfiguracion },
  { name: 'FiGrid',          label: 'Otros',          Icon: IconoCuadricula },
  { name: 'MdGamepad',       label: 'Gaming',         Icon: IconoVideojuegos },
  { name: 'MdSportsEsports', label: 'Esports',        Icon: IconoControl },
  { name: 'FiGift',          label: 'Gift cards',     Icon: IconoGiftCard },
  { name: 'GiGameConsole',   label: 'Consolas',       Icon: IconoConsola },
  { name: 'FaLaptop',        label: 'Laptops',        Icon: IconoLaptop },
  { name: 'BsPcDisplay',     label: 'PC de escritorio', Icon: IconoPcEscritorio },
  { name: 'TbDeviceCctv',    label: 'CCTV',           Icon: IconoCamaraSeguridad },
  { name: 'FaMicrochip',     label: 'Electrónica',    Icon: IconoCircuito },
  { name: 'BsPlugin',        label: 'Adaptadores',    Icon: IconoCableUsb },
  { name: 'IoLogoWindows',   label: 'Software',       Icon: IconoSoftware },
];

// Synchronous lookup map for preset icons
const ICON_MAP: Record<string, IconComponent> = Object.fromEntries(
  ICON_OPTIONS.map(o => [o.name, o.Icon])
);

/** Synchronous lookup — devuelve la cuadrícula ("Otros") si el nombre no es una opción fija. */
export function getCategoryIcon(name: string | null | undefined): IconComponent {
  return (name && ICON_MAP[name]) ? ICON_MAP[name] : IconoCuadricula;
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
    // Static import() paths so webpack can create per-library code-split chunks.
    // Ojo (C-188): una familia que se importa aquí entera no se puede recortar en ningún otro lado: si un componente usa un
    // logo de esa familia, la página baja la familia completa. Por eso ya no está 'fa6' (ningún nombre llegaba: "Fa" es
    // 'fa') y los logos de marca de la tienda (FaWhatsapp en el pie y en el botón flotante) vienen de 'react-icons/fa6'.
    let mod: Record<string, unknown>;
    switch (lib) {
      case 'gi':  mod = await import('react-icons/gi');  break;
      case 'fa':  mod = await import('react-icons/fa');  break;
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
