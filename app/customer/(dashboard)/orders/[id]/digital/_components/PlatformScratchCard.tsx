'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react';
import Image from 'next/image';
import { FiCheck, FiCopy, FiRotateCw, FiUnlock } from 'react-icons/fi';
import { BsNintendoSwitch } from 'react-icons/bs';
import { SiSteam, SiPlaystation, SiRoblox, SiNetflix, SiSpotify, SiApple } from 'react-icons/si';
import { FaGamepad, FaXbox } from 'react-icons/fa';
import { createCardEngine, type GiftCardFace } from '@/components/gift-card/cardEngine';
import { adminSecondaryButton } from '@/lib/admin-ui';
import styles from './PlatformScratchCard.module.css';

const subscribeReduced = (notify: () => void) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
const readReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const serverReduced = () => false;
const PLATFORMS = {
  NINTENDO: { name: 'Nintendo', icon: BsNintendoSwitch },
  STEAM: { name: 'Steam', icon: SiSteam },
  ROBLOX: { name: 'Roblox', icon: SiRoblox },
  PLAYSTATION: { name: 'PlayStation', icon: SiPlaystation },
  PSN: { name: 'PlayStation', icon: SiPlaystation },
  XBOX: { name: 'Xbox', icon: FaXbox },
  NETFLIX: { name: 'Netflix', icon: SiNetflix },
  SPOTIFY: { name: 'Spotify', icon: SiSpotify },
  APPLE: { name: 'Apple', icon: SiApple },
  ITUNES: { name: 'Apple', icon: SiApple },
};
type Point = { x: number; y: number };
type Stroke = Point[];
type Flake = { x: number; y: number; vx: number; vy: number; life: number; angle: number };

