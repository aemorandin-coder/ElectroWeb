/**
 * Motor de física de la gift card 3D (C-71), sin React: muelles para inclinación y giro,
 * arrastre directo y lanzamiento. Escribe variables CSS en la tarjeta; no provoca renders.
 */
export type GiftCardFace = 'front' | 'back';

interface Spring { x: number; v: number; t: number; k: number; c: number }
interface PointerLike { clientX: number; clientY: number; pointerType: string }

const norm = (angle: number) => ((angle % 360) + 360) % 360;
const isBackAngle = (angle: number) => { const n = norm(angle); return n > 90 && n < 270; };
// k: rigidez, c: amortiguación. Ligeramente subamortiguado: rebota un poco al llegar.
const spring = (x: number, t: number, k: number, c: number): Spring => ({ x, v: 0, t, k, c });
const step = (s: Spring, dt: number) => { const a = s.k * (s.t - s.x) - s.c * s.v; s.v += a * dt; s.x += s.v * dt; };
const settled = (s: Spring) => Math.abs(s.t - s.x) < 0.02 && Math.abs(s.v) < 0.02;

export interface CardEngine {
  mount(card: HTMLElement, floor: HTMLElement | null): void;
  unmount(): void;
  setReduced(reduced: boolean): void;
  onFaceChange(listener: ((face: GiftCardFace) => void) | undefined): void;
  flip(): void;
  showFace(face: GiftCardFace): void;
  impulse(tiltX: number, tiltY: number): void;
  pointerDown(event: PointerLike, rect: DOMRect): void;
  /** Devuelve true cuando empieza un arrastre (el componente captura el puntero). */
  pointerMove(event: PointerLike, rect: DOMRect): boolean;
  pointerUp(event: PointerLike & { type: string }): void;
  pointerLeave(event: PointerLike): void;
  isReduced(): boolean;
}

