'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiCopy, FiDownload } from 'react-icons/fi';
import { adminNotice, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

// C-141: los 10 códigos de respaldo de los dos pasos. El servidor los entrega una sola vez (guarda solo su huella):
// por eso la pantalla no deja seguir hasta que el admin confirma que los guardó.

export default function CodigosRespaldo({ codigos, correo, textoBoton, onListo }: { codigos: string[]; correo: string; textoBoton: string; onListo: () => void | Promise<void> }) {
  const [guardados, setGuardados] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const texto = [
    `Electro Shop · Códigos de respaldo de ${correo}`,
    `Generados el ${new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas', dateStyle: 'long', timeStyle: 'short' })}`,
    'Cada código sirve una sola vez, cuando no tengas tu teléfono a mano.',
    '',
    ...codigos,
    '',
  ].join('\n');

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigos.join('\n'));
      toast.success('Códigos copiados');
    } catch {
      toast.error('No se pudo copiar. Anótalos a mano o descarga el archivo.');
    }
  };

  const descargar = () => {
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'electroshop-codigos-de-respaldo.txt';
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <p className={`${adminNotice('warning')} flex items-start gap-2`}>
        <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Guárdalos ahora: no se vuelven a mostrar. Si pierdes el teléfono, uno de estos códigos te deja entrar. Cada uno sirve una sola vez.</span>
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Códigos de respaldo">
        {codigos.map((codigo) => (
          <li key={codigo} className="rounded-lg border border-line bg-surface px-2 py-2 text-center font-mono text-sm font-semibold text-ink">{codigo}</li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={copiar} className={adminSecondaryButton}>
          <FiCopy className="h-4 w-4" aria-hidden="true" />
          Copiar
        </button>
        <button type="button" onClick={descargar} className={adminSecondaryButton}>
          <FiDownload className="h-4 w-4" aria-hidden="true" />
          Descargar .txt
        </button>
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink">
        <input type="checkbox" checked={guardados} onChange={(e) => setGuardados(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500" />
        <span>Ya guardé mis códigos en un lugar seguro, fuera de este teléfono o computadora.</span>
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
