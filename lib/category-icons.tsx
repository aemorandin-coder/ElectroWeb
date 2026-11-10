import {
  IconoAudifonos, IconoBateria, IconoCableUsb, IconoCamaraFotos, IconoCamaraSeguridad, IconoCelular, IconoCelularTableta,
  IconoChip, IconoCircuito, IconoClave, IconoConfiguracion, IconoConsola, IconoControl, IconoCuadricula, IconoDigital,
  IconoDiscoDuro, IconoGarantia, IconoGiftCard, IconoImpresora, IconoLaptop, IconoMicrofono, IconoMonitor, IconoMouse,
  IconoPaquete, IconoParlante, IconoPcEscritorio, IconoPcGaming, IconoRegalo, IconoRelojInteligente, IconoRouter,
  IconoServicioTecnico, IconoServidor, IconoSoftware, IconoTableta, IconoVideojuegos,
  IconoAgua, IconoBombillo, IconoEnchufe, IconoFerreteria, IconoHerramientas, IconoJardin, IconoLlave, IconoPintura,
  IconoSoldadura, IconoTaladro,
  type IconType,
} from '@/components/iconos';

// ─── Íconos de categoría: solo los del pack propio (C-189) ──────────────────
// Una categoría guarda el nombre de su ícono. El selector del panel ofrece solo estos y guarda el nombre del componente
// ("IconoConsola"). Las categorías de antes guardan el de react-icons ("GiGameConsole"): se leen con NOMBRES_ANTERIORES y
// se ven con el mismo dibujo, sin tocar la base. Un nombre que no está en ninguna de las dos listas se ve como "Otros".
// No se carga ninguna librería: antes un cargador importaba familias enteras de react-icons y lucide, y toda página con
// un logo de esas familias bajaba la familia completa (el checkout, 4,97 MB de Simple Icons).
export interface CategoryIconOption {
  name: string;
  label: string;
  Icon: IconType;
}

