'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FiGift, FiRefreshCw } from 'react-icons/fi';
import { adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { novedadesDesde } from '@/lib/modulos';
import { useTiempoReal } from '@/lib/realtime/hooks';
import { VERSION_BUILD } from '@/lib/version-build';

// C-168. Dos avisos arriba del contenido del panel:
// 1. "El panel se actualizó": el servidor corre un build distinto del que cargó esta pestaña (se subió una versión). No recarga
//    sola: quien está editando decide cuándo.
// 2. "Qué hay de nuevo": la primera vez que cada administrador entra después de un deploy, qué módulos cambiaron.

interface DatosServidor {
  id: string;
  version: string;
  describe: string;
  visto: string | null;
}

const REVISAR_CADA_MS = 10 * 60_000;
const MAXIMO_LINEAS = 4;

export default function AvisosDeVersion() {
  const [servidor, setServidor] = useState<DatosServidor | null>(null);
  const [cerradas, setCerradas] = useState(false);

  const revisar = useCallback(async () => {
    const res = await fetch('/api/admin/version', { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) return;
    const datos = (await res.json().catch(() => null)) as DatosServidor | null;
    if (datos && typeof datos.id === 'string') setServidor(datos);
  }, []);

  // Al abrir el panel, al volver a la pestaña, cada 10 minutos y cuando vuelve la conexión en vivo (un deploy reinicia el
  // servidor: la conexión se cae y se reabre sola, y ahí se ve la versión nueva)
  useCargarAlMontar(revisar);
  useTiempoReal(() => {}, { onReconectar: revisar });
  useEffect(() => {
    const cada = setInterval(() => void revisar(), REVISAR_CADA_MS);
    const alVolver = () => {
      if (document.visibilityState === 'visible') void revisar();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(cada);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [revisar]);

  const cerrarNovedades = async () => {
    setCerradas(true);
    await fetch('/api/admin/version', { method: 'POST' }).catch(() => null);
  };

  if (!servidor) return null;

  if (servidor.id !== VERSION_BUILD.id) {
    return (
      <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-700">
        <FiRefreshCw className="h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1 basis-60">
          <span className="font-semibold">El panel se actualizó a la versión {servidor.version}.</span> Recarga para usar la versión nueva. Si estás
          editando algo, termina y guárdalo primero.
        </p>
        <button type="button" onClick={() => window.location.reload()} className={adminPrimaryButton}>Recargar ahora</button>
      </div>
    );
  }

  if (cerradas || servidor.visto === servidor.version) return null;
  const novedades = novedadesDesde(servidor.visto, VERSION_BUILD.version);
  if (novedades.length === 0) return null;
  // Compacto: solo lo más nuevo de cada módulo y pocas líneas. El detalle completo está en Administración → Versiones
  const lineas = novedades.map(({ modulo, cambios }) => ({ modulo, cambio: cambios[0] }));

  return (
    <section aria-labelledby="novedades-titulo" className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700 sm:p-4">
      <div className="flex items-start gap-3">
        <FiGift className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="novedades-titulo" className="font-semibold">Qué hay de nuevo · versión {servidor.version}</h2>
          <ul className="mt-1.5 space-y-1">
            {lineas.slice(0, MAXIMO_LINEAS).map(({ modulo, cambio }) => (
              <li key={`${modulo.id}-${cambio.version}`} className="line-clamp-2">
                <span className="font-semibold">{modulo.nombre}:</span> {cambio.resumen}
              </li>
            ))}
          </ul>
          {lineas.length > MAXIMO_LINEAS && <p className="mt-1">Y {lineas.length - MAXIMO_LINEAS} más en Versiones.</p>}
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" onClick={() => void cerrarNovedades()} className={adminPrimaryButton}>Entendido</button>
            <Link href="/admin/versiones" onClick={() => void cerrarNovedades()} className={adminSecondaryButton}>Ver detalle</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
