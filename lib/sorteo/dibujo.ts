// C-263: el boleto épico y el flyer de estado del sorteo, dibujados en canvas (como las historias de ElectroStudio,
// lib/studio/engine.ts: el mismo lienzo de 1080 × 1920, el QR con qrcode-generator y la animación por segundo). Un solo
// dibujo para la pantalla, la imagen que se descarga y el flyer: "una sola familia visual". El equipo eligió, viendo las
// maquetas del 15/11 (~/.cache/electroshop-trabajo/c263), el boleto A ("el talón") y el flyer F1 ("Mis boletos").
// - El boleto se diseñó al ancho de un teléfono (320, la letra más chica de 12,6: a 280 px, el ancho más chico en que sale, da 11) y crece parejo.
// - Los colores son los del kit (lib/marca.ts): el azul oscuro del logo, sus rótulos en brand-300 y el blanco.
// - Chispa va siempre con el corte de la cintura fuera del cuadro (pegado al borde de abajo, sin rebote hacia arriba).
// Solo navegador (canvas, Image, FontFace).
import qrcode from 'qrcode-generator';
import { chispaSrc } from '@/lib/studio/chispa';
import type { LogoDePremio } from '@/lib/sorteo/premio';

const AZ = { 50: '#f4f7fc', 200: '#d4e0f5', 300: '#aac1eb', 500: '#2a63cd', 600: '#1e4ba3', 700: '#1a3b7e' } as const;
const TINTA = '#212529';
const SUAVE = '#495057';
const GRIS = '#6a6c6b';
const FONDO_IMAGEN = '#eef2f9';

/* ---------- lo que se dibuja ---------- */
export interface BoletoParaDibujar {
  codigo: string;
  /** C-297: también los del producto estrella y los de una reseña */
  tipo: 'compra' | 'estrella' | 'resena' | 'amigos';
  /** "Compra ORD-2026-0041" o "Invitaste a 2 amigos" */
  origen: string;
  /** Su lugar entre los boletos del cliente ("2 de 3") */
  n: number;
  total: number;
  /** C-297: si representa a los que nacieron juntos (una compra que dio 15): el talón dice "15 boletos" en lugar de "2 de 3" */
  cantidad?: number;
}
export interface SorteoParaDibujar {
  /** "Sorteo de Navidad" */
  titulo: string;
  logo: LogoDePremio | null;
  /** Lo que se escribe si el premio no tiene logo ("PS4", o el nombre) */
  nombre: string;
  /** El correo tapado del cliente */
  correo: string;
  /** "20 DIC" */
  dia: string;
  /** "20 de diciembre" */
  resultado: string;
}
export interface Recursos {
  foto: HTMLImageElement | null;
  sello: HTMLImageElement | null;
  /** La familia de Inter de la página (next/font) */
  fuente: string;
}

/* ---------- imágenes y fuentes ---------- */
const imagenes = new Map<string, Promise<HTMLImageElement | null>>();
/** Una imagen de la tienda (misma dirección: el canvas no queda "sucio" y se puede exportar). null si no carga */
export function cargarImagen(src: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  let p = imagenes.get(src);
  if (!p) {
    p = new Promise((resolver) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => resolver(im);
      im.onerror = () => resolver(null);
      im.src = src;
    });
    imagenes.set(src, p);
  }
  return p;
}
export const SELLO_SRC = '/images/sorteo/sello-es.png';

/** Inter, como la carga next/font (la variable --font-inter de app/layout.tsx) */
export function fuenteInter(): string {
  const v = typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--font-inter').trim() : '';
  return v ? `${v}, Inter, system-ui, sans-serif` : 'Inter, system-ui, sans-serif';
}

/** Poppins (OFL, public/fonts), la de los títulos del arte del sorteo (el reel y su portada). Una sola vez por página */
const POPPINS = 'ESPoppins';
let poppins: Promise<void> | null = null;
export function cargarPoppins(): Promise<void> {
  if (poppins) return poppins;
  if (typeof FontFace === 'undefined') return Promise.resolve();
  const caras = [
    new FontFace(POPPINS, 'url(/fonts/poppins-latin-700-normal.woff2)', { weight: '700' }),
    new FontFace(POPPINS, 'url(/fonts/poppins-latin-800-normal.woff2)', { weight: '800' }),
  ];
  poppins = Promise.all(caras.map((c) => c.load().then((lista) => void document.fonts.add(lista)))).then(() => undefined).catch(() => undefined);
  return poppins;
}
/** Que Inter ya esté lista en los pesos del boleto (si no, el canvas dibuja con otra letra y no se vuelve a pintar) */
export async function fuentesDelBoleto(fuente: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(['500', '600', '700'].map((p) => document.fonts.load(`${p} 16px ${fuente}`).catch(() => [])));
}

