'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { IconoCerrar, IconoCorreo, IconoCuenta, IconoDocumento, IconoEnviar, IconoGuardar, IconoVer } from '@/components/iconos';
import { FaWhatsapp } from 'react-icons/fa';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  adminDato, adminHint, adminInput, adminModalBody, adminModalFooter, adminModalHeader, adminModalOverlay, adminModalPanel,
  adminModalTitle, adminPrimaryButton, adminSecondaryButton, adminSpinner,
} from '@/lib/admin-ui';
import { CORREOS_MAX, correosDe } from '@/lib/proveedores/contacto';
import { normalizarRif } from '@/lib/proveedores/fiscal';

export interface Contacto {
  contactName: string | null;
  contactEmail: string | null;
  contactWhatsapp: string | null;
  bienvenidaAt: string | null;
  /** C-246: sus datos fiscales, como en su RIF */
  legalName: string | null;
  taxId: string | null;
  fiscalAddress: string | null;
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Caracas' });

/**
 * C-227: a quién le escribe la tienda cuando se vende algo de este proveedor (el correo de despacho, decisión 6 del 14/11)
 * y la bienvenida de aliado comercial (decisión 7: un botón, cuando su catálogo ya está publicado), con la vista previa
 * antes de enviarla (PLAN.md §1.9). Sin correo, sus ventas le llegan al equipo para pasárselas a mano.
 * C-246: hasta 3 correos de despacho (a todos les llega cada venta) y sus datos fiscales, como en su RIF.
 */
export default function ContactoProveedor({ proveedorId, nombreProveedor, despachaElMismo, contacto, onGuardado }: {
  proveedorId: string;
  nombreProveedor: string;
  despachaElMismo: boolean;
  contacto: Contacto;
  onGuardado: (c: Contacto) => void;
}) {
  const { confirm } = useConfirm();
  const [nombre, setNombre] = useState(contacto.contactName ?? '');
  const [correo, setCorreo] = useState(contacto.contactEmail ?? '');
  const [whatsapp, setWhatsapp] = useState(contacto.contactWhatsapp ?? '');
  const [razon, setRazon] = useState(contacto.legalName ?? '');
  const [rif, setRif] = useState(contacto.taxId ?? '');
  const [domicilio, setDomicilio] = useState(contacto.fiscalAddress ?? '');
  const [guardando, setGuardando] = useState(false);
  const [vista, setVista] = useState<{ para: string | null; publicados: number; asunto: string; html: string } | null>(null);
  const [abriendo, setAbriendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  useBodyScrollLock(vista !== null);

  const correosEscritos = correosDe(correo);
  const nuevoCorreo = correosEscritos.join(', ');
  const rifEscrito = rif.trim() ? normalizarRif(rif) : '';
  const cambio = nombre.trim() !== (contacto.contactName ?? '') || nuevoCorreo !== (contacto.contactEmail ?? '') || whatsapp.trim() !== (contacto.contactWhatsapp ?? '')
    || razon.trim() !== (contacto.legalName ?? '') || (rifEscrito ?? rif.trim()) !== (contacto.taxId ?? '') || domicilio.trim() !== (contacto.fiscalAddress ?? '');
  const problema = correosEscritos.length > CORREOS_MAX ? `Hasta ${CORREOS_MAX} correos de despacho` : rifEscrito === null ? 'El RIF lleva una letra y 9 números, como J-30838235-3' : null;

  const guardar = async () => {
    if (nuevoCorreo !== (contacto.contactEmail ?? '') && contacto.contactEmail) {
      const ok = await confirm({
        title: 'Cambiar el correo de despacho',
        message: `Sus próximas ventas le llegarán a ${nuevoCorreo || '(nadie: al equipo, para pasarlas a mano)'} en lugar de ${contacto.contactEmail}. Lo que ya se le avisó sigue con su enlace.`,
        confirmText: 'Cambiar', cancelText: 'Cancelar', type: 'warning',
      });
      if (!ok) return;
    }
    setGuardando(true);
    try {
      const r = await fetch(`/api/admin/proveedores/${proveedorId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactName: nombre, contactEmail: nuevoCorreo, contactWhatsapp: whatsapp, legalName: razon, taxId: rif, fiscalAddress: domicilio }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'No se pudo guardar'); return; }
      const guardado: Contacto = {
        contactName: d.contactName ?? null, contactEmail: d.contactEmail ?? null, contactWhatsapp: d.contactWhatsapp ?? null, bienvenidaAt: d.bienvenidaAt ?? null,
        legalName: d.legalName ?? null, taxId: d.taxId ?? null, fiscalAddress: d.fiscalAddress ?? null,
      };
      setNombre(guardado.contactName ?? '');
      setCorreo(guardado.contactEmail ?? '');
      setWhatsapp(guardado.contactWhatsapp ?? '');
      setRazon(guardado.legalName ?? '');
      setRif(guardado.taxId ?? '');
      setDomicilio(guardado.fiscalAddress ?? '');
      onGuardado(guardado);
      toast.success('Datos del proveedor guardados');
    } finally {
      setGuardando(false);
    }
  };

  const abrirVista = async () => {
    setAbriendo(true);
    try {
      const r = await fetch(`/api/admin/proveedores/${proveedorId}/bienvenida`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'No se pudo armar la bienvenida'); return; }
      setVista(d);
    } finally {
      setAbriendo(false);
    }
  };

  const enviar = async () => {
    setEnviando(true);
    try {
      const r = await fetch(`/api/admin/proveedores/${proveedorId}/bienvenida`, { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'No se pudo enviar'); return; }
      onGuardado({ ...contacto, bienvenidaAt: d.enviadaEl ?? new Date().toISOString() });
      toast.success(`Bienvenida enviada a ${d.para}`);
      setVista(null);
    } finally {
      setEnviando(false);
    }
  };

  const sinEnviar = !vista?.para || vista.publicados === 0;

  return (
    <div className="space-y-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <IconoCuenta className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" /> Su contacto de despacho
        </p>
        <p className={adminHint}>
          {despachaElMismo
            ? 'Cuando se vende algo suyo, a estos correos les llega "¡Se vendió su producto!" con el enlace para anotar la guía (con copia al equipo).'
            : 'Si despacha él mismo, a estos correos les llegan sus ventas. También es a donde va la bienvenida.'}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Quién lo recibe</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} placeholder="Nombre de la persona" autoComplete="off" className={`${adminInput()} sm:max-w-sm`} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Correos de despacho (hasta {CORREOS_MAX}, separados por coma)</span>
          <input type="text" inputMode="email" value={correo} onChange={(e) => setCorreo(e.target.value)} maxLength={380} placeholder="despachos@proveedor.com, ventas@proveedor.com" autoComplete="off" className={`${adminInput(correosEscritos.length > CORREOS_MAX)} sm:max-w-xl`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">WhatsApp</span>
          <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={20} placeholder="+58 412 000 0000" autoComplete="off" className={`${adminInput()} sm:max-w-48`} />
        </label>
      </div>
      <div className="pt-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <IconoDocumento className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" /> Datos fiscales
        </p>
        <p className={adminHint}>Como en su RIF: van en la credencial de la bienvenida y sirven para sus facturas de compra.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Razón social</span>
          <input value={razon} onChange={(e) => setRazon(e.target.value)} maxLength={150} placeholder="Como dice su RIF" autoComplete="off" className={`${adminInput()} sm:max-w-md`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">RIF</span>
          <input value={rif} onChange={(e) => setRif(e.target.value)} maxLength={14} placeholder="J-30838235-3" autoComplete="off" className={`${adminInput(rifEscrito === null)} sm:max-w-48`} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Domicilio fiscal</span>
          <input value={domicilio} onChange={(e) => setDomicilio(e.target.value)} maxLength={300} placeholder="Calle, local, sector, ciudad y estado" autoComplete="off" className={`${adminInput()} sm:max-w-3xl`} />
        </label>
      </div>
      {problema && <p className="text-xs font-semibold text-deal" role="alert">{problema}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void guardar()} disabled={!cambio || guardando || Boolean(problema)} className={adminSecondaryButton}>
          <IconoGuardar className="h-4 w-4" aria-hidden="true" /> {guardando ? 'Guardando…' : 'Guardar los datos'}
        </button>
        <button type="button" onClick={() => void abrirVista()} disabled={abriendo || cambio} className={adminSecondaryButton} title={cambio ? 'Guarda los datos primero' : undefined}>
          <IconoVer className="h-4 w-4" aria-hidden="true" /> {abriendo ? 'Armando…' : contacto.bienvenidaAt ? 'Ver y reenviar la bienvenida' : 'Ver la bienvenida'}
        </button>
        <span className={adminDato}>
          <IconoCorreo className="h-3.5 w-3.5" aria-hidden="true" />
          {contacto.bienvenidaAt ? `Bienvenida enviada el ${fecha(contacto.bienvenidaAt)}` : 'Bienvenida sin enviar'}
        </span>
        {contacto.contactWhatsapp && (
          <a href={`https://wa.me/${contacto.contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={adminDato}>
            <FaWhatsapp className="h-3.5 w-3.5" aria-hidden="true" /> Escribirle
          </a>
        )}
      </div>

      {vista && (
        <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="bienvenida-titulo">
          <div className={`${adminModalPanel} sm:max-w-2xl`}>
            <div className={adminModalHeader}>
              <div className="min-w-0">
                <h2 id="bienvenida-titulo" className={adminModalTitle}>La bienvenida de {nombreProveedor}</h2>
                <p className="truncate text-xs text-muted">Asunto: {vista.asunto}</p>
              </div>
              <button type="button" onClick={() => setVista(null)} className="rounded-lg p-2 text-ink-soft hover:bg-surface" aria-label="Cerrar">
                <IconoCerrar className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className={`${adminModalBody} bg-surface`}>
              {abriendo ? <span className={adminSpinner} aria-label="Cargando" /> : (
                <iframe title="Vista previa de la bienvenida" srcDoc={vista.html} sandbox="" className="h-[60dvh] w-full rounded-xl border border-line bg-white" />
              )}
            </div>
            <div className={adminModalFooter}>
              <p className="mr-auto self-center text-sm text-ink-soft">
                {!vista.para ? 'Guarda su correo de despacho para poder enviarla.'
                  : vista.publicados === 0 ? 'Todavía no tiene productos publicados: publícalos primero.'
                    : `Le llega a ${vista.para}. Dice que tiene ${vista.publicados} ${vista.publicados === 1 ? 'producto publicado' : 'productos publicados'}.`}
              </p>
              <button type="button" onClick={() => setVista(null)} className={adminSecondaryButton}>Cerrar</button>
              <button type="button" onClick={() => void enviar()} disabled={sinEnviar || enviando} className={adminPrimaryButton}>
                <IconoEnviar className="h-4 w-4" aria-hidden="true" /> {enviando ? 'Enviando…' : contacto.bienvenidaAt ? 'Reenviarla' : 'Enviarla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
