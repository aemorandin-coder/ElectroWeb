'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiAlertCircle, FiCheckCircle, FiClock, FiSend } from 'react-icons/fi';
import DocumentUpload from '@/components/customer/DocumentUpload';
import { adminBadge, adminError, adminHint, adminInput, adminLabel, adminNotice, adminPrimaryButton, type AdminTone } from '@/lib/admin-ui';
import { Seccion } from './comun';
import type { DatosPerfil } from './tipos';

// Empresa (C-138): solo la verificación, que sí existe (la revisa el equipo en Verificaciones).
// Antes prometía facturas fiscales automáticas, descuentos por volumen, crédito y gestor de cuenta, con una ventana
// emergente a los 2,5 s. La factura a nombre de la empresa es C-120.

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
          Por ahora la verificación guarda los datos de tu empresa en tu cuenta. Los recibos a nombre de la empresa (con su RIF) se habilitarán más adelante: te avisaremos.
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
    </div>
  );
}
