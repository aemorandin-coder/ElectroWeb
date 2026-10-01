'use client';

import Link from 'next/link';
import { FiBriefcase, FiFileText, FiUser } from 'react-icons/fi';
import { adminCard, adminHint, adminInput, adminLabel } from '@/lib/admin-ui';
import { DOMICILIO_MAX } from '@/lib/facturacion';

/**
 * ¿A nombre de quién va la factura? (C-147)
 * La persona, con su cédula, o su empresa verificada, con la razón social, el RIF y el domicilio fiscal.
 * De aquí solo sale la elección y, la primera vez, el domicilio fiscal: el nombre, la cédula, la razón social y el
 * RIF los pone el servidor desde la cuenta. Sin empresa verificada no hay elección: va a nombre de la persona.
 */

export interface EmpresaFactura {
  nombre: string;
  rif: string;
  /** Domicilio fiscal guardado en el perfil; null si todavía no lo escribió */
  domicilio: string | null;
}

export interface EleccionFactura {
  tipo: 'PERSON' | 'COMPANY';
  /** Domicilio fiscal escrito en esta compra (solo si la empresa no tiene uno guardado) */
  domicilio: string;
}

const opcion = (activa: boolean) =>
  `flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 text-left ${activa ? 'border-brand-500 bg-brand-50' : 'border-line bg-white hover:bg-surface'}`;

export default function DatosFactura({
  nombre,
  cedula,
  empresa,
  value,
  onChange,
  error,
}: {
  nombre: string;
  cedula: string;
  empresa: EmpresaFactura | null;
  value: EleccionFactura;
  onChange: (value: EleccionFactura) => void;
  error?: string;
}) {
  return (
    <section id="datos-factura" aria-labelledby="datos-factura-titulo" className={`${adminCard} scroll-mt-24 space-y-3 p-5 shadow-sm`}>
      <h2 id="datos-factura-titulo" className="flex items-center gap-2 text-lg font-bold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600">
          <FiFileText className="h-4 w-4" aria-hidden="true" />
        </span>
        Datos de la factura
      </h2>

      {empresa ? (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm text-ink-soft">¿A nombre de quién va la factura?</legend>
          <label className={opcion(value.tipo === 'PERSON')}>
            <input type="radio" name="factura-a-nombre" className="mt-1 h-4 w-4 shrink-0 accent-brand-500" checked={value.tipo === 'PERSON'} onChange={() => onChange({ ...value, tipo: 'PERSON' })} />
            <span className="min-w-0 text-sm [overflow-wrap:anywhere]">
              <span className="flex items-center gap-1.5 font-semibold text-ink"><FiUser className="h-4 w-4 shrink-0" aria-hidden="true" /> A mi nombre</span>
              <span className="block text-ink-soft">{nombre || 'Tu nombre'}</span>
              {cedula && <span className="block tabular-nums text-muted">Cédula {cedula}</span>}
            </span>
          </label>
          <label className={opcion(value.tipo === 'COMPANY')}>
            <input type="radio" name="factura-a-nombre" className="mt-1 h-4 w-4 shrink-0 accent-brand-500" checked={value.tipo === 'COMPANY'} onChange={() => onChange({ ...value, tipo: 'COMPANY' })} />
            <span className="min-w-0 text-sm [overflow-wrap:anywhere]">
              <span className="flex items-center gap-1.5 font-semibold text-ink"><FiBriefcase className="h-4 w-4 shrink-0" aria-hidden="true" /> A nombre de mi empresa</span>
              <span className="block text-ink-soft">{empresa.nombre}</span>
              <span className="block tabular-nums text-muted">RIF {empresa.rif}</span>
              {empresa.domicilio && <span className="block text-muted">{empresa.domicilio}</span>}
            </span>
          </label>

          {value.tipo === 'COMPANY' && !empresa.domicilio && (
            <div>
              <label htmlFor="factura-domicilio" className={adminLabel}>Domicilio fiscal de la empresa</label>
              <textarea
                id="factura-domicilio"
                value={value.domicilio}
                onChange={(e) => onChange({ ...value, domicilio: e.target.value })}
                maxLength={DOMICILIO_MAX}
                rows={2}
                aria-invalid={Boolean(error)}
                aria-describedby="factura-domicilio-ayuda"
                className={`${adminInput(Boolean(error))} h-auto py-2`}
                placeholder="Como aparece en el RIF"
              />
              <p id="factura-domicilio-ayuda" className={adminHint}>Solo te lo pedimos una vez: queda guardado en Mi perfil → Empresa.</p>
            </div>
          )}
        </fieldset>
      ) : (
        <div className="space-y-1 text-sm [overflow-wrap:anywhere]">
          <p className="text-ink-soft">Va a tu nombre:</p>
          <p className="font-semibold text-ink">{nombre || 'Tu nombre'}</p>
          {cedula && <p className="tabular-nums text-muted">Cédula {cedula}</p>}
          <p className={adminHint}>
            ¿Compras para una empresa?{' '}
            <Link href="/customer/profile?tab=empresa" className="font-semibold text-brand-600 hover:text-brand-700">Verifícala en Mi perfil</Link>{' '}
            y podrás pedir la factura a su nombre.
          </p>
        </div>
      )}

      {error && <p role="alert" className="text-sm font-medium text-deal">{error}</p>}
    </section>
  );
}
