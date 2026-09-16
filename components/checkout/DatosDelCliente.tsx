'use client';

import { useState } from 'react';
import { FiAlertCircle, FiUserCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { ControlDocumento, ControlTelefono, AYUDA_DOCUMENTO } from '@/components/forms/ControlesDatos';
import { adminCard, adminError, adminHint, adminLabel, adminNotice, adminPrimaryButton } from '@/lib/admin-ui';
import { leerDocumento, leerTelefono } from '@/lib/validations/registro';

/**
 * Teléfono y cédula en la primera compra (C-85, decisión de Andrés del 16/09).
 * El registro ya no pide la cédula y las cuentas de Google no traen ninguno de los dos.
 * Solo aparece si falta alguno; guarda en el perfil con PUT /api/user/profile, que valida y bloquea la cédula.
 * El servidor de órdenes también los exige: esto es la ayuda, no el candado.
 */
export default function DatosDelCliente({
  telefono,
  cedula,
  onGuardado,
}: {
  telefono: string;
  cedula: string;
  onGuardado: (datos: { telefono: string; cedula: string }) => void;
}) {
  const faltaTelefono = !telefono;
  const faltaCedula = !cedula;

  const [codigo, setCodigo] = useState('+58');
  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState('V');
  const [documento, setDocumento] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');

  if (!faltaTelefono && !faltaCedula) return null;

  const lecturaTelefono = faltaTelefono ? leerTelefono(`${codigo} ${numero}`) : null;
  const lecturaCedula = faltaCedula ? leerDocumento(`${tipo}-${documento}`) : null;
  const errorTelefono = intentado && lecturaTelefono && !lecturaTelefono.ok ? lecturaTelefono.error : '';
  const errorCedula = intentado && lecturaCedula && !lecturaCedula.ok ? lecturaCedula.error : '';

  const guardar = async () => {
    setIntentado(true);
    setErrorServidor('');
    if ((lecturaTelefono && !lecturaTelefono.ok) || (lecturaCedula && !lecturaCedula.ok)) {
      document.getElementById(lecturaTelefono && !lecturaTelefono.ok ? 'datos-telefono' : 'datos-cedula')?.focus();
      return;
    }

    const perfil: { phone?: string; idNumber?: string } = {};
    if (lecturaTelefono?.ok) perfil.phone = lecturaTelefono.valor;
    if (lecturaCedula?.ok) perfil.idNumber = lecturaCedula.valor;

    setGuardando(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: perfil }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorServidor(data.error || 'No pudimos guardar tus datos. Intenta de nuevo.');
        return;
      }
      toast.success('Datos guardados');
      onGuardado({ telefono: perfil.phone ?? telefono, cedula: perfil.idNumber ?? cedula });
    } catch {
      setErrorServidor('Sin conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section id="datos-del-cliente" aria-labelledby="datos-del-cliente-titulo" className={`${adminCard} scroll-mt-24 border-warning/40 p-5 lg:p-6`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning-strong">
          <FiUserCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="datos-del-cliente-titulo" className="text-lg font-bold text-ink">
            Completa tus datos para comprar
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {faltaTelefono && faltaCedula
              ? 'Tu teléfono para coordinar la entrega y tu cédula para la factura. Solo te lo pedimos una vez.'
              : faltaTelefono
                ? 'Tu teléfono con WhatsApp para coordinar la entrega. Solo te lo pedimos una vez.'
                : 'Tu cédula para la factura. Solo te la pedimos una vez.'}
          </p>
        </div>
      </div>

      {/* Enter guarda estos datos en vez de enviar el pedido */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onKeyDownCapture={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault();
            guardar();
          }
        }}
      >
        {faltaTelefono && (
          <div>
            <label htmlFor="datos-telefono" className={adminLabel}>
              Teléfono con WhatsApp
            </label>
            <ControlTelefono
              id="datos-telefono"
              codigo={codigo}
              numero={numero}
              onCodigo={setCodigo}
              onNumero={setNumero}
              error={Boolean(errorTelefono)}
              disabled={guardando}
              aria={{ 'aria-invalid': Boolean(errorTelefono), 'aria-describedby': errorTelefono ? 'datos-telefono-error' : undefined }}
            />
            {errorTelefono && (
              <p id="datos-telefono-error" className={adminError}>
                {errorTelefono}
              </p>
            )}
          </div>
        )}
        {faltaCedula && (
          <div>
            <label htmlFor="datos-cedula" className={adminLabel}>
              Cédula
            </label>
            <ControlDocumento
              id="datos-cedula"
              tipo={tipo}
              numero={documento}
              onTipo={setTipo}
              onNumero={setDocumento}
              error={Boolean(errorCedula)}
              disabled={guardando}
              aria={{ 'aria-invalid': Boolean(errorCedula), 'aria-describedby': errorCedula ? 'datos-cedula-error' : 'datos-cedula-ayuda' }}
            />
            {errorCedula ? (
              <p id="datos-cedula-error" className={adminError}>
                {errorCedula}
              </p>
            ) : (
              <p id="datos-cedula-ayuda" className={adminHint}>
                {AYUDA_DOCUMENTO}
              </p>
            )}
          </div>
        )}
      </div>

      {errorServidor && (
        <div role="alert" className={`${adminNotice('danger')} mt-4 flex items-start gap-2`}>
          <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{errorServidor}</p>
        </div>
      )}

      <button type="button" onClick={guardar} disabled={guardando} className={`${adminPrimaryButton} mt-4 w-full sm:w-auto`}>
        {guardando ? 'Guardando' : 'Guardar mis datos'}
      </button>
    </section>
  );
}
