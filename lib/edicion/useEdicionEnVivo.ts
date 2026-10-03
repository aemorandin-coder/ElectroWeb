'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import type { PersonaEnLinea } from '@/lib/realtime/eventos';
import { useTiempoReal } from '@/lib/realtime/hooks';

// C-169: lo que el editor de un recurso necesita saber de los demás administradores, en vivo:
//   - quiénes lo tienen abierto ahora ("Luis también está editando esto")
//   - si alguien lo cambió, lo movió a la papelera, lo restauró o lo borró mientras se edita
// La presencia se anota con POST /api/admin/presencia (al abrir, cada 20 s y al cerrar); los avisos llegan por el canal en vivo.

const LATIDO_MS = 20_000;

export interface CambioAjeno {
  accion: 'creado' | 'actualizado' | 'papelera' | 'restaurado' | 'eliminado';
  por: { id: string; nombre: string };
  en: string;
  campos?: string[];
}

function idDePestana(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  } catch {
    // Sin crypto: se usa el azar normal
  }
  return Math.random().toString(36).slice(2, 12).padEnd(10, '0');
}

/** `recurso` = `product:<id>`. Con null (recurso nuevo, todavía sin id) no hace nada. `yo` = id de la persona que edita. */
export function useEdicionEnVivo(recurso: string | null, yo: string | undefined) {
  const [otros, setOtros] = useState<PersonaEnLinea[]>([]);
  const [cambio, setCambio] = useState<CambioAjeno | null>(null);
  const pestana = useRef('');
  useEffect(() => {
    if (!pestana.current) pestana.current = idDePestana();
  });

  const avisar = useCallback(async (accion: 'entrar' | 'latido') => {
    if (!recurso || !yo || !pestana.current) return;
    const res = await fetch('/api/admin/presencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recurso, accion, pestana: pestana.current }),
    }).catch(() => null);
    if (res?.ok) {
      const datos = (await res.json().catch(() => null)) as { editores?: PersonaEnLinea[] } | null;
      if (Array.isArray(datos?.editores)) setOtros(datos.editores);
    }
  }, [recurso, yo]);

  useCargarAlMontar(() => avisar('entrar'), [avisar]);

  useEffect(() => {
    if (!recurso || !yo) return;
    const cada = setInterval(() => void avisar('latido'), LATIDO_MS);
    const salir = () => {
      const cuerpo = JSON.stringify({ recurso, accion: 'salir', pestana: pestana.current });
      try {
        navigator.sendBeacon('/api/admin/presencia', new Blob([cuerpo], { type: 'application/json' }));
      } catch {
        void fetch('/api/admin/presencia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: cuerpo, keepalive: true }).catch(() => undefined);
      }
    };
    window.addEventListener('pagehide', salir);
    return () => {
      clearInterval(cada);
      window.removeEventListener('pagehide', salir);
      salir();
    };
  }, [recurso, yo, avisar]);

  useTiempoReal((evento) => {
    if (!recurso || !yo) return;
    if (evento.tipo === 'admin:presencia' && evento.recurso === recurso) {
      setOtros(evento.editores.filter((e) => e.id !== yo));
    }
    if (evento.tipo === 'admin:recurso_cambiado' && evento.recurso === recurso && evento.por.id !== yo) {
      setCambio({ accion: evento.accion, por: evento.por, en: evento.en, campos: evento.campos });
    }
  }, { onReconectar: () => void avisar('latido') });

  return { otros, cambio, olvidarCambio: () => setCambio(null) };
}
