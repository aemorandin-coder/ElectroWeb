// C-279: el movimiento del Dashboard nuevo, como la maqueta que eligió el equipo. Solo navegador.
// Las entradas son las de ElectroStudio (sube, zoom, sello, barrido, nítido), los íconos se dibujan, las tarjetas viajan a su
// lugar nuevo (FLIP) y un pago confirmado tira confeti en los azules de la marca. Todo una sola vez; con "reducir movimiento"
// no se mueve nada. Nunca se cambia el texto de un nodo de React (las cifras cuentan con CifraAnimada).
import s from './tablero.module.css';

export const quieto = () => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export type Entrada = 'sube' | 'zoom' | 'sello' | 'rebote' | 'barrido' | 'nitido';
const CLASE: Record<Entrada, string> = { sube: s.anSube, zoom: s.anZoom, sello: s.anSello, rebote: s.anRebote, barrido: s.anBarrido, nitido: s.anNitido };

/** Hace entrar un elemento con su animación, desde `retraso` ms. Al terminar queda como estaba */
export function entra(el: Element | null | undefined, tipo: Entrada, retraso = 0) {
  if (!(el instanceof HTMLElement) || quieto()) return;
  const clase = CLASE[tipo];
  el.classList.add(s.an, clase);
  el.style.animationDelay = `${retraso}ms`;
  const fin = (ev: AnimationEvent) => {
    if (ev.target !== el) return;
    el.classList.remove(s.an, clase);
    el.style.animationDelay = '';
    el.removeEventListener('animationend', fin);
  };
  el.addEventListener('animationend', fin);
}

/** El ícono se dibuja una vez, como IconoDibujado del kit de onboarding */
export function dibujar(svg: Element | null | undefined, retraso = 0, ms = 700) {
  if (!(svg instanceof SVGSVGElement) || quieto()) return;
  svg.querySelectorAll<SVGGeometryElement>('path, circle, rect, line, polyline, polygon, ellipse').forEach((p) => {
    let largo = 60;
    try { largo = Math.ceil(p.getTotalLength()) + 2; } catch { /* sin largo: se dibuja con el de siempre */ }
    const relleno = p.style.fill !== '' && p.style.fill !== 'none';
    p.style.strokeDasharray = String(largo);
    p.style.strokeDashoffset = String(largo);
    const opacidad = p.style.fillOpacity;
    if (relleno) p.style.fillOpacity = '0';
    window.setTimeout(() => {
      p.style.transition = `stroke-dashoffset ${ms}ms cubic-bezier(.65,0,.35,1), fill-opacity 400ms ease ${Math.round(ms * 0.6)}ms`;
      p.style.strokeDashoffset = '0';
      if (relleno) p.style.fillOpacity = opacidad;
      window.setTimeout(() => { p.style.transition = ''; p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }, ms + 500);
    }, retraso);
  });
}

/** Un anillo que se abre una vez alrededor de la tarjeta: "esto cambió" */
export function destacar(el: Element | null | undefined) {
  if (!(el instanceof HTMLElement) || quieto()) return;
  el.classList.remove(s.destaca);
  void el.offsetWidth;
  el.classList.add(s.destaca);
}

/** Dónde está cada tarjeta (por su data-id), para animar el cambio de lugar */
export function posiciones(contenedor: HTMLElement | null): Map<string, DOMRect> {
  const salida = new Map<string, DOMRect>();
  contenedor?.querySelectorAll<HTMLElement>(':scope > [data-id]').forEach((el) => salida.set(el.dataset.id ?? '', el.getBoundingClientRect()));
  return salida;
}

/** FLIP: cada tarjeta viaja de donde estaba a donde quedó; las nuevas aparecen. Se llama después de pintar el cambio */
export function viajar(contenedor: HTMLElement | null, antes: Map<string, DOMRect>, { excepto = null as string | null, ms = 460 } = {}) {
  if (!contenedor || quieto()) return;
  contenedor.querySelectorAll<HTMLElement>(':scope > [data-id]').forEach((el) => {
    const id = el.dataset.id ?? '';
    if (id === excepto) return;
    const a = antes.get(id);
    if (!a) {
      el.animate([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.22,1,.36,1)' });
      return;
    }
    const d = el.getBoundingClientRect();
    const dx = a.left - d.left;
    const dy = a.top - d.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.22,1,.36,1)' });
  });
}

