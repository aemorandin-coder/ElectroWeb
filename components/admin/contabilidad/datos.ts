// C-229: de un talonario y una factura (o un borrador) a lo que muestran la réplica y la lista casilla por casilla.
// Módulo puro, para el panel.

import type { CompradorDTO, TalonarioDTO } from '@/lib/dto/contabilidad';
import type { Renglon, TotalesFactura } from '@/lib/contabilidad/montos';
import { numeroControl } from '@/lib/contabilidad/talonario';
import type { DatosReplica } from './ReplicaTalonario';

/** "2026-01-17T…" → "17-01-2023" como está impreso */
function fechaImpresa(iso: string | null): string | null {
  if (!iso) return null;
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}-${mes}-${anio}`;
}

export function datosReplica(
  t: TalonarioDTO,
  f: {
    numeroTexto: string;
    numeroControl: string;
    /** "2026-11-14" */
    fecha: string | null;
    comprador: CompradorDTO | null;
    condicionPago: 'CONTADO' | 'CREDITO' | null;
    renglones: Renglon[];
    totales: TotalesFactura | null;
    alicuota: number;
    anulada?: boolean;
  },
): DatosReplica {
  const [anio, mes, dia] = (f.fecha ?? '').split('-');
  return {
    emisor: { nombre: t.emisorNombre, rif: t.emisorRif, domicilio: t.emisorDomicilio, telefono: t.emisorTelefono },
    imprenta: { nombre: t.imprenta, rif: t.imprentaRif, autorizacion: t.autorizacion, elaboradoEl: fechaImpresa(t.elaboradoEl) },
    rango: {
      serie: t.serie,
      desdeTexto: String(t.numeroDesde).padStart(3, '0'),
      hastaTexto: String(t.numeroHasta).padStart(3, '0'),
      controlDesde: numeroControl(t, t.numeroDesde),
      controlHasta: numeroControl(t, t.numeroHasta),
      documentos: t.numeroHasta - t.numeroDesde + 1,
    },
    numeroTexto: f.numeroTexto,
    numeroControl: f.numeroControl,
    fecha: f.fecha ? { dia, mes, anio } : null,
    comprador: f.comprador,
    condicionPago: f.condicionPago,
    renglones: f.renglones,
    totales: f.totales,
    alicuota: f.alicuota,
    anulada: f.anulada,
  };
}
