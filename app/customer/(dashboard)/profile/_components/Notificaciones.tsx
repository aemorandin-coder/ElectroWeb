'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiBell, FiCheckCircle } from 'react-icons/fi';
import { Interruptor, Seccion } from './comun';
import type { Ajustes } from './tipos';

// Notificaciones (C-138): solo lo que la tienda de verdad hace. Antes había 7 interruptores y 6 no hacían nada.
// Los avisos de favoritos los manda el cron (lib/favoritos-avisos.ts), el pedido de reseñas también (lib/resenas-avisos.ts, C-157);
// las ofertas por correo son las campañas (C-75).

type Clave = keyof Ajustes['notificaciones'];

export default function Notificaciones({ inicial }: { inicial: Ajustes['notificaciones'] }) {
  const [prefs, setPrefs] = useState(inicial);
  const [guardando, setGuardando] = useState<Clave | null>(null);

  // Se guarda al tocar: sin botón "Guardar" que olvidar
  const cambiar = async (clave: Clave, valor: boolean) => {
    const antes = prefs;
    setPrefs({ ...prefs, [clave]: valor });
    setGuardando(clave);
    try {
      const res = await fetch('/api/customer/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificaciones: { [clave]: valor } }),
      });
      if (!res.ok) throw new Error();
      toast.success(valor ? 'Activado' : 'Desactivado', { id: 'preferencia' });
    } catch {
      setPrefs(antes);
      toast.error('No se pudo guardar. Intenta de nuevo.', { id: 'preferencia' });
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div className="space-y-4">
      <Seccion titulo="Tus pedidos y tus Puntos ES" descripcion="Estos avisos siempre te llegan en la tienda porque los necesitas para comprar. Los de tus pedidos y garantías, también por correo.">
        <ul className="grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
          {['Confirmación y pago de cada pedido', 'Envío, guía y entrega', 'Recargas y movimientos de Puntos ES', 'Respuestas de garantía'].map((t) => (
            <li key={t} className="flex items-center gap-2"><FiCheckCircle className="h-4 w-4 shrink-0 text-success-strong" aria-hidden="true" /> {t}</li>
          ))}
        </ul>
        <Link href="/customer/notifications" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
          <FiBell className="h-4 w-4" aria-hidden="true" /> Ver mis notificaciones
        </Link>
      </Seccion>

      <Seccion titulo="Tus favoritos" descripcion="Te avisamos cuando un producto que guardaste baja de precio, entra en oferta o vuelve a estar disponible.">
        <div className="divide-y divide-line">
          <Interruptor
            titulo="En la tienda"
            descripcion="En la campana de notificaciones."
            activo={prefs.inAppFavoritos}
            onCambio={(v) => cambiar('inAppFavoritos', v)}
            deshabilitado={guardando === 'inAppFavoritos'}
          />
          <Interruptor
            titulo="Por correo"
            descripcion="Un solo correo con todos los cambios de esa revisión."
            activo={prefs.emailFavoritos}
            onCambio={(v) => cambiar('emailFavoritos', v)}
            deshabilitado={guardando === 'emailFavoritos'}
          />
        </div>
      </Seccion>

      <Seccion titulo="Tus reseñas" descripcion="Unos días después de recibir tu pedido te escribimos para preguntarte qué te pareció. Solo si no has opinado todavía de ese producto.">
        <Interruptor
          titulo="Por correo"
          descripcion="Un solo correo por pedido, con un botón para dejar tu reseña. Cada correo trae un enlace para darte de baja."
          activo={prefs.emailReviews}
          onCambio={(v) => cambiar('emailReviews', v)}
          deshabilitado={guardando === 'emailReviews'}
        />
      </Seccion>

      <Seccion titulo="Ofertas y novedades">
        <Interruptor
          titulo="Por correo"
          descripcion="Ofertas, productos nuevos y cupones de la tienda. Cada correo trae un enlace para darte de baja."
          activo={prefs.emailPromotions}
          onCambio={(v) => cambiar('emailPromotions', v)}
          deshabilitado={guardando === 'emailPromotions'}
        />
      </Seccion>
    </div>
  );
}
