'use client';

import { adminInput } from '@/lib/admin-ui';
import { PAISES_TELEFONO, TIPOS_DOCUMENTO } from '@/lib/validations/registro';

// Teléfono y cédula con el formato que validan lib/validations/registro.ts y las APIs (C-84, C-85).
// Los usan el registro y el checkout. Solo pintan los controles: la etiqueta y el error los pone quien los usa.

// Selector corto junto al número: adminInput() trae w-full y lo estiraba a todo el ancho
const selectCorto =
  'h-11 shrink-0 rounded-lg border border-line bg-white px-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-surface';

type Aria = { 'aria-invalid'?: boolean; 'aria-describedby'?: string };

export function ControlTelefono({
  id,
  codigo,
  numero,
  onCodigo,
  onNumero,
  onBlur,
  error,
  disabled,
  aria,
}: {
  id: string;
  codigo: string;
  numero: string;
  onCodigo: (valor: string) => void;
  onNumero: (valor: string) => void;
  onBlur?: () => void;
  error?: boolean;
  disabled?: boolean;
  aria?: Aria;
}) {
  return (
    <div className="flex gap-2">
      <select
        aria-label="Código de país"
        value={codigo}
        onChange={(e) => onCodigo(e.target.value)}
        className={`${selectCorto} w-28`}
        disabled={disabled}
      >
        {PAISES_TELEFONO.map((p) => (
          <option key={p.codigo} value={p.codigo} title={p.pais}>
            {p.corto} {p.codigo}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        maxLength={16}
        value={numero}
        onChange={(e) => onNumero(e.target.value.replace(/[^\d\s-]/g, ''))}
        onBlur={onBlur}
        className={adminInput(Boolean(error))}
        placeholder={codigo === '+58' ? '0412 123 4567' : 'Número'}
        disabled={disabled}
        {...aria}
      />
    </div>
  );
}

export function ControlDocumento({
  id,
  tipo,
  numero,
  onTipo,
  onNumero,
  onBlur,
  error,
  disabled,
  aria,
}: {
  id: string;
  tipo: string;
  numero: string;
  onTipo: (valor: string) => void;
  onNumero: (valor: string) => void;
  onBlur?: () => void;
  error?: boolean;
  disabled?: boolean;
  aria?: Aria;
}) {
  return (
    <div className="flex gap-2">
      <select aria-label="Tipo de documento" value={tipo} onChange={(e) => onTipo(e.target.value)} className={`${selectCorto} w-16`} disabled={disabled}>
        {TIPOS_DOCUMENTO.map((t) => (
          <option key={t.letra} value={t.letra} title={t.nombre}>
            {t.letra}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="text"
        inputMode={tipo === 'P' ? 'text' : 'numeric'}
        autoComplete="off"
        autoCapitalize="characters"
        maxLength={15}
        value={numero}
        onChange={(e) => onNumero(tipo === 'P' ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : e.target.value.replace(/\D/g, ''))}
        onBlur={onBlur}
        className={adminInput(Boolean(error))}
        placeholder={tipo === 'P' ? 'Número de pasaporte' : '12345678'}
        disabled={disabled}
        {...aria}
      />
    </div>
  );
}

export const AYUDA_DOCUMENTO = 'V venezolano, E extranjero, P pasaporte, J o G RIF. Revísala: luego no se puede cambiar.';
