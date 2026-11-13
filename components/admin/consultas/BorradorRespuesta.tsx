'use client';

// C-214: el borrador de respuesta a un mensaje de contacto (Andrés, 13/11, la idea D). Claude lo redacta con su orden,
// los productos que nombra y el flete de ZOOM a su ciudad; se edita aquí y se manda por correo o por WhatsApp.

import { useState } from 'react';
import Link from 'next/link';
import { FaWhatsapp } from 'react-icons/fa6';
import { IconoActualizar, IconoCheck, IconoCopiar, IconoCorreo, IconoEnvio, IconoNovedad, IconoOrdenes, IconoPaquete, IconoUbicacion } from '@/components/iconos';
import { adminInput, adminNotice, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import type { BorradorRespuesta as Borrador, DatoUsado } from '@/lib/ia/respuesta-consulta';

/** Como adminDato, pero el texto puede partirse: un dato largo no se sale de la caja en el teléfono */
const dato = 'inline-flex max-w-full items-start gap-1 rounded-2xl bg-surface px-2.5 py-0.5 text-xs font-semibold tabular-nums text-ink-soft ring-1 ring-inset ring-line [overflow-wrap:anywhere]';

const ICONO: Record<DatoUsado['tipo'], typeof IconoOrdenes> = { orden: IconoOrdenes, producto: IconoPaquete, envio: IconoEnvio, ciudad: IconoUbicacion };

/** wa.me pide el número con su código de país y sin signos: "0414-111.22.33" → "584141112233" */
function numeroWhatsApp(telefono: string): string | null {
  const d = telefono.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('58')) return d;
  if (d.length === 11 && d.startsWith('0')) return `58${d.slice(1)}`;
  if (d.length === 10 && d.startsWith('4')) return `58${d}`;
  return d.length >= 11 ? d : null;
}

export default function BorradorRespuesta({ mensaje }: { mensaje: { id: string; email: string; phone: string; subject: string } }) {
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  const redactar = async () => {
    setPensando(true);
    setError('');
    try {
      const r = await fetch(`/api/admin/consultas/${mensaje.id}/respuesta`, { method: 'POST' });
      const datos = (await r.json().catch(() => ({}))) as Partial<Borrador> & { error?: string };
      if (!r.ok || !datos.respuesta) {
        setError(datos.error || 'No se pudo redactar el borrador.');
        return;
      }
      setBorrador(datos as Borrador);
      setTexto(datos.respuesta);
    } catch {
      setError('Sin conexión con la tienda. Prueba otra vez.');
    } finally {
      setPensando(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin permiso del navegador: el texto está a la vista para copiarlo a mano
    }
  };

  const whatsapp = numeroWhatsApp(mensaje.phone);
  const asunto = borrador?.asunto ?? `Re: ${mensaje.subject}`;

  return (
    <section aria-labelledby={`borrador-${mensaje.id}`} className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`borrador-${mensaje.id}`} className="flex items-center gap-2 text-sm font-bold text-ink">
          <IconoNovedad className="h-4 w-4 text-brand-600" aria-hidden="true" /> Respuesta sugerida
        </h3>
        {borrador && !pensando && (
          <button type="button" onClick={redactar} className={`${adminSecondaryButton} min-h-11`}>
            <IconoActualizar className="h-4 w-4" aria-hidden="true" /> Redactar otra
          </button>
        )}
      </div>

      {pensando ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft" role="status">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-hidden="true" />
          Buscando su orden, los productos y el envío… tarda unos 20 segundos.
        </p>
      ) : !borrador ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-ink-soft">Claude redacta la respuesta con el estado real de su orden, los productos que nombra (precio y existencia) y lo que cobra ZOOM a su ciudad. Tú la revisas y la envías.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={redactar} className={`${adminPrimaryButton} min-h-11`}>
              <IconoNovedad className="h-4 w-4" aria-hidden="true" /> Redactar con Claude
            </button>
            {/* Responder sin borrador, como antes (era el botón "Responder por Email" del mensaje) */}
            <a href={`mailto:${mensaje.email}?subject=${encodeURIComponent(asunto)}`} className={`${adminSecondaryButton} min-h-11`}>
              <IconoCorreo className="h-4 w-4" aria-hidden="true" /> Responder por correo
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {borrador.datos.length > 0 && (
            <ul className="flex min-w-0 flex-wrap gap-1.5" aria-label="Datos que usó">
              {borrador.datos.map((d) => {
                const Icono = ICONO[d.tipo];
                const contenido = <><Icono className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="min-w-0">{d.texto}</span></>;
                return (
                  <li key={`${d.tipo}-${d.texto}`}>
                    {d.enlace ? <Link href={d.enlace} target={d.tipo === 'producto' ? '_blank' : undefined} className={`${dato} hover:text-brand-600`}>{contenido}</Link> : <span className={dato}>{contenido}</span>}
                  </li>
                );
              })}
            </ul>
          )}
          {borrador.porConfirmar.length > 0 && (
            <div className={adminNotice('warning')}>
              <p className="font-semibold">Antes de enviar, confirma:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">{borrador.porConfirmar.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          )}
          <label className="block">
            <span className="sr-only">Respuesta</span>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={10} className={`${adminInput} min-h-48 leading-relaxed`} />
          </label>
          {!borrador.whatsappSeguro && (
            <p className={adminNotice('neutral')}>Lleva datos de sus órdenes y el teléfono del mensaje no es el de su cuenta: respóndele al correo, que llega al dueño de la compra.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${mensaje.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`} className={`${adminPrimaryButton} min-h-11`}>
              <IconoCorreo className="h-4 w-4" aria-hidden="true" /> Responder por correo
            </a>
            {whatsapp && borrador.whatsappSeguro && (
              <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" className={`${adminSecondaryButton} min-h-11`}>
                <FaWhatsapp className="h-4 w-4" aria-hidden="true" /> Enviar por WhatsApp
              </a>
            )}
            <button type="button" onClick={copiar} className={`${adminSecondaryButton} min-h-11`}>
              {copiado ? <IconoCheck className="h-4 w-4" aria-hidden="true" /> : <IconoCopiar className="h-4 w-4" aria-hidden="true" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs text-muted">Redactado por {borrador.firma}. Revísalo antes de enviarlo; después marca el mensaje como «Respondido».</p>
        </div>
      )}
      {error && <p className={`${adminNotice('danger')} mt-3`} role="alert">{error}</p>}
    </section>
  );
}
