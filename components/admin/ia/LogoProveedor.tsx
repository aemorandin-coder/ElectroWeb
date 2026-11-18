import { SiClaude, SiGooglegemini } from 'react-icons/si';
import type { IconoProps, IconType } from '@/components/iconos';
import type { IdProveedor } from '@/lib/ia/proveedores/catalogo';

// C-292: el logo de cada proveedor de IA (skill herramientas-claras, regla 2). Claude y Gemini tienen el suyo en react-icons (solo
// logos de marca); xAI y Groq no: van con su nombre en la placa, sin inventar el dibujo de su marca.

function Nombre({ texto, className = '' }: { texto: string; className?: string }) {
  return <span className={`inline-flex items-center justify-center text-[11px] font-bold leading-none tracking-tight ${className}`} aria-hidden="true">{texto}</span>;
}

const LogoXai = ({ className }: IconoProps) => <Nombre texto="xAI" className={className} />;
const LogoGroq = ({ className }: IconoProps) => <Nombre texto="groq" className={className} />;

export const LOGOS: Record<IdProveedor, IconType> = {
  anthropic: SiClaude,
  google: SiGooglegemini,
  xai: LogoXai,
  groq: LogoGroq,
};
