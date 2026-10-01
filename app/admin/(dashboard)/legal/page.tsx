'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiDownload, FiEdit3, FiEye, FiFileText, FiPlus, FiRefreshCw, FiSearch, FiShield, FiX } from 'react-icons/fi';
import {
  adminBadge, adminChoice, adminError, adminHint, adminIconButton, adminInput, adminLabel, adminModalBody, adminModalFooter,
  adminModalHeader, adminModalOverlay, adminModalPanel, adminModalTitle, adminNotice, adminPageHeader, adminPageSubtitle,
  adminPageTitle, adminPrimaryButton, adminSecondaryButton, adminTab,
} from '@/lib/admin-ui';
import { useSession } from 'next-auth/react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { hasPermission } from '@/lib/auth-helpers';
import { TextoDocumento } from '@/components/legal/SignDocumentModal';

// Legal (C-103): firmas de los clientes con su constancia en PDF, y los documentos con sus versiones.
// Antes: una sola lista de "términos del saldo", la firma en base64 en cada fila, "Reenviar términos" que BORRABA
// la prueba legal y una descarga en HTML armada en el navegador.

interface Firma {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  idNumber: string;
  phone: string | null;
  address: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  signedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  contentHash: string;
  pdfHash: string;
  document: { id: string; slug: string; title: string; version: number; isCurrent: boolean };
}
interface Documento {
  id: string;
  slug: string;
  version: number;
  title: string;
  content: string;
  contentHash: string;
  requiredFor: string | null;
  isCurrent: boolean;
  publishedAt: string;
  signatures: number;
}