/* ---------- tiempo ---------- */
const lim = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const tramo = (t: number, ini: number, dur: number) => lim((t - ini) / dur);
const sale = (x: number) => 1 - Math.pow(1 - x, 3);
const rebota = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
function azar(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const semillaDe = (texto: string) => [...texto].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/* ---------- piezas ---------- */
// Los logos de PlayStation, como los de LogoCorto (react-icons/si, Simple Icons). Las marcas son de Sony: lo dicen /sorteo y el flyer
const PS_SIMBOLO = 'M8.984 2.596v17.547l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.18.76.814.76 1.505v5.875c2.441 1.193 4.362-.002 4.362-3.152 0-3.237-1.126-4.675-4.438-5.827-1.307-.448-3.728-1.186-5.39-1.502zm4.656 16.241l6.296-2.275c.715-.258.826-.625.246-.818-.586-.192-1.637-.139-2.357.123l-4.205 1.5V14.98l.24-.085s1.201-.42 2.913-.615c1.696-.18 3.785.03 5.437.661 1.848.601 2.04 1.472 1.576 2.072-.465.6-1.622 1.036-1.622 1.036l-8.544 3.107V18.86zM1.807 18.6c-1.9-.545-2.214-1.668-1.352-2.32.801-.586 2.16-1.052 2.16-1.052l5.615-2.013v2.313L4.205 17c-.705.271-.825.632-.239.826.586.195 1.637.15 2.343-.12L8.247 17v2.074c-.12.03-.256.044-.39.073-1.939.331-3.996.196-6.038-.479z';
const PS_LETRAS: Record<LogoDePremio, { d: string; y: number; alto: number }> = {
  ps4: { d: 'M12.302 13.18v-2.387c0-.486.227-.834.712-.834h2.99c.017 0 .035-.018.035-.036v-.475c0-.004 0-.008-.003-.012h-3.66c-.792.1-1.18.653-1.18 1.357v2.386c0 .482-.233.831-.71.831H7.332c-.018 0-.036.012-.036.036v.475c0 .02.01.035.023.04h3.584c.933-.025 1.393-.62 1.393-1.385zM.024 14.564h1.05a.042.042 0 00.025-.04v-1.52c0-.487.275-.823.676-.823h4.323c.974 0 1.445-.6 1.445-1.384 0-.705-.386-1.257-1.18-1.357H.006c0 .003-.006.005-.006.01v.475c0 .024.013.036.037.036h5.697c.484 0 .712.35.712.833 0 .484-.227.836-.712.836H1.226c-.7 0-1.226.592-1.226 1.373v1.519c0 .02.01.036.028.04zm15.998-.55h5.738c.017 0 .03.012.03.024v.483c0 .024.017.036.035.036h1.035c.018 0 .036-.01.036-.036v-.475c0-.018.02-.036.04-.036h1.028c.024 0 .036-.018.036-.036v-.484c0-.018-.01-.036-.035-.036h-1.03c-.02 0-.037-.017-.037-.035V9.96c0-.283-.104-.463-.28-.523h-.3a1.153 1.153 0 00-.303.132l-6.18 3.815c-.24.15-.323.318-.263.445.048.104.185.182.454.182zm.895-.637l4.79-2.961c.03-.024.09-.018.09.048v2.961c0 .018-.016.036-.034.036h-4.817c-.04 0-.06-.012-.065-.024-.006-.024.005-.042.036-.06z', y: 9.436, alto: 5.128 },
  ps5: { d: 'M10.4499 14.56905a1.38287 1.38287 0 001.38287-1.38287v-2.37841a.83315.83315 0 01.83416-.83315h2.68403a.03732.03732 0 00.03631-.03732V9.4612a.03631.03631 0 00-.0363-.0363H12.1172a1.38287 1.38287 0 00-1.38388 1.38286v2.38043a.83416.83416 0 01-.83315.83415H7.25347a.03631.03631 0 00-.03631.03632v.47608a.03631.03631 0 00.03631.03631zm6.04488-3.21156V9.4612a.03631.03631 0 01.0363-.0363h7.30772a.03732.03732 0 01.03732.0363v.47609a.03833.03833 0 01-.03732.03732h-6.20929a.03631.03631 0 00-.0363.03631v1.2356a.3954.3954 0 00.3964.39741h4.62267a1.46457 1.46457 0 010 2.9251h-6.0812a.03631.03631 0 01-.0363-.0363v-.47407a.03631.03631 0 01.0363-.03632h5.53047a.91586.91586 0 10-.00706-1.8307h-4.72656a.83315.83315 0 01-.83315-.83416m-10.84608.28645a.83466.83466 0 000-1.66932H.03654a.03732.03732 0 01-.03632-.03732V9.4612a.03631.03631 0 01.03632-.0363h6.1528a1.38388 1.38388 0 010 2.76673H1.9328a.83315.83315 0 00-.83315.83416v1.51299a.03631.03631 0 01-.03631.0363H.03654a.03631.03631 0 01-.03632-.04034v-1.51298a1.38287 1.38287 0 011.38388-1.37783Z', y: 9.425, alto: 5.15 },
};
const caminos = new Map<string, Path2D>();
const camino = (d: string) => {
  let p = caminos.get(d);
  if (!p) {
    p = new Path2D(d);
    caminos.set(d, p);
  }
  return p;
};

/** Los íconos del pack (components/iconos) que van en el canvas: el trazo de 2 y la superficie al 25 % */
type Pieza = { d: string; sup?: boolean };
const ICONOS: Record<'carrito' | 'clientes' | 'calendario' | 'estrella' | 'chat', Pieza[]> = {
  carrito: [
    { d: 'M5.6 6.5h14.8a.8.8 0 0 1 .78.98L20 12.8a2 2 0 0 1-1.95 1.55H7.6z', sup: true }, { d: 'M2.5 3H4a1 1 0 0 1 .97.76L8 16.5h11' },
    { d: 'M8.25 20a1.25 1.25 0 1 0 2.5 0a1.25 1.25 0 1 0 -2.5 0z' }, { d: 'M16.25 20a1.25 1.25 0 1 0 2.5 0a1.25 1.25 0 1 0 -2.5 0z' },
  ],
  clientes: [
    { d: 'M13.5 7.5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0z' }, { d: 'M15 13.3a5.6 5.6 0 0 1 1.5-.2c3 0 5.3 2.2 5.3 5.2v.8h-3' },
    { d: 'M5.4 8a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0z', sup: true }, { d: 'M2.5 20.5v-.7c0-3.4 2.9-5.8 6.5-5.8s6.5 2.4 6.5 5.8v.7z', sup: true },
  ],
  // C-297: el producto estrella y la reseña (IconoEstrella e IconoChat del pack)
  estrella: [{ d: 'M12 2.8l2.75 5.6 6.2.9-4.5 4.35 1.05 6.15L12 16.9l-5.5 2.9 1.05-6.15L3.05 9.3l6.2-.9z', sup: true }],
  chat: [
    { d: 'M12 3.5c5 0 9 3.4 9 7.6s-4 7.6-9 7.6c-1 0-2-.1-2.9-.4L4.5 20.5l1.2-3.9C4 15.2 3 13.3 3 11.1 3 6.9 7 3.5 12 3.5z' },
    { d: 'M8 11.2h.01M12 11.2h.01M16 11.2h.01' },
  ],
  calendario: [{ d: 'M5 4.5h14a2 2 0 0 1 2 2v3H3v-3a2 2 0 0 1 2-2z', sup: true }, { d: 'M5 4.5h14a2 2 0 0 1 2 2v12.5a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-12.5a2 2 0 0 1 2 -2z' }, { d: 'M8 2.5v4M16 2.5v4' }],
};
/** C-297: el ícono de dónde salió cada boleto */
const ICONO_DEL_TIPO: Record<BoletoParaDibujar['tipo'], keyof typeof ICONOS> = { compra: 'carrito', estrella: 'estrella', resena: 'chat', amigos: 'clientes' };
function icono(ctx: CanvasRenderingContext2D, n: keyof typeof ICONOS, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 24, s / 24);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  for (const p of ICONOS[n]) {
    const c = camino(p.d);
    if (p.sup) {
      ctx.save();
      ctx.globalAlpha *= 0.25;
      ctx.fill(c);
      ctx.restore();
    }
    ctx.stroke(c);
  }
  ctx.restore();
}

