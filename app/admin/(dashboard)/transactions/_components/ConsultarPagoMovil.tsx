'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { FiAlertCircle, FiCheckCircle, FiLoader, FiSearch, FiX } from 'react-icons/fi';
import { BANCOS_VENEZUELA } from '@/lib/pago-movil/bancos-venezuela';
import { hoyCaracas } from '@/lib/pago-movil/monto';
import { formatVES } from '@/lib/currency';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useMontado } from '@/lib/hooks/useMontado';
import {
  adminHint, adminIconButton, adminInput, adminLabel, adminModalBody, adminModalFooter, adminModalHeader, adminModalOverlay,
  adminModalPanel, adminModalTitle, adminNotice, adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';

// C-129: "Consultar Pago Móvil". Para cuando un cliente dice "pagué y no me aparece": se le pregunta al BDV con los
// datos del comprobante, sin registrar nada, y se ve si esa referencia ya se usó en la tienda (quién, en qué orden).
// Reemplaza pedir capturas: el banco es la prueba.

interface Uso {
  cliente: { name: string | null; email: string | null } | null;
  contexto: string;
  orden: string | null;
  recarga: string | null;
  archivado: string | null;
  montoBs: number;
  fecha: string;
}

interface Resultado {
  encontrado: boolean;
  codigo: number;
  mensajeBanco: string;
  explicacion: string;
  montoBanco: number | null;
  consultado: { referencia: string; banco: string; monto: string; fecha: string };
  usos: Uso[];
}

const fecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Caracas' });

export default function ConsultarPagoMovil() {
  const mounted = useMontado();
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState({ referencia: '', bancoOrigen: '', telefonoPagador: '', cedulaPagador: '', fechaPago: '', importe: '' });
  const [consultando, setConsultando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  useBodyScrollLock(abierto);

  const cambiar = (campo: keyof typeof datos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDatos((d) => ({ ...d, [campo]: e.target.value }));
    setResultado(null);
  };

  const abrir = () => {
    setDatos((d) => ({ ...d, fechaPago: d.fechaPago || hoyCaracas() }));
    setAbierto(true);
  };

  const consultar = async (e: React.FormEvent) => {
    e.preventDefault();
    setConsultando(true);
    setResultado(null);
    try {
      const response = await fetch('/api/admin/pago-movil/consultar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || 'No se pudo consultar');
        return;
      }
      setResultado(data);
    } catch {
      toast.error('Sin conexión');
    } finally {
      setConsultando(false);
    }
  };

  return (
    <>
      <button type="button" onClick={abrir} className={adminSecondaryButton}>
        <FiSearch className="h-4 w-4" aria-hidden="true" /> Consultar Pago Móvil
      </button>

      {mounted && abierto && createPortal(
        <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setAbierto(false); }}>
          <form onSubmit={consultar} className={`${adminModalPanel} sm:max-w-lg`} role="dialog" aria-modal="true" aria-labelledby="consultar-pm">
            <div className={adminModalHeader}>
              <div>
                <h2 id="consultar-pm" className={adminModalTitle}>Consultar Pago Móvil</h2>
                <p className="text-sm text-muted">Le pregunta al Banco de Venezuela. No registra ni acredita nada.</p>
              </div>
              <button type="button" onClick={() => setAbierto(false)} className={`${adminIconButton} h-11 w-11`} aria-label="Cerrar">
                <FiX className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className={`${adminModalBody} space-y-3`}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="cpm-ref" className={adminLabel}>Referencia</label>
                  <input id="cpm-ref" value={datos.referencia} onChange={cambiar('referencia')} inputMode="numeric" maxLength={8} placeholder="123456" className={adminInput()} required />
                </div>
                <div>
                  <label htmlFor="cpm-banco" className={adminLabel}>Banco desde el que pagó</label>
                  <select id="cpm-banco" value={datos.bancoOrigen} onChange={cambiar('bancoOrigen')} className={adminInput()} required>
                    <option value="">Elige…</option>
                    {BANCOS_VENEZUELA.map((b) => <option key={b.codigo} value={b.codigo}>{b.nombre} ({b.codigo})</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="cpm-monto" className={adminLabel}>Monto exacto (Bs.)</label>
                  <input id="cpm-monto" value={datos.importe} onChange={cambiar('importe')} inputMode="decimal" placeholder="1115,25" className={adminInput()} required />
                </div>
                <div>
                  <label htmlFor="cpm-fecha" className={adminLabel}>Fecha del pago</label>
                  <input id="cpm-fecha" type="date" value={datos.fechaPago} max={hoyCaracas()} onChange={cambiar('fechaPago')} className={adminInput()} required />
                </div>
                <div>
                  <label htmlFor="cpm-tel" className={adminLabel}>Teléfono que pagó</label>
                  <input id="cpm-tel" value={datos.telefonoPagador} onChange={cambiar('telefonoPagador')} inputMode="tel" placeholder="04121234567" className={adminInput()} required />
                </div>
                <div>
                  <label htmlFor="cpm-ced" className={adminLabel}>Cédula (opcional)</label>
                  <input id="cpm-ced" value={datos.cedulaPagador} onChange={cambiar('cedulaPagador')} placeholder="V12345678" className={adminInput()} />
                </div>
              </div>
              <p className={adminHint}>Copia los datos del comprobante del cliente. El banco busca por monto exacto: un céntimo distinto da &quot;no encontrado&quot;.</p>

              {resultado && (
                <div className="space-y-3" aria-live="polite">
                  <div className={adminNotice(resultado.encontrado ? 'success' : 'warning')}>
                    <p className="flex items-center gap-2 font-semibold">
                      {resultado.encontrado ? <FiCheckCircle className="h-4 w-4" aria-hidden="true" /> : <FiAlertCircle className="h-4 w-4" aria-hidden="true" />}
                      {resultado.encontrado ? `El banco confirma ${formatVES(resultado.montoBanco ?? 0)}` : 'El banco no encuentra ese pago'}
                    </p>
                    <p className="mt-1">{resultado.explicacion}</p>
                    <p className="mt-1 text-xs opacity-80">Respuesta del banco ({resultado.codigo}): {resultado.mensajeBanco}</p>
                  </div>

                  {resultado.usos.length > 0 ? (
                    <div className={adminNotice('danger')}>
                      <p className="font-semibold">Esta referencia ya se usó en la tienda</p>
                      <ul className="mt-1 space-y-1">
                        {resultado.usos.map((u, i) => (
                          <li key={i}>
                            {u.cliente?.name || u.cliente?.email || 'Cliente'} · {formatVES(u.montoBs)} ·{' '}
                            {u.orden ? `orden ${u.orden}` : u.recarga ? 'recarga de Puntos ES' : u.archivado ? `archivado: ${u.archivado}` : 'sin orden todavía'}
                            <span className="block text-xs opacity-80">{fecha.format(new Date(u.fecha))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : resultado.encontrado ? (
                    <p className="text-sm text-ink-soft">Esta referencia no se ha usado en la tienda: el pago está libre.</p>
                  ) : null}
                </div>
              )}
            </div>

            <div className={adminModalFooter}>
              <button type="button" onClick={() => setAbierto(false)} className={adminSecondaryButton}>Cerrar</button>
              <button type="submit" disabled={consultando} className={adminPrimaryButton}>
                {consultando ? <FiLoader className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FiSearch className="h-4 w-4" aria-hidden="true" />}
                {consultando ? 'Consultando…' : 'Consultar al banco'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </>
  );
}
