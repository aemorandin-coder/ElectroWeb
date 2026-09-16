'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiCheck, FiImage, FiSave, FiUpload, FiX } from 'react-icons/fi';
import {
  adminBadge, adminCard, adminHint, adminInput, adminLabel, adminPrimaryButton, adminSecondaryButton, adminSpinner,
} from '@/lib/admin-ui';

interface PopupState {
  hotAdEnabled: boolean;
  hotAdImage: string | null;
  hotAdLink: string;
  hotAdTransparentBg: boolean;
  hotAdShadowEnabled: boolean;
  hotAdShadowBlur: number;
  hotAdShadowOpacity: number;
  hotAdBackdropOpacity: number;
  hotAdBackdropColor: string;
}

const INICIAL: PopupState = {
  hotAdEnabled: false, hotAdImage: null, hotAdLink: '',
  hotAdTransparentBg: false, hotAdShadowEnabled: true,
  hotAdShadowBlur: 20, hotAdShadowOpacity: 50,
  hotAdBackdropOpacity: 70, hotAdBackdropColor: '#000000',
};

function Interruptor({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label htmlFor={id} className="relative inline-flex cursor-pointer items-center">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" aria-label={label} />
      <span className="h-6 w-11 rounded-full bg-line transition-colors after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500" />
    </label>
  );
}

