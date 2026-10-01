'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FiCheckCircle, FiSend } from 'react-icons/fi';
import HCaptchaWrapper, { type HCaptchaRefMethods } from '@/components/HCaptchaWrapper';
import { useCart } from '@/contexts/CartContext';
import { formatUSD } from '@/lib/currency';
import { adminCard, adminError, adminHint, adminInput, adminLabel, adminNotice, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

// "Pedir cotización" (C-148): una empresa o institución cuenta qué necesita y, si quiere, manda los productos de su
// carrito. El equipo arma el presupuesto en el panel y le envía el enlace. Sin cuenta.

type Campo = 'clientName' | 'clientDoc' | 'contactName' | 'contactPhone' | 'contactEmail' | 'location' | 'requestNote';

export default function PedirCotizacion() {
  const { data: session } = useSession();
  const { items } = useCart();
  // Solo productos del catálogo: las gift cards y recargas del carrito llevan otro identificador
  const delCarrito = items.filter((i) => /^[a-z0-9-]{3,40}$/i.test(i.id));
  const [valores, setValores] = useState<Record<Campo, string>>({ clientName: '', clientDoc: '', contactName: '', contactPhone: '', contactEmail: '', location: '', requestNote: '' });
  const [conCarrito, setConCarrito] = useState(true);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<HCaptchaRefMethods>(null);
  const [error, setError] = useState<{ campo?: string; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [numero, setNumero] = useState<string | null>(null);

  const cambiar = (campo: Campo, valor: string) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    if (error?.campo === campo) setError(null);
  };
  // Con sesión, el correo de la cuenta ya viene puesto (se puede cambiar)
  const correo = valores.contactEmail || (session?.user?.email ?? '');

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!captcha) {
      setError({ campo: 'captcha', texto: 'Completa la verificación de seguridad.' });
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...valores,
          contactEmail: correo,
          captchaToken: captcha,
          items: conCarrito ? delCarrito.map((i) => ({ productId: i.id, quantity: i.quantity })) : [],
        }),
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        // El captcha se gasta en cada intento
        captchaRef.current?.resetCaptcha();
        setCaptcha(null);
        setError({ campo: datos.field, texto: datos.error || 'No pudimos registrar tu solicitud. Intenta de nuevo.' });
        if (datos.field && datos.field !== 'captcha') document.getElementById(`cot-${datos.field}`)?.focus();
        return;
      }
      setNumero(datos.numero);
    } catch {
      setError({ texto: 'Sin conexión. Intenta de nuevo.' });
    } finally {
      setEnviando(false);
    }
  };

  if (numero) {
    return (
      <div className={`${adminCard} text-center`} role="status">
        <FiCheckCircle className="mx-auto h-12 w-12 text-success-strong" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-bold text-ink">Recibimos tu solicitud</h2>
        <p className="mt-1 text-sm text-ink-soft">Número <strong className="font-mono text-ink">{numero}</strong>. Armamos tu presupuesto y te lo enviamos por WhatsApp o por correo, con un enlace para verlo, imprimirlo y aprobarlo.</p>
        <Link href="/productos" className={`${adminSecondaryButton} mt-5`}>Seguir viendo productos</Link>
      </div>
    );
  }

  const campo = (id: Campo, etiqueta: string, extra: { tipo?: string; ayuda?: string; opcional?: boolean; autoComplete?: string; inputMode?: 'tel' | 'email' | 'text'; max?: number } = {}) => (
    <div>
      <label htmlFor={`cot-${id}`} className={adminLabel}>{etiqueta}{extra.opcional && <span className="font-normal text-muted"> (opcional)</span>}</label>
      <input
        id={`cot-${id}`}
        type={extra.tipo ?? 'text'}
        inputMode={extra.inputMode}
        autoComplete={extra.autoComplete}
        maxLength={extra.max ?? 120}
        value={id === 'contactEmail' ? correo : valores[id]}
        onChange={(e) => cambiar(id, e.target.value)}
        aria-invalid={error?.campo === id}
        className={adminInput(error?.campo === id)}
        disabled={enviando}
      />
      {extra.ayuda && <p className={adminHint}>{extra.ayuda}</p>}
    </div>
  );

  return (
    <form onSubmit={enviar} noValidate className={`${adminCard} space-y-5`}>
      <div className="grid gap-4 sm:grid-cols-2">
        {campo('clientName', 'Empresa, institución o tu nombre', { autoComplete: 'organization' })}
        {campo('clientDoc', 'RIF o cédula', { opcional: true, max: 20, ayuda: 'Para que el presupuesto salga a nombre correcto.' })}
        {campo('contactName', 'Persona de contacto', { autoComplete: 'name', max: 100 })}
        {campo('contactPhone', 'Teléfono o WhatsApp', { tipo: 'tel', inputMode: 'tel', autoComplete: 'tel', max: 30 })}
        {campo('contactEmail', 'Correo', { tipo: 'email', inputMode: 'email', autoComplete: 'email', max: 150 })}
        {campo('location', 'Ciudad y estado', { opcional: true, max: 200 })}
      </div>

      <div>
        <label htmlFor="cot-requestNote" className={adminLabel}>¿Qué necesitas?</label>
        <textarea
          id="cot-requestNote"
          rows={5}
          maxLength={2000}
          value={valores.requestNote}
          onChange={(e) => cambiar('requestNote', e.target.value)}
          aria-invalid={error?.campo === 'requestNote'}
          className={`${adminInput(error?.campo === 'requestNote')} h-auto py-2`}
          placeholder="Equipos, cantidades, para qué son y para cuándo los necesitas."
          disabled={enviando}
        />
      </div>

      {delCarrito.length > 0 && (
        <div className="rounded-xl border border-line p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-ink">
            <input type="checkbox" checked={conCarrito} onChange={(e) => setConCarrito(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500" />
            <span>{delCarrito.length === 1 ? 'Cotizar el producto de mi carrito' : `Cotizar los ${delCarrito.length} productos de mi carrito`}</span>
          </label>
          {conCarrito && (
            <ul className="mt-3 space-y-1 text-sm text-ink-soft">
              {delCarrito.map((i) => (
                <li key={i.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">{i.quantity} × {i.name}</span>
                  <span className="shrink-0 tabular-nums">{formatUSD(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-center">
        <HCaptchaWrapper
          sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'}
          onVerify={(token: string) => { setCaptcha(token); if (error?.campo === 'captcha') setError(null); }}
          onExpire={() => setCaptcha(null)}
          ref={captchaRef}
          theme="light"
        />
      </div>

      {error && <p className={error.campo ? adminError : adminNotice('danger')} role="alert">{error.texto}</p>}

      <button type="submit" disabled={enviando} className={`${adminPrimaryButton} w-full sm:w-auto`}>
        <FiSend className="h-4 w-4" aria-hidden="true" />
        {enviando ? 'Enviando…' : 'Pedir cotización'}
      </button>
    </form>
  );
}