export const ICON_OPTIONS: CategoryIconOption[] = [
  // Gaming y digital
  { name: 'IconoGiftCard',         label: 'Gift cards y recargas',   Icon: IconoGiftCard },
  { name: 'IconoVideojuegos',      label: 'Videojuegos',             Icon: IconoVideojuegos },
  { name: 'IconoConsola',          label: 'Consolas',                Icon: IconoConsola },
  { name: 'IconoControl',          label: 'Controles y mandos',      Icon: IconoControl },
  { name: 'IconoMouse',            label: 'Accesorios gaming',       Icon: IconoMouse },
  { name: 'IconoPcGaming',         label: 'PC gaming',               Icon: IconoPcGaming },
  { name: 'IconoSoftware',         label: 'Software',                Icon: IconoSoftware },
  { name: 'IconoClave',            label: 'Licencias',               Icon: IconoClave },
  { name: 'IconoDigital',          label: 'Códigos digitales',       Icon: IconoDigital },
  // Computación
  { name: 'IconoLaptop',           label: 'Laptops',                 Icon: IconoLaptop },
  { name: 'IconoPcEscritorio',     label: 'PC de escritorio',        Icon: IconoPcEscritorio },
  { name: 'IconoMonitor',          label: 'Monitores',               Icon: IconoMonitor },
  { name: 'IconoChip',             label: 'Componentes de PC',       Icon: IconoChip },
  { name: 'IconoDiscoDuro',        label: 'Almacenamiento',          Icon: IconoDiscoDuro },
  { name: 'IconoImpresora',        label: 'Impresoras',              Icon: IconoImpresora },
  { name: 'IconoServidor',         label: 'Servidores',              Icon: IconoServidor },
  // Celulares, audio y foto
  { name: 'IconoCelularTableta',   label: 'Celulares y tablets',     Icon: IconoCelularTableta },
  { name: 'IconoCelular',          label: 'Celulares',               Icon: IconoCelular },
  { name: 'IconoTableta',          label: 'Tablets',                 Icon: IconoTableta },
  { name: 'IconoRelojInteligente', label: 'Wearables',               Icon: IconoRelojInteligente },
  { name: 'IconoAudifonos',        label: 'Audio',                   Icon: IconoAudifonos },
  { name: 'IconoMicrofono',        label: 'Micrófonos',              Icon: IconoMicrofono },
  { name: 'IconoParlante',         label: 'Parlantes',               Icon: IconoParlante },
  { name: 'IconoCamaraFotos',      label: 'Fotografía',              Icon: IconoCamaraFotos },
  // Electrónica, redes y energía
  { name: 'IconoCircuito',         label: 'Electrónica y repuestos', Icon: IconoCircuito },
  { name: 'IconoCableUsb',         label: 'Cables y adaptadores',    Icon: IconoCableUsb },
  { name: 'IconoBateria',          label: 'Energía',                 Icon: IconoBateria },
  { name: 'IconoRouter',           label: 'Redes',                   Icon: IconoRouter },
  { name: 'IconoCamaraSeguridad',  label: 'CCTV y seguridad',        Icon: IconoCamaraSeguridad },
  { name: 'IconoGarantia',         label: 'Protección',              Icon: IconoGarantia },
  // Ferretería (pack v1.2, C-200)
  { name: 'IconoFerreteria',       label: 'Ferretería',              Icon: IconoFerreteria },
  { name: 'IconoTaladro',          label: 'Herramientas eléctricas', Icon: IconoTaladro },
  { name: 'IconoHerramientas',     label: 'Herramientas manuales',   Icon: IconoHerramientas },
  { name: 'IconoPintura',          label: 'Pinturas',                Icon: IconoPintura },
  { name: 'IconoEnchufe',          label: 'Electricidad',            Icon: IconoEnchufe },
  { name: 'IconoBombillo',         label: 'Iluminación',             Icon: IconoBombillo },
  { name: 'IconoAgua',             label: 'Bombas y agua',           Icon: IconoAgua },
  { name: 'IconoJardin',           label: 'Jardín y agro',           Icon: IconoJardin },
  { name: 'IconoLlave',            label: 'Cerrajería',              Icon: IconoLlave },
  { name: 'IconoSoldadura',        label: 'Soldadura',               Icon: IconoSoldadura },
  // General
  { name: 'IconoServicioTecnico',  label: 'Servicio técnico',        Icon: IconoServicioTecnico },
  { name: 'IconoConfiguracion',    label: 'Herramientas',            Icon: IconoConfiguracion },
  { name: 'IconoRegalo',           label: 'Regalos',                 Icon: IconoRegalo },
  { name: 'IconoPaquete',          label: 'General',                 Icon: IconoPaquete },
  { name: 'IconoCuadricula',       label: 'Otros',                   Icon: IconoCuadricula },
];

/**
 * Los nombres de react-icons que guardan las categorías de antes, con su dibujo del pack (el mismo que C-188).
 * Las 28 opciones del selector viejo (entre ellas los 14 nombres que usan las categorías de producción) y los de
 * categoría de la tabla de equivalencias de C-188.
 */
const NOMBRES_ANTERIORES = new Map<string, string>([
  ['FiMonitor', 'IconoMonitor'], ['FiSmartphone', 'IconoCelularTableta'], ['FiCpu', 'IconoChip'],
  ['FiHardDrive', 'IconoDiscoDuro'], ['FiHeadphones', 'IconoAudifonos'], ['FiWifi', 'IconoRouter'],
  ['FiCamera', 'IconoCamaraFotos'], ['FiPrinter', 'IconoImpresora'], ['FiBattery', 'IconoBateria'],
  ['FiSliders', 'IconoMouse'], ['FiMic', 'IconoMicrofono'], ['FiVolume2', 'IconoParlante'],
  ['FiPackage', 'IconoPaquete'], ['FiShield', 'IconoGarantia'], ['FiWatch', 'IconoRelojInteligente'],
  ['FiServer', 'IconoServidor'], ['FiSettings', 'IconoConfiguracion'], ['FiGrid', 'IconoCuadricula'],
  ['MdGamepad', 'IconoVideojuegos'], ['MdSportsEsports', 'IconoControl'], ['FiGift', 'IconoGiftCard'],
  ['GiGameConsole', 'IconoConsola'], ['FaLaptop', 'IconoLaptop'], ['BsPcDisplay', 'IconoPcEscritorio'],
  ['TbDeviceCctv', 'IconoCamaraSeguridad'], ['FaMicrochip', 'IconoCircuito'], ['BsPlugin', 'IconoCableUsb'],
  ['IoLogoWindows', 'IconoSoftware'],
  ['FaGamepad', 'IconoControl'], ['GiLaptop', 'IconoLaptop'], ['FiTablet', 'IconoTableta'], ['FaEthernet', 'IconoRouter'],
  ['PiSecurityCameraDuotone', 'IconoCamaraSeguridad'], ['SiPcgamingwiki', 'IconoPcGaming'], ['FiTool', 'IconoServicioTecnico'],
]);

