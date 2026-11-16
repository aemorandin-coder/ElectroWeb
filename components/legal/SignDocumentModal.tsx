'use client';

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { IconoAdvertencia, IconoCerrar, IconoCheck, IconoDescargar, IconoDocumento, IconoEditar, IconoFlechaAbajo } from '@/components/iconos';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useFocoDeVuelta } from '@/lib/hooks/useFocoDeVuelta';
import {
  adminError, adminHint, adminInput, adminLabel, adminModalOverlay, adminModalPanel, adminPrimaryButton, adminSecondaryButton, avisoAccion,
} from '@/lib/admin-ui';
import { parsearDocumento, segmentosNegrita } from '@/lib/legal-docs-core';
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
  // Negritas de **texto** (C-160): sin HTML, solo tramos de texto
  const linea = (texto: string) => segmentosNegrita(texto).map((t, k) => (t.negrita ? <strong key={k} className="font-semibold text-ink">{t.texto}</strong> : t.texto));
  return (
    <div className="space-y-3 text-sm leading-relaxed text-ink-soft">
      {parsearDocumento(content).map((b, i) => {
        if (b.tipo === 'subtitulo') return <h3 key={i} className="pt-2 text-sm font-bold text-ink">{b.texto}</h3>;
        if (b.tipo === 'subsubtitulo') return <h4 key={i} className="pt-1 text-sm font-semibold text-ink">{b.texto}</h4>;
        // C-251b: lo que hay que leer antes de firmar es un aviso de acción (PLAN.md §1.1); el rojo es error o rechazo
        if (b.tipo === 'aviso') return <p key={i} className={`flex items-start gap-3 rounded-lg border p-3 font-semibold ${avisoAccion}`}><IconoAdvertencia aria-hidden="true" /><span>{linea(b.texto)}</span></p>;
        if (b.tipo === 'lista') return <ul key={i} className="list-disc space-y-1 pl-6">{b.items.map((it, j) => <li key={j}>{linea(it)}</li>)}</ul>;
        return <p key={i}>{linea(b.texto)}</p>;
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
      <IconoCheck className="h-8 w-8" aria-hidden="true" />
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
  // C-251: la cédula registrada no se cambia al firmar (C-84); el servidor la exige igual
  const [cedulaFija, setCedulaFija] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [largo, setLargo] = useState(0);
  // C-260: la pista "Firma aquí" se va apenas se toca el recuadro (el largo llega recién al terminar el trazo)
  const [firmando, setFirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [firmaId, setFirmaId] = useState<string | null>(null);
  const [recargas, setRecargas] = useState(0);
  const textoRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  useBodyScrollLock(isOpen);
  // C-265: el foco entra a la firma y, al cerrarla, vuelve a donde estaba (el botón "Leer y firmar" o la recarga de atrás)
  const ventana = useRef<HTMLDivElement>(null);
  useFocoDeVuelta(isOpen, ventana);

  useEffect(() => {
    if (!isOpen) return;
    let vigente = true;
    fetch(`/api/legal/documentos/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((data) => {
        if (!vigente) return;
        setDoc(data.document);
        setIdNumber((v) => v || data.profile?.idNumber || '');
        setCedulaFija(Boolean(data.profile?.idNumber));
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
      <div ref={ventana} tabIndex={-1} className={`${adminModalPanel} max-w-2xl outline-none`}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><IconoDocumento className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 id={tituloId} className="truncate text-base font-bold text-ink">{doc?.title ?? 'Documento'}</h2>
              <p className="text-xs text-muted">
                {paso === 'leer' ? 'Paso 1 de 2: léelo completo' : paso === 'firmar' ? 'Paso 2 de 2: tus datos y tu firma' : 'Firmado'}
                {doc ? ` · Versión ${doc.version}` : ''}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={enviando} className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-surface" aria-label="Cerrar">
            <IconoCerrar className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {error ? (
          <div className="p-6 text-center">
            <IconoAdvertencia className="mx-auto mb-2 h-8 w-8 text-deal" aria-hidden="true" />
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
              {/* C-260 (C-258 midió que había que bajar 811 palabras sin saber cuánto faltaba): la píldora del kit, con la flecha que
                  baja dos veces; tocarla baja una pantalla. Se va cuando se llega al final */}
              {!leido && (
                <div className="pointer-events-none sticky bottom-0 -mx-5 flex justify-center bg-linear-to-t from-white via-white/90 to-transparent pb-1 pt-10">
                  <button
                    type="button"
                    onClick={() => textoRef.current?.scrollBy({ top: textoRef.current.clientHeight * 0.8, behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth' })}
                    className="onb-sube pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full bg-brand-700 px-4 text-sm font-semibold text-white shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                    style={{ '--onb-retraso': '0.5s' } as CSSProperties}
                  >
                    <span className="onb-baja inline-flex">
                      <IconoFlechaAbajo className="h-4 w-4" aria-hidden="true" />
                    </span>
                    Baja hasta el final para firmar
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-3 border-t border-line bg-surface px-5 py-4">
              {/* C-251b: lo que falta para seguir, en gris (como los pasos del checkout, C-241) */}
              {!leido && <p className="text-xs font-medium text-ink-soft">Desplázate hasta el final para continuar.</p>}
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
                  <input id="firma-cedula" className={adminInput(Boolean(errores.idNumber))} value={idNumber} onChange={(e) => setIdNumber(e.target.value.toUpperCase())} readOnly={cedulaFija} placeholder="V12345678" autoComplete="off" maxLength={12} />
                  {cedulaFija && <p className="mt-1 text-xs text-muted">La de tu cuenta. Si está mal, escríbenos.</p>}
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
                  <button type="button" onClick={() => { padRef.current?.clear(); setFirmando(false); }} className="min-h-11 px-2 text-sm font-semibold text-deal">Borrar</button>
                </div>
                <div onPointerDownCapture={() => setFirmando(true)} className={`relative rounded-xl border-2 border-dashed p-1 ${errores.signature ? 'border-deal' : 'border-line'}`}>
                  <SignaturePad ref={padRef} onChange={onChangeFirma} label="Recuadro para firmar con el dedo, el lápiz o el mouse" />
                  {/* C-260: con el recuadro vacío, una firma que se dibuja sola, una vez, y "Firma aquí". Se va al empezar a firmar */}
                  {largo === 0 && !firmando && (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-brand-500">
                      <svg viewBox="0 0 120 40" className="onb-firma h-10 w-32 opacity-60">
                        <path d="M6 28c10-20 22-24 24-8s-10 18-4 6 16-18 22-4 4 14 12 2 14-16 20-4 10 8 16-2 10-8 18-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <IconoEditar className="h-4 w-4" />
                        Firma aquí
                      </span>
                    </div>
                  )}
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
                  <IconoDescargar className="h-4 w-4" aria-hidden="true" /> Descargar PDF
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
