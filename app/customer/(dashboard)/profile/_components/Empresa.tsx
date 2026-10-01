'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiAlertCircle, FiCheckCircle, FiClock, FiSend } from 'react-icons/fi';
import DocumentUpload from '@/components/customer/DocumentUpload';
import { adminBadge, adminError, adminHint, adminInput, adminLabel, adminNotice, adminPrimaryButton, type AdminTone } from '@/lib/admin-ui';
import { DOMICILIO_MAX, DOMICILIO_MIN, leerDomicilioFiscal } from '@/lib/facturacion';
import { Seccion } from './comun';
import type { DatosPerfil } from './tipos';

// Empresa (C-138): solo la verificación, que sí existe (la revisa el equipo en Verificaciones).
// Antes prometía facturas fiscales automáticas, descuentos por volumen, crédito y gestor de cuenta, con una ventana
// emergente a los 2,5 s. C-147: con la empresa verificada, la factura puede ir a su nombre (se elige al pagar) y aquí
// se guarda su domicilio fiscal.

const ESTADOS: Record<string, { texto: string; tono: AdminTone; Icono: typeof FiClock }> = {
  NONE: { texto: 'Sin verificar', tono: 'neutral', Icono: FiClock },
  PENDING: { texto: 'En revisión', tono: 'warning', Icono: FiClock },
  APPROVED: { texto: 'Verificada', tono: 'success', Icono: FiCheckCircle },
  REJECTED: { texto: 'Rechazada', tono: 'danger', Icono: FiAlertCircle },
};