export default function PlatformScratchCard({ code, platform, productName, image, region, onReveal, isAlreadyRevealed, onCopy }: {
  code: string;
  platform: string | null;
  productName: string;
  image: string | null;
  region: string | null;
  onReveal: () => void;
  isAlreadyRevealed: boolean;
  onCopy: () => void;
}) {
  const brand = PLATFORMS[platform?.toUpperCase() as keyof typeof PLATFORMS] ?? { name: platform || 'Digital', icon: FaGamepad };
  const Icon = brand.icon;
  const platformStyle = Object.hasOwn(PLATFORMS, platform?.toUpperCase() ?? '') ? platform?.toUpperCase() : 'DIGITAL';
  const reduced = useSyncExternalStore(subscribeReduced, readReduced, serverReduced);
  const [face, setFace] = useState<GiftCardFace>(isAlreadyRevealed ? 'back' : 'front');
  const [engine] = useState(() => createCardEngine({ face: isAlreadyRevealed ? 'back' : 'front', entrance: true }));
  const [revealedHere, setRevealedHere] = useState(false);
  const revealed = isAlreadyRevealed || revealedHere;
  const [imageFailed, setImageFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLCanvasElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);
  const activePointer = useRef<number | null>(null);
  const strokes = useRef<Stroke[]>([]);
  const flakes = useRef<Flake[]>([]);
  const dustFrame = useRef(0);
  const notified = useRef(false);

  useEffect(() => {
    engine.mount(cardRef.current!, floorRef.current);
    engine.onFaceChange(setFace);
    return () => { engine.unmount(); cancelAnimationFrame(dustFrame.current); };
  }, [engine]);
  useEffect(() => { engine.setReduced(reduced); }, [engine, reduced]);
  useEffect(() => { if (isAlreadyRevealed) engine.showFace('back'); }, [engine, isAlreadyRevealed]);

  const reveal = () => {
    if (revealed || notified.current) return;
    notified.current = true;
    setRevealedHere(true);
    setProgress(100);
    engine.impulse(-55, 55);
    onReveal();
  };

  // Al cambiar el tamaño se reconstruye la misma lámina y sus trazos normalizados.
  useEffect(() => {
    if (revealed) return;
    const canvas = coverRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      const token = getComputedStyle(canvas);
      const line = token.getPropertyValue('--color-line-strong').trim();
      const surface = token.getPropertyValue('--color-surface').trim();
      const muted = token.getPropertyValue('--color-muted').trim();
      const ink = token.getPropertyValue('--color-ink').trim();
      const foil = ctx.createLinearGradient(0, 0, width, height);
      foil.addColorStop(0, line); foil.addColorStop(0.4, surface); foil.addColorStop(0.52, line); foil.addColorStop(1, surface);
      ctx.fillStyle = foil;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = muted;
      ctx.lineWidth = 1;
      for (let x = -height; x < width; x += 5) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + height, height); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = ink;
      ctx.font = '600 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Raspa aquí', width / 2, height / 2 + 5);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 30;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const stroke of strokes.current) {
        ctx.beginPath();
        stroke.forEach((point, i) => i ? ctx.lineTo(point.x * width, point.y * height) : ctx.moveTo(point.x * width, point.y * height));
        ctx.stroke();
      }
    };
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  }, [revealed]);

  const emitDust = (x: number, y: number) => {
    if (reduced) return;
    const dust = dustRef.current;
    const ctx = dust?.getContext('2d');
    if (!dust || !ctx) return;
    if (dust.width !== dust.clientWidth || dust.height !== dust.clientHeight) {
      dust.width = dust.clientWidth;
      dust.height = dust.clientHeight;
    }
    for (let i = 0; i < 3; i++) flakes.current.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, life: 1, angle: Math.random() * Math.PI });
    flakes.current = flakes.current.slice(-48);
    if (dustFrame.current) return;
    const tone = getComputedStyle(dust).getPropertyValue('--color-line-strong').trim();
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 2);
      last = now;
      ctx.clearRect(0, 0, dust.width, dust.height);
      flakes.current = flakes.current.filter((flake) => flake.life > 0);
      for (const flake of flakes.current) {
        flake.vy += 0.15 * dt; flake.x += flake.vx * dt; flake.y += flake.vy * dt; flake.life -= 0.035 * dt; flake.angle += 0.1 * dt;
        ctx.save(); ctx.translate(flake.x, flake.y); ctx.rotate(flake.angle); ctx.globalAlpha = Math.max(flake.life, 0); ctx.fillStyle = tone; ctx.fillRect(-2, -1, 4, 2); ctx.restore();
      }
      dustFrame.current = flakes.current.length ? requestAnimationFrame(frame) : 0;
    };
    dustFrame.current = requestAnimationFrame(frame);
  };

  const scratch = (event: PointerEvent<HTMLCanvasElement>, start = false) => {
    event.stopPropagation();
    if (revealed || (!start && activePointer.current !== event.pointerId)) return;
    const canvas = event.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
    if (start) {
      activePointer.current = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
      strokes.current.push([point]);
    }
    const stroke = strokes.current[strokes.current.length - 1];
    const previous = stroke[stroke.length - 1];
    stroke.push(point);
    const width = canvas.clientWidth, height = canvas.clientHeight;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 30; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(previous.x * width, previous.y * height); ctx.lineTo(point.x * width, point.y * height); ctx.stroke();
    emitDust(point.x * width, point.y * height);
  };

  const finishScratch = (event: PointerEvent<HTMLCanvasElement>) => {
    event.stopPropagation();
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const canvas = coverRef.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || revealed) return;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0, samples = 0;
    for (let i = 3; i < pixels.length; i += 16) { samples++; if (pixels[i] === 0) clear++; }
    const coverage = clear / samples;
    setProgress(Math.round(coverage * 100));
    if (coverage > 0.4) reveal();
  };

  return (
    <div className={styles.wrapper}>
      <div ref={sceneRef} className={`${styles.scene} ${reduced ? styles.reduced : ''}`} data-platform={platformStyle}>
        <div ref={floorRef} className={styles.floor} aria-hidden="true" />
        <div ref={cardRef} className={styles.card} data-back={String(face === 'back')}
          onPointerDown={(event) => { if (face === 'front') engine.pointerDown(event, sceneRef.current!.getBoundingClientRect()); }}
          onPointerMove={(event) => { if (face === 'front' && engine.pointerMove(event, sceneRef.current!.getBoundingClientRect())) event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerUp={(event) => { if (face === 'front') engine.pointerUp(event); }}
          onPointerCancel={(event) => engine.pointerUp(event)}
          onPointerLeave={(event) => engine.pointerLeave(event)}>
          <div className={`${styles.face} ${styles.front}`} aria-hidden={face !== 'front'} inert={face !== 'front'}>
            <div className={styles.foil} aria-hidden="true" />
            <div className={styles.frontContent}>
              <div className={styles.brandRow}><span className={styles.brand}><Icon aria-hidden="true" />{brand.name}</span><span className={styles.tag}>Código digital</span></div>
              <div className={styles.art}>
                <Icon className={styles.platformArt} aria-label={`Logo de ${brand.name}`} />
                {image && !imageFailed && <span className={styles.productThumbnail}><Image src={image} alt={productName} fill sizes="72px" className={styles.productImage} onError={() => setImageFailed(true)} /></span>}
              </div>
              <div className={styles.product}><strong>{productName}</strong><span>{region || 'Electro Shop'}</span></div>
            </div>
            <div className={styles.glare} aria-hidden="true" />
          </div>
          <div className={`${styles.face} ${styles.back}`} aria-hidden={face !== 'back'} inert={face !== 'back'}>
            <div className={styles.backBrand}><Icon aria-hidden="true" /><span>{brand.name}</span><FiUnlock aria-hidden="true" /></div>
            <p className={styles.backTitle}>{revealed ? 'Tu código está listo' : 'Tu próximo juego empieza aquí'}</p>
            <div className={styles.scratchZone}>
              <button type="button" onClick={() => revealed && onCopy()} disabled={!revealed} tabIndex={revealed && face === 'back' ? 0 : -1} className={styles.code} aria-label={revealed ? 'Copiar código revelado' : 'Código cubierto'}>
                <span aria-hidden={!revealed}>{code}</span>{revealed && <FiCopy className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
              {!revealed && <canvas ref={coverRef} className={styles.cover} aria-label="Raspa con el dedo o el mouse para revelar el código" onPointerDown={(event) => scratch(event, true)} onPointerMove={(event) => scratch(event)} onPointerUp={finishScratch} onPointerCancel={finishScratch} />}
              <canvas ref={dustRef} className={styles.dust} aria-hidden="true" />
            </div>
            <p className={styles.backHint}>{revealed ? 'Toca el código para copiarlo.' : 'Raspa la lámina plateada.'}</p>
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { engine.pointerLeave({ clientX: 0, clientY: 0, pointerType: 'mouse' }); engine.flip(); }} className={`${adminSecondaryButton} flex-1 px-3`}><FiRotateCw className="h-4 w-4" aria-hidden="true" />{face === 'front' ? 'Voltear tarjeta' : 'Ver portada'}</button>
        {face === 'back' && !revealed && <button type="button" onClick={reveal} className={`${adminSecondaryButton} flex-1 px-3`}><FiUnlock className="h-4 w-4" aria-hidden="true" />Revelar sin raspar</button>}
      </div>
      <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-muted">{revealed ? <><FiCheck className="h-4 w-4 text-success-strong" aria-hidden="true" />Código revelado</> : face === 'front' ? 'Toca o arrastra la tarjeta para voltearla.' : `Lámina raspada: ${progress}%`}</p>
    </div>
  );
}
