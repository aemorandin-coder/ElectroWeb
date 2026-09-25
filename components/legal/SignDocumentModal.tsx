'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiCheck, FiDownload, FiFileText, FiX } from 'react-icons/fi';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  adminError, adminHint, adminInput, adminLabel, adminModalOverlay, adminModalPanel, adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';
import { parsearDocumento } from '@/lib/legal-docs-core';
import { RESORTES, avanzarResorte, crearResorte, prefiereMenosMovimiento } from '@/lib/motion/resorte';
import SignaturePad, { type SignaturePadHandle } from './SignaturePad';

interface Documento {
  slug: string;
  title: string;
  version: number;
  content: string;
  contentHash: string;
  requiredFor: string | null;
  publishedAt: string;
}

interface SignDocumentModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  onSigned: () => void;
}

const LARGO_MINIMO = 120; // px de trazo: un garabato corto o un punto no es una firma

/** Contenido del documento con el formato de lib/legal-docs-core (sin HTML) */
export function TextoDocumento({ content }: { content: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-ink-soft">
      {parsearDocumento(content).map((b, i) => {
        if (b.tipo === 'subtitulo') return <h3 key={i} className="pt-2 text-sm font-bold text-ink">{b.texto}</h3>;
        if (b.tipo === 'aviso') return <p key={i} className="rounded-lg border border-deal/30 bg-deal-bg p-3 font-semibold text-deal">{b.texto}</p>;
        if (b.tipo === 'lista') return <ul key={i} className="list-disc space-y-1 pl-6">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
        return <p key={i}>{b.texto}</p>;
      })}
    </div>
  );
}

/** Check que aparece con un rebote de resorte al terminar (C-89); quieto si el sistema pide menos movimiento */
function CheckRebote() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefiereMenosMovimiento()) { el.style.transform = 'scale(1)'; return; }
    const r = crearResorte(0.3);
    r.destino = 1;
    let frame = 0;
    let t = performance.now();
    const paso = (ahora: number) => {
      const quieto = avanzarResorte(r, (ahora - t) / 1000, RESORTES.rebote);
      t = ahora;
      el.style.transform = `scale(${r.valor})`;
      if (!quieto) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <span ref={ref} className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-strong text-white" style={{ transform: 'scale(0.3)' }}>
      <FiCheck className="h-8 w-8" aria-hidden="true" />
    </span>
  );
}

/**
 * Leer y firmar un documento legal (C-103). Reemplaza a BalanceTermsModal, que solo servía para los términos
 * del saldo, no guardaba el documento y dejaba la firma en la base como texto sin validar.
 */
