'use client';

import { useEffect, useId, useState } from 'react';
import { toast } from 'react-hot-toast';
import { IconoCerrar, IconoDescargar, IconoEnviar, IconoRepetir } from '@/components/iconos';
import Opcion from '@/components/admin/Opcion';
import { adminHint, adminModalOverlay, adminModalPanel } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useCajonAccesible } from '@/lib/hooks/useCajonAccesible';

// C-287: al sacar la imagen o el video de una historia, ElectroStudio pregunta qué hacer con él (el equipo, 17/11: "que me
// preguntes si decides descargarlo o enviarlo por Telegram"). Antes (C-286) el video iba siempre a Telegram.
// Telegram es el bot de Notificaciones: sin bot o sin chats conectados, esa opción se ve apagada y dice por qué.

export type Destino = 'descargar' | 'telegram' | 'ambos';
export interface EstadoTelegram { disponible: boolean; chats: number; motivo?: string }

interface Props {
  tipo: 'imagen' | 'video';
  onElegir: (destino: Destino) => void;
  onCerrar: () => void;
}

/**
 * C-286 y C-287: la imagen o el video, a Telegram (los chats del bot de Notificaciones), tal como salió: Full HD y con el
 * texto de la historia. Solo cuando el equipo lo elige al sacarlo (ElegirSalida).
 */
export async function enviarATelegram(archivo: { blob: Blob; nombre: string; texto: string; tipo: 'imagen' | 'video'; segundos?: number; ancho?: number; alto?: number }) {
  const que = archivo.tipo === 'video' ? 'el video' : 'la imagen';
  if (archivo.blob.size > 40 * 1024 * 1024) {
    toast.error(`${archivo.tipo === 'video' ? 'El video' : 'La imagen'} pesa más de 40 MB: no se puede mandar a Telegram.`);
    return;
  }
  const datos = new FormData();
  datos.append('archivo', new File([archivo.blob], archivo.nombre, { type: archivo.blob.type }));
  datos.append('tipo', archivo.tipo);
  datos.append('texto', archivo.texto.slice(0, 1000));
  if (archivo.segundos) datos.append('segundos', String(Math.round(archivo.segundos)));
  if (archivo.ancho) datos.append('ancho', String(archivo.ancho));
  if (archivo.alto) datos.append('alto', String(archivo.alto));
  const id = toast.loading(`Mandando ${que} a Telegram…`);
  try {
    const res = await fetch('/api/admin/studio/telegram', { method: 'POST', body: datos });
    const r = (await res.json().catch(() => ({}))) as { apagado?: boolean; enviados?: number; total?: number; error?: string };
    if (!res.ok) { toast.error(r.error || `No se pudo mandar ${que} a Telegram`, { id }); return; }
    if (r.apagado || !r.total) { toast.error('El bot de Telegram no está conectado o no tiene chats: se conecta en Notificaciones → Telegram.', { id, duration: 8000 }); return; }
    const enviados = r.enviados ?? 0;
    if (enviados === r.total) toast.success(`Listo en Telegram (${enviados === 1 ? '1 chat' : `${enviados} chats`}), en Full HD`, { id });
    else toast.error(`Telegram: llegó a ${enviados} de ${r.total} chats. ${r.error ?? ''}`, { id, duration: 8000 });
  } catch {
    toast.error(`No se pudo mandar ${que} a Telegram (sin conexión).`, { id });
  }
}

/** Si el bot de Telegram está conectado y a cuántos chats llega (lo dice el servidor) */
export function useEstadoTelegram(): EstadoTelegram | null {
  const [estado, setEstado] = useState<EstadoTelegram | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch('/api/admin/studio/telegram', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: EstadoTelegram | null) => { if (vivo) setEstado(d ?? { disponible: false, chats: 0, motivo: 'No se pudo revisar Telegram.' }); })
      .catch(() => { if (vivo) setEstado({ disponible: false, chats: 0, motivo: 'Sin conexión.' }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}

export default function ElegirSalida({ tipo, onElegir, onCerrar }: Props) {
  const id = useId();
  const telegram = useEstadoTelegram();
  useBodyScrollLock(true);
  useCajonAccesible(true, `salida-${id}`, onCerrar);
  const nombre = tipo === 'video' ? 'el video' : 'la imagen';
  const chats = telegram?.chats ?? 0;
  const aTelegram = telegram === null ? 'Revisando el bot…'
    : telegram.disponible ? `Llega a ${chats === 1 ? '1 chat' : `${chats} chats`} del bot, en Full HD${tipo === 'video' ? ' a 60 cuadros' : ''} y con el texto de la historia`
      : telegram.motivo ?? 'El bot no está conectado: se conecta en Notificaciones → Telegram.';
  const sinTelegram = !telegram?.disponible;

  return (
    <div className={adminModalOverlay}>
      <div className="fixed inset-0" onClick={onCerrar} aria-hidden="true" />
      <div id={`salida-${id}`} role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`} className={`${adminModalPanel} relative z-10 my-auto p-5 sm:max-w-md sm:p-6`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={`${id}-titulo`} className="text-lg font-bold text-ink">¿Qué hago con {nombre}?</h2>
            <p className={adminHint}>{tipo === 'video' ? 'Se arma en Full HD a 60 cuadros: tarda unos segundos.' : 'En Full HD, en PNG.'}</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="-mr-2 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink">
            <IconoCerrar className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Opcion elegida={false} icono={IconoDescargar} titulo="Descargarlo" detalle="Queda en este equipo, en la carpeta de descargas" onClick={() => onElegir('descargar')} />
          <Opcion elegida={false} icono={IconoEnviar} titulo="Mandarlo por Telegram" detalle={aTelegram} disabled={sinTelegram} onClick={() => onElegir('telegram')} />
          <Opcion elegida={false} icono={IconoRepetir} titulo="Las dos cosas" detalle="Se descarga y llega a Telegram" disabled={sinTelegram} onClick={() => onElegir('ambos')} />
        </div>
      </div>
    </div>
  );
}