/** Popup de imagen del home (C-23/C-23b). Se guarda en Configuración con permiso de contenido. */
export default function Popup() {
  const [ad, setAd] = useState<PopupState>(INICIAL);
  const [guardado, setGuardado] = useState<PopupState>(INICIAL);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  const hayCambios = JSON.stringify(ad) !== JSON.stringify(guardado);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        const leido: PopupState = {
          hotAdEnabled: data.hotAdEnabled ?? false,
          hotAdImage: data.hotAdImage || null,
          hotAdLink: data.hotAdLink || '',
          hotAdTransparentBg: data.hotAdTransparentBg ?? false,
          hotAdShadowEnabled: data.hotAdShadowEnabled ?? true,
          hotAdShadowBlur: data.hotAdShadowBlur ?? 20,
          hotAdShadowOpacity: data.hotAdShadowOpacity ?? 50,
          hotAdBackdropOpacity: data.hotAdBackdropOpacity ?? 70,
          hotAdBackdropColor: data.hotAdBackdropColor || '#000000',
        };
        setAd(leido);
        setGuardado(leido);
      })
      .catch(() => toast.error('No se pudo cargar el popup'))
      .finally(() => setCargando(false));
  }, []);

  const set = <K extends keyof PopupState>(clave: K, valor: PopupState[K]) => setAd((prev) => ({ ...prev, [clave]: valor }));

  const subir = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error('La imagen pesa más de 5 MB');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'hotAd');
    setSubiendo(true);
    try {
      const res = await fetch('/api/upload/settings', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error || 'No se pudo subir la imagen');
      set('hotAdImage', data.url);
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSubiendo(false);
      if (archivo.current) archivo.current.value = '';
    }
  };

  const guardar = async () => {
    if (ad.hotAdEnabled && !ad.hotAdImage) return toast.error('Sube una imagen antes de activar el popup');
    setGuardando(true);
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ad) });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error || 'No se pudo guardar');
      setGuardado(ad);
      toast.success('Popup guardado');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="flex justify-center py-16"><span className={adminSpinner} aria-label="Cargando" /></div>;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-5">
        <section className={adminCard}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                Popup del home
                <span className={adminBadge(guardado.hotAdEnabled ? 'success' : 'neutral')}>{guardado.hotAdEnabled ? 'Activo' : 'Apagado'}</span>
              </h2>
              <p className="mt-1 text-sm text-muted">Una imagen sobre la portada al entrar. Se muestra como máximo una vez cada 24 horas por visitante.</p>
            </div>
            <Interruptor id="popup-activo" checked={ad.hotAdEnabled} onChange={(v) => set('hotAdEnabled', v)} label="Activar popup" />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <div>
              <p className={adminLabel}>Imagen</p>
              <button
                type="button"
                onClick={() => archivo.current?.click()}
                className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-surface text-muted hover:border-brand-200"
              >
                {subiendo ? (
                  <span className={adminSpinner} aria-label="Subiendo" />
                ) : ad.hotAdImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ad.hotAdImage} alt="Imagen del popup" className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-center text-xs"><FiUpload className="mx-auto mb-1 h-5 w-5" aria-hidden="true" />Subir imagen</span>
                )}
              </button>
              <input ref={archivo} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); }} />
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => archivo.current?.click()} className={`${adminSecondaryButton} h-9 flex-1 px-2 text-xs`}>{ad.hotAdImage ? 'Cambiar' : 'Elegir'}</button>
                {ad.hotAdImage && (
                  <button type="button" onClick={() => set('hotAdImage', null)} className={`${adminSecondaryButton} h-9 px-2 text-xs`} aria-label="Quitar imagen"><FiX className="h-4 w-4" /></button>
                )}
              </div>
              <p className={adminHint}>PNG, JPG o WEBP · máx. 5 MB</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="popup-enlace" className={adminLabel}>Enlace al tocar la imagen</label>
                <input id="popup-enlace" type="url" value={ad.hotAdLink} onChange={(e) => set('hotAdLink', e.target.value)} placeholder="/productos?oferta=1 o https://…" className={adminInput()} />
                <p className={adminHint}>Opcional. Si lo dejas vacío, tocar la imagen solo cierra el popup.</p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                <div>
                  <p className="text-sm font-medium text-ink">Fondo transparente</p>
                  <p className="text-xs text-muted">Sin tarjeta blanca alrededor de la imagen</p>
                </div>
                <Interruptor id="popup-transparente" checked={ad.hotAdTransparentBg} onChange={(v) => set('hotAdTransparentBg', v)} label="Fondo transparente" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                <div>
                  <p className="text-sm font-medium text-ink">Sombra</p>
                  <p className="text-xs text-muted">Despega la imagen del fondo</p>
                </div>
                <Interruptor id="popup-sombra" checked={ad.hotAdShadowEnabled} onChange={(v) => set('hotAdShadowEnabled', v)} label="Sombra" />
              </div>
            </div>
          </div>
        </section>

        <section className={adminCard}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><FiImage className="h-4 w-4 text-muted" aria-hidden="true" /> Ajustes visuales</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {ad.hotAdShadowEnabled && (
              <>
                <div>
                  <label htmlFor="popup-sombra-grosor" className={adminLabel}>Grosor de la sombra: {ad.hotAdShadowBlur} px</label>
                  <input id="popup-sombra-grosor" type="range" min="5" max="100" value={ad.hotAdShadowBlur} onChange={(e) => set('hotAdShadowBlur', Number(e.target.value))} className="w-full accent-brand-500" />
                </div>
                <div>
                  <label htmlFor="popup-sombra-opacidad" className={adminLabel}>Opacidad de la sombra: {ad.hotAdShadowOpacity}%</label>
                  <input id="popup-sombra-opacidad" type="range" min="10" max="100" value={ad.hotAdShadowOpacity} onChange={(e) => set('hotAdShadowOpacity', Number(e.target.value))} className="w-full accent-brand-500" />
                </div>
              </>
            )}
            <div>
              <label htmlFor="popup-fondo-opacidad" className={adminLabel}>Oscuridad del fondo: {ad.hotAdBackdropOpacity}%</label>
              <input id="popup-fondo-opacidad" type="range" min="30" max="95" value={ad.hotAdBackdropOpacity} onChange={(e) => set('hotAdBackdropOpacity', Number(e.target.value))} className="w-full accent-brand-500" />
            </div>
            <div>
              <label htmlFor="popup-fondo-color" className={adminLabel}>Color del fondo</label>
              <div className="flex items-center gap-3">
                <input id="popup-fondo-color" type="color" value={ad.hotAdBackdropColor} onChange={(e) => set('hotAdBackdropColor', e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-line p-0" />
                <span className="font-mono text-sm text-muted">{ad.hotAdBackdropColor}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Vista previa: el fondo y la imagen como los verá el cliente */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className={adminLabel}>Vista previa</p>
        <div className="relative flex aspect-[9/16] max-h-[28rem] w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface p-6">
          <div className="absolute inset-0" style={{ backgroundColor: ad.hotAdBackdropColor, opacity: ad.hotAdBackdropOpacity / 100 }} aria-hidden="true" />
          {ad.hotAdImage ? (
            <div
              className={`relative max-h-full ${ad.hotAdTransparentBg ? '' : 'rounded-2xl bg-white p-2'}`}
              style={ad.hotAdShadowEnabled ? { boxShadow: `0 10px ${ad.hotAdShadowBlur}px rgba(0,0,0,${ad.hotAdShadowOpacity / 100})` } : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ad.hotAdImage} alt="" className="max-h-80 w-auto rounded-xl object-contain" />
            </div>
          ) : (
            <p className="relative text-sm font-medium text-white">Sin imagen</p>
          )}
        </div>
        <button type="button" onClick={guardar} disabled={guardando || !hayCambios} className={`${adminPrimaryButton} mt-4 w-full`}>
          {guardando ? 'Guardando…' : hayCambios ? <><FiSave className="h-4 w-4" aria-hidden="true" /> Guardar popup</> : <><FiCheck className="h-4 w-4" aria-hidden="true" /> Sin cambios</>}
        </button>
      </aside>
    </div>
  );
}
