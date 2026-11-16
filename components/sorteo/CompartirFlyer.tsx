'use client';

// C-263: "¡Presume tus boletos!", la hoja para compartir el flyer de estado del cliente (la F1 del equipo, "Mis boletos").
// La hoja es la del kit de onboarding (PLAN.md §1.11): sube desde abajo (en la PC, una tarjeta en el centro) y Chispa se
// asoma por detrás del borde de arriba (la hoja le tapa la cintura). Dentro:
// - la vista previa del flyer, que se anima una vez;
// - las tres redes, cada una con su línea: en WhatsApp el enlace va en el texto y se toca; en Instagram va en el sticker
//   «Enlace» (por eso el enlace queda copiado); en TikTok no se toca ningún enlace, por eso el QR;
// - "Compartir" (el teléfono: copia el enlace y abre la hoja del sistema con la imagen y el texto), o "Descargar imagen"
//   (la computadora: la baja y copia el enlace); "Copiar enlace" y "Descargar video" aparte.
// Todo se dibuja en el navegador con los datos del propio cliente (su sesión): no se le pide nada al servidor.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { FaWhatsapp } from 'react-icons/fa6';
import { SiInstagram, SiTiktok } from 'react-icons/si';
import { IconoCerrar, IconoCompartir, IconoCopiar, IconoDescargar, IconoEnlace, IconoVideo } from '@/components/iconos';
import ChispaGuia, { PROPORCION_CHISPA } from '@/components/onboarding/ChispaGuia';
import { atraparTab } from '@/components/onboarding/compartido';
import { useSettings } from '@/contexts/SettingsContext';
import { adminPrimaryButton } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { prefiereMenosMovimiento } from '@/lib/motion/resorte';
import {
  cargarImagen, cargarPoppins, chispaDelFlyer, dibujarFlyer, FLYER_ANIMA, FLYER_DURA, FLYER_H, FLYER_W, LOGO_BLANCO,
  type DatosFlyer, type RecursosFlyer, type SorteoParaDibujar,
} from '@/lib/sorteo/dibujo';
import { canvasBlob, downloadBlob, pickVideoType, puedeCompartirArchivo, recordCanvas } from '@/lib/studio/exportar';
import { recursosDelBoleto } from './BoletoEpico';

const ANCHO_CHISPA = 104;
const ASOMA = 0.86;
const CABECERA = 24;
const ARCHIVO = 'flyer-sorteo-electroshop';

const REDES = [
  { Logo: FaWhatsapp, nombre: 'WhatsApp Estado', linea: 'El enlace va en el texto y se puede tocar.', color: 'text-whatsapp' },
  { Logo: SiInstagram, nombre: 'Instagram Historia', linea: 'Tu enlace queda copiado: pégalo en el sticker «Enlace».', color: 'text-ink' },
  { Logo: SiTiktok, nombre: 'TikTok', linea: 'Ahí no se tocan enlaces: tus amigos escanean el QR.', color: 'text-ink' },
];

