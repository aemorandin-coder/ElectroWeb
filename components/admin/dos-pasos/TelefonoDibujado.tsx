import { IconoCelular, IconoMas, IconoQr } from '@/components/iconos';
import type { AppDeCodigos } from './apps';

// C-290: la pantalla de la app de códigos, dibujada y simplificada, con lo que hay que tocar marcado (skill
// herramientas-claras, regla 5). No imita la app de nadie: es un teléfono genérico con el logo de la app elegida.
// - `agregar`: la app sin cuentas, el botón + marcado y la opción de escanear el QR.
// - `numero`: la cuenta de Electro Shop con su número de 6 cifras y el círculo de los 30 segundos.
// El marcado aparece una vez (con "reducir movimiento", ya está puesto).

const NUMERO_DE_MUESTRA = '123 456';

export default function TelefonoDibujado({ app, modo, className = '' }: { app: AppDeCodigos; modo: 'agregar' | 'numero'; className?: string }) {
  const Logo = app.logo;
  const etiqueta = modo === 'agregar'
    ? `Dibujo de ${app.nombre}: toca el botón más y elige escanear un código QR`
    : `Dibujo de ${app.nombre}: la cuenta Electro Shop con el número de 6 cifras`;

  return (
    <div role="img" aria-label={etiqueta} className={`relative w-44 shrink-0 select-none ${className}`}>
      <div className="rounded-[1.75rem] border-4 border-ink bg-ink p-1 shadow-lg">
        <div className="relative flex aspect-[9/17] flex-col overflow-hidden rounded-[1.4rem] bg-white">
          {/* La cámara y la barra de la app */}
          <span className="mx-auto mt-1.5 h-1.5 w-12 rounded-full bg-ink/80" aria-hidden="true" />
          <div className="mt-2 flex items-center gap-1.5 border-b border-line px-3 pb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-50 text-brand-600">
              <Logo className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="truncate text-[11px] font-semibold text-ink">{app.corto}</span>
          </div>

          {modo === 'agregar' ? (
            <>
              <div className="mx-3 mt-4 rounded-lg border border-dashed border-line px-2 py-5 text-center text-[11px] text-muted">
                Todavía no hay cuentas
              </div>
              {/* Lo que sale al tocar +: la opción de escanear, marcada */}
              <div className="absolute inset-x-2 bottom-14 rounded-xl border border-line bg-white p-1.5 shadow-md">
                <span className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-2 py-1.5 text-[11px] font-semibold text-brand-700 ring-2 ring-brand-500 transition-[box-shadow] duration-700 starting:ring-0 motion-reduce:transition-none">
                  <IconoQr className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Escanear un código QR
                </span>
              </div>
              <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white ring-4 ring-brand-200 transition-[box-shadow] duration-700 starting:ring-0 motion-reduce:transition-none">
                <IconoMas className="h-5 w-5" aria-hidden="true" />
              </span>
            </>
          ) : (
            <div className="mx-2 mt-3 rounded-xl border border-brand-200 bg-brand-50 px-2.5 py-2 ring-2 ring-brand-500 transition-[box-shadow] duration-700 starting:ring-0 motion-reduce:transition-none">
              <p className="text-[11px] font-semibold text-ink">Electro Shop</p>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-bold tabular-nums tracking-wider text-brand-700">{NUMERO_DE_MUESTRA}</span>
                {/* El círculo de los 30 segundos, quieto a dos tercios */}
                <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 -rotate-90" aria-hidden="true">
                  <circle cx="10" cy="10" r="8" fill="none" strokeWidth="3" className="stroke-brand-100" />
                  <circle cx="10" cy="10" r="8" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="50.3" strokeDashoffset="16.8" className="stroke-brand-500" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** C-290: la fila de Electro Shop en la app, sin el teléfono: para la pantalla de entrar, donde no cabe el dibujo entero */
export function FilaDeLaApp({ className = '' }: { className?: string }) {
  return (
    <div role="img" aria-label="Así se ve en tu app: Electro Shop con su número de 6 cifras" className={`flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
        <IconoCelular className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-ink">Electro Shop</span>
        <span className="block font-mono text-lg font-bold tabular-nums tracking-wider text-brand-700">{NUMERO_DE_MUESTRA}</span>
      </span>
      <svg viewBox="0 0 20 20" className="h-6 w-6 shrink-0 -rotate-90" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="none" strokeWidth="3" className="stroke-brand-100" />
        <circle cx="10" cy="10" r="8" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="50.3" strokeDashoffset="16.8" className="stroke-brand-500" />
      </svg>
    </div>
  );
}
