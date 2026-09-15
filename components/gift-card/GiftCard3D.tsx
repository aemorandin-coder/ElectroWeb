'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { formatUSD } from '@/lib/currency';
import { formatGiftCardCode, getGiftCardDesign, type GiftCardDesign } from '@/lib/gift-card-designs';
import { createCardEngine, type GiftCardFace } from './cardEngine';
import styles from './GiftCard3D.module.css';

export type { GiftCardFace };

interface GiftCard3DProps {
  /** Slug del diseño ("electro", "obsidiana"…) o el diseño completo. */
  design?: string | GiftCardDesign | null;
  amountUSD: number;
  /** Texto en lugar del monto (por ejemplo "••••" si el saldo aún no se puede mostrar). */
  amountLabel?: string | null;
  recipientName?: string | null;
  /** Digital: llega por correo, sin PIN. Impresa: PIN bajo raspadito y sello de estado. */
  kind?: 'digital' | 'print';
  /** Código completo. Si falta, se muestra enmascarado con los últimos 4. */
  code?: string | null;
  codeLast4?: string | null;
  /** Solo impresa: PIN visible (hoja del admin). Sin PIN se dibuja el raspadito tapado. */
  pin?: string | null;
  status?: 'INACTIVE' | 'ACTIVE' | null;
  /** Cara a la que debe ir la tarjeta; al cambiarla, gira con el muelle. */
  face?: GiftCardFace;
  onFaceChange?: (face: GiftCardFace) => void;
  interactive?: boolean;
  /** Llega inclinada y se asienta al montarse. */
  entrance?: boolean;
  className?: string;
}