export default function CompartirFlyer({ datos, sorteo, foto, texto, alCerrar }: {
  datos: DatosFlyer;
  sorteo: SorteoParaDibujar;
  foto: string | null;
  /** El texto que acompaña la imagen al compartir (con el enlace) */
  texto: string;
  alCerrar: () => void;
}) {
  const { settings } = useSettings();
  const gorro = Boolean(settings?.gorroNavidad);
  const [recursos, setRecursos] = useState<RecursosFlyer | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [grabando, setGrabando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const previaRef = useRef<HTMLCanvasElement>(null);
  const raizRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const focoPrevio = useRef<Element | null>(typeof document !== 'undefined' ? document.activeElement : null);
  const tituloId = useId();
  useBodyScrollLock(true);

  // Las imágenes y las letras; después, la imagen lista para compartir (el teléfono pide compartir al instante del toque)
  useEffect(() => {
    let vivo = true;
    void Promise.all([recursosDelBoleto(foto), cargarImagen(LOGO_BLANCO), cargarImagen(chispaDelFlyer(gorro)), cargarPoppins()]).then(async ([r, logo, chispa]) => {
      if (!vivo) return;
      const listos = { ...r, logo, chispa };
      setRecursos(listos);
      const c = document.createElement('canvas');
      c.width = FLYER_W;
      c.height = FLYER_H;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      dibujarFlyer(ctx, datos, sorteo, listos, null);
      const blob = await canvasBlob(c);
      if (vivo && blob) setArchivo(new File([blob], `${ARCHIVO}.png`, { type: 'image/png' }));
    });
    return () => {
      vivo = false;
    };
  }, [datos, sorteo, foto, gorro]);

  // La vista previa: se anima una vez (con "reducir movimiento", quieta)
  useEffect(() => {
    const canvas = previaRef.current;
    if (!canvas || !recursos) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.clientWidth || 144;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(((W * FLYER_H) / FLYER_W) * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pintar = (t: number | null) => {
      ctx.setTransform(canvas.width / FLYER_W, 0, 0, canvas.height / FLYER_H, 0, 0);
      dibujarFlyer(ctx, datos, sorteo, recursos, t);
    };
    if (prefiereMenosMovimiento()) {
      pintar(null);
      return;
    }
    let cuadro = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = (ahora - inicio) / 1000;
      if (t < FLYER_ANIMA) {
        pintar(t);
        cuadro = requestAnimationFrame(paso);
      } else pintar(null);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [recursos, datos, sorteo]);

  useEffect(() => {
    botonRef.current?.focus({ preventScroll: true });
  }, []);

  const cerrar = useCallback(() => {
    const fin = () => {
      if (focoPrevio.current instanceof HTMLElement) focoPrevio.current.focus({ preventScroll: true });
      alCerrar();
    };
    if (prefiereMenosMovimiento()) return fin();
    setSaliendo(true);
    setTimeout(fin, 280);
  }, [alCerrar]);

  useEffect(() => {
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
      else atraparTab(e, raizRef.current);
    };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [cerrar]);

  const compartible = Boolean(archivo && puedeCompartirArchivo(archivo));

  const copiar = async (aviso = true) => {
    try {
      await navigator.clipboard.writeText(datos.enlace);
      if (aviso) toast.success('Tu enlace quedó copiado. En Instagram, pégalo en el sticker «Enlace».', { id: 'flyer-enlace', duration: 5000 });
      return true;
    } catch {
      if (aviso) toast.error(`No se pudo copiar. Tu enlace: ${datos.enlace}`, { id: 'flyer-enlace' });
      return false;
    }
  };

  const descargar = async () => {
    if (!archivo) return;
    downloadBlob(archivo, archivo.name);
    const copiado = await copiar(false);
    toast.success(copiado ? 'Listo: se descargó tu flyer y tu enlace quedó copiado.' : 'Listo: se descargó tu flyer.', { id: 'flyer-enlace' });
  };

  const compartir = () => {
    if (!archivo) return;
    // El enlace se copia sin esperar: el teléfono solo deja compartir justo después del toque
    void (navigator.clipboard ? navigator.clipboard.writeText(datos.enlace) : Promise.reject(new Error('Sin portapapeles'))).then(
      () => toast.success('Tu enlace quedó copiado. En Instagram, pégalo en el sticker «Enlace».', { id: 'flyer-enlace', duration: 6000 }),
      // C-267: si el teléfono no dejó copiarlo, se dice cómo llevarlo a Instagram
      () => toast('Para Instagram, toca «Copiar» y pega tu enlace en el sticker «Enlace».', { id: 'flyer-enlace', duration: 6000 }),
    );
    navigator.share({ files: [archivo], text: texto }).catch((e: unknown) => {
      // Cancelado por la persona, o ya hay una hoja abierta: no es un error
      const nombre = typeof e === 'object' && e !== null && 'name' in e ? String(e.name) : '';
      if (nombre === 'AbortError' || nombre === 'InvalidStateError') return;
      // C-267: el teléfono no abrió la hoja (o no aceptó la imagen). Antes no pasaba nada; ahora se descarga, para subirla
      // desde la galería
      downloadBlob(archivo, archivo.name);
      toast.success('Tu teléfono no abrió la hoja de compartir: se descargó tu flyer. Súbelo desde tu galería.', { id: 'flyer-enlace', duration: 7000 });
    });
  };

  const video = async () => {
    const tipo = pickVideoType();
    if (!tipo || !recursos) {
      toast.error('Este navegador no puede grabar el video. Prueba con Chrome, o descarga la imagen.');
      return;
    }
    setGrabando(true);
    try {
      const c = document.createElement('canvas');
      c.width = FLYER_W;
      c.height = FLYER_H;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('Sin canvas');
      const blob = await recordCanvas(c, tipo, (t) => dibujarFlyer(ctx, datos, sorteo, recursos, t), FLYER_DURA);
      downloadBlob(blob, `${ARCHIVO}.${tipo.startsWith('video/mp4') ? 'mp4' : 'webm'}`);
      toast.success(tipo.startsWith('video/mp4') ? 'Listo: se descargó tu video.' : 'Listo: se descargó tu video (WEBM: Instagram prefiere MP4, usa Chrome actualizado).');
    } catch {
      toast.error('No se pudo grabar el video. Descarga la imagen.');
    } finally {
      setGrabando(false);
    }
  };

  const altoChispa = Math.round(ANCHO_CHISPA * PROPORCION_CHISPA);
  const asoma = Math.round(altoChispa * ASOMA);
  const secundario = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:border-brand-300 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-60';

  return createPortal(
    <div
      ref={raizRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      data-saliendo={saliendo ? '' : undefined}
      className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center lg:items-center lg:p-6"
    >
      <div className="onb-velo absolute inset-0 bg-brand-700/60" aria-hidden="true" onClick={cerrar} />
      <div className="onb-lamina relative w-full sm:w-[30rem] lg:w-[48rem]" style={{ marginTop: asoma + CABECERA }}>
        {/* Chispa, detrás del borde de arriba de la hoja: la ventana termina 2 px por debajo del borde (la hoja lo tapa) */}
        <div aria-hidden="true" className="pointer-events-none absolute right-7 overflow-hidden" style={{ bottom: 'calc(100% - 2px)', width: ANCHO_CHISPA, height: asoma + 2 + CABECERA }}>
          <div className="onb-asoma absolute left-0" style={{ top: CABECERA }}>
            <ChispaGuia pose="senala" ancho={ANCHO_CHISPA} />
          </div>
        </div>

        <div className="onb-tarjeta relative max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-t-[1.75rem] bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 lg:rounded-[1.75rem] lg:p-7">
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            <IconoCerrar className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-7">
            <div className="flex items-start gap-4 pt-8 lg:block lg:pt-0">
              <div className="w-32 shrink-0 overflow-hidden rounded-2xl bg-brand-700 shadow-lg ring-1 ring-black/5 lg:w-64">
                <canvas ref={previaRef} className="block w-full" style={{ aspectRatio: `${FLYER_W} / ${FLYER_H}` }} role="img" aria-label={`Tu flyer: ¡Ya tengo ${datos.total} ${datos.total === 1 ? 'boleto' : 'boletos'}! Participa conmigo. ${datos.enlaceTexto}`} />
              </div>
              <div className="min-w-0 lg:hidden">
                <h2 id={tituloId} className="text-xl font-bold leading-tight text-ink">¡Presume tus boletos!</h2>
                <p className="mt-1 text-sm text-ink-soft">Tu historia para el estado, con tu enlace para invitar.</p>
              </div>
            </div>

            <div className="mt-4 min-w-0 lg:mt-0">
              <div className="hidden lg:block" aria-hidden="true">
                <p className="text-2xl font-bold leading-tight text-ink">¡Presume tus boletos!</p>
                <p className="mt-1 text-sm text-ink-soft">Tu historia para el estado, con tu enlace para invitar. Descárgala y súbela desde el teléfono.</p>
              </div>
              <ul className="space-y-2.5 lg:mt-5">
                {REDES.map(({ Logo, nombre, linea, color }) => (
                  <li key={nombre} className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface ring-1 ring-line ${color}`}>
                      <Logo className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{nombre}</span>
                      <span className="block text-sm leading-snug text-ink-soft">{linea}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-surface py-1 pl-3 pr-1 text-sm">
                <IconoEnlace className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{datos.enlaceTexto}</span>
                <button type="button" onClick={() => void copiar()} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 font-semibold text-brand-600 hover:bg-white focus-visible:outline-2 focus-visible:outline-brand-500">
                  <IconoCopiar className="h-4 w-4" aria-hidden="true" /> Copiar
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                {compartible ? (
                  <>
                    <button ref={botonRef} type="button" onClick={compartir} className={`${adminPrimaryButton} h-12! w-full text-base! sm:w-auto`}>
                      <IconoCompartir className="h-5 w-5" aria-hidden="true" /> Compartir
                    </button>
                    <button type="button" onClick={() => void descargar()} className={secundario}>
                      <IconoDescargar className="h-4 w-4" aria-hidden="true" /> Descargar imagen
                    </button>
                  </>
                ) : (
                  <button ref={botonRef} type="button" onClick={() => void descargar()} disabled={!archivo} className={`${adminPrimaryButton} h-12! w-full text-base! sm:w-auto`}>
                    <IconoDescargar className="h-5 w-5" aria-hidden="true" /> {archivo ? 'Descargar imagen' : 'Preparando tu flyer…'}
                  </button>
                )}
                <button type="button" onClick={() => void video()} disabled={grabando || !recursos} className="inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-60">
                  <IconoVideo className="h-4 w-4" aria-hidden="true" /> {grabando ? `Grabando el video (${FLYER_DURA} s)…` : 'Descargar video'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
