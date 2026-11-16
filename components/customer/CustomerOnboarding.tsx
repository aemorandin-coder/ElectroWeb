'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { IconoBolsa, IconoCerrar, IconoCheck, IconoChevronDerecha, IconoCorreo, IconoUbicacion, IconoVerificado } from '@/components/iconos';
import type { IconType } from '@/components/iconos';
import { useSession } from 'next-auth/react';
import { adminCard } from '@/lib/admin-ui';
import AsiFunciona from '@/components/onboarding/AsiFunciona';
import IconoDibujado from '@/components/onboarding/IconoDibujado';
import { lanzarConfeti } from '@/lib/motion/confeti';
import { RESORTES, avanzarResorte, crearResorte, fijarResorte, prefiereMenosMovimiento, useBucleAnimacion } from '@/lib/motion/resorte';

/**
 * Misiones de bienvenida del panel del cliente (C-89).
 * Antes: el progreso contaba 2 misiones sobre 3 ("Agregar dirección" nunca se comprobaba), así que no pasaba de 67 %
 * y el botón "Ocultar" (que solo salía al 100 %) nunca aparecía; al recargar volvía a mostrarse.
 * Ahora: 4 misiones con datos reales del panel, anillo de progreso y contador con física, checks que rebotan
 * al aparecer, confeti una sola vez al completar todo y "Ocultar" que se recuerda.
 */

type Stats = { orders?: number; tieneDireccion?: boolean; datosCompletos?: boolean } | null;
type Mision = { id: string; titulo: string; texto: string; href: string; Icono: IconType; hecha: boolean };

const KEY_OCULTAS = 'electroweb_misiones_ocultas';
const KEY_CELEBRADAS = 'electroweb_misiones_celebradas';
const EVENTO = 'electroweb-misiones';
const RADIO = 26;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

