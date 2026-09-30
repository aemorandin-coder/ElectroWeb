'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { FiBell, FiBriefcase, FiCamera, FiLock, FiUser } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { adminNotice, adminSecondaryButton, adminTab } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import DatosPersonales from './_components/DatosPersonales';
import Seguridad from './_components/Seguridad';
import Notificaciones from './_components/Notificaciones';
import Empresa from './_components/Empresa';
import { mesYAnio } from './_components/comun';
import type { Ajustes, DatosPerfil } from './_components/tipos';

// Mi perfil (C-138): Perfil y Configuración en una sola página con pestañas. La pestaña va en la URL
// (?tab=seguridad) para que los enlaces del checkout, el inicio y los correos lleguen directo.

type Pestana = 'datos' | 'seguridad' | 'notificaciones' | 'empresa';

const PESTANAS: { id: Pestana; texto: string; Icono: IconType }[] = [
  { id: 'datos', texto: 'Datos personales', Icono: FiUser },
  { id: 'seguridad', texto: 'Seguridad', Icono: FiLock },
  { id: 'notificaciones', texto: 'Notificaciones', Icono: FiBell },
  { id: 'empresa', texto: 'Empresa', Icono: FiBriefcase },
];

const esPestana = (valor: string | null): valor is Pestana => PESTANAS.some((p) => p.id === valor);

export default function ProfilePage() {
  const { update } = useSession();
  const [pestana, setPestana] = useState<Pestana>('datos');
  const [datos, setDatos] = useState<DatosPerfil | null>(null);
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [error, setError] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    try {
      const [rPerfil, rAjustes] = await Promise.all([fetch('/api/user/profile'), fetch('/api/customer/settings')]);
      if (!rPerfil.ok || !rAjustes.ok) throw new Error();
      setDatos(await rPerfil.json());
      setAjustes(await rAjustes.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useCargarAlMontar(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (esPestana(tab)) setPestana(tab);
    void cargar();
  }, []);

  const elegir = (id: Pestana) => {
    setPestana(id);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', id);
    window.history.replaceState(null, '', url);
  };

  // La foto se guarda al elegirla (antes había que acordarse de "Guardar cambios" y la página se recargaba)
  const cambiarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Usa una foto PNG, JPG o WEBP');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La foto pesa más de 2 MB');
      return;
    }
    setSubiendoFoto(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result as string);
        lector.onerror = reject;
        lector.readAsDataURL(file);
      });
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: base64 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error);
      toast.success('Foto actualizada');
      await Promise.all([cargar(), update()]);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : 'No se pudo subir la foto');
    } finally {
      setSubiendoFoto(false);
    }
  };

  if (error) {
    return (
      <div className={`${adminNotice('danger')} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <p className="text-sm">No se pudo cargar tu perfil.</p>
        <button type="button" onClick={() => void cargar()} className={adminSecondaryButton}>Reintentar</button>
      </div>
    );
  }

  if (!datos || !ajustes) {
    return (
      <div className="space-y-4" aria-label="Cargando tu perfil">
        <div className="h-24 animate-pulse rounded-2xl border border-line bg-white" />
        <div className="h-10 w-2/3 animate-pulse rounded-lg bg-surface" />
        <div className="h-72 animate-pulse rounded-2xl border border-line bg-white" />
      </div>
    );
  }

  const foto = datos.profile?.avatar || datos.user.image;
  const inicial = (datos.user.name || datos.user.email || '?').charAt(0).toUpperCase();
  const alGuardar = async () => {
    await Promise.all([cargar(), update()]);
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <header className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 sm:p-5">
        <div className="relative shrink-0">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-500 text-2xl font-bold text-white sm:h-20 sm:w-20">
            {foto ? <Image src={foto} alt="" width={80} height={80} className="h-full w-full object-cover" /> : inicial}
          </div>
          <button
            type="button"
            onClick={() => archivo.current?.click()}
            disabled={subiendoFoto}
            aria-label="Cambiar foto"
            title="Cambiar foto"
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60"
          >
            <FiCamera className="h-4 w-4" aria-hidden="true" />
          </button>
          <input ref={archivo} type="file" accept="image/png,image/jpeg,image/webp" onChange={cambiarFoto} className="hidden" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-ink lg:text-2xl">{datos.user.name || 'Mi perfil'}</h1>
          <p className="truncate text-sm text-muted">{datos.user.email}</p>
          <p className="mt-1 text-sm text-ink-soft">
            Cliente desde {mesYAnio(datos.user.createdAt)}
            {' · '}{datos.resumen.pedidosPagados} {datos.resumen.pedidosPagados === 1 ? 'pedido' : 'pedidos'}
            {datos.resumen.totalComprado > 0 && <> · {formatUSD(datos.resumen.totalComprado)} en compras</>}
          </p>
        </div>
      </header>

      {/* En el teléfono, 2×2: en una fila deslizable la cuarta pestaña quedaba escondida a 360 px */}
      <nav aria-label="Secciones de mi perfil">
        <ul className="grid grid-cols-2 gap-1 border-b border-line pb-2 sm:flex">
          {PESTANAS.map(({ id, texto, Icono }) => (
            <li key={id}>
              <button type="button" onClick={() => elegir(id)} aria-current={pestana === id ? 'page' : undefined} className={`${adminTab(pestana === id)} h-11 w-full justify-center sm:w-auto`}>
                <Icono className="h-4 w-4" aria-hidden="true" /> {texto}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {pestana === 'datos' && <DatosPersonales key={datos.user.id} datos={datos} onGuardado={alGuardar} />}
      {pestana === 'seguridad' && <Seguridad ajustes={ajustes} onCambio={cargar} />}
      {pestana === 'notificaciones' && <Notificaciones inicial={ajustes.notificaciones} />}
      {pestana === 'empresa' && <Empresa datos={datos} onEnviado={cargar} />}
    </div>
  );
}
