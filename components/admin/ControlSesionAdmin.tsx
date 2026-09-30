'use client';

import { useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import { FiClock } from 'react-icons/fi';
import { adminPrimaryButton } from '@/lib/admin-ui';

// C-140: la sesión del panel se cierra tras 1 hora sin uso (regla de Andrés del 30/09).
// "Uso" = clics, teclas, toques o rueda del mouse en cualquier pestaña del panel: se comparte por localStorage,
// así una pestaña olvidada no cierra la sesión de la que se está usando. Los contadores que el panel pide cada
// 30 s no cuentan. El servidor se entera con /api/sesion/actividad y cierra por su cuenta a los 70 min.

const CLAVE = 'electroshop_admin_uso';
const LIMITE_MS = 60 * 60 * 1000;
const AVISO_MS = 5 * 60 * 1000;
const AVISAR_SERVIDOR_CADA_MS = 4 * 60 * 1000;

function leerUso(): number {
  try {
    return Number(localStorage.getItem(CLAVE)) || 0;
  } catch {
    return 0;
  }
}

function anotarUso(ahora: number) {
  try {
    localStorage.setItem(CLAVE, String(ahora));
  } catch {
    // Sin almacenamiento (modo privado): cuenta solo esta pestaña
  }
}

export function cerrarSesionAdmin(motivo: 'sesion-inactiva' | 'sesion-cerrada') {
  void signOut({ callbackUrl: `/login?redirect=admin&error=${motivo}` });
}

export default function ControlSesionAdmin() {
  const [quedanMs, setQuedanMs] = useState<number | null>(null);
  const usoLocal = useRef(0);
  const ultimoAviso = useRef(0);
  const cerrando = useRef(false);

  useEffect(() => {
    const avisarServidor = async (ahora: number) => {
      ultimoAviso.current = ahora;
      const res = await fetch('/api/sesion/actividad', { method: 'POST' }).catch(() => null);
      if (res?.status === 401 && !cerrando.current) {
        cerrando.current = true;
        cerrarSesionAdmin('sesion-cerrada');
      }
    };

    const alUsar = () => {
      const ahora = Date.now();
      if (ahora - usoLocal.current < 15_000) return; // una escritura cada 15 s como mucho
      usoLocal.current = ahora;
      anotarUso(ahora);
      setQuedanMs(null);
      if (ahora - ultimoAviso.current >= AVISAR_SERVIDOR_CADA_MS) void avisarServidor(ahora);
    };

    // Abrir o recargar el panel cuenta como uso
    const inicio = Date.now();
    usoLocal.current = inicio;
    anotarUso(inicio);
    void avisarServidor(inicio);

    const eventos = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    eventos.forEach((e) => window.addEventListener(e, alUsar, { passive: true }));

    const revisar = setInterval(() => {
      const ahora = Date.now();
      const ultimo = Math.max(usoLocal.current, leerUso());
      const sinUso = ahora - ultimo;
      if (sinUso >= LIMITE_MS) {
        if (!cerrando.current) {
          cerrando.current = true;
          cerrarSesionAdmin('sesion-inactiva');
        }
        return;
      }
      setQuedanMs(sinUso >= LIMITE_MS - AVISO_MS ? LIMITE_MS - sinUso : null);
    }, 10_000);

    return () => {
      eventos.forEach((e) => window.removeEventListener(e, alUsar));
      clearInterval(revisar);
    };
  }, []);

  if (quedanMs === null) return null;
  const minutos = Math.max(1, Math.ceil(quedanMs / 60_000));
  return (
    <div role="alertdialog" aria-live="assertive" aria-labelledby="sesion-aviso-titulo" className="fixed inset-x-3 bottom-4 z-[var(--z-toast)] mx-auto max-w-md rounded-2xl border border-line bg-white p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <FiClock className="mt-0.5 h-5 w-5 shrink-0 text-warning-strong" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p id="sesion-aviso-titulo" className="text-sm font-semibold text-ink">Tu sesión se cierra en {minutos} {minutos === 1 ? 'minuto' : 'minutos'}</p>
          <p className="mt-0.5 text-sm text-muted">Por seguridad, el panel se cierra tras 1 hora sin uso.</p>
        </div>
      </div>
      {/* El clic ya cuenta como uso (pointerdown): el botón solo lo hace explícito */}
      <button type="button" onClick={() => setQuedanMs(null)} className={`${adminPrimaryButton} mt-3 w-full`}>Seguir conectado</button>
    </div>
  );
}
