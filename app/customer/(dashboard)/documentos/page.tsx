'use client';

import { useEffect, useState } from 'react';
import { IconoConfirmado, IconoDescargar, IconoDocumento, IconoReloj } from '@/components/iconos';
import { adminBadge, adminDato, adminPrimaryButton, adminSecondaryButton, avisoAccion } from '@/lib/admin-ui';

import SignDocumentModal from '@/components/legal/SignDocumentModal';

// Mis documentos (C-103): lo que el cliente firmó, con su constancia en PDF, y lo que falta firmar.

interface DocumentoCliente {
  slug: string;
  title: string;
  version: number;
  requiredFor: string | null;
  signed: boolean;
  signatureId: string | null;
  signedAt: string | null;
  legacy: boolean;
}
interface FirmaAnterior { id: string; title: string; version: number; signedAt: string; revoked: boolean }

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });

export default function DocumentosPage() {
  const [docs, setDocs] = useState<DocumentoCliente[] | null>(null);
  const [historial, setHistorial] = useState<FirmaAnterior[]>([]);
  const [error, setError] = useState(false);
  const [firmando, setFirmando] = useState<string | null>(null);
  const [recargas, setRecargas] = useState(0);

  useEffect(() => {
    let vigente = true;
    fetch('/api/legal/documentos')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((data) => { if (vigente) { setDocs(data.documents); setHistorial(data.history); setError(false); } })
      .catch(() => { if (vigente) setError(true); });
    return () => { vigente = false; };
  }, [recargas]);

  const pendientes = docs?.filter((d) => !d.signed) ?? [];

  return (
    <div className="space-y-4">
      {/* C-265: la cabecera de la página, sin tarjeta (antes era una tarjeta con su placa dentro del marco blanco) */}
      <header>
        <h1 className="text-xl font-bold text-ink lg:text-2xl">Mis documentos</h1>
        <p className="mt-0.5 text-sm text-ink-soft">Los documentos que firmaste, con su constancia en PDF.</p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-line bg-white p-6 text-center text-sm text-ink">
          No se pudieron cargar tus documentos.
          <button type="button" onClick={() => setRecargas((n) => n + 1)} className={`${adminSecondaryButton} ml-2`}>Reintentar</button>
        </div>
      ) : !docs ? (
        <div className="flex justify-center p-10" role="status" aria-label="Cargando"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
      ) : (
        <>
          {pendientes.length > 0 && (
            // C-251b: lo que alguien tiene que hacer, con el ícono en su placa (PLAN.md §1.1)
            <p className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${avisoAccion}`}>
              <IconoDocumento aria-hidden="true" />
              Tienes {pendientes.length === 1 ? 'un documento' : `${pendientes.length} documentos`} por firmar.
            </p>
          )}
          {/* C-265: en dos columnas desde 1280 px, cada documento del tamaño de lo que lleva */}
          <ul className="grid gap-3 xl:grid-cols-2">
            {docs.map((d) => (
              <li key={d.slug} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${d.signed ? 'bg-success-strong/10 text-success-strong' : 'bg-brand-500 text-white'}`}>
                  {d.signed ? <IconoConfirmado className="h-5 w-5" aria-hidden="true" /> : <IconoReloj className="h-5 w-5" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{d.title}</p>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span>Versión {d.version}</span>
                    {/* C-251b: un dato, en gris (PLAN.md §1.8) */}
                    {d.requiredFor && <span className={adminDato}>Necesario para: {d.requiredFor}</span>}
                    {d.signed
                      ? <span className={adminBadge('success')}>{d.signedAt ? `Firmado el ${fecha(d.signedAt)}` : 'Firmado'}</span>
                      : <span className={adminBadge('warning')}>Por firmar</span>}
                  </p>
                  {d.legacy && <p className="mt-1 text-xs text-muted">Lo firmaste antes de que guardáramos las constancias en PDF. La constancia aparecerá aquí pronto.</p>}
                </div>
                {d.signed ? (
                  d.signatureId && (
                    <a href={`/api/legal/firmas/${d.signatureId}/pdf`} className={adminSecondaryButton}>
                      <IconoDescargar className="h-4 w-4" aria-hidden="true" /> Descargar PDF
                    </a>
                  )
                ) : (
                  <button type="button" onClick={() => setFirmando(d.slug)} className={adminPrimaryButton}>Leer y firmar</button>
                )}
              </li>
            ))}
          </ul>

          {historial.length > 0 && (
            <section className="max-w-3xl rounded-2xl border border-line bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-ink">Versiones anteriores que firmaste</h2>
              <ul className="divide-y divide-line">
                {historial.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="text-ink-soft">{f.title} · v{f.version} · {fecha(f.signedAt)}</span>
                    <a href={`/api/legal/firmas/${f.id}/pdf`} className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-600">
                      <IconoDescargar className="h-4 w-4" aria-hidden="true" /> PDF
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {firmando && (
        <SignDocumentModal
          slug={firmando}
          isOpen
          onClose={() => setFirmando(null)}
          onSigned={() => { setFirmando(null); setRecargas((n) => n + 1); }}
        />
      )}
    </div>
  );
}
