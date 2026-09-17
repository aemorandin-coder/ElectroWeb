import { prefiereMenosMovimiento } from '@/lib/motion/resorte';

/**
 * Confeti con física (C-89): gravedad, resistencia del aire, giro y el volteo de un papel que cae.
 * Dura menos de 2,5 s, no se repite y borra su canvas al terminar. Con movimiento reducido no hace nada.
 * Los colores salen de los tokens de la tienda (--color-*), no de hex sueltos.
 */

type Particula = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  giro: number;
  velocidadGiro: number;
  fase: number;
  ancho: number;
  alto: number;
  color: string;
  vida: number;
  duracion: number;
};

const TOKENS = ['--color-brand-500', '--color-brand-300', '--color-warning', '--color-success', '--color-brand-700', '--color-deal'];
const GRAVEDAD = 1500; // px/s²
const RESISTENCIA = 2.2; // por segundo

export function lanzarConfeti(origen: { x: number; y: number }, cantidad = 110) {
  if (typeof window === 'undefined' || prefiereMenosMovimiento()) return;

  const estilos = getComputedStyle(document.documentElement);
  const colores = TOKENS.map((t) => estilos.getPropertyValue(t).trim()).filter(Boolean);
  if (!colores.length) return;

  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: 'calc(var(--z-popup) + 1)',
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const particulas: Particula[] = Array.from({ length: cantidad }, () => {
    // Cono hacia arriba con algo de dispersión a los lados
    const angulo = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
    const fuerza = 520 + Math.random() * 620;
    return {
      x: origen.x,
      y: origen.y,
      vx: Math.cos(angulo) * fuerza,
      vy: Math.sin(angulo) * fuerza,
      giro: Math.random() * Math.PI * 2,
      velocidadGiro: (Math.random() - 0.5) * 14,
      fase: Math.random() * Math.PI * 2,
      ancho: 6 + Math.random() * 6,
      alto: 8 + Math.random() * 8,
      color: colores[Math.floor(Math.random() * colores.length)],
      vida: 0,
      duracion: 1.6 + Math.random() * 0.8,
    };
  });

  let ultimo = performance.now();
  const tick = (ahora: number) => {
    const dt = Math.min((ahora - ultimo) / 1000, 1 / 30);
    ultimo = ahora;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let vivas = 0;
    for (const p of particulas) {
      p.vida += dt;
      if (p.vida >= p.duracion) continue;
      vivas++;
      const frenado = Math.exp(-RESISTENCIA * dt);
      p.vx *= frenado;
      p.vy = p.vy * frenado + GRAVEDAD * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.giro += p.velocidadGiro * dt;
      p.fase += dt * 9;

      const restante = p.duracion - p.vida;
      ctx.save();
      ctx.globalAlpha = Math.min(1, restante / 0.45);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.giro);
      // El volteo: el papel se ve más angosto cuando gira de canto
      ctx.scale(1, Math.cos(p.fase));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.ancho / 2, -p.alto / 2, p.ancho, p.alto);
      ctx.restore();
    }

    if (vivas > 0) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}
