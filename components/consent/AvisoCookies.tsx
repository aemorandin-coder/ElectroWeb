'use client';

// C-223: el aviso de cookies (la maqueta que eligió el equipo el 14/11, PLAN.md §5.2). Chico y abajo, con las dos opciones
// del mismo tamaño: "Solo las necesarias" y "Aceptar". "Elegir" muestra lo que hay (la medición y los anuncios) con su
// interruptor. Sale una vez; después se vuelve a abrir con "Cookies" en el pie. Sin Google Analytics ni píxel configurados
// no hay nada que pedir y no sale.

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconoCandado, IconoCerrar, IconoObjetivo, IconoReportes, type IconType } from '@/components/iconos';
import {
  EVENTO_ABRIR_PREFERENCIAS, EVENTO_CONSENTIMIENTO, consentimientoGuardado, guardarConsentimiento, hayTerceros, leerConsentimiento,
} from '@/lib/consentimiento';

const suscribir = (avisar: () => void) => {
  window.addEventListener(EVENTO_CONSENTIMIENTO, avisar);
  window.addEventListener('storage', avisar);
  return () => {
    window.removeEventListener(EVENTO_CONSENTIMIENTO, avisar);
    window.removeEventListener('storage', avisar);
  };
};

export default function AvisoCookies() {
  const pathname = usePathname();
  // En el servidor no se sabe qué eligió: no se dibuja nada hasta estar en el navegador
  const guardado = useSyncExternalStore(suscribir, consentimientoGuardado, () => null);
  const [reabierto, setReabierto] = useState(false);
  const [eligiendo, setEligiendo] = useState(false);
  const [medicion, setMedicion] = useState(false);
  const [anuncios, setAnuncios] = useState(false);

  // "Cookies" en el pie: vuelve a abrir con lo que había elegido
  useEffect(() => {
    const abrir = () => {
      const c = leerConsentimiento();
      setMedicion(c?.medicion ?? false);
      setAnuncios(c?.anuncios ?? false);
      setEligiendo(true);
      setReabierto(true);
    };
    window.addEventListener(EVENTO_ABRIR_PREFERENCIAS, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_PREFERENCIAS, abrir);
  }, []);

  if (!hayTerceros() || guardado === null || pathname?.startsWith('/admin')) return null;
  if (guardado !== '' && !reabierto) return null;

  const elegir = (m: boolean, a: boolean) => {
    guardarConsentimiento(m, a);
    setReabierto(false);
    setEligiendo(false);
  };
  const conGoogle = Boolean(process.env.NEXT_PUBLIC_GA_ID);
  const conMeta = Boolean(process.env.NEXT_PUBLIC_FB_PIXEL_ID);

  return (
    <section
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+0.75rem)] z-[var(--z-drawer)] rounded-2xl border border-line bg-white p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] transition-[opacity,transform] duration-300 starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none lg:inset-x-auto lg:bottom-6 lg:left-1/2 lg:w-[min(56rem,calc(100%-3rem))] lg:-translate-x-1/2"
    >
      {!eligiendo ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
          <p className="flex flex-1 items-start gap-3 text-sm text-ink">
            <span className="iconos-marca flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <IconoCandado className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              Usamos cookies para que la tienda funcione y, si aceptas, para medir visitas y anuncios.{' '}
              <button type="button" onClick={() => setEligiendo(true)} className="font-semibold text-brand-600 underline-offset-2 hover:underline">Elegir</button>
            </span>
          </p>
          <div className="grid shrink-0 grid-cols-2 gap-2">
            <button type="button" onClick={() => elegir(false, false)} className="min-h-11 rounded-xl border border-line-strong bg-white px-4 text-sm font-semibold text-ink hover:border-brand-300 hover:bg-brand-50">
              Solo las necesarias
            </button>
            <button type="button" onClick={() => elegir(true, true)} className="min-h-11 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600">
              Aceptar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-ink">Tus cookies</p>
            {!reabierto && (
              <button type="button" onClick={() => setEligiendo(false)} aria-label="Volver" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink">
                <IconoCerrar className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <ul className="divide-y divide-line rounded-xl border border-line">
            <Fila icono={IconoCandado} titulo="Necesarias" detalle="Sesión, carrito y pago. Siempre encendidas." encendido bloqueado />
            {conGoogle && <Fila icono={IconoReportes} titulo="Medición" detalle="Google Analytics: qué páginas se ven." encendido={medicion} onCambiar={setMedicion} />}
            {conMeta && <Fila icono={IconoObjetivo} titulo="Anuncios" detalle="Píxel de Meta: medir y mostrar anuncios." encendido={anuncios} onCambiar={setAnuncios} />}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Link href="/privacidad#cookies" className="text-sm font-semibold text-brand-600 underline-offset-2 hover:underline">Política de privacidad</Link>
            <button type="button" onClick={() => elegir(conGoogle && medicion, conMeta && anuncios)} className="min-h-11 rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600">
              Guardar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Fila({ icono: Icono, titulo, detalle, encendido, bloqueado = false, onCambiar }: {
  icono: IconType; titulo: string; detalle: string; encendido: boolean; bloqueado?: boolean; onCambiar?: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className="iconos-marca flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <Icono className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{titulo}</span>
        <span className="block text-xs text-muted">{detalle}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={encendido}
        aria-label={titulo}
        disabled={bloqueado}
        onClick={() => onCambiar?.(!encendido)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed ${encendido ? 'bg-success-strong' : 'bg-subtle'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${encendido ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
      </button>
    </li>
  );
}