/** El símbolo de PlayStation y el logotipo (PS4 o PS5), del alto del símbolo. Devuelve el ancho */
function logoPS(ctx: CanvasRenderingContext2D, logo: LogoDePremio, x: number, y: number, alto: number, color: string, letras = 0.5): number {
  const s1 = alto / 18.808;
  ctx.save();
  ctx.fillStyle = color;
  ctx.save();
  ctx.translate(x, y - 2.596 * s1);
  ctx.scale(s1, s1);
  ctx.fill(camino(PS_SIMBOLO));
  ctx.restore();
  const L = PS_LETRAS[logo];
  const altoL = alto * letras;
  const s2 = altoL / L.alto;
  const x2 = x + 24 * s1 + alto * 0.22;
  ctx.save();
  ctx.translate(x2, y + (alto - altoL) / 2 - L.y * s2);
  ctx.scale(s2, s2);
  ctx.fill(camino(L.d));
  ctx.restore();
  ctx.restore();
  return x2 + 24 * s2 - x;
}
function anchoLogoPS(alto: number, letras = 0.5): number {
  return (24 * alto) / 18.808 + alto * 0.22 + (24 * alto * letras) / 5.13;
}

interface Letra {
  tam: number;
  peso?: number;
  color: string;
  fam: string;
  esp?: number;
  al?: CanvasTextAlign;
}
function escribir(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, o: Letra): number {
  ctx.font = `${o.peso ?? 700} ${o.tam}px ${o.fam}`;
  ctx.fillStyle = o.color;
  ctx.textAlign = o.al ?? 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = `${o.esp ?? 0}px`;
  ctx.fillText(t, x, y);
  const w = ctx.measureText(t).width;
  ctx.letterSpacing = '0px';
  return w;
}
function medir(ctx: CanvasRenderingContext2D, t: string, o: Omit<Letra, 'color'>): number {
  ctx.font = `${o.peso ?? 700} ${o.tam}px ${o.fam}`;
  ctx.letterSpacing = `${o.esp ?? 0}px`;
  const w = ctx.measureText(t).width;
  ctx.letterSpacing = '0px';
  return w;
}
/** Achica la letra (hasta `minimo`) para que el texto quepa en `ancho`; si aún no cabe, lo corta con "…" */
function ajustar(ctx: CanvasRenderingContext2D, t: string, ancho: number, o: Omit<Letra, 'color'>, minimo: number): { texto: string; tam: number } {
  let tam = o.tam;
  while (tam > minimo && medir(ctx, t, { ...o, tam }) > ancho) tam -= 0.5;
  let texto = t;
  while (texto.length > 3 && medir(ctx, texto, { ...o, tam }) > ancho) texto = `${texto.slice(0, -2)}…`;
  return { texto, tam };
}