export function createCardEngine({ face, entrance }: { face: GiftCardFace; entrance: boolean }): CardEngine {
  const start = face === 'back' ? 180 : 0;
  const rx = spring(entrance ? -22 : 0, 0, 170, 17);
  const ry = spring(0, 0, 170, 17);
  const fl = spring(start + (entrance ? -38 : 0), start, 110, 13);
  let card: HTMLElement | null = null;
  let floor: HTMLElement | null = null;
  let reduced = false;
  let raf = 0;
  let last = 0;
  let gx = 30;
  let gy = 20;
  let dragging = false;
  let down: null | { x: number; t: number; lastT: number; fl: number; vel: number } = null;
  let lastFace: GiftCardFace = face;
  let listener: ((face: GiftCardFace) => void) | undefined;

  function render() {
    if (!card) return;
    const s = card.style;
    s.setProperty('--rx', `${rx.x.toFixed(2)}deg`);
    s.setProperty('--ry', `${(ry.x + fl.x).toFixed(2)}deg`);
    const tilt = ry.x + Math.sin((fl.x * Math.PI) / 180) * 18;
    s.setProperty('--fx', `${(50 + tilt * 2.2).toFixed(1)}%`);
    s.setProperty('--fy', `${(50 - rx.x * 2.6).toFixed(1)}%`);
    s.setProperty('--gx', `${gx.toFixed(1)}%`);
    s.setProperty('--gy', `${gy.toFixed(1)}%`);
    if (floor) {
      floor.style.setProperty('--shx', `${(tilt * 0.9).toFixed(1)}px`);
      floor.style.setProperty('--shs', (0.94 + Math.abs(Math.cos((fl.x * Math.PI) / 180)) * 0.06).toFixed(3));
    }
    const back = isBackAngle(fl.x);
    card.dataset.back = String(back);
    const current: GiftCardFace = back ? 'back' : 'front';
    if (current !== lastFace && settled(fl)) {
      lastFace = current;
      listener?.(current);
    }
  }

  function frame(now: number) {
    const dt = Math.min(1 / 30, (now - (last || now)) / 1000);
    last = now;
    if (!dragging) step(fl, dt);
    step(rx, dt);
    step(ry, dt);
    render();
    if (dragging || !(settled(rx) && settled(ry) && settled(fl))) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = 0;
      last = 0;
    }
  }

  function wake() {
    if (reduced) { render(); return; }
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }

  function flipTo(target: number) {
    fl.t = target;
    if (reduced) { fl.x = target; fl.v = 0; }
    wake();
  }

  const relative = (event: PointerLike, rect: DOMRect) => ({
    px: (event.clientX - rect.left) / rect.width,
    py: (event.clientY - rect.top) / rect.height,
  });

  return {
    mount(cardEl, floorEl) { card = cardEl; floor = floorEl; render(); wake(); },
    unmount() { cancelAnimationFrame(raf); raf = 0; card = null; floor = null; },
    setReduced(value) {
      reduced = value;
      cancelAnimationFrame(raf);
      raf = 0;
      if (value) {
        const target = isBackAngle(fl.t) ? 180 : 0;
        rx.x = rx.t = ry.x = ry.t = rx.v = ry.v = 0;
        fl.x = fl.t = target;
        fl.v = 0;
      }
      render();
      wake();
    },
    onFaceChange(fn) { listener = fn; },
    flip() { flipTo(Math.round((fl.t + 180) / 180) * 180); },
    showFace(target) { if (isBackAngle(fl.t) !== (target === 'back')) flipTo(fl.t + 180); },
    impulse(tiltX, tiltY) { if (reduced) return; rx.v += tiltX; ry.v += tiltY; wake(); },
    pointerDown(event, rect) {
      const now = performance.now();
      down = { x: event.clientX, t: now, lastT: now, fl: fl.x, vel: 0 };
      if (!reduced && event.pointerType !== 'mouse') {
        const { px, py } = relative(event, rect);
        rx.t = -(py - 0.5) * 12;
        ry.t = (px - 0.5) * 14;
        wake();
      }
    },
    pointerMove(event, rect) {
      if (reduced) return false;
      const { px, py } = relative(event, rect);
      gx = px * 100;
      gy = py * 100;
      let startedDrag = false;
      if (down) {
        const dx = event.clientX - down.x;
        if (!dragging && Math.abs(dx) > 6) { dragging = true; startedDrag = true; }
        if (dragging) {
          const now = performance.now();
          const dt = Math.max(1, now - down.lastT) / 1000;
          const angle = down.fl + dx * 0.6;
          down.vel = down.vel * 0.6 + ((angle - fl.x) / dt) * 0.4;
          fl.x = angle;
          fl.t = angle;
          fl.v = down.vel;
          down.lastT = now;
          rx.t = -(py - 0.5) * 12;
        }
      } else if (event.pointerType === 'mouse') {
        rx.t = -(py - 0.5) * 16;
        ry.t = (px - 0.5) * 22;
      }
      wake();
      return startedDrag;
    },
    pointerUp(event) {
      if (!down) return;
      const now = performance.now();
      const wasDrag = dragging;
      const elapsed = now - down.t;
      // Si el dedo se detuvo antes de soltar, no hay lanzamiento
      const vel = now - down.lastT > 90 ? 0 : down.vel;
      dragging = false;
      down = null;
      if (event.pointerType !== 'mouse') { rx.t = 0; ry.t = 0; }
      if (!wasDrag) {
        if (elapsed < 400 && event.type === 'pointerup') flipTo(Math.round((fl.t + 180) / 180) * 180);
        else wake();
        return;
      }
      // El impulso proyecta hacia dónde iría y la tarjeta encaja en la cara más cercana
      fl.t = Math.round((fl.x + vel * 0.2) / 180) * 180;
      fl.v = vel;
      wake();
    },
    pointerLeave(event) {
      if (event.pointerType !== 'mouse' || down) return;
      rx.t = 0;
      ry.t = 0;
      gx = 30;
      gy = 20;
      wake();
    },
    isReduced: () => reduced,
  };
}