function leer(key: string) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function guardar(key: string) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // Sin almacenamiento: se vuelve a mostrar la próxima vez
  }
  window.dispatchEvent(new Event(EVENTO));
}
function suscribir(avisar: () => void) {
  window.addEventListener('storage', avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener('storage', avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

export default function CustomerOnboarding({ stats }: { stats: Stats }) {
  const { data: session } = useSession();
  const ocultas = useSyncExternalStore(suscribir, () => leer(KEY_OCULTAS), () => false);
  const [verGuia, setVerGuia] = useState(false);

  const misiones: Mision[] = [
    {
      id: 'correo',
      titulo: 'Verifica tu correo',
      texto: 'Para comprar y recuperar tu cuenta',
      href: '/customer/profile?tab=datos',
      Icono: IconoCorreo,
      hecha: Boolean((session?.user as { emailVerified?: boolean } | undefined)?.emailVerified),
    },
    { id: 'datos', titulo: 'Completa tus datos', texto: 'Teléfono y cédula para tus pedidos', href: '/customer/profile', Icono: IconoVerificado, hecha: Boolean(stats?.datosCompletos) },
    { id: 'direccion', titulo: 'Agrega una dirección', texto: 'Para que tus envíos salgan sin demoras', href: '/customer/addresses', Icono: IconoUbicacion, hecha: Boolean(stats?.tieneDireccion) },
    { id: 'pedido', titulo: 'Haz tu primer pedido', texto: 'Explora el catálogo', href: '/productos', Icono: IconoBolsa, hecha: (stats?.orders ?? 0) > 0 },
  ];
  const hechas = misiones.filter((m) => m.hecha).length;
  const porcentaje = Math.round((hechas / misiones.length) * 100);
  const completo = hechas === misiones.length;

  // Física: el anillo y el número suben con un resorte; cada check rebota con un pequeño retraso
  const anilloRef = useRef<SVGCircleElement>(null);
  // C-265: con todo cumplido no hay anillo (va en una línea): el confeti sale de la placa del check
  const placaRef = useRef<HTMLSpanElement>(null);
  const numeroRef = useRef<HTMLSpanElement>(null);
  const checksRef = useRef<Array<HTMLSpanElement | null>>([]);
  const fisica = useRef({ progreso: crearResorte(0), checks: misiones.map(() => ({ r: crearResorte(0), retraso: 0 })) });

  const paso = useCallback((dt: number) => {
    const f = fisica.current;
    let quieto = avanzarResorte(f.progreso, dt, RESORTES.firme, 0.05);
    const valor = Math.max(0, Math.min(100, f.progreso.valor));
    if (anilloRef.current) anilloRef.current.style.strokeDashoffset = String(CIRCUNFERENCIA * (1 - valor / 100));
    if (numeroRef.current) numeroRef.current.textContent = `${Math.round(valor)}%`;

    f.checks.forEach((c, i) => {
      if (c.retraso > 0) {
        c.retraso -= dt;
        quieto = false;
        return;
      }
      quieto = avanzarResorte(c.r, dt, RESORTES.rebote, 0.001) && quieto;
      const el = checksRef.current[i];
      if (el) el.style.transform = `scale(${Math.max(0, c.r.valor)})`;
    });
    return quieto;
  }, []);
  const iniciar = useBucleAnimacion(paso);

  // Cuando llegan los datos: animar hasta el progreso real
  const cargado = stats !== null;
  const firma = misiones.map((m) => (m.hecha ? 1 : 0)).join('');
  useEffect(() => {
    if (!cargado || ocultas) return;
    const f = fisica.current;
    const reducido = prefiereMenosMovimiento();
    f.progreso.destino = porcentaje;
    let orden = 0;
    firma.split('').forEach((h, i) => {
      const c = f.checks[i];
      const destino = h === '1' ? 1 : 0;
      if (c.r.destino === destino) return;
      c.r.destino = destino;
      c.retraso = destino ? 0.25 + orden++ * 0.12 : 0;
    });
    if (reducido) {
      fijarResorte(f.progreso, porcentaje);
      f.checks.forEach((c) => {
        fijarResorte(c.r, c.r.destino);
        c.retraso = 0;
      });
    }
    iniciar();
  }, [cargado, ocultas, porcentaje, firma, iniciar]);

  // Todo completo: confeti una sola vez en la vida de la cuenta en este navegador
  useEffect(() => {
    if (!cargado || !completo || ocultas || leer(KEY_CELEBRADAS)) return;
    const t = setTimeout(() => {
      const r = (anilloRef.current ?? placaRef.current)?.getBoundingClientRect();
      if (r) lanzarConfeti({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, 90);
      guardar(KEY_CELEBRADAS);
    }, 900);
    return () => clearTimeout(t);
  }, [cargado, completo, ocultas]);

  if (ocultas) return null;

  if (!cargado) {
    return <div className="h-14 animate-pulse rounded-2xl bg-line" aria-hidden="true" />;
  }
  // C-260: "¿Cómo funciona la tienda?" abre la hoja del kit (C-257), con el camino en tres íconos que se dibujan
  const guia = verGuia && (
    <AsiFunciona
      clave="tienda"
      aMano={{ alCerrar: () => setVerGuia(false) }}
      titulo="Así funciona la tienda"
      nota="Con Puntos ES pagas al instante, a la tasa de la tienda."
      pasos={[
        { icono: 'recargar', texto: 'Recarga Puntos ES con Pago Móvil' },
        { icono: 'bolsa', texto: 'Paga al instante en el checkout', accion: 'salta' },
        { icono: 'envio', texto: 'Recibe por MRW, ZOOM o retiro' },
      ]}
      boton="Entendido"
    />
  );

  // C-265 (decisión del equipo): con las 4 misiones cumplidas, una línea (antes eran 320 px de tarjetas ya hechas).
  // Se conservan "¿Cómo funciona la tienda?" y la X que las oculta.
  if (completo) {
    return (
      <section aria-labelledby="misiones-titulo" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-line bg-white px-3 py-2.5 lg:px-4">
        <span ref={placaRef} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-strong text-white">
          <IconoCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="min-w-[10rem] flex-1 text-sm">
          <span id="misiones-titulo" className="font-semibold text-ink">Tu cuenta está lista.</span>{' '}
          <span className="text-muted">Completaste las {misiones.length} misiones.</span>
        </p>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setVerGuia(true)}
            aria-haspopup="dialog"
            className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 hover:text-brand-700"
          >
            ¿Cómo funciona la tienda? <IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => guardar(KEY_OCULTAS)}
            aria-label="Ocultar misiones"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <IconoCerrar className="h-5 w-5" aria-hidden="true" />
          </button>
        </span>
        {guia}
      </section>
    );
  }

  // C-201 (pedido de Andrés): quien ya compró no necesita el recorrido para "dejar la cuenta lista": solo lo que le falta,
  // en una tarjeta corta y sin el anillo. Quien todavía no compró sigue viendo las misiones completas.
  const pendientes = misiones.filter((m) => !m.hecha);
  if ((stats?.orders ?? 0) > 0 && pendientes.length > 0) {
    return (
      <section aria-labelledby="misiones-titulo" className={`${adminCard} p-3 lg:p-4`}>
        <h2 id="misiones-titulo" className="px-1 text-sm font-semibold text-ink">
          {pendientes.length === 1 ? 'Te falta un paso' : `Te faltan ${pendientes.length} pasos`}
        </h2>
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {pendientes.map((m) => (
            <li key={m.id}>
              <Link href={m.href} className="group flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface p-2.5 hover:border-brand-500/40 hover:bg-white">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 ring-1 ring-line">
                  <m.Icono className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{m.titulo}</span>
                  <span className="block truncate text-xs text-muted">{m.texto}</span>
                </span>
                <IconoChevronDerecha className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-labelledby="misiones-titulo" className={`${adminCard} p-4 lg:p-5`}>
      <div className="flex items-center gap-4">
        {/* Anillo de progreso */}
        <div className="relative h-16 w-16 shrink-0" role="img" aria-label={`Progreso ${porcentaje}%`}>
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r={RADIO} fill="none" strokeWidth="6" className="stroke-line" />
            <circle
              ref={anilloRef}
              cx="32"
              cy="32"
              r={RADIO}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className={completo ? 'stroke-success-strong' : 'stroke-brand-500'}
              strokeDasharray={CIRCUNFERENCIA}
              style={{ strokeDashoffset: CIRCUNFERENCIA }}
            />
          </svg>
          <span ref={numeroRef} className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-ink" aria-hidden="true">
            0%
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 id="misiones-titulo" className="text-base font-bold text-ink lg:text-lg">
            {completo ? 'Tu cuenta está lista' : 'Deja tu cuenta lista para comprar'}
          </h2>
          <p className="text-sm text-muted">
            {completo ? 'Completaste todas las misiones.' : `${hechas} de ${misiones.length} misiones completas.`}
          </p>
        </div>

        {completo && (
          <button
            type="button"
            onClick={() => guardar(KEY_OCULTAS)}
            aria-label="Ocultar misiones"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <IconoCerrar className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {misiones.map((m, i) => (
          <li key={m.id}>
            <Link
              href={m.href}
              className={`group flex min-h-14 items-center gap-3 rounded-xl border p-3 transition-[transform,background-color,border-color] duration-150 active:scale-[0.98] ${
                m.hecha ? 'border-success-strong/20 bg-success-strong/5' : 'border-line bg-surface hover:border-brand-500/40 hover:bg-white'
              }`}
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 ring-1 ring-line">
                {/* C-260: el ícono de cada misión se dibuja una vez, en cascada (el kit de onboarding, PLAN §1.11) */}
                <IconoDibujado Icono={m.Icono} className="h-4 w-4" retraso={0.15 + i * 0.12} />
                {/* El check crece con rebote encima del ícono cuando la misión está hecha */}
                <span
                  ref={(el) => {
                    checksRef.current[i] = el;
                  }}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-success-strong text-white"
                  style={{ transform: 'scale(0)' }}
                  aria-hidden="true"
                >
                  <IconoCheck className="h-4 w-4" />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${m.hecha ? 'text-ink-soft' : 'text-ink'}`}>
                  {m.titulo}
                  <span className="sr-only">{m.hecha ? ': hecha' : ': pendiente'}</span>
                </span>
                <span className="block truncate text-xs text-muted">{m.texto}</span>
              </span>
              {!m.hecha && <IconoChevronDerecha className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-line pt-3">
        {/* C-260: "¿Cómo funciona la tienda?" abre la hoja del kit (C-257), con el camino en tres íconos que se dibujan.
            Antes era una lista que se desplegaba, con más texto */}
        <button
          type="button"
          onClick={() => setVerGuia(true)}
          aria-haspopup="dialog"
          className="flex h-10 w-full items-center justify-between text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          ¿Cómo funciona la tienda?
          <IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
        </button>
        {guia}
      </div>
    </section>
  );
}