/** El código mientras "rueda": cada letra cae en su lugar, de izquierda a derecha */
function codigoRodando(codigo: string, avance: number, cuadro: number): string {
  if (avance >= 1) return codigo;
  const n = codigo.length;
  return [...codigo].map((c, i) => (c === '-' ? '-' : avance >= (i + 1) / n ? c : LETRAS[(cuadro * 7 + i * 13) % LETRAS.length])).join('');
}

/** La foto del premio recortada a un cuadro (la cubre) */
function foto(ctx: CanvasRenderingContext2D, im: HTMLImageElement | null, x: number, y: number, w: number, h: number, cx = 0.5, cy = 0.5) {
  if (!im || !im.naturalWidth) return;
  const iw = im.naturalWidth;
  const ih = im.naturalHeight;
  const k = Math.min(iw / w, ih / h);
  const sw = w * k;
  const sh = h * k;
  ctx.drawImage(im, lim(cx * iw - sw / 2, 0, iw - sw), lim(cy * ih - sh / 2, 0, ih - sh), sw, sh, x, y, w, h);
}

/** El destello que cruza una vez */
function destello(ctx: CanvasRenderingContext2D, W: number, H: number, avance: number, alfa: number, ancho: number) {
  if (avance <= 0 || avance >= 1) return;
  const x = -ancho * 2 + avance * (W + ancho * 4);
  const g = ctx.createLinearGradient(x - ancho, 0, x + ancho, H * 0.35);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, `rgba(255,255,255,${alfa})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** El contorno del boleto: la perforación vertical en `cx`, con las muescas arriba y abajo */
function forma(ctx: CanvasRenderingContext2D, W: number, H: number, r: number, cx: number, nr: number) {
  ctx.beginPath();
  ctx.moveTo(r, 0);
  if (nr > 0.2) {
    ctx.lineTo(cx - nr, 0);
    ctx.arc(cx, 0, nr, Math.PI, 0, true);
  }
  ctx.lineTo(W - r, 0);
  ctx.arcTo(W, 0, W, r, r);
  ctx.lineTo(W, H - r);
  ctx.arcTo(W, H, W - r, H, r);
  if (nr > 0.2) {
    ctx.lineTo(cx + nr, H);
    ctx.arc(cx, H, nr, 0, Math.PI, true);
  }
  ctx.lineTo(r, H);
  ctx.arcTo(0, H, 0, H - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
}

/* ---------- el boleto (la A: el talón) ---------- */
/** El boleto mide 320 × 164 en su diseño y crece parejo */
export const altoBoleto = (W: number) => (W * 164) / 320;
/** Cuánto dura su animación, en segundos */
export const DURA_BOLETO = 1.75;

/**
 * Dibuja un boleto desde (0, 0) con el ancho `W`. `t` es el segundo de su animación (null: quieto y completo): sube y se
 * endereza, la perforación se marca de arriba abajo, el código "rueda" hasta quedar, cae el sello ES con un golpecito y
 * cruza un destello.
 */
export function dibujarBoleto(ctx: CanvasRenderingContext2D, b: BoletoParaDibujar, s: SorteoParaDibujar, r: Recursos, W: number, t: number | null, { sombra = true } = {}) {
  const u = W / 320;
  const H = altoBoleto(W);
  const T = t == null ? 9 : t;
  const cx = 228 * u;
  const fam = r.fuente;
  const entra = sale(tramo(T, 0, 0.45));
  const nr = 9 * u * sale(tramo(T, 0.22, 0.3));
  const golpe = tramo(T, 1.02, 0.32);
  ctx.save();
  ctx.globalAlpha *= tramo(T, 0, 0.18);
  ctx.translate(0, (1 - entra) * 22 * u + (golpe > 0 && golpe < 1 ? Math.sin(golpe * Math.PI * 5) * (1 - golpe) * 1.8 * u : 0));
  ctx.translate(W / 2, H / 2);
  ctx.rotate((1 - entra) * -0.045);
  ctx.translate(-W / 2, -H / 2);

  if (sombra) {
    ctx.save();
    ctx.shadowColor = 'rgba(14,31,68,.30)';
    ctx.shadowBlur = 16 * u;
    ctx.shadowOffsetY = 7 * u;
    forma(ctx, W, H, 14 * u, cx, nr);
    ctx.fillStyle = AZ[700];
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  forma(ctx, W, H, 14 * u, cx, nr);
  ctx.fillStyle = AZ[700];
  ctx.fill();
  ctx.clip();

  // La foto, detrás del texto: sus bordes son del mismo azul y se funden
  const fx = 104 * u;
  if (r.foto) {
    foto(ctx, r.foto, fx, 0, cx - fx, H, 0.55, 0.52);
    const g = ctx.createLinearGradient(fx, 0, fx + 64 * u, 0);
    g.addColorStop(0, AZ[700]);
    g.addColorStop(0.35, 'rgba(26,59,126,.75)');
    g.addColorStop(1, 'rgba(26,59,126,0)');
    ctx.fillStyle = g;
    ctx.fillRect(fx - 1, 0, 64 * u + 1, H);
    const g2 = ctx.createLinearGradient(0, H * 0.55, 0, H);
    g2.addColorStop(0, 'rgba(26,59,126,0)');
    g2.addColorStop(1, 'rgba(26,59,126,.85)');
    ctx.fillStyle = g2;
    ctx.fillRect(fx, 0, cx - fx, H);
  }

  const x = 16 * u;
  const rotulo = ajustar(ctx, s.titulo.toUpperCase(), cx - x - 12 * u, { tam: 12.6 * u, fam, esp: 1.1 * u }, 10.5 * u);
  escribir(ctx, rotulo.texto, x, 27 * u, { tam: rotulo.tam, color: AZ[300], fam, esp: 1.2 * u });
  if (s.logo) logoPS(ctx, s.logo, x, 37 * u, 25 * u, '#fff');
  else {
    const n = ajustar(ctx, s.nombre, cx - x - 16 * u, { tam: 21 * u, fam }, 13 * u);
    escribir(ctx, n.texto, x, 59 * u, { tam: n.tam, color: '#fff', fam });
  }
  escribir(ctx, 'Participa con', x, 86 * u, { tam: 12.6 * u, peso: 500, color: AZ[300], fam });
  const correo = ajustar(ctx, s.correo, cx - x - 14 * u, { tam: 15 * u, fam }, 11 * u);
  escribir(ctx, correo.texto, x, 104 * u, { tam: correo.tam, color: '#fff', fam });
  // De dónde salió
  const wE = medir(ctx, b.origen, { tam: 12.6 * u, peso: 600, fam });
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, 118 * u, wE + 33 * u, 26 * u, 13 * u);
  ctx.fillStyle = 'rgba(255,255,255,.13)';
  ctx.fill();
  ctx.restore();
  icono(ctx, ICONO_DEL_TIPO[b.tipo], x + 9 * u, 124 * u, 14 * u, '#fff');
  escribir(ctx, b.origen, x + 26 * u, 135.5 * u, { tam: 12.6 * u, peso: 600, color: '#fff', fam });

  // El talón
  const sx = (cx + W) / 2;
  escribir(ctx, 'BOLETO', sx, 27 * u, { tam: 12.6 * u, color: AZ[300], fam, esp: 1.4 * u, al: 'center' });
  const [c1, c2] = codigoRodando(b.codigo, sale(tramo(T, 0.5, 0.55)), Math.floor(T * 24)).split('-');
  escribir(ctx, c1, sx, 59 * u, { tam: 22 * u, color: '#fff', fam, esp: 2.4 * u, al: 'center' });
  escribir(ctx, c2 ?? '', sx, 85 * u, { tam: 22 * u, color: '#fff', fam, esp: 2.4 * u, al: 'center' });
  ctx.fillStyle = 'rgba(170,193,235,.35)';
  ctx.fillRect(sx - 22 * u, 100 * u, 44 * u, 1 * u);
  escribir(ctx, s.dia, sx, 127 * u, { tam: 14 * u, color: '#fff', fam, al: 'center' });
  escribir(ctx, b.cantidad && b.cantidad > 1 ? `${b.cantidad} boletos` : `${b.n} de ${b.total}`, sx, 146 * u, { tam: 12.6 * u, peso: 500, color: AZ[300], fam, al: 'center' });

  // La perforación: se dibuja de arriba abajo
  const corte = sale(tramo(T, 0.22, 0.42));
  if (corte > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(170,193,235,.6)';
    ctx.lineWidth = 1.6 * u;
    ctx.setLineDash([4 * u, 4 * u]);
    ctx.beginPath();
    ctx.moveTo(cx, 11 * u);
    ctx.lineTo(cx, 11 * u + (H - 22 * u) * corte);
    ctx.stroke();
    ctx.restore();
  }
  // El sello ES cae sobre la perforación
  const se = tramo(T, 0.9, 0.22);
  if (se > 0 && r.sello?.naturalWidth) {
    const d = 40 * u * (1 + (1 - sale(se)) * 0.9);
    ctx.save();
    ctx.globalAlpha *= 0.9 * se;
    ctx.translate(cx - 10 * u, H - 46 * u);
    ctx.rotate(-0.24);
    ctx.drawImage(r.sello, -d / 2, -d / 2, d, d);
    ctx.restore();
  }
  destello(ctx, W, H, tramo(T, 1.2, 0.55), 0.22, 46 * u);
  ctx.restore();
  ctx.restore();
}

/**
 * La imagen que se descarga: los boletos uno debajo del otro, a 960 de ancho, sobre el fondo claro de los correos y con la
 * marca debajo. Sin el monto ni los amigos: se comparte.
 */
export function imagenDeBoletos(boletos: BoletoParaDibujar[], s: SorteoParaDibujar, r: Recursos, logo: HTMLImageElement | null, dominio: string): HTMLCanvasElement {
  const W = 960;
  const H = altoBoleto(W);
  const pad = 60;
  const sep = 40;
  const pie = 120;
  const c = document.createElement('canvas');
  c.width = W + pad * 2;
  c.height = pad * 2 + boletos.length * H + (boletos.length - 1) * sep + pie;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.fillStyle = FONDO_IMAGEN;
  ctx.fillRect(0, 0, c.width, c.height);
  boletos.forEach((b, i) => {
    ctx.save();
    ctx.translate(pad, pad + i * (H + sep));
    dibujarBoleto(ctx, b, s, r, W, null);
    ctx.restore();
  });
  const y = c.height - pad - pie + 30;
  if (logo?.naturalWidth) {
    const w = 300;
    ctx.drawImage(logo, (c.width - w) / 2, y, w, (w * logo.naturalHeight) / logo.naturalWidth);
  }
  escribir(ctx, `${dominio}/sorteo`, c.width / 2, y + 100, { tam: 26, peso: 600, color: GRIS, fam: r.fuente, al: 'center' });
  return c;
}

/* ---------- el flyer (la F1: "Mis boletos") ---------- */
export const FLYER_W = 1080;
export const FLYER_H = 1920;
/** Lo que dura el video; la animación termina antes y se queda quieta */
export const FLYER_DURA = 7;
export const FLYER_ANIMA = 5.2;

export interface DatosFlyer {
  /** Hasta 3 boletos (los últimos), para el abanico */
  boletos: BoletoParaDibujar[];
  total: number;
  /** El enlace corto completo (el QR) y escrito sin https:// */
  enlace: string;
  enlaceTexto: string;
  dominio: string;
  /** La línea de las marcas del premio, o null */
  marcas: string | null;
}
export interface RecursosFlyer extends Recursos {
  logo: HTMLImageElement | null;
  chispa: HTMLImageElement | null;
}
/** Las imágenes del flyer: el logo blanco de ElectroStudio y Chispa (con gorro si la Navidad está encendida) */
export const LOGO_BLANCO = '/images/studio/logo-white.png';
export const chispaDelFlyer = (gorro: boolean) => chispaSrc('senala', gorro);

const qrCache = new Map<string, boolean[][]>();
function modulosQR(texto: string): boolean[][] {
  const hit = qrCache.get(texto);
  if (hit) return hit;
  const q = qrcode(0, 'M');
  q.addData(texto);
  q.make();
  const n = q.getModuleCount();
  const m: boolean[][] = [];
  for (let i = 0; i < n; i++) m.push(Array.from({ length: n }, (_, j) => q.isDark(i, j)));
  qrCache.set(texto, m);
  return m;
}
/** El QR: los ojos primero y los módulos en un orden al azar (siempre el mismo) mientras `avance` va de 0 a 1 */
function dibujarQR(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, lado: number, color: string, avance: number) {
  const m = modulosQR(texto);
  const n = m.length;
  const k = lado / n;
  const r = azar(semillaDe(texto));
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (!m[i][j]) continue;
      const umbral = r();
      const ojo = (i < 7 && j < 7) || (i < 7 && j >= n - 7) || (i >= n - 7 && j < 7);
      if (ojo ? avance <= 0 : umbral > avance) continue;
      ctx.fillRect(x + j * k, y + i * k, k + 0.4, k + 0.4);
    }
  }
}
function fondo(ctx: CanvasRenderingContext2D, t: number | null) {
  ctx.fillStyle = AZ[700];
  ctx.fillRect(0, 0, FLYER_W, FLYER_H);
  const cx = 540;
  const cy = 860;
  const g = ctx.createRadialGradient(cx, cy, 40, cx, cy, 1100);
  g.addColorStop(0, 'rgba(42,99,205,.95)');
  g.addColorStop(0.55, 'rgba(42,99,205,.35)');
  g.addColorStop(1, 'rgba(42,99,205,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FLYER_W, FLYER_H);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((t ?? 0) * 0.035);
  ctx.fillStyle = 'rgba(255,255,255,.045)';
  for (let i = 0; i < 24; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 2200, (i / 24) * Math.PI * 2, (i / 24) * Math.PI * 2 + 0.11);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Puntos de luz: titilan mientras corre la animación; en la imagen, quietos
  const r = azar(77);
  for (let i = 0; i < 46; i++) {
    const x = r() * FLYER_W;
    const y = r() * FLYER_H;
    const s = 2 + r() * 4;
    const f = r() * 6.28;
    const a = t == null ? 0.35 + r() * 0.3 : 0.3 + 0.3 * Math.sin(f + t * 2.4);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
}
function aparece(ctx: CanvasRenderingContext2D, a: number, dibujar: () => void, { dy = 30, escala = false, cx = FLYER_W / 2, cy = 0 } = {}) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= lim(a * 1.6);
  if (escala) {
    const s = 0.7 + 0.3 * rebota(a);
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
  } else ctx.translate(0, (1 - sale(a)) * dy);
  dibujar();
  ctx.restore();
}

/**
 * La F1: "¡YA TENGO 3 BOLETOS PARA LA [PS4]!" con sus boletos en abanico (el número cuenta mientras entran), el QR con su
 * enlace en la tarjeta blanca, Chispa abajo (pegado al borde: el corte queda fuera) con su globo y las marcas. Lo de arriba
 * y lo de abajo quedan fuera de lo que tapan Instagram y WhatsApp (el perfil arriba, "Responder" abajo), y el QR, fuera de
 * los botones de TikTok. `t`: el segundo de la animación (null: la imagen quieta).
 */
export function dibujarFlyer(ctx: CanvasRenderingContext2D, d: DatosFlyer, s: SorteoParaDibujar, r: RecursosFlyer, t: number | null) {
  const T = t == null ? 99 : t;
  const fam = r.fuente;
  const pop = `${POPPINS}, ${fam}`;
  fondo(ctx, t);
  aparece(ctx, tramo(T, 0.1, 0.45), () => {
    if (!r.logo?.naturalWidth) return;
    const w = 360;
    ctx.drawImage(r.logo, 540 - w / 2, 166, w, (w * r.logo.naturalHeight) / r.logo.naturalWidth);
  }, { dy: -40 });
  aparece(ctx, tramo(T, 0.3, 0.4), () => {
    const rot = ajustar(ctx, s.titulo.toUpperCase(), 760, { tam: 26, fam, esp: 6 }, 18);
    const w = medir(ctx, rot.texto, { tam: rot.tam, fam, esp: 6 });
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.roundRect(540 - w / 2 - 28, 256, w + 56, 52, 26);
    ctx.fill();
    escribir(ctx, rot.texto, 543, 292, { tam: rot.tam, color: AZ[200], fam, esp: 6, al: 'center' });
  });
  aparece(ctx, tramo(T, 0.45, 0.4), () => escribir(ctx, '¡YA TENGO', 540, 418, { tam: 84, peso: 800, fam: pop, color: '#fff', al: 'center' }), { escala: true, cy: 390 });
  // El número cuenta los boletos a medida que entran al abanico
  const abanico = d.boletos.slice(-3);
  const inicios = abanico.map((_, i) => 1.0 + i * 0.25);
  const cuenta = t == null ? d.total : Math.max(1, Math.round((d.total * inicios.filter((x) => T >= x).length) / Math.max(1, abanico.length)));
  aparece(ctx, tramo(T, 0.7, 0.4), () => {
    const linea = `${cuenta} ${cuenta === 1 ? 'BOLETO' : 'BOLETOS'}`;
    const a = ajustar(ctx, linea, 980, { tam: 158, peso: 800, fam: pop }, 100);
    escribir(ctx, a.texto, 540, 572, { tam: a.tam, peso: 800, fam: pop, color: '#fff', al: 'center' });
  }, { escala: true, cy: 520 });
  aparece(ctx, tramo(T, 1.0, 0.4), () => {
    if (s.logo) {
      const tam = 80;
      const altoS = tam * 0.78;
      const antes = 'PARA LA ';
      const wA = medir(ctx, antes, { tam, peso: 800, fam: pop });
      const wD = medir(ctx, '!', { tam, peso: 800, fam: pop });
      const wL = anchoLogoPS(altoS);
      let x = 540 - (wA + wL + tam * 0.12 + wD) / 2;
      escribir(ctx, antes, x, 676, { tam, peso: 800, fam: pop, color: '#fff' });
      x += wA;
      logoPS(ctx, s.logo, x, 676 - altoS * 0.92, altoS, '#fff');
      escribir(ctx, '!', x + wL + tam * 0.12, 676, { tam, peso: 800, fam: pop, color: '#fff' });
    } else escribir(ctx, 'PARA EL SORTEO!', 540, 676, { tam: 80, peso: 800, fam: pop, color: '#fff', al: 'center' });
  }, { escala: true, cy: 650 });

  // El abanico de boletos: el más nuevo adelante
  const lugares = abanico.length === 1
    ? [{ x: 540, y: 752, r: 0, w: 600 }]
    : abanico.length === 2
      ? [{ x: 420, y: 740, r: -0.1, w: 520 }, { x: 650, y: 762, r: 0.06, w: 560 }]
      : [{ x: 330, y: 738, r: -0.13, w: 500 }, { x: 750, y: 738, r: 0.13, w: 500 }, { x: 540, y: 752, r: 0, w: 560 }];
  abanico.forEach((b, i) => {
    const l = lugares[i];
    const tb = t == null ? null : T - inicios[i];
    if (tb != null && tb < 0) return;
    const H = altoBoleto(l.w);
    ctx.save();
    ctx.translate(l.x, l.y + H / 2);
    ctx.rotate(l.r);
    ctx.translate(-l.w / 2, -H / 2);
    dibujarBoleto(ctx, b, s, r, l.w, tb);
    ctx.restore();
  });

  // La tarjeta del QR
  aparece(ctx, tramo(T, 2.5, 0.5), () => {
    ctx.save();
    ctx.shadowColor = 'rgba(14,31,68,.4)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(64, 1088, 952, 330, 40);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = AZ[50];
    ctx.beginPath();
    ctx.roundRect(92, 1111, 284, 284, 24);
    ctx.fill();
    dibujarQR(ctx, d.enlace, 108, 1127, 252, AZ[700], t == null ? 1 : tramo(T, 2.8, 0.7));
    escribir(ctx, '¡Participa', 408, 1164, { tam: 60, peso: 800, fam: pop, color: TINTA });
    escribir(ctx, 'conmigo!', 408, 1228, { tam: 60, peso: 800, fam: pop, color: TINTA });
    escribir(ctx, 'Crea tu cuenta gratis con mi enlace:', 410, 1282, { tam: 28, peso: 500, color: SUAVE, fam });
    const n = t == null ? d.enlaceTexto.length : Math.floor(d.enlaceTexto.length * tramo(T, 3.2, 0.6));
    const e = ajustar(ctx, d.enlaceTexto, 580, { tam: 31, fam }, 22);
    escribir(ctx, e.texto.slice(0, n), 410, 1328, { tam: e.tam, color: AZ[600], fam });
    icono(ctx, 'calendario', 410, 1358, 30, AZ[600]);
    escribir(ctx, `Resultado: ${s.resultado}`, 452, 1383, { tam: 27, peso: 600, color: GRIS, fam });
  }, { dy: 60 });

  // Chispa abajo, pegado al borde: sube desde fuera del cuadro y nunca de más (se le vería el corte de la cintura)
  const tc = tramo(T, 3.0, 0.6);
  if (tc > 0 && r.chispa?.naturalWidth) {
    const w = 440;
    const h = (w * r.chispa.naturalHeight) / r.chispa.naturalWidth;
    ctx.save();
    ctx.translate(610 + w / 2, FLYER_H + 10 + Math.max(0, 1 - rebota(tc)) * h * 0.75);
    ctx.rotate(Math.sin(tramo(T, 3.8, 0.7) * Math.PI * 2) * 0.03);
    ctx.drawImage(r.chispa, -w / 2, -h, w, h);
    ctx.restore();
  }
  aparece(ctx, tramo(T, 3.6, 0.35), () => {
    const x = 64;
    const y = 1486;
    const w = 560;
    const h = 128;
    ctx.save();
    ctx.shadowColor = 'rgba(14,31,68,.35)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 34);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w - 70, y + h - 4);
    ctx.lineTo(x + w + 26, y + h + 16);
    ctx.lineTo(x + w - 20, y + h - 40);
    ctx.fill();
    ctx.restore();
    escribir(ctx, '¡Escanea el código', x + 34, y + 60, { tam: 36, peso: 700, fam: pop, color: TINTA });
    escribir(ctx, 'y participa tú también!', x + 34, y + 106, { tam: 36, peso: 700, fam: pop, color: TINTA });
  }, { escala: true, cx: 600, cy: 1600 });
  aparece(ctx, tramo(T, 4.0, 0.4), () => {
    const lineas = [`Sorteo de Electro Shop. Bases en ${d.dominio}/sorteo.`, ...(d.marcas ? d.marcas.split('\n') : [])];
    lineas.forEach((l, i) => escribir(ctx, l, 70, 1668 + i * 25, { tam: 18, peso: 500, color: 'rgba(212,224,245,.75)', fam }));
  });
}

/** La línea de las marcas del flyer, según el logo del premio (el aviso completo está en /sorteo) */
export function marcasDelFlyer(logo: LogoDePremio | null): string | null {
  if (!logo) return null;
  return `PlayStation y ${logo === 'ps4' ? 'PS4' : 'PS5'} son marcas de Sony,\nque no patrocina este sorteo.`;
}