export default function SignDocumentModal({ slug, isOpen, onClose, onSigned }: SignDocumentModalProps) {
  const tituloId = useId();
  const [doc, setDoc] = useState<Documento | null>(null);
  const [error, setError] = useState('');
  const [paso, setPaso] = useState<'leer' | 'firmar' | 'listo'>('leer');
  const [leido, setLeido] = useState(false);
  const [acepto, setAcepto] = useState(false);
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [largo, setLargo] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [firmaId, setFirmaId] = useState<string | null>(null);
  const [recargas, setRecargas] = useState(0);
  const textoRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    let vigente = true;
    fetch(`/api/legal/documentos/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((data) => {
        if (!vigente) return;
        setDoc(data.document);
        setIdNumber((v) => v || data.profile?.idNumber || '');
        setPhone((v) => v || data.profile?.phone || '');
        setAddress((v) => v || data.profile?.address || '');
        setError('');
      })
      .catch(() => { if (vigente) setError('No se pudo cargar el documento. Revisa tu conexión.'); });
    return () => { vigente = false; };
  }, [isOpen, slug, recargas]);

  // Textos cortos: si no hay nada que desplazar, ya se leyó
  useEffect(() => {
    const el = textoRef.current;
    if (el && doc && el.scrollHeight <= el.clientHeight + 10) setLeido(true);
  }, [doc]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !enviando) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, enviando, onClose]);

  const onChangeFirma = useCallback((l: number) => setLargo(l), []);

  const enviar = async () => {
    if (!doc) return;
    const nuevos: Record<string, string> = {};
    if (!/^[VvEe]?\d{6,9}$/.test(idNumber.replace(/[\s.-]/g, ''))) nuevos.idNumber = 'V o E y 6 a 9 números. Ej.: V12345678';
    if (largo < LARGO_MINIMO) nuevos.signature = 'Firma en el recuadro (un trazo completo, no un punto)';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/legal/documentos/${encodeURIComponent(doc.slug)}/firmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentHash: doc.contentHash, idNumber, phone, address, signature: padRef.current?.toDataURL() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.code === 'DOCUMENTO_CAMBIO') {
        toast.error(data.error);
        setPaso('leer'); setLeido(false); setAcepto(false); setRecargas((n) => n + 1);
        return;
      }
      if (res.status === 409 && data.code === 'YA_FIRMADO') { onSigned(); return; }
      if (!res.ok) {
        if (data.field) setErrores({ [data.field]: data.error });
        toast.error(data.error || 'No se pudo firmar');
        return;
      }
      setFirmaId(data.signatureId);
      setPaso('listo');
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby={tituloId}>
      <div className={`${adminModalPanel} max-w-2xl`}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><FiFileText className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 id={tituloId} className="truncate text-base font-bold text-ink">{doc?.title ?? 'Documento'}</h2>
              <p className="text-xs text-muted">
                {paso === 'leer' ? 'Paso 1 de 2: léelo completo' : paso === 'firmar' ? 'Paso 2 de 2: tus datos y tu firma' : 'Firmado'}
                {doc ? ` · Versión ${doc.version}` : ''}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={enviando} className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-surface" aria-label="Cerrar">
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {error ? (
          <div className="p-6 text-center">
            <FiAlertTriangle className="mx-auto mb-2 h-8 w-8 text-warning-strong" aria-hidden="true" />
            <p className="text-sm text-ink">{error}</p>
            <button type="button" onClick={() => setRecargas((n) => n + 1)} className={`${adminSecondaryButton} mt-4`}>Reintentar</button>
          </div>
        ) : !doc ? (
          <div className="flex justify-center p-10" role="status" aria-label="Cargando"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
        ) : paso === 'leer' ? (
          <>
            <div
              ref={textoRef}
              tabIndex={0}
              onScroll={(e) => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 12) setLeido(true); }}
              className="min-h-0 flex-1 overflow-y-auto px-5 py-4 focus-visible:outline-2 focus-visible:outline-brand-500"
              aria-label="Texto del documento"
            >
              <TextoDocumento content={doc.content} />
            </div>
            <div className="space-y-3 border-t border-line bg-surface px-5 py-4">
              {!leido && <p className="text-xs font-medium text-warning-strong">Desplázate hasta el final para continuar.</p>}
              <label className={`flex min-h-11 items-start gap-3 text-sm ${leido ? 'text-ink' : 'text-subtle'}`}>
                <input type="checkbox" className="mt-0.5 h-5 w-5" checked={acepto} disabled={!leido} onChange={(e) => setAcepto(e.target.checked)} />
                <span>Leí y acepto &quot;{doc.title}&quot;.</span>
              </label>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className={adminSecondaryButton}>Ahora no</button>
                <button type="button" disabled={!acepto} onClick={() => setPaso('firmar')} className={adminPrimaryButton}>Continuar a la firma</button>
              </div>
            </div>
          </>
        ) : paso === 'firmar' ? (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="firma-cedula" className={adminLabel}>Cédula</label>
                  <input id="firma-cedula" className={adminInput(Boolean(errores.idNumber))} value={idNumber} onChange={(e) => setIdNumber(e.target.value.toUpperCase())} placeholder="V12345678" autoComplete="off" maxLength={12} />
                  {errores.idNumber && <p className={adminError}>{errores.idNumber}</p>}
                </div>
                <div>
                  <label htmlFor="firma-telefono" className={adminLabel}>Teléfono (opcional)</label>
                  <input id="firma-telefono" type="tel" className={adminInput()} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="04121234567" maxLength={20} />
                </div>
              </div>
              <div>
                <label htmlFor="firma-direccion" className={adminLabel}>Dirección (opcional)</label>
                <input id="firma-direccion" className={adminInput()} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ciudad, estado" maxLength={200} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className={adminLabel}>Tu firma</span>
                  <button type="button" onClick={() => padRef.current?.clear()} className="min-h-11 px-2 text-sm font-semibold text-deal">Borrar</button>
                </div>
                <div className={`rounded-xl border-2 border-dashed p-1 ${errores.signature ? 'border-deal' : 'border-line'}`}>
                  <SignaturePad ref={padRef} onChange={onChangeFirma} label="Recuadro para firmar con el dedo, el lápiz o el mouse" />
                </div>
                {errores.signature ? <p className={adminError}>{errores.signature}</p> : <p className={adminHint}>Firma con el dedo o el mouse, como en tu cédula. La página no se mueve mientras firmas.</p>}
              </div>
              <p className="rounded-lg bg-surface p-3 text-xs text-muted">
                Guardamos la constancia en PDF con el texto exacto, tus datos, la fecha, la IP y tu firma. Podrás descargarla en Mis documentos.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface px-5 py-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPaso('leer')} disabled={enviando} className={adminSecondaryButton}>Volver al texto</button>
              <button type="button" onClick={enviar} disabled={enviando} className={adminPrimaryButton}>{enviando ? 'Firmando…' : 'Firmar'}</button>
            </div>
          </>
        ) : (
          <div className="space-y-4 px-5 py-8 text-center">
            <CheckRebote />
            <div>
              <p className="text-lg font-bold text-ink">Documento firmado</p>
              <p className="text-sm text-muted">Tu constancia quedó guardada. También está en Mis documentos.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              {firmaId && (
                <a href={`/api/legal/firmas/${firmaId}/pdf`} className={adminSecondaryButton}>
                  <FiDownload className="h-4 w-4" aria-hidden="true" /> Descargar PDF
                </a>
              )}
              <button type="button" onClick={onSigned} className={adminPrimaryButton}>Continuar</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
