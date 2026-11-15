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

// C-250 (el equipo, 15/11): solo los azules del kit de marca (lib/marca.ts). Los colores de antes (morado, rosa, cian…)
// siguen guardados como estaban y se muestran con el azul más parecido; uno personalizado (#…), según lo claro que sea.
export const COLOR_OPTIONS = [
  { name: 'azul',   label: 'Azul de la marca',     from: '#2a63cd', to: '#1e4ba3', swatch: '#2a63cd', text: '#1e4ba3' },
  { name: 'medio',  label: 'Azul medio',           from: '#1e4ba3', to: '#1a3b7e', swatch: '#1e4ba3', text: '#1a3b7e' },
  { name: 'oscuro', label: 'Azul oscuro del logo', from: '#1a3b7e', to: '#1a3b7e', swatch: '#1a3b7e', text: '#1a3b7e' },
  { name: 'claro',  label: 'Azul claro',           from: '#aac1eb', to: '#2a63cd', swatch: '#aac1eb', text: '#1e4ba3' },
];

/** Los colores de antes del kit, con su azul más parecido */
const ANTES: Record<string, string> = {
  blue: 'azul', cyan: 'claro', teal: 'claro', green: 'claro', indigo: 'medio', purple: 'medio',
  rose: 'oscuro', red: 'oscuro', orange: 'oscuro', amber: 'oscuro',
};

const AUTO_COLORS = COLOR_OPTIONS.map(c => c.name);

export function getAutoColor(index: number): string {
  return AUTO_COLORS[index % AUTO_COLORS.length];
}

/** Un color personalizado (#rrggbb) va al azul del kit de su misma luz */
function azulPorLuz(hex: string) {
  const n = parseInt(hex.slice(1, 7).padEnd(6, '0'), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const luz = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const nombre = luz > 0.62 ? 'claro' : luz > 0.4 ? 'azul' : luz > 0.25 ? 'medio' : 'oscuro';
  return COLOR_OPTIONS.find(c => c.name === nombre) || COLOR_OPTIONS[0];
}

export function getCategoryColor(color: string | null | undefined, index = 0) {
  if (!color) {
    const key = getAutoColor(index);
    return COLOR_OPTIONS.find(c => c.name === key) || COLOR_OPTIONS[0];
  }
  if (color.startsWith('#')) return azulPorLuz(color);
  return COLOR_OPTIONS.find(c => c.name === (ANTES[color] ?? color)) || COLOR_OPTIONS[0];
}