const reducedQuery = '(prefers-reduced-motion: reduce)';
const subscribeReduced = (onChange: () => void) => {
  const media = window.matchMedia(reducedQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
const getReduced = () => window.matchMedia(reducedQuery).matches;
const getReducedServer = () => false;

/**
 * Gift card con física (C-71): inclinación con muelle, brillo y lámina que siguen el ángulo,
 * arrastre para voltear y lanzamiento con impulso. Quieta en reposo (sin animaciones infinitas).
 * Con "reducir movimiento" no hay 3D: la cara cambia con un fundido.
 */
export default function GiftCard3D({
  design: designProp,
  amountUSD,
  amountLabel,
  recipientName,
  kind = 'digital',
  code,
  codeLast4,
  pin,
  status,
  face = 'front',
  onFaceChange,
  interactive = true,
  entrance = true,
  className = '',
}: GiftCard3DProps) {
  const design = typeof designProp === 'object' && designProp ? designProp : getGiftCardDesign(designProp as string | null | undefined);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, getReducedServer);

  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLSpanElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);

  const [engine] = useState(() => createCardEngine({ face, entrance }));

  useEffect(() => {
    engine.mount(cardRef.current!, floorRef.current);
    return () => engine.unmount();
  }, [engine]);
  useEffect(() => { engine.setReduced(reduced); }, [engine, reduced]);
  useEffect(() => { engine.onFaceChange(onFaceChange); }, [engine, onFaceChange]);
  // Cara pedida desde afuera (por ejemplo, la revelación del canje)
  useEffect(() => { engine.showFace(face); }, [engine, face]);

  // Monto: cuenta hasta el valor nuevo
  const shownAmount = useRef(amountUSD);
  useEffect(() => {
    const el = amountRef.current;
    const from = shownAmount.current;
    shownAmount.current = amountUSD;
    if (!el || from === amountUSD || amountLabel) return;
    if (engine.isReduced()) { el.textContent = formatUSD(amountUSD); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 420);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatUSD(from + (amountUSD - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    engine.impulse(-90, 0);
    return () => cancelAnimationFrame(frame);
  }, [amountUSD, amountLabel, engine]);

  // Diseño nuevo: un giro corto y un destello, una sola vez
  const shownDesign = useRef(design.slug);
  useEffect(() => {
    if (shownDesign.current === design.slug) return;
    shownDesign.current = design.slug;
    if (engine.isReduced()) return;
    engine.impulse(0, 240);
    const sweep = sweepRef.current;
    if (sweep) {
      sweep.classList.remove(styles.sweepRun);
      void sweep.offsetWidth;
      sweep.classList.add(styles.sweepRun);
    }
  }, [design.slug, engine]);

  /* ── Puntero ─────────────────────────────────────────────────────────── */
  const rect = () => sceneRef.current!.getBoundingClientRect();
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (engine.pointerMove(event, rect())) event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => engine.pointerDown(event, rect());
  const release = (event: PointerEvent<HTMLDivElement>) => engine.pointerUp(event);
  const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => engine.pointerLeave(event);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); engine.flip(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); engine.impulse(0, -220); }
    if (event.key === 'ArrowRight') { event.preventDefault(); engine.impulse(0, 220); }
  };

  /* ── Contenido ───────────────────────────────────────────────────────── */
  const last4 = (codeLast4 || (code ? code.replace(/[^A-Za-z0-9]/g, '').slice(-4) : '')).toUpperCase();
  const shownCode = code ? formatGiftCardCode(code) : `ESMC-••••-••••-${last4 || '••••'}`;
  const designVars = {
    '--gc-bg': design.background,
    '--gc-text': design.text,
    '--gc-accent': design.accent,
    '--gc-muted': design.muted,
    '--gc-line': design.line,
    '--gc-chip': design.chip,
    '--gc-foil': String(design.foil),
  } as CSSProperties;

  const handlers = interactive
    ? { onPointerMove, onPointerDown, onPointerUp: release, onPointerCancel: release, onPointerLeave, onKeyDown }
    : {};

  return (
    <div className={`${styles.scene} ${reduced ? styles.reduced : ''} ${interactive ? '' : styles.static} ${className}`} ref={sceneRef}>
      <div className={styles.floor} ref={floorRef} aria-hidden="true" />
      <div
        ref={cardRef}
        className={styles.card}
        style={designVars}
        data-back={String(face === 'back')}
        role={interactive ? 'button' : 'img'}
        tabIndex={interactive ? 0 : undefined}
        aria-label={`Gift card${amountLabel ? '' : ` de ${formatUSD(amountUSD)}`}${recipientName ? ` para ${recipientName}` : ''}.${interactive ? ' Toca o presiona Enter para voltearla.' : ''}`}
        {...handlers}
      >
        <div className={`${styles.face} ${styles.front}`}>
          <div className={styles.foil} />
          <div className={styles.foilBand} />
          <div className={`${styles.inner} ${styles.frontInner}`}>
            <div className={styles.brandRow}>
              <div className={styles.mark}>
                <span className={styles.monogram} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M5 5h13M5 12h10M5 19h13M5 5v14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
                </span>
                <span className={styles.wordmark}><b>ELECTRO</b><span>SHOP</span></span>
              </div>
              <span className={styles.tag}>GIFT CARD</span>
            </div>
            <div />
            <div className={styles.valueRow}>
              <div>
                <div className={styles.label}>Saldo</div>
                <div className={styles.amount}><span ref={amountRef}>{amountLabel ?? formatUSD(amountUSD)}</span><small>USD</small></div>
              </div>
              {recipientName && <div className={styles.to}>Para<b>{recipientName}</b></div>}
            </div>
          </div>
          <div className={styles.glare} />
          <div className={styles.sweep} ref={sweepRef} />
        </div>

        <div className={`${styles.face} ${styles.back}`}>
          <div className={styles.foil} />
          <div className={styles.strip} />
          <div className={`${styles.inner} ${styles.backInner}`}>
            <div>
              <div className={styles.label}>Código de canje</div>
              <div className={styles.code}>{shownCode}</div>
            </div>
            <div className={styles.pinZone}>
              {kind === 'print' ? (
                <>
                  <div className={`${styles.pinBox} ${pin ? '' : styles.scratchCover}`}>
                    {pin ? <span className={styles.pin}>{pin.replace(/(\d{3})(?=\d)/g, '$1 ')}</span> : <span className={styles.scratchText}>RASPA AQUÍ</span>}
                  </div>
                  {status && (
                    <span className={`${styles.stamp} ${status === 'ACTIVE' ? styles.stampActive : styles.stampInactive}`}>
                      {status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                    </span>
                  )}
                </>
              ) : (
                <p className={styles.note}>
                  <b>Sin PIN.</b> {code ? 'Canjéala con este código.' : `El código llega solo al correo de ${recipientName || 'quien la recibe'}.`}
                </p>
              )}
            </div>
            <div />
            <div className={styles.redeem}>
              <span>Canjea en <b>electroshopve.com/canjear-gift-card</b></span>
              <span>Sin vencimiento</span>
            </div>
          </div>
          <div className={styles.glare} />
        </div>
      </div>
    </div>
  );
}
