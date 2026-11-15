'use client';

// C-229: cargar un talonario (solo el dueño), por pasos (PLAN.md §1.9). Se copia lo que trae impreso: los números, el
// control, el emisor y el pie de la imprenta. Al final, la réplica de la próxima factura vacía, para compararla con el papel.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Ayuda from '@/components/admin/Ayuda';
import Pasos, { type Paso } from '@/components/admin/Pasos';
import ReplicaTalonario from '@/components/admin/contabilidad/ReplicaTalonario';
import { datosReplica } from '@/components/admin/contabilidad/datos';
import { IconoCheck, IconoDocumento, IconoFlechaDerecha, IconoFlechaIzquierda, IconoImpresora, IconoNumero, IconoTienda, IconoVer } from '@/components/iconos';
import { adminCard, adminError, adminHint, adminInput, adminLabel, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { normalizarDocumento } from '@/lib/contabilidad/montos';
import { numeroControl, numeroFactura, problemasTalonario, quedan, usadas } from '@/lib/contabilidad/talonario';
import type { TalonarioDTO } from '@/lib/dto/contabilidad';

interface Form {
  serie: string; numeroDesde: string; numeroHasta: string; proximo: string;
  controlSerie: string; controlDesde: string; controlHasta: string;
  emisorNombre: string; emisorRif: string; emisorDomicilio: string; emisorTelefono: string;
  imprenta: string; imprentaRif: string; autorizacion: string; elaboradoEl: string;
}

const PASOS = [
  { titulo: 'La serie y los números', icono: IconoNumero, queHacer: 'Como dicen el talonario y su pie.' },
  { titulo: 'El control', icono: IconoDocumento, queHacer: 'El número rojo de abajo: un control por factura.' },
  { titulo: 'Lo impreso arriba', icono: IconoTienda, queHacer: 'Los datos de la empresa, como están impresos.' },
  { titulo: 'La imprenta', icono: IconoImpresora, queHacer: 'El pie de la factura: quién la imprimió y su autorización.' },
  { titulo: 'Revisar y guardar', icono: IconoVer, queHacer: 'Compárala con el papel antes de guardar.' },
];

const entero = (v: string) => (/^\d{1,8}$/.test(v.trim()) ? Number(v.trim()) : NaN);

export default function AsistenteTalonario({ empresa, alicuota }: { empresa: { nombre: string; rif: string; domicilio: string; telefono: string }; alicuota: number }) {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [alcanzado, setAlcanzado] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<Form>({
    serie: 'A', numeroDesde: '1', numeroHasta: '100', proximo: '', controlSerie: '00', controlDesde: '', controlHasta: '',
    emisorNombre: empresa.nombre, emisorRif: empresa.rif, emisorDomicilio: empresa.domicilio, emisorTelefono: empresa.telefono,
    imprenta: '', imprentaRif: '', autorizacion: '', elaboradoEl: '',
  });
  const set = (k: keyof Form, v: string) => setF((x) => ({ ...x, [k]: v }));

  const nums = {
    serie: f.serie.trim().toUpperCase(),
    numeroDesde: entero(f.numeroDesde), numeroHasta: entero(f.numeroHasta), proximo: entero(f.proximo),
    controlSerie: f.controlSerie.trim(), controlDesde: entero(f.controlDesde), controlHasta: entero(f.controlHasta),
  };
  const p = problemasTalonario(nums);
  const problemas = [
    p.serie ?? p.numeroDesde ?? p.numeroHasta ?? p.proximo ?? null,
    p.controlSerie ?? p.controlDesde ?? p.controlHasta ?? null,
    f.emisorNombre.trim().length < 3 ? 'La razón social, como está impresa.' : !normalizarDocumento(f.emisorRif) ? 'El RIF de la empresa (J-40590333-3).' : f.emisorDomicilio.trim().length < 10 ? 'El domicilio fiscal, como está impreso.' : null,
    f.imprenta.trim().length < 3 ? 'El nombre de la imprenta.' : !normalizarDocumento(f.imprentaRif) ? 'El RIF de la imprenta, como está en el pie.' : f.autorizacion.trim().length < 5 ? 'La providencia que autoriza a la imprenta.' : null,
  ];
  const listoHasta = (i: number) => problemas.slice(0, i).every((x) => x === null);

  const pasos: Paso[] = PASOS.map((x, i) => ({
    titulo: x.titulo,
    icono: x.icono,
    hecho: i < 4 && i < alcanzado && problemas[i] === null,
    disponible: listoHasta(i),
    resumen: i === 0 ? (problemas[0] ? 'Serie, primera, última y la próxima' : `Serie ${nums.serie} · la próxima ${numeroFactura(nums, nums.proximo)}`)
      : i === 1 ? (problemas[1] || problemas[0] ? 'El número rojo' : `La ${numeroFactura(nums, nums.proximo)} lleva el ${numeroControl(nums, nums.proximo)}`)
        : i === 2 ? (f.emisorNombre.trim() || 'Razón social y RIF')
          : i === 3 ? (f.imprenta.trim() || 'Quién la imprimió')
            : 'Compararla con el papel',
  }));

  const ir = (i: number) => { setPaso(i); setAlcanzado((a) => Math.max(a, i)); setError(null); };

  const vistaTalonario: TalonarioDTO | null = listoHasta(4)
    ? {
        id: 'nuevo', ...nums, estado: 'EN_USO', emisorNombre: f.emisorNombre.trim(), emisorRif: normalizarDocumento(f.emisorRif) ?? f.emisorRif,
        emisorDomicilio: f.emisorDomicilio.trim(), emisorTelefono: f.emisorTelefono.trim() || null, imprenta: f.imprenta.trim(),
        imprentaRif: normalizarDocumento(f.imprentaRif) ?? f.imprentaRif, autorizacion: f.autorizacion.trim(), elaboradoEl: f.elaboradoEl || null,
        quedan: quedan(nums), usadas: usadas(nums), proximoTexto: numeroFactura(nums, nums.proximo), proximoControl: numeroControl(nums, nums.proximo),
      }
    : null;

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/contabilidad/talonarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nums, emisorNombre: f.emisorNombre, emisorRif: f.emisorRif, emisorDomicilio: f.emisorDomicilio, emisorTelefono: f.emisorTelefono,
          imprenta: f.imprenta, imprentaRif: f.imprentaRif, autorizacion: f.autorizacion, elaboradoEl: f.elaboradoEl,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setError(d?.error ?? 'No se pudo guardar el talonario.');
        return;
      }
      toast.success(`Talonario Serie ${d.talonario.serie} cargado: la próxima es la ${d.talonario.proximoTexto}`);
      router.push('/admin/contabilidad/facturas');
      router.refresh();
    } catch {
      setError('Sin conexión. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const campo = (k: keyof Form, etiqueta: string, opciones: { ancho?: string; ayuda?: string; placeholder?: string; tipo?: string; numerico?: boolean } = {}) => (
    <div>
      <label htmlFor={`t-${k}`} className={adminLabel}>{etiqueta}</label>
      <input
        id={`t-${k}`}
        type={opciones.tipo ?? 'text'}
        value={f[k]}
        inputMode={opciones.numerico ? 'numeric' : undefined}
        placeholder={opciones.placeholder}
        onChange={(e) => set(k, e.target.value)}
        className={`${adminInput()} ${opciones.numerico ? 'tabular-nums' : ''} ${opciones.ancho ?? ''}`}
        autoComplete="off"
      />
      {opciones.ayuda && <p className={adminHint}>{opciones.ayuda}</p>}
    </div>
  );

  const pie = (siguiente: number, texto: string) => (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
      {paso > 0 ? <button type="button" onClick={() => ir(paso - 1)} className={adminSecondaryButton}><IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /> Atrás</button> : <span />}
      <button type="button" onClick={() => ir(siguiente)} disabled={!listoHasta(siguiente)} className={adminPrimaryButton}>{texto} <IconoFlechaDerecha className="h-4 w-4" aria-hidden="true" /></button>
    </div>
  );

  return (
    <div className="space-y-4">
      <Pasos pasos={pasos} actual={paso} onIr={ir} etiqueta="Pasos del talonario" />
      <section className={`${adminCard} ${paso === 4 ? '' : 'max-w-3xl'}`} aria-labelledby="paso-talonario">
        <h2 id="paso-talonario" className="text-lg font-semibold text-ink">{PASOS[paso].titulo}</h2>
        <p className="mt-1 text-sm text-muted">{PASOS[paso].queHacer}</p>

        {paso === 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {campo('serie', 'Serie', { ancho: 'sm:max-w-24', ayuda: 'Debajo de "FACTURA": "A".' })}
            {campo('proximo', 'La próxima por usar', { ancho: 'sm:max-w-32', numerico: true, ayuda: 'La primera en blanco del talonario.' })}
            {campo('numeroDesde', 'Primera factura', { ancho: 'sm:max-w-32', numerico: true, ayuda: 'En el pie: "desde 001".' })}
            {campo('numeroHasta', 'Última factura', { ancho: 'sm:max-w-32', numerico: true, ayuda: 'En el pie: "hasta 100".' })}
          </div>
        )}
        {paso === 1 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {campo('controlSerie', 'Antes del guion', { ancho: 'sm:max-w-24', numerico: true, ayuda: 'El "00" de 00-000501.' })}
            {campo('controlDesde', 'Primer control', { ancho: 'sm:max-w-36', numerico: true, ayuda: 'En el pie: "desde el Nº".' })}
            {campo('controlHasta', 'Último control', { ancho: 'sm:max-w-36', numerico: true, ayuda: 'En el pie: "hasta el Nº".' })}
            {!problemas[0] && !problemas[1] && (
              <p className="sm:col-span-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
                <IconoCheck className="mr-1 inline h-4 w-4" aria-hidden="true" />
                La {numeroFactura(nums, nums.proximo)} lleva el control <strong className="tabular-nums">{numeroControl(nums, nums.proximo)}</strong>. Compruébalo en el papel.
              </p>
            )}
          </div>
        )}
        {paso === 2 && (
          <div className="mt-4 grid gap-4">
            {campo('emisorNombre', 'Razón social', { ancho: 'sm:max-w-md' })}
            {campo('emisorRif', 'RIF', { ancho: 'sm:max-w-56', placeholder: 'J-40590333-3' })}
            {campo('emisorDomicilio', 'Domicilio fiscal', { ayuda: 'Como está impreso, con el teléfono aparte.' })}
            {campo('emisorTelefono', 'Teléfono', { ancho: 'sm:max-w-56' })}
          </div>
        )}
        {paso === 3 && (
          <div className="mt-4 grid gap-4">
            {campo('imprenta', 'Imprenta', { ancho: 'sm:max-w-md', placeholder: 'Gráfica …, C.A.' })}
            {campo('imprentaRif', 'RIF de la imprenta', { ancho: 'sm:max-w-56' })}
            <div>
              <label htmlFor="t-autorizacion" className={`${adminLabel} inline-flex items-center gap-1`}>
                Autorización
                <Ayuda etiqueta="Qué es la autorización">En el pie: &ldquo;Autorizado Nro. Providencia: SENIAT/…&rdquo; y su fecha. Se copia tal cual.</Ayuda>
              </label>
              <input id="t-autorizacion" value={f.autorizacion} onChange={(e) => set('autorizacion', e.target.value)} placeholder="Providencia SENIAT/03/00692 del 03-04-2008" className={`${adminInput()} sm:max-w-md`} autoComplete="off" />
            </div>
            {campo('elaboradoEl', 'Fecha de elaboración', { tipo: 'date', ancho: 'sm:max-w-48', ayuda: 'En el pie, día, mes y año. Si no la ves, déjala vacía.' })}
          </div>
        )}
        {paso === 4 && vistaTalonario && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-start">
            <div className="space-y-3 text-sm">
              <p>Así queda la <strong className="tabular-nums">{vistaTalonario.proximoTexto}</strong>, la próxima por usar. Compárala con el papel: el número rojo, el control y el pie.</p>
              <p className="text-muted">Quedan {vistaTalonario.quedan} por usar. Las anteriores ({vistaTalonario.usadas}) quedan como emitidas antes del sistema.</p>
              {error && <p role="alert" className={adminError}>{error}</p>}
              <button type="button" onClick={() => void guardar()} disabled={guardando} className={`${adminPrimaryButton} w-full`}>
                <IconoCheck className="h-4 w-4" aria-hidden="true" /> {guardando ? 'Guardando…' : 'Guardar el talonario'}
              </button>
              <button type="button" onClick={() => ir(0)} className={`${adminSecondaryButton} w-full`}>Cambiar algo</button>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[40rem]">
                <ReplicaTalonario datos={datosReplica(vistaTalonario, { numeroTexto: vistaTalonario.proximoTexto ?? '', numeroControl: vistaTalonario.proximoControl ?? '', fecha: null, comprador: null, condicionPago: null, renglones: [], totales: null, alicuota })} />
              </div>
            </div>
          </div>
        )}
        {paso < 4 && problemas[paso] && <p className={`${adminHint} mt-3`}>{problemas[paso]}</p>}
        {paso < 4 && pie(paso + 1, paso === 3 ? 'Siguiente: revisar' : `Siguiente: ${PASOS[paso + 1].titulo.toLowerCase()}`)}
      </section>
    </div>
  );
}
