'use client';

// Historial de una solicitud de garantía (C-122). Lo usan el panel del cliente y el del equipo.

import Image from 'next/image';
import { FiLock } from 'react-icons/fi';
import { CLAIM_STATUS_CUSTOMER, CLAIM_STATUS_LABEL, type ClaimStatus } from '@/lib/warranty';

export interface EventoGarantia {
  id: string;
  kind: 'CREATED' | 'STATUS' | 'MESSAGE' | 'NOTE';
  byCustomer: boolean;
  /** Solo en la vista del equipo */
  authorName?: string | null;
  status: ClaimStatus | null;
  message: string | null;
  photos: string[];
  createdAt: string;
}

const cuando = (iso: string) => new Date(iso).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Fotos privadas: se abren en otra pestaña (el enlace pide la sesión del cliente o del equipo) */
export function Fotos({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <li key={url}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="relative block h-20 w-20 overflow-hidden rounded-lg border border-line bg-surface focus-visible:outline-2 focus-visible:outline-brand-500">
            <Image src={url} alt={`Foto ${i + 1}`} fill sizes="80px" className="object-cover" unoptimized />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function Historial({ eventos, vista }: { eventos: EventoGarantia[]; vista: 'cliente' | 'equipo' }) {
  const etiquetas = vista === 'cliente' ? CLAIM_STATUS_CUSTOMER : CLAIM_STATUS_LABEL;
  return (
    <ol className="mt-3 space-y-3">
      {eventos.map((e) => {
        if (e.kind === 'STATUS') {
          return (
            <li key={e.id} className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span className="h-px w-4 bg-line" aria-hidden="true" />
              <span>Estado: <strong className="font-semibold text-ink-soft">{e.status ? etiquetas[e.status] : ''}</strong></span>
              <span>· {cuando(e.createdAt)}</span>
            </li>
          );
        }
        const deCliente = e.byCustomer;
        const nota = e.kind === 'NOTE';
        const quien = deCliente
          ? (vista === 'cliente' ? 'Tú' : e.authorName || 'Cliente')
          : vista === 'cliente' ? 'Electro Shop' : e.authorName || 'Equipo';
        return (
          <li key={e.id} className={`rounded-xl border p-3 ${nota ? 'border-warning/40 bg-warning/10' : deCliente ? 'border-line bg-white' : 'border-brand-200 bg-brand-50'}`}>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span className="font-semibold text-ink-soft">{quien}</span>
              {nota && <span className="inline-flex items-center gap-1 font-semibold text-warning-strong"><FiLock className="h-3 w-3" aria-hidden="true" /> Nota interna</span>}
              {e.kind === 'CREATED' && <span>· abrió la solicitud</span>}
              <span>· {cuando(e.createdAt)}</span>
            </p>
            {e.message && <p className="mt-1 whitespace-pre-line text-sm text-ink">{e.message}</p>}
            <Fotos urls={e.photos} />
          </li>
        );
      })}
    </ol>
  );
}
