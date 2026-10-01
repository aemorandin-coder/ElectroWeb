'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiCheckCircle, FiPrinter } from 'react-icons/fi';
import { adminCard, adminError, adminInput, adminLabel, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

// Lo que el cliente hace con su cotización (C-148): imprimirla o guardarla en PDF, y dar su conformidad.

export function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className={adminSecondaryButton}>
      <FiPrinter className="h-4 w-4" aria-hidden="true" />
      Imprimir o guardar en PDF
    </button>
  );
}

export function AprobarCotizacion({ token, total }: { token: string; total: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<{ campo?: string; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const aprobar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/cotizaciones/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, documento, acepta }) });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ campo: datos.field, texto: datos.error || 'No se pudo aprobar. Intenta de nuevo.' });
        return;
      }
      toast.success('Presupuesto aprobado. Te escribimos para coordinar el pago y la entrega.');
      router.refresh();
    } catch {
      setError({ texto: 'Sin conexión. Intenta de nuevo.' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={aprobar} noValidate className={`${adminCard} mx-auto mt-4 max-w-4xl print:hidden`} aria-labelledby="aprobar-titulo">
      <h2 id="aprobar-titulo" className="flex items-center gap-2 text-lg font-semibold text-ink">
        <FiCheckCircle className="h-5 w-5 text-success-strong" aria-hidden="true" />
        ¿De acuerdo? Aprueba el presupuesto
      </h2>
      <p className="mt-1 text-sm text-muted">Al aprobarlo le avisamos al equipo y te escribimos para coordinar el pago y la entrega. No se cobra nada aquí.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="aprobar-nombre" className={adminLabel}>Nombre y apellido</label>
          <input id="aprobar-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} autoComplete="name" className={adminInput(error?.campo === 'nombre')} disabled={enviando} />
        </div>
        <div>
          <label htmlFor="aprobar-documento" className={adminLabel}>Cédula, o RIF de la empresa</label>
          <input id="aprobar-documento" value={documento} onChange={(e) => setDocumento(e.target.value)} maxLength={20} className={adminInput(error?.campo === 'documento')} disabled={enviando} />
        </div>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-ink">
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500" />
        <span>Estoy de acuerdo con este presupuesto por {total} y con sus condiciones.</span>
      </label>
      {error && <p className={`${adminError} mt-3`} role="alert">{error.texto}</p>}
      <button type="submit" disabled={enviando} className={`${adminPrimaryButton} mt-4 w-full sm:w-auto`}>{enviando ? 'Enviando…' : 'Aprobar presupuesto'}</button>
    </form>
  );
}
