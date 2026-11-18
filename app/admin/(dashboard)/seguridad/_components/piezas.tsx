'use client';

import type { ReactNode } from 'react';
import { SiAppstore, SiGoogleplay } from 'react-icons/si';
import { IconoCandado, IconoCelular, IconoCuadricula, IconoFlechaDerecha, IconoFlechaIzquierda, type IconType } from '@/components/iconos';
import { adminInput, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { qrSvg } from '@/lib/qr';
import { useTelefono, type AppDeCodigos } from '@/components/admin/dos-pasos/apps';

// C-290: las piezas de Mi seguridad (skill herramientas-claras): el paso en su tarjeta con el pie pegado abajo, el QR,
// los botones de las tiendas, el campo del número de 6 cifras y el camino de cada entrada. La salida por WhatsApp es
// `Trabado` (components/admin/dos-pasos), que también usa la pantalla de entrar.

/** Un paso: el título, una línea de qué hacer, lo de adentro y el pie */
export function Marco({ id, titulo, linea, pie, children }: { id: string; titulo: string; linea: string; pie: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-line bg-white">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <h2 id={id} className="text-lg font-semibold text-ink">{titulo}</h2>
        <p className="mt-0.5 max-w-prose text-sm text-muted">{linea}</p>
      </div>
      <div className="min-w-0 space-y-5 px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      {pie}
    </section>
  );
}

/** El pie del paso: volver, lo que viene después y el botón que dice adónde lleva */
export function Pie({ onAtras, despues, siguiente }: {
  onAtras?: () => void;
  /** "Después: …", en una línea */
  despues?: string;
  siguiente?: { texto: string; onClick?: () => void; tipo?: 'button' | 'submit'; form?: string; deshabilitado?: boolean; ocupado?: boolean };
}) {
  return (
    <div className="rounded-b-2xl border-t border-line bg-surface px-4 py-3 sm:px-5">
      {despues && <p className="mb-2 text-sm text-ink-soft sm:hidden">{despues}</p>}
      <div className="flex items-center gap-3">
        {onAtras ? (
          <button type="button" onClick={onAtras} aria-label="Atrás" className={`${adminSecondaryButton} max-sm:w-11 max-sm:px-0!`}><IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /><span className="max-sm:hidden">Atrás</span></button>
        ) : <span />}
        <p className="hidden min-w-0 flex-1 text-center text-sm text-ink-soft sm:block">{despues}</p>
        {siguiente && (
          <button
            type={siguiente.tipo ?? 'button'}
            form={siguiente.form}
            onClick={siguiente.onClick}
            disabled={siguiente.deshabilitado || siguiente.ocupado}
            className={`${adminPrimaryButton} ml-auto min-w-0 max-sm:flex-1 sm:ml-0`}
          >
            {siguiente.ocupado && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />}
            <span className="truncate">{siguiente.texto}</span>
            {!siguiente.ocupado && <IconoFlechaDerecha className="h-4 w-4 shrink-0" aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function Qr({ texto, etiqueta, className = 'h-40 w-40' }: { texto: string; etiqueta: string; className?: string }) {
  const qr = qrSvg(texto);
  return (
    <svg viewBox={`0 0 ${qr.tamano} ${qr.tamano}`} role="img" aria-label={etiqueta} className={`shrink-0 rounded-xl border border-line bg-white ${className}`} shapeRendering="crispEdges">
      <path d={qr.camino} className="fill-ink" />
    </svg>
  );
}

/**
 * Dónde se baja la app: los botones de Play Store y App Store (en el teléfono, primero la del suyo) y, en la
 * computadora, un QR de cada tienda para abrirla desde el teléfono.
 */
export function Tiendas({ app }: { app: AppDeCodigos }) {
  const sistema = useTelefono();
  const tiendas = [
    { id: 'android' as const, nombre: 'Play Store', para: 'Android', url: app.play, Logo: SiGoogleplay },
    { id: 'iphone' as const, nombre: 'App Store', para: 'iPhone', url: app.appStore, Logo: SiAppstore },
  ];
  if (sistema === 'iphone') tiendas.reverse();

  return (
    <div>
      <div className="grid gap-2 sm:max-w-md sm:grid-cols-2">
        {tiendas.map(({ id, nombre, para, url, Logo }) => (
          <a key={id} href={url} target="_blank" rel="noopener noreferrer" className={`${sistema === id ? adminPrimaryButton : adminSecondaryButton} justify-start`}>
            <Logo className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="text-left leading-tight"><span className="block text-xs font-normal opacity-80">{para}</span>{nombre}</span>
          </a>
        ))}
      </div>
      {/* En la computadora: el teléfono escanea el QR de su tienda y la abre */}
      <div className="mt-4 hidden gap-6 lg:flex">
        {tiendas.map(({ id, nombre, para, url }) => (
          <figure key={id} className="flex items-center gap-3">
            <Qr texto={url} etiqueta={`Código QR para bajar ${app.nombre} de ${nombre}`} className="h-24 w-24" />
            <figcaption className="text-sm text-muted"><span className="block font-semibold text-ink">{para}</span>Escanéalo con la cámara</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function CampoNumero({ id, valor, onChange, deshabilitado, invalido }: { id: string; valor: string; onChange: (v: string) => void; deshabilitado: boolean; invalido?: boolean }) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={7}
      value={valor}
      onChange={(e) => onChange(e.target.value.replace(/[^\d\s]/g, ''))}
      placeholder="000 000"
      disabled={deshabilitado}
      aria-invalid={invalido || undefined}
      className={`${adminInput(invalido)} block h-14 max-w-56 text-center font-mono text-2xl tracking-[0.3em]`}
    />
  );
}

/** Cómo es cada entrada al panel: la contraseña, el número de la app y el panel */
export function CaminoDeEntrada({ className = '' }: { className?: string }) {
  const pasos: { Icono: IconType; texto: string }[] = [
    { Icono: IconoCandado, texto: 'Tu contraseña' },
    { Icono: IconoCelular, texto: 'El número de tu app' },
    { Icono: IconoCuadricula, texto: 'Entras al panel' },
  ];
  return (
    <ol className={`flex items-center gap-2 ${className}`} aria-label="Cómo entras al panel">
      {pasos.map(({ Icono, texto }, i) => (
        <li key={texto} className="flex min-w-0 items-center gap-2">
          {i > 0 && <span className="h-0.5 w-4 shrink-0 rounded-full bg-brand-200 sm:w-8" aria-hidden="true" />}
          <span className="flex min-w-0 flex-col items-center gap-1 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white"><Icono className="h-5 w-5" aria-hidden="true" /></span>
            <span className="text-xs font-semibold text-ink">{texto}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