/** Confeti en los azules de la marca, una vez, desde `rect` (o el centro de la pantalla) */
export function confeti(rect: DOMRect | null) {
  if (quieto()) return;
  const cv = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  cv.width = window.innerWidth * dpr;
  cv.height = window.innerHeight * dpr;
  Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 'var(--z-toast)' });
  cv.setAttribute('aria-hidden', 'true');
  document.body.append(cv);
  const ctx = cv.getContext('2d');
  if (!ctx) { cv.remove(); return; }
  ctx.scale(dpr, dpr);
  const ox = rect ? rect.left + rect.width * 0.3 : window.innerWidth / 2;
  const oy = rect ? rect.top + 60 : window.innerHeight / 3;
  // Los azules del kit (lib/marca.ts) y el blanco
  const colores = ['#2a63cd', '#1a3b7e', '#7599de', '#aac1eb', '#1e4ba3', '#ffffff'];
  const piezas = Array.from({ length: 90 }, () => ({
    x: ox, y: oy, vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 11 - 3, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, c: colores[Math.floor(Math.random() * colores.length)],
  }));
  const t0 = performance.now();
  const paso = (t: number) => {
    const x = (t - t0) / 1600;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of piezas) {
      p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - x * x);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (x < 1) requestAnimationFrame(paso);
    else cv.remove();
  };
  requestAnimationFrame(paso);
}

/** La corriente de la recepción: una línea que recorre los pasos del día y los enciende al pasar (una vez) */
export function corriente(cont: HTMLElement | null) {
  if (!cont) return;
  const svg = cont.querySelector('svg[data-corriente]');
  const path = svg?.querySelector('path');
  const punto = svg?.querySelector('circle');
  const botones = [...cont.querySelectorAll<HTMLElement>('[data-paso]')];
  if (!svg || !path || !punto || botones.length === 0) return;
  const encender = (b: HTMLElement) => { b.classList.add(s.encendido); window.setTimeout(() => b.classList.remove(s.encendido), 650); };
  const base = cont.getBoundingClientRect();
  const c = botones.map((b) => { const r = b.getBoundingClientRect(); return { x: r.left - base.left, y: r.top - base.top + r.height / 2, w: r.width, h: r.height }; });
  svg.setAttribute('width', String(base.width));
  svg.setAttribute('height', String(base.height));
  svg.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);
  // En columna (computadora) baja por la izquierda y entra a tocar cada paso; en fila (teléfono) corre por debajo
  const enColumna = c.length > 1 && c.every((p) => Math.abs(p.x - c[0].x) < 2);
  const enFila = c.every((p) => Math.abs(p.y - c[0].y) < 2);
  if (!enColumna && !enFila) {
    path.setAttribute('d', '');
    punto.style.display = 'none';
    if (!quieto()) botones.forEach((b, i) => window.setTimeout(() => encender(b), i * 260));
    return;
  }
  punto.style.display = '';
  let d: string;
  if (enColumna) {
    const x0 = c[0].x - 14;
    d = `M ${x0} ${c[0].y - c[0].h / 2 - 4}`;
    for (const p of c) d += ` L ${x0} ${p.y} L ${p.x + 2} ${p.y} L ${x0} ${p.y}`;
    d += ` L ${x0} ${c[c.length - 1].y + c[c.length - 1].h / 2 + 4}`;
  } else {
    d = `M ${c[0].x - 10} ${c[0].y + c[0].h / 2 + 7}`;
    for (const p of c) d += ` L ${p.x + p.w + 6} ${p.y + p.h / 2 + 7}`;
  }
  path.setAttribute('d', d);
  if (quieto()) { path.style.opacity = '.35'; punto.style.display = 'none'; return; }
  const largo = path.getTotalLength();
  path.style.strokeDasharray = String(largo);
  path.style.strokeDashoffset = String(largo);
  const ms = enColumna ? 1500 : 1300;
  const t0 = performance.now();
  const encendidos = new Set<number>();
  const paso = (t: number) => {
    const x = Math.min(1, (t - t0) / ms);
    const k = enColumna ? x : 1 - (1 - x) ** 2;
    path.style.strokeDashoffset = String(largo * (1 - k));
    const pt = path.getPointAtLength(largo * k);
    punto.setAttribute('cx', String(pt.x));
    punto.setAttribute('cy', String(pt.y));
    c.forEach((p, i) => {
      const toca = enColumna ? pt.x >= p.x - 1 && Math.abs(pt.y - p.y) < 2 : pt.x >= p.x + p.w / 2;
      if (toca && !encendidos.has(i)) { encendidos.add(i); encender(botones[i]); }
    });
    if (x < 1) requestAnimationFrame(paso);
    else {
      punto.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
      path.animate([{ opacity: 0.55 }, { opacity: 0.22 }], { duration: 600, fill: 'forwards' });
    }
  };
  requestAnimationFrame(paso);
}
