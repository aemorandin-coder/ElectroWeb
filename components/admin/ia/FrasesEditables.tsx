'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { IconoCerrar, IconoMas } from '@/components/iconos';
import { adminHint, adminInput, adminSecondaryButton } from '@/lib/admin-ui';
import { FRASE_MAX_LARGO, FRASE_MIN_LARGO } from '@/lib/ia/reglas';
import { llamar, type DatosIa } from './tipos';

// C-288 · Las frases que nunca van en lo que se publica: se quitan y se agregan aquí, con su guardado y su aviso. La tienda quita la
// oración entera que trae una (lib/ia/limpieza.ts → quitarNotasDelEquipo). Rige desde el próximo pedido.

export default function FrasesEditables({ datos, alGuardar }: { datos: DatosIa; alGuardar: () => Promise<void> }) {
  const [nueva, setNueva] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const lista = datos.frases.lista;

  const guardar = async (frases: string[], mensaje: string) => {
    setOcupado(true);
    try {
      const r = await llamar('/api/admin/ia/frases', 'PUT', { frases, desde: datos.updatedAt });
      if (r.ok) toast.success(mensaje);
      else toast.error(r.datos.error ?? 'No se pudo guardar');
      // También después de un conflicto (409): se carga lo último para que se vea lo que guardó la otra persona
      if (r.ok || r.estado === 409) await alGuardar();
    } catch {
      toast.error('Sin conexión. Prueba otra vez.');
    } finally {
      setOcupado(false);
    }
  };

  const agregar = async () => {
    const frase = nueva.trim().replace(/\s+/g, ' ');
    if (frase.length < FRASE_MIN_LARGO) return void toast.error('La frase lleva al menos 3 caracteres');
    if (frase.length > FRASE_MAX_LARGO) return void toast.error('La frase llega a 80 caracteres');
    if (lista.some((f) => f.toLowerCase() === frase.toLowerCase())) return void toast.error('Esa frase ya está');
    await guardar([...lista, frase], 'Frase agregada: rige desde el próximo pedido');
    setNueva('');
  };

  return (
    <div>
      <ul className="flex flex-wrap gap-1.5" aria-label="Frases que nunca van">
        {lista.map((frase) => (
          <li key={frase} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-surface py-0.5 pl-3 pr-1 text-xs font-medium text-ink">
            {frase}
            <button
              type="button"
              onClick={() => void guardar(lista.filter((f) => f !== frase), 'Frase quitada: rige desde el próximo pedido')}
              disabled={ocupado || lista.length <= 1}
              aria-label={`Quitar «${frase}»`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-40"
            >
              <IconoCerrar className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); void agregar(); }} className="mt-3 flex gap-2 sm:max-w-md">
        <input
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          maxLength={FRASE_MAX_LARGO}
          placeholder="Por ejemplo: consultar disponibilidad"
          aria-label="Una frase nueva"
          className={`${adminInput(false)} h-10`}
        />
        <button type="submit" disabled={ocupado || nueva.trim().length < FRASE_MIN_LARGO} className={`${adminSecondaryButton} h-10! shrink-0 px-3!`}>
          <IconoMas className="h-4 w-4" aria-hidden="true" />Agregar
        </button>
      </form>
      <p className={adminHint}>Se busca la frase entera, sin distinguir mayúsculas ni acentos. {datos.frases.delPanel ? 'Son las del equipo.' : 'Son las de fábrica: al cambiar una, quedan guardadas como del equipo.'}</p>
    </div>
  );
}
