'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import Filtros from '@/components/admin/Filtros';
import ModalDialog from '@/components/ui/ModalDialog';
import {
  IconoCerrar, IconoConfirmado, IconoDescargar, IconoDocumento, IconoLista, IconoRechazado, IconoReloj, IconoVer,
} from '@/components/iconos';
import {
  adminBadge, adminHint, adminIconButton, adminInput, adminLabel, adminModalBody, adminModalFooter,
  adminModalHeader, adminModalTitle, adminRowZebra, adminSecondaryButton, adminSuccessButton, adminTable,
  adminTableWrap, adminTd, adminTh,
} from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { mensajeError } from '@/lib/admin/respuesta';

interface VerificationRequest {
  id: string;
  companyName: string;
  taxId: string;
  businessVerificationStatus: string;
  businessConstitutiveAct: string;
  businessRIFDocument: string;
  businessVerificationNotes: string;
  updatedAt: string;
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
}

export default function VerificacionesPanel({ onActualizado }: { onActualizado?: () => void }) {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [processing, setProcessing] = useState(false);

  async function fetchRequests() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/verifications?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(Array.isArray(data) ? data : []);
      } else {
        toast.error(await mensajeError(response, 'No se pudieron cargar las solicitudes de verificación'));
      }
    } catch {
      toast.error('No se pudieron cargar las solicitudes de verificación');
    } finally {
      setLoading(false);
    }
  }

  useCargarAlMontar(fetchRequests, [filter]);

  const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest) return;

    if (status === 'REJECTED' && !actionNote.trim()) {
      toast.error('Por favor indica el motivo del rechazo');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/verifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedRequest.id,
          status,
          notes: actionNote,
        }),
      });

      if (response.ok) {
        toast.success(`Solicitud ${status === 'APPROVED' ? 'aprobada' : 'rechazada'} exitosamente`);
        setSelectedRequest(null);
        setActionNote('');
        await fetchRequests();
        window.dispatchEvent(new Event('refresh-sidebar-counts'));
        onActualizado?.();
      } else {
        toast.error(await mensajeError(response, 'No se pudo procesar la solicitud'));
      }
    } catch {
      toast.error('Error al procesar la solicitud');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className={adminBadge('success')}><IconoConfirmado className="h-3.5 w-3.5" aria-hidden="true" /> Aprobado</span>;
      case 'REJECTED':
        return <span className={adminBadge('danger')}><IconoRechazado className="h-3.5 w-3.5" aria-hidden="true" /> Rechazado</span>;
      default:
        return <span className={adminBadge('warning')}><IconoReloj className="h-3.5 w-3.5" aria-hidden="true" /> Pendiente</span>;
    }
  };

  return (
    <div className="space-y-4">
      <Filtros
        etiqueta="Filtrar verificaciones"
        valor={filter}
        onCambiar={setFilter}
        filtros={[
          { valor: 'PENDING', etiqueta: 'Pendientes', ayuda: 'Esperan tu revisión', Icono: IconoReloj, tono: 'aviso' },
          { valor: 'APPROVED', etiqueta: 'Aprobados', ayuda: 'Ya verificadas', Icono: IconoConfirmado },
          { valor: 'REJECTED', etiqueta: 'Rechazados', ayuda: 'Con su motivo', Icono: IconoRechazado },
          { valor: 'ALL', etiqueta: 'Todos', ayuda: 'Todas las solicitudes', Icono: IconoLista },
        ]}
      />

      <div className={adminTableWrap}>
        <table className={`${adminTable} min-w-[720px]`}>
          <thead>
            <tr>
              <th scope="col" className={adminTh}>Empresa</th>
              <th scope="col" className={adminTh}>RIF / NIT</th>
              <th scope="col" className={adminTh}>Solicitante</th>
              <th scope="col" className={adminTh}>Estado</th>
              <th scope="col" className={adminTh}>Fecha</th>
              <th scope="col" className={`${adminTh} text-right`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={`${adminTd} py-8 text-center text-muted`}>
                  Cargando solicitudes…
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={6} className={`${adminTd} py-8 text-center text-muted`}>
                  No hay solicitudes en esta categoría
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className={adminRowZebra}>
                  <td className={adminTd}>
                    <div className="font-medium text-ink">{req.companyName}</div>
                  </td>
                  <td className={`${adminTd} font-mono tabular-nums text-muted`}>{req.taxId}</td>
                  <td className={adminTd}>
                    <div className="flex items-center gap-3">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-line">
                        {req.user?.image ? (
                          <Image src={req.user.image} alt={req.user?.name || 'Usuario'} fill sizes="32px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                            {(req.user?.name || req.user?.email || 'U').charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-ink">{req.user?.name || 'Usuario'}</div>
                        <div className="truncate text-xs text-muted">{req.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className={adminTd}>{getStatusBadge(req.businessVerificationStatus)}</td>
                  <td className={`${adminTd} whitespace-nowrap tabular-nums text-muted`}>
                    {new Date(req.updatedAt).toLocaleDateString('es-VE')}
                  </td>
                  <td className={`${adminTd} text-right`}>
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(req)}
                      className={adminSecondaryButton}
                    >
                      <IconoVer className="h-4 w-4" aria-hidden="true" /> Ver detalles
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ModalDialog
        open={Boolean(selectedRequest)}
        onClose={() => { setSelectedRequest(null); setActionNote(''); }}
        ariaLabelledBy="verificacion-titulo"
        size="2xl"
      >
        {selectedRequest && (
          <>
            <div className={adminModalHeader}>
              <h3 id="verificacion-titulo" className={adminModalTitle}>Detalles de Verificación</h3>
              <button
                type="button"
                onClick={() => { setSelectedRequest(null); setActionNote(''); }}
                className={adminIconButton}
                aria-label="Cerrar"
              >
                <IconoCerrar className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className={`${adminModalBody} flex-1 space-y-6`}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="mb-1 block text-xs font-bold uppercase text-muted">Empresa</span>
                  <p className="text-lg font-medium text-ink">{selectedRequest.companyName}</p>
                </div>
                <div>
                  <span className="mb-1 block text-xs font-bold uppercase text-muted">RIF / NIT</span>
                  <p className="font-mono text-lg font-medium tabular-nums text-ink">{selectedRequest.taxId}</p>
                </div>
              </div>

              <div>
                <span className="mb-3 block text-xs font-bold uppercase text-muted">Documentos Adjuntos</span>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <a
                    href={selectedRequest.businessConstitutiveAct}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-line p-4 transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <IconoDocumento className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">Acta Constitutiva</p>
                      <p className="text-xs text-muted">Clic para ver</p>
                    </div>
                    <IconoDescargar className="h-4 w-4 text-subtle group-hover:text-brand-600" aria-hidden="true" />
                  </a>

                  <a
                    href={selectedRequest.businessRIFDocument}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-line p-4 transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <IconoDocumento className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">Documento RIF</p>
                      <p className="text-xs text-muted">Clic para ver</p>
                    </div>
                    <IconoDescargar className="h-4 w-4 text-subtle group-hover:text-brand-600" aria-hidden="true" />
                  </a>
                </div>
              </div>

              {selectedRequest.businessVerificationStatus === 'PENDING' && (
                <div>
                  <label htmlFor="verificacion-notas" className={adminLabel}>Notas de revisión</label>
                  <textarea
                    id="verificacion-notas"
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Escribe aquí las razones del rechazo o notas de aprobación…"
                    className={`${adminInput()} h-auto py-2.5`}
                    rows={3}
                  />
                  <p className={adminHint}>Para rechazar, escribe el motivo: el cliente lo recibe.</p>
                </div>
              )}

              {selectedRequest.businessVerificationNotes && selectedRequest.businessVerificationStatus !== 'PENDING' && (
                <div className="rounded-xl border border-line bg-surface p-4">
                  <span className="mb-1 block text-xs font-bold uppercase text-muted">Notas de la revisión</span>
                  <p className="text-sm text-ink-soft">{selectedRequest.businessVerificationNotes}</p>
                </div>
              )}
            </div>

            {selectedRequest.businessVerificationStatus === 'PENDING' && (
              <div className={adminModalFooter}>
                <button
                  type="button"
                  onClick={() => handleAction('REJECTED')}
                  disabled={processing}
                  className={`${adminSecondaryButton} text-deal!`}
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('APPROVED')}
                  disabled={processing}
                  className={adminSuccessButton}
                >
                  {processing ? 'Procesando…' : 'Aprobar Verificación'}
                </button>
              </div>
            )}
          </>
        )}
      </ModalDialog>
    </div>
  );
}
