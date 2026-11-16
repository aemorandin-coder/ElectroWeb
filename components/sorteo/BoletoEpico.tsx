'use client';

// C-263: el boleto épico (la A del equipo, "el talón"), uno por cada boleto del cliente: troquelado, con el premio, su
// correo tapado (así participa el día del sorteo), de dónde salió y su código. Se dibuja en canvas con lib/sorteo/dibujo.ts,
// el mismo dibujo de la imagen que se descarga y del flyer.
// - Se anima una sola vez: la primera vez que el cliente ve ese boleto (se recuerda por su código en este navegador), al
//   llegar a la vista. Después, y con "reducir movimiento", aparece quieto y completo.
// - Para los lectores de pantalla es una imagen con todo lo que dice.
import { useEffect, useRef } from 'react';
import { prefiereMenosMovimiento } from '@/lib/motion/resorte';
import {
  altoBoleto, cargarImagen, DURA_BOLETO, dibujarBoleto, fuentesDelBoleto, fuenteInter, SELLO_SRC,
  type BoletoParaDibujar, type Recursos, type SorteoParaDibujar,
} from '@/lib/sorteo/dibujo';

const CLAVE_VISTOS = 'electroweb_boletos_vistos';
/** Lugar alrededor del boleto para la sombra y el sello que cae */
const MARGEN = 24;

function yaVisto(codigo: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(CLAVE_VISTOS) || '[]') as string[]).includes(codigo);
  } catch {
    return true;
  }
}
function marcarVisto(codigo: string) {
  try {
    const vistos = JSON.parse(localStorage.getItem(CLAVE_VISTOS) || '[]') as string[];
    if (!vistos.includes(codigo)) localStorage.setItem(CLAVE_VISTOS, JSON.stringify([...vistos, codigo].slice(-200)));
  } catch {
    // Sin almacenamiento: se vuelve a animar la próxima vez, no es grave
  }
}

/** La foto, el sello y la letra, una vez por página */
const recursosPorFoto = new Map<string, Promise<Recursos>>();
export function recursosDelBoleto(foto: string | null): Promise<Recursos> {
  const k = foto ?? '';
  let p = recursosPorFoto.get(k);
  if (!p) {
    const fuente = fuenteInter();
    p = Promise.all([cargarImagen(foto), cargarImagen(SELLO_SRC), fuentesDelBoleto(fuente)]).then(([f, sello]) => ({ foto: f, sello, fuente }));
    recursosPorFoto.set(k, p);
  }
  return p;
}

export default function BoletoEpico({ boleto, sorteo, foto, retraso = 0 }: {
  boleto: BoletoParaDibujar;
  sorteo: SorteoParaDibujar;
  /** La foto del premio (una ruta de la tienda), o null */
  foto: string | null;
  /** Segundos de espera antes de animarse (los boletos entran en cascada) */
  retraso?: number;
}) {
  const cajaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const caja = cajaRef.current;
    const canvas = canvasRef.current;
    if (!caja || !canvas) return;
    let vivo = true;
    let recursos: Recursos | null = null;
    let t: number | null = null;
    let cuadro = 0;
    let ancho = 0;

    const pintar = () => {
      if (!recursos) return;
      const W = caja.clientWidth;
      if (!W) return;
      const H = altoBoleto(W);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (W !== ancho) {
        ancho = W;
        canvas.width = Math.round((W + MARGEN * 2) * dpr);
        canvas.height = Math.round((H + MARGEN * 2) * dpr);
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W + MARGEN * 2, H + MARGEN * 2);
      ctx.translate(MARGEN, MARGEN);
      dibujarBoleto(ctx, boleto, sorteo, recursos, W, t);
    };

    const animar = () => {
      marcarVisto(boleto.codigo);
      const inicio = performance.now();
      const paso = (ahora: number) => {
        if (!vivo) return;
        const s = (ahora - inicio) / 1000 - retraso;
        t = s < 0 ? 0 : s;
        pintar();
        if (s < DURA_BOLETO) cuadro = requestAnimationFrame(paso);
        else {
          t = null;
          pintar();
        }
      };
      cuadro = requestAnimationFrame(paso);
    };

    let io: IntersectionObserver | null = null;
    void recursosDelBoleto(foto).then((r) => {
      if (!vivo) return;
      recursos = r;
      const quieto = prefiereMenosMovimiento() || yaVisto(boleto.codigo) || typeof IntersectionObserver === 'undefined';
      if (quieto) {
        t = null;
        pintar();
        return;
      }
      // Hasta que llega a la vista no se ve (así entra); al llegar, se anima una vez
      t = 0;
      pintar();
      io = new IntersectionObserver((entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        io?.disconnect();
        animar();
      }, { threshold: 0.35 });
      io.observe(caja);
    });

    const ro = new ResizeObserver(() => pintar());
    ro.observe(caja);
    return () => {
      vivo = false;
      cancelAnimationFrame(cuadro);
      io?.disconnect();
      ro.disconnect();
    };
  }, [boleto, sorteo, foto, retraso]);

  return (
    <div ref={cajaRef} className="relative w-full" style={{ aspectRatio: '320 / 164' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Boleto ${boleto.codigo} del ${sorteo.titulo}, ${boleto.n} de ${boleto.total}: ${boleto.origen}. Participa con ${sorteo.correo}. Resultado el ${sorteo.resultado}.`}
        className="pointer-events-none absolute"
        style={{ inset: -MARGEN, width: `calc(100% + ${MARGEN * 2}px)`, height: `calc(100% + ${MARGEN * 2}px)` }}
      />
    </div>
  );
}
