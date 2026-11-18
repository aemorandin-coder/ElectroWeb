'use client';

import { useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { IconoAdvertencia, IconoCopiar, IconoDescargar } from '@/components/iconos';
import { adminNotice, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

// C-141: los 10 códigos de respaldo de los dos pasos. El servidor los entrega una sola vez (guarda solo su huella):
// por eso la pantalla no deja seguir hasta que el admin confirma que los guardó.
// C-290: en pantalla se llaman "llaves de repuesto" (skill herramientas-claras, regla 7).

export default function CodigosRespaldo({ codigos, correo, textoBoton, onListo, antesDeConfirmar }: {
  codigos: string[];
  correo: string;
  textoBoton: string;
  onListo: () => void | Promise<void>;
  /** C-290: lo que va entre las llaves y la casilla (en la activación, cómo será cada entrada) */
  antesDeConfirmar?: ReactNode;
}) {
  const [guardados, setGuardados] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const texto = [
    `Electro Shop · Llaves de repuesto de ${correo}`,
    `Creadas el ${new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas', dateStyle: 'long', timeStyle: 'short' })}`,
    'Cada llave te deja entrar una sola vez, cuando no tengas tu teléfono a mano. Escríbela donde va el número de la app.',
    '',
    ...codigos,
    '',
  ].join('\n');

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigos.join('\n'));
      toast.success('Llaves copiadas');
    } catch {
      toast.error('No se pudo copiar. Anótalas a mano o descarga el archivo.');
    }
  };

  const descargar = () => {
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'electroshop-llaves-de-repuesto.txt';
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <p className={`${adminNotice('warning')} flex items-start gap-2`}>
        <IconoAdvertencia className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Guárdalas ahora: no se vuelven a mostrar. Descárgalas o anótalas en papel.</span>
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Llaves de repuesto">
        {codigos.map((codigo) => (
          <li key={codigo} className="rounded-lg border border-line bg-surface px-2 py-2 text-center font-mono text-sm font-semibold text-ink">{codigo}</li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={copiar} className={adminSecondaryButton}>
          <IconoCopiar className="h-4 w-4" aria-hidden="true" />
          Copiar
        </button>
        <button type="button" onClick={descargar} className={adminSecondaryButton}>
          <IconoDescargar className="h-4 w-4" aria-hidden="true" />
          Descargar .txt
        </button>
      </div>
      {antesDeConfirmar}
      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink">
        <input type="checkbox" checked={guardados} onChange={(e) => setGuardados(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500" />
        <span>Ya las guardé fuera de este teléfono y de esta computadora.</span>
      </label>
      <button
        type="button"
        disabled={!guardados || saliendo}
        onClick={async () => {
          setSaliendo(true);
          try {
            await onListo();
          } finally {
            setSaliendo(false);
          }
        }}
        className={`${adminPrimaryButton} mt-4 w-full sm:w-auto`}
      >
        {textoBoton}
      </button>
    </div>
  );
}