const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Caracas' });
const csv = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function LegalPage() {
  const [tab, setTab] = useState<'firmas' | 'documentos'>('firmas');
  // C-141: publicar documentos es configuración sensible (solo el super admin); el Administrador los lee
  const { data: session } = useSession();
  const puedePublicar = hasPermission(session, 'MANAGE_SETTINGS');

  // Firmas
  const [firmas, setFirmas] = useState<Firma[]>([]);
  const [pagina, setPagina] = useState({ page: 1, totalPages: 1, total: 0 });
  const [buscar, setBuscar] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<'' | 'vigentes' | 'revocadas'>('');
  const [cargando, setCargando] = useState(true);
  const [recargas, setRecargas] = useState(0);
  const [viendo, setViendo] = useState<Firma | null>(null);
  const [motivo, setMotivo] = useState('');
  const [pidiendo, setPidiendo] = useState(false);

  // Documentos
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [legado, setLegado] = useState(0);
  const [opciones, setOpciones] = useState<Record<string, string>>({});
  const [editor, setEditor] = useState<{ slug: string; title: string; content: string; requiredFor: string } | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [publicando, setPublicando] = useState(false);

  useBodyScrollLock(viendo !== null || editor !== null);

  useEffect(() => {
    let vigente = true;
    const params = new URLSearchParams({ page: String(pagina.page), search: busqueda, ...(estado ? { estado } : {}) });
    fetch(`/api/admin/legal/firmas?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((data) => {
        if (!vigente) return;
        setFirmas(data.signatures);
        setPagina((p) => ({ ...p, totalPages: data.pagination.totalPages, total: data.pagination.total }));
      })
      .catch(() => { if (vigente) toast.error('No se pudieron cargar las firmas'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [pagina.page, busqueda, estado, recargas]);

  useEffect(() => {
    let vigente = true;
    fetch('/api/admin/legal/documentos')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((data) => {
        if (!vigente) return;
        setDocumentos(data.documents);
        setLegado(data.legacyPending);
        setOpciones(data.requiredOptions ?? {});
      })
      .catch(() => { if (vigente) toast.error('No se pudieron cargar los documentos'); });
    return () => { vigente = false; };
  }, [recargas]);

  const vigentes = documentos.filter((d) => d.isCurrent);

  const exportarCSV = async () => {
    toast.loading('Generando CSV…', { id: 'csv' });
    try {
      const filas: Firma[] = [];
      for (let page = 1; page <= 50; page++) {
        const r = await fetch(`/api/admin/legal/firmas?${new URLSearchParams({ page: String(page), limit: '200', search: busqueda, ...(estado ? { estado } : {}) })}`);
        if (!r.ok) throw new Error();
        const data = await r.json();
        filas.push(...data.signatures);
        if (page >= data.pagination.totalPages) break;
      }
      if (filas.length === 0) { toast.error('No hay firmas para exportar', { id: 'csv' }); return; }
      const lineas = [
        'Constancia,Documento,Versión,Nombre,Correo,Cédula,Teléfono,Dirección,IP,Navegador,Fecha,Estado,Motivo,Huella del texto,Huella del PDF',
        ...filas.map((f) => [f.id, f.document.title, f.document.version, f.userName, f.userEmail, f.idNumber, f.phone, f.address, f.ipAddress, f.userAgent,
          fechaHora(f.signedAt), f.revokedAt ? 'Pedida de nuevo' : 'Vigente', f.revokedReason, f.contentHash, f.pdfHash].map(csv).join(',')),
      ];
      const url = URL.createObjectURL(new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `registro-legal-firmas-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${filas.length} firmas exportadas`, { id: 'csv' });
    } catch {
      toast.error('No se pudo exportar', { id: 'csv' });
    }
  };

  const pedirDeNuevo = async () => {
    if (!viendo) return;
    setPidiendo(true);
    try {
      const r = await fetch(`/api/admin/legal/firmas/${viendo.id}/revocar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motivo }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(data.error || 'No se pudo'); return; }
      toast.success('Listo: se le avisó al cliente. La firma anterior queda como historial.');
      setViendo(null);
      setMotivo('');
      setRecargas((n) => n + 1);
    } finally {
      setPidiendo(false);
    }
  };

  const publicar = async () => {
    if (!editor) return;
    setPublicando(true);
    setErrores({});
    try {
      const r = await fetch('/api/admin/legal/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: editor.slug || undefined, title: editor.title, content: editor.content, requiredFor: editor.requiredFor || null }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setErrores(data.fields ?? {}); toast.error(data.error || 'No se pudo publicar'); return; }
      toast.success(`Publicada la versión ${data.document.version}`);
      setEditor(null);
      setRecargas((n) => n + 1);
    } finally {
      setPublicando(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Legal</h1>
          <p className={adminPageSubtitle}>Documentos que firman los clientes y sus constancias</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-line pb-2" role="tablist" aria-label="Secciones de legal">
        <button type="button" role="tab" aria-selected={tab === 'firmas'} onClick={() => setTab('firmas')} className={adminTab(tab === 'firmas')}>
          <FiShield className="h-4 w-4" aria-hidden="true" /> Firmas
        </button>
        <button type="button" role="tab" aria-selected={tab === 'documentos'} onClick={() => setTab('documentos')} className={adminTab(tab === 'documentos')}>
          <FiFileText className="h-4 w-4" aria-hidden="true" /> Documentos
        </button>
      </div>

      {legado > 0 && (
        <p className={adminNotice('warning')}>
          {legado} {legado === 1 ? 'firma de antes todavía no tiene' : 'firmas de antes todavía no tienen'} constancia en PDF. Siguen valiendo;
          para verlas aquí, corre en el servidor <code className="font-mono">npx tsx scripts/migrar-firmas-saldo.ts --apply</code>.
        </p>
      )}

      {tab === 'firmas' ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); setCargando(true); setPagina((p) => ({ ...p, page: 1 })); setBusqueda(buscar.trim()); }}>
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input type="search" aria-label="Buscar firmas" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre, correo o cédula" className={`${adminInput()} pl-9`} />
            </form>
            <div className="flex flex-wrap gap-2">
              {([['', 'Todas'], ['vigentes', 'Vigentes'], ['revocadas', 'Pedidas de nuevo']] as const).map(([v, l]) => (
                <button key={v} type="button" aria-pressed={estado === v} onClick={() => { setCargando(true); setEstado(v); setPagina((p) => ({ ...p, page: 1 })); }}
                  className={`${adminChoice(estado === v)} min-h-11 px-3 text-sm`}>{l}</button>
              ))}
              <button type="button" onClick={exportarCSV} className={adminSecondaryButton}><FiDownload className="h-4 w-4" aria-hidden="true" /> CSV</button>
              <button type="button" onClick={() => { setCargando(true); setRecargas((n) => n + 1); }} className={`${adminIconButton} h-11 w-11 border border-line bg-white`} aria-label="Actualizar">
                <FiRefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          {cargando && firmas.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Cargando…</p>
          ) : firmas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">No hay firmas {busqueda ? `para "${busqueda}"` : 'todavía'}.</div>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {firmas.map((f) => (
                <li key={f.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{f.userName}</span>
                      <span className="font-mono text-sm text-muted">{f.idNumber}</span>
                      {f.revokedAt ? <span className={adminBadge('warning')}>Pedida de nuevo</span>
                        : f.document.isCurrent ? <span className={adminBadge('success')}>Vigente</span>
                          : <span className={adminBadge('neutral')}>Versión anterior</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{f.document.title} · v{f.document.version} · {fechaHora(f.signedAt)} · {f.userEmail}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setViendo(f); setMotivo(''); }} className={adminSecondaryButton}><FiEye className="h-4 w-4" aria-hidden="true" /> Ver</button>
                    <a href={`/api/legal/firmas/${f.id}/pdf`} className={adminSecondaryButton} aria-label={`Descargar la constancia de ${f.userName}`}><FiDownload className="h-4 w-4" aria-hidden="true" /> PDF</a>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {pagina.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted">
              <span>{pagina.total} firmas</span>
              <div className="flex gap-2">
                <button type="button" disabled={pagina.page <= 1} onClick={() => setPagina((p) => ({ ...p, page: p.page - 1 }))} className={adminSecondaryButton}>Anterior</button>
                <span className="self-center">{pagina.page} / {pagina.totalPages}</span>
                <button type="button" disabled={pagina.page >= pagina.totalPages} onClick={() => setPagina((p) => ({ ...p, page: p.page + 1 }))} className={adminSecondaryButton}>Siguiente</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">{puedePublicar ? 'Publicar una versión nueva pide la firma otra vez a todos. Las firmas anteriores se conservan.' : 'Solo un super admin publica documentos o versiones nuevas.'}</p>
            {puedePublicar && (
              <button type="button" onClick={() => { setErrores({}); setVistaPrevia(false); setEditor({ slug: '', title: '', content: '', requiredFor: '' }); }} className={adminPrimaryButton}>
                <FiPlus className="h-4 w-4" aria-hidden="true" /> Nuevo documento
              </button>
            )}
          </div>
          <ul className="space-y-3">
            {vigentes.map((d) => {
              const anteriores = documentos.filter((x) => x.slug === d.slug && !x.isCurrent);
              return (
                <li key={d.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{d.title}</span>
                        <span className={adminBadge('brand')}>Versión {d.version}</span>
                        {d.requiredFor && <span className={adminBadge('warning')}>Necesario para: {opciones[d.requiredFor] ?? d.requiredFor}</span>}
                      </p>
                      <p className="text-sm text-muted">Publicada {fechaHora(d.publishedAt)} · {d.signatures} {d.signatures === 1 ? 'firma' : 'firmas'} · Huella {d.contentHash.slice(0, 12)}…</p>
                    </div>
                    {puedePublicar && (
                      <button type="button" onClick={() => { setErrores({}); setVistaPrevia(false); setEditor({ slug: d.slug, title: d.title, content: d.content, requiredFor: d.requiredFor ?? '' }); }} className={adminSecondaryButton}>
                        <FiEdit3 className="h-4 w-4" aria-hidden="true" /> Nueva versión
                      </button>
                    )}
                  </div>
                  {anteriores.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-brand-600">Versiones anteriores ({anteriores.length})</summary>
                      <ul className="mt-2 space-y-1 text-sm text-muted">
                        {anteriores.map((a) => <li key={a.id}>v{a.version} · {fechaHora(a.publishedAt)} · {a.signatures} {a.signatures === 1 ? 'firma' : 'firmas'}</li>)}
                      </ul>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {viendo && createPortal(
        <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="firma-titulo" onKeyDown={(e) => { if (e.key === 'Escape') setViendo(null); }}>
          <div className={`${adminModalPanel} max-w-xl`}>
            <div className={adminModalHeader}>
              <h2 id="firma-titulo" className={adminModalTitle}>Constancia de firma</h2>
              <button type="button" onClick={() => setViendo(null)} className={`${adminIconButton} h-11 w-11`} aria-label="Cerrar"><FiX className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <div className={`${adminModalBody} space-y-4`}>
              <div className="rounded-xl border border-line bg-surface p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por la API con sesión */}
                <img src={`/api/legal/firmas/${viendo.id}/imagen`} alt={`Firma de ${viendo.userName}`} className="mx-auto max-h-40 w-auto" />
              </div>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                {([
                  ['Cliente', viendo.userName], ['Cédula', viendo.idNumber], ['Correo', viendo.userEmail], ['Teléfono', viendo.phone],
                  ['Dirección', viendo.address], ['Documento', `${viendo.document.title} · v${viendo.document.version}`],
                  ['Fecha', fechaHora(viendo.signedAt)], ['IP', viendo.ipAddress],
                ] as const).map(([k, v]) => (
                  <div key={k} className="min-w-0"><dt className="text-xs text-muted">{k}</dt><dd className="break-words text-ink">{v || '—'}</dd></div>
                ))}
              </dl>
              <p className="break-all text-xs text-muted">Huella del texto: {viendo.contentHash}<br />Huella del PDF: {viendo.pdfHash}</p>
              {viendo.revokedAt ? (
                <p className={adminNotice('warning')}>Pedida de nuevo el {fechaHora(viendo.revokedAt)}: {viendo.revokedReason}</p>
              ) : (
                <div className="space-y-2 rounded-xl border border-line p-3">
                  <label htmlFor="motivo" className={adminLabel}>Pedirle que firme de nuevo</label>
                  <input id="motivo" className={adminInput()} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} placeholder="Ej.: la cédula no coincide con el pago" />
                  <p className={adminHint}>El cliente recibe el aviso con este motivo. Esta firma se conserva como historial.</p>
                  <button type="button" onClick={pedirDeNuevo} disabled={pidiendo || motivo.trim().length < 5} className={adminSecondaryButton}>
                    <FiAlertTriangle className="h-4 w-4" aria-hidden="true" /> {pidiendo ? 'Enviando…' : 'Pedir firma de nuevo'}
                  </button>
                </div>
              )}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setViendo(null)} className={adminSecondaryButton}>Cerrar</button>
              <a href={`/api/legal/firmas/${viendo.id}/pdf`} className={adminPrimaryButton}><FiDownload className="h-4 w-4" aria-hidden="true" /> Descargar PDF</a>
            </div>
          </div>
        </div>,
        document.body
      )}

      {editor && createPortal(
        <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="doc-titulo" onKeyDown={(e) => { if (e.key === 'Escape' && !publicando) setEditor(null); }}>
          <div className={`${adminModalPanel} max-w-3xl`}>
            <div className={adminModalHeader}>
              <h2 id="doc-titulo" className={adminModalTitle}>{editor.slug ? 'Nueva versión' : 'Nuevo documento'}</h2>
              <button type="button" onClick={() => setEditor(null)} className={`${adminIconButton} h-11 w-11`} aria-label="Cerrar"><FiX className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <div className={`${adminModalBody} space-y-4`}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_16rem]">
                <div>
                  <label htmlFor="doc-title" className={adminLabel}>Título</label>
                  <input id="doc-title" className={adminInput(Boolean(errores.title))} value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} maxLength={150} />
                  {errores.title && <p className={adminError}>{errores.title}</p>}
                </div>
                <div>
                  <label htmlFor="doc-req" className={adminLabel}>Se exige para</label>
                  <select id="doc-req" className={adminInput()} value={editor.requiredFor} onChange={(e) => setEditor({ ...editor, requiredFor: e.target.value })}>
                    <option value="">Nada (solo constancia)</option>
                    {Object.entries(opciones).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="doc-content" className={adminLabel}>Texto</label>
                  <button type="button" onClick={() => setVistaPrevia((v) => !v)} className="min-h-11 px-2 text-sm font-semibold text-brand-600">{vistaPrevia ? 'Editar' : 'Vista previa'}</button>
                </div>
                {vistaPrevia ? (
                  <div className="max-h-96 overflow-y-auto rounded-lg border border-line p-4"><TextoDocumento content={editor.content} /></div>
                ) : (
                  <textarea id="doc-content" rows={16} className={`${adminInput(Boolean(errores.content))} h-auto py-2 font-mono text-xs`} value={editor.content} onChange={(e) => setEditor({ ...editor, content: e.target.value })} />
                )}
                {errores.content ? <p className={adminError}>{errores.content}</p> : (
                  <p className={adminHint}>&quot;## &quot; al inicio = título · &quot;- &quot; = viñeta · &quot;!! &quot; = aviso en rojo · línea en blanco = párrafo nuevo.</p>
                )}
              </div>
              {editor.slug && <p className={adminNotice('warning')}>Al publicar, todos los clientes tendrán que firmar esta versión{editor.requiredFor ? ` antes de ${(opciones[editor.requiredFor] ?? '').toLowerCase()}` : ''}.</p>}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setEditor(null)} disabled={publicando} className={adminSecondaryButton}>Cancelar</button>
              <button type="button" onClick={publicar} disabled={publicando} className={adminPrimaryButton}>{publicando ? 'Publicando…' : 'Publicar'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
