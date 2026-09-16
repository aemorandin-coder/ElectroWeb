'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowLeft, FiShoppingBag } from 'react-icons/fi';
import { useSettings } from '@/contexts/SettingsContext';

/**
 * Marco de las páginas de acceso (C-84): volver, logo y el formulario.
 * En el teléfono el formulario va sobre fondo blanco y sin tarjeta: el captcha mide 303 px
 * y dentro de una tarjeta con relleno no cabía a 360 px. Desde lg es una tarjeta centrada.
 * El relleno de abajo deja libre el botón flotante de WhatsApp.
 */
export default function AuthShell({
  volver,
  children,
  pie,
}: {
  volver: { href: string; texto: string };
  children: ReactNode;
  pie?: ReactNode;
}) {
  const { settings } = useSettings();
  const nombre = settings?.companyName || 'Electro Shop Morandin';

  return (
    <main className="min-h-dvh bg-white px-4 pb-24 pt-3 lg:bg-surface lg:py-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          href={volver.href}
          className="-ml-2 inline-flex h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
          {volver.texto}
        </Link>

        <div className="mt-1 flex justify-center">
          <Link href="/" aria-label={`Ir al inicio de ${nombre}`} className="relative block h-20 w-20 lg:h-24 lg:w-24">
            {settings?.logo ? (
              <Image src={settings.logo} alt={nombre} fill sizes="96px" className="object-contain" priority />
            ) : (
              <span className="flex h-full w-full items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 text-brand-600">
                <FiShoppingBag className="h-9 w-9" aria-hidden="true" />
              </span>
            )}
          </Link>
        </div>

        <div className="mt-4 lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:p-8 lg:shadow-sm">{children}</div>

        {pie && <div className="mt-6 text-center">{pie}</div>}
      </div>
    </main>
  );
}