export default function Empresa({ datos, onEnviado }: { datos: DatosPerfil; onEnviado: () => Promise<void> }) {
  const p = datos.profile;
  const estado = p?.businessVerificationStatus || 'NONE';
  const meta = ESTADOS[estado] ?? ESTADOS.NONE;
  const bloqueado = estado === 'PENDING' || estado === 'APPROVED';

  const [nombre, setNombre] = useState(p?.companyName || '');
  const [rif, setRif] = useState(p?.taxId || '');
  const [acta, setActa] = useState<File | null>(null);
  const [rifArchivo, setRifArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domicilio, setDomicilio] = useState(p?.businessFiscalAddress || '');
  const [guardandoDomicilio, setGuardandoDomicilio] = useState(false);
  const [errorDomicilio, setErrorDomicilio] = useState<string | null>(null);

  const guardarDomicilio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leerDomicilioFiscal(domicilio)) {
      setErrorDomicilio(`Escribe el domicilio fiscal como aparece en el RIF (de ${DOMICILIO_MIN} a ${DOMICILIO_MAX} letras).`);
      return;
    }
    setGuardandoDomicilio(true);
    setErrorDomicilio(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: { businessFiscalAddress: domicilio } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorDomicilio(data.error || 'No se pudo guardar el domicilio fiscal');
        return;
      }
      toast.success('Domicilio fiscal guardado');
      await onEnviado();
    } catch {
      setErrorDomicilio('No se pudo guardar. Revisa tu conexión.');
    } finally {
      setGuardandoDomicilio(false);
    }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 3 || !rif.trim() || !acta || !rifArchivo) {
      setError('Completa el nombre, el RIF y sube los dos documentos.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('companyName', nombre.trim());
      formData.append('taxId', rif.trim());
      formData.append('actaConstitutiva', acta);
      formData.append('rifDocument', rifArchivo);
      const res = await fetch('/api/customer/business/verify', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo enviar la solicitud');
        return;
      }
      toast.success('Solicitud enviada. Te avisaremos cuando el equipo la revise.');
      await onEnviado();
    } catch {
      setError('No se pudo enviar la solicitud. Revisa tu conexión.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <Seccion
        titulo="Cuenta de empresa"
        descripcion="Si compras para tu empresa, verifícala con su acta constitutiva y su RIF."
        accion={<span className={`${adminBadge(meta.tono)} shrink-0`}><meta.Icono className="h-3.5 w-3.5" aria-hidden="true" /> {meta.texto}</span>}
      >
        <p className={adminNotice('neutral')}>
          {estado === 'APPROVED'
            ? 'Tu empresa está verificada: al pagar puedes elegir que la factura vaya a su nombre, con su RIF y su domicilio fiscal.'
            : 'Con la empresa verificada, al pagar puedes elegir que la factura vaya a su nombre, con su RIF y su domicilio fiscal.'}
        </p>
        {estado === 'REJECTED' && p?.businessVerificationNotes && (
          <p className={`${adminNotice('danger')} mt-3`}><strong>Motivo del rechazo:</strong> {p.businessVerificationNotes}</p>
        )}
        {estado === 'PENDING' && <p className="mt-3 text-sm text-ink-soft">El equipo está revisando tus documentos. Te avisaremos en la campana y por correo.</p>}
      </Seccion>

      <Seccion titulo="Datos de la empresa">
        <form onSubmit={enviar} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="empresa-nombre" className={adminLabel}>Razón social</label>
              <input id="empresa-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={bloqueado} maxLength={150} className={adminInput()} placeholder="Ej: Tecnología Avanzada C.A." />
            </div>
            <div>
              <label htmlFor="empresa-rif" className={adminLabel}>RIF</label>
              <input id="empresa-rif" value={rif} onChange={(e) => setRif(e.target.value.toUpperCase())} disabled={bloqueado} maxLength={20} className={adminInput()} placeholder="J-12345678-9" />
              <p className={adminHint}>J o G para empresas; V o E si es una firma personal.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DocumentUpload label="Acta constitutiva" accept=".pdf,.jpg,.jpeg,.png" currentFileUrl={p?.businessConstitutiveAct || undefined} disabled={bloqueado} onFileSelect={setActa} />
            <DocumentUpload label="Documento del RIF" accept=".pdf,.jpg,.jpeg,.png" currentFileUrl={p?.businessRIFDocument || undefined} disabled={bloqueado} onFileSelect={setRifArchivo} />
          </div>
          <p className={adminHint}>Los documentos solo los ve el equipo de la tienda.</p>
          {error && <p className={adminError} role="alert">{error}</p>}
          {!bloqueado && (
            <button type="submit" disabled={enviando} className={`${adminPrimaryButton} w-full sm:w-auto`}>
              <FiSend className="h-4 w-4" aria-hidden="true" /> {enviando ? 'Enviando…' : estado === 'REJECTED' ? 'Enviar de nuevo' : 'Enviar para verificar'}
            </button>
          )}
        </form>
      </Seccion>

      {estado === 'APPROVED' && (
        <Seccion titulo="Domicilio fiscal" descripcion="Va en las facturas a nombre de la empresa. Escríbelo como aparece en su RIF.">
          <form onSubmit={guardarDomicilio} className="space-y-3" noValidate>
            <div>
              <label htmlFor="empresa-domicilio" className={adminLabel}>Domicilio fiscal</label>
              <textarea
                id="empresa-domicilio"
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
                maxLength={DOMICILIO_MAX}
                rows={2}
                aria-invalid={Boolean(errorDomicilio)}
                aria-describedby={errorDomicilio ? 'empresa-domicilio-error' : undefined}
                className={`${adminInput(Boolean(errorDomicilio))} h-auto py-2`}
                placeholder="Ej: Av. Principal, edificio, local, ciudad, estado"
              />
              {errorDomicilio && <p id="empresa-domicilio-error" className={adminError} role="alert">{errorDomicilio}</p>}
            </div>
            <button type="submit" disabled={guardandoDomicilio || domicilio.trim() === (p?.businessFiscalAddress || '')} className={`${adminPrimaryButton} w-full sm:w-auto`}>
              {guardandoDomicilio ? 'Guardando…' : 'Guardar domicilio fiscal'}
            </button>
          </form>
        </Seccion>
      )}
    </div>
  );
}
