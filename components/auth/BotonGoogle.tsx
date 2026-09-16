'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';
import { adminSecondaryButton } from '@/lib/admin-ui';

/**
 * "Continuar con Google" (C-85). Solo se pinta si el servidor dice que Google está configurado.
 * `destino` ya viene validado con rutaInternaSegura.
 */
export default function BotonGoogle({ destino, deshabilitado = false }: { destino: string; deshabilitado?: boolean }) {
  const [saliendo, setSaliendo] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={deshabilitado || saliendo}
        onClick={() => {
          setSaliendo(true);
          // Sale de la tienda hacia Google: el botón queda bloqueado para no abrir dos ventanas de permiso
          signIn('google', { callbackUrl: destino }).catch(() => setSaliendo(false));
        }}
        className={`${adminSecondaryButton} h-12 w-full text-base`}
      >
        {saliendo ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-hidden="true" />
        ) : (
          <FcGoogle className="h-5 w-5" aria-hidden="true" />
        )}
        Continuar con Google
      </button>
      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-medium text-muted">o con tu correo</span>
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
