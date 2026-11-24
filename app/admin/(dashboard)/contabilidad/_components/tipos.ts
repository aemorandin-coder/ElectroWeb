import type { LibroVentas } from '@/lib/contabilidad/libro';
import type { FirmaDTO, NotaDTO, ResumenMes } from '@/lib/contabilidad/mesa';
import type { CompraSinFactura } from '@/lib/contabilidad/servidor';
import type {
  CompraGastoDTO, ConfigContableDTO, FacturaDTO, MovimientosMesDTO, ObligacionFiscalDTO, PeriodoContableDTO, TalonarioDTO,
} from '@/lib/dto/contabilidad';

export type TabHubId = 'resumen' | 'facturacion' | 'libros' | 'movimientos' | 'ajustes';
export type SubTabLibro = 'ventas' | 'compras' | 'iva';

export interface HubDatosProps {
  tabInicial: TabHubId;
  subTabLibroInicial?: SubTabLibro;
  mes: string;
  meses: string[];
  hoy: string;
  venceIvaMes: string;
  saludo: string;
  hoyLargo: string;
  yo: {
    id: string;
    nombre: string;
    esContadora: boolean;
    esDueno: boolean;
    puedeFacturar: boolean;
    puedeDeclarar: boolean;
  };
  empresa: { nombre: string; rif: string; domicilio: string; telefono: string };
  tasaHoy: number | null;
  alicuota: number;
  resumen: ResumenMes;
  periodo: PeriodoContableDTO;
  obligaciones: ObligacionFiscalDTO[];
  firma: FirmaDTO | null;
  contadora: { nombre: string } | null;
  notas: NotaDTO[];
  talonarioNormal: TalonarioDTO | null;
  talonarioContingencia: TalonarioDTO | null;
  talonariosTodos: TalonarioDTO[];
  facturas: FacturaDTO[];
  comprasPendientes: CompraSinFactura[];
  comprasGastos: {
    items: CompraGastoDTO[];
    creditoFiscalBs: number;
    totalComprasBs: number;
    pendientesRevision: number;
  };
  libro: LibroVentas;
  movimientos: MovimientosMesDTO;
  ventas30: number;
  config: ConfigContableDTO | null;
  canalPublico: 'TALONARIO' | 'PORTAL_SENIAT' | 'IMPRENTA_DIGITAL';
  imprentaAmbientePublico: 'SANDBOX' | 'PRODUCCION';
  checklistTotal: number;
  checklistHechos: number;
}

export function fechaCortaVe(iso: string | null | undefined): string {
  if (!iso) return '—';
  const limpia = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limpia)) {
    return new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
  }
  const [a, m, d] = limpia.split('-');
  return `${d}/${m}/${a}`;
}

export function fechaHoraCortaVe(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function diasHasta2027(hoyIso: string): number {
  const hoyMs = Date.UTC(Number(hoyIso.slice(0, 4)), Number(hoyIso.slice(5, 7)) - 1, Number(hoyIso.slice(8, 10)));
  const metaMs = Date.UTC(2027, 3, 19); // 19 de abril de 2027
  return Math.max(0, Math.round((metaMs - hoyMs) / 86_400_000));
}

export function etiquetaCanal(canal: string): string {
  if (canal === 'IMPRENTA_DIGITAL') return 'Imprenta Digital';
  if (canal === 'PORTAL_SENIAT') return 'Portal SENIAT';
  return 'Talonario físico';
}