const POR_NOMBRE = new Map(ICON_OPTIONS.map((o) => [o.name, o]));

/** La opción del selector que corresponde a un nombre guardado, del pack ("IconoConsola") o de antes ("GiGameConsole"). */
export function getCategoryIconOption(name: string | null | undefined): CategoryIconOption | null {
  if (!name) return null;
  return POR_NOMBRE.get(name) ?? POR_NOMBRE.get(NOMBRES_ANTERIORES.get(name) ?? '') ?? null;
}

/** El dibujo de una categoría; la cuadrícula ("Otros") si no tiene o si el nombre no se conoce. */
export function getCategoryIcon(name: string | null | undefined): IconType {
  return getCategoryIconOption(name)?.Icon ?? IconoCuadricula;
}

/** El ícono que se usa cuando la categoría no eligió ninguno (no se guarda: se calcula al mostrarla). */
export function getAutoIcon(categoryName: string): string {
  const n = categoryName.toLowerCase();
  if (/gift ?card|recarga/.test(n)) return 'IconoGiftCard';
  if (/consola/.test(n)) return 'IconoConsola';
  if (/laptop|notebook|port[aá]til/.test(n)) return 'IconoLaptop';
  if (/software|licencia|antivirus/.test(n)) return 'IconoSoftware';
  if (/cctv|vigilancia|c[aá]maras? de seguridad/.test(n)) return 'IconoCamaraSeguridad';
  if (/computad|desktop|pc\b|monitor/.test(n)) return 'IconoMonitor';
  if (/celular|móvil|movil|teléfono|telefono|smartphone/.test(n)) return 'IconoCelularTableta';
  if (/componente|procesador|cpu|tarjeta (madre|gráfica|video)/.test(n)) return 'IconoChip';
  if (/disco|almacen|ssd|hdd|memoria/.test(n)) return 'IconoDiscoDuro';
  if (/audio|auricular|headphone|audifonos/.test(n)) return 'IconoAudifonos';
  if (/\bred\b|router|wifi|switch\b|cable|internet|modem/.test(n)) return 'IconoRouter';
  if (/cámara|camara|foto|video/.test(n)) return 'IconoCamaraFotos';
  if (/impres|printer|toner|cartucho/.test(n)) return 'IconoImpresora';
  if (/batería|bateria|ups|pila|carga|energía|energia/.test(n)) return 'IconoBateria';
  if (/gaming|gamer|juego|videojuego/.test(n)) return 'IconoVideojuegos';
  if (/micrófono|microfono/.test(n)) return 'IconoMicrofono';
  if (/parlan|speaker|sonido/.test(n)) return 'IconoParlante';
  if (/seguridad/.test(n)) return 'IconoGarantia';
  if (/smartwatch|reloj|wearable/.test(n)) return 'IconoRelojInteligente';
  if (/servidor|server|nas/.test(n)) return 'IconoServidor';
  if (/acceso|periféri|teclado|mouse|ratón/.test(n)) return 'IconoMouse';
  return 'IconoCuadricula';
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
