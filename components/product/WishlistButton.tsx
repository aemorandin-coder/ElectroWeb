'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { FiHeart } from 'react-icons/fi';

/** Guardar en favoritos. Sin sesión avisa; con sesión consulta y cambia el estado en /api/customer/wishlist. */
export default function WishlistButton({ productId, productName }: { productId: string; productName: string }) {
  const { data: session, status } = useSession();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    fetch('/api/customer/wishlist')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.products) setSaved(data.products.some((p: { id: string }) => p.id === productId));
      })
      .catch(() => {
        // Sin conexión: el corazón queda vacío, no bloquea la compra
      });
    return () => {
      cancelled = true;
    };
  }, [status, productId]);

  const toggle = async () => {
    if (!session) {
      toast.error('Inicia sesión para guardar favoritos');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/customer/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, action: saved ? 'remove' : 'add' }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSaved(!saved);
      toast.success(saved ? 'Quitado de favoritos' : 'Guardado en favoritos');
    } catch {
      toast.error('No se pudieron actualizar tus favoritos');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? `Quitar ${productName} de favoritos` : `Guardar ${productName} en favoritos`}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-60 ${
        saved ? 'border-deal bg-deal text-white' : 'border-line bg-white text-ink-soft hover:text-deal'
      }`}
    >
      <FiHeart className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} aria-hidden="true" />
    </button>
  );
}
