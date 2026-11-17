'use client';

import {
    adminBadge, adminHint, adminIconButton, adminInput, adminLabel, adminModalBody, adminModalFooter, adminModalHeader, adminModalOverlay,
    adminModalPanel, adminModalTitle, adminPageHeader, adminPageTitle, adminRowHover, adminSecondaryButton, adminSuccessButton, adminTable,
    adminTableWrap, adminTd, adminTh,
} from '@/lib/admin-ui';
import Filtros from '@/components/admin/Filtros';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';


import { useState } from 'react';
import Link from 'next/link';
import { IconoCerrar, IconoConfirmado, IconoDescargar, IconoDocumento, IconoFlechaIzquierda, IconoLista, IconoRechazado, IconoReloj, IconoVer } from '@/components/iconos';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
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

export default function VerificationsPage() {
    const [requests, setRequests] = useState<VerificationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING'); // ALL, PENDING, APPROVED, REJECTED
    const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
    useBodyScrollLock(Boolean(selectedRequest));
    const [actionNote, setActionNote] = useState('');
    const [processing, setProcessing] = useState(false);

    useCargarAlMontar(fetchRequests, [filter]);

    async function fetchRequests() {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/verifications?status=${filter}`);
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            } else {
                // C-281 (A-08): antes un error dejaba la lista vacía sin decir nada
                toast.error(await mensajeError(response, 'No se pudieron cargar las solicitudes de verificación'));
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
            toast.error('No se pudieron cargar las solicitudes de verificación');
        } finally {
            setLoading(false);
        }
    }

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
                    notes: actionNote
                }),
            });

            if (response.ok) {
                toast.success(`Solicitud ${status === 'APPROVED' ? 'aprobada' : 'rechazada'} exitosamente`);
                setSelectedRequest(null);
                setActionNote('');
                fetchRequests();
            } else {
                toast.error(await mensajeError(response, 'No se pudo procesar la solicitud'));
            }
        } catch (error) {
            console.error('Error processing request:', error);
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
            <div>
                <Link href="/admin/customers" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    <IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /> Clientes
                </Link>
                <div className={adminPageHeader}>
                    <h1 className={adminPageTitle}>Verificación de Empresas</h1>
                </div>
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
            </div>

            {/* List */}
            <div>
                <div className={adminTableWrap}>
                    <table className={`${adminTable} min-w-[720px]`}>
                        <thead>
                            <tr>
                                <th className={adminTh}>Empresa</th>
                                <th className={adminTh}>RIF / NIT</th>
                                <th className={adminTh}>Solicitante</th>
                                <th className={adminTh}>Estado</th>
                                <th className={adminTh}>Fecha</th>
                                <th className={adminTh}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className={`${adminTd} py-8 text-center text-muted`}>
                                        Cargando solicitudes...
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
                                    <tr key={req.id} className={adminRowHover}>
                                        <td className={adminTd}>
                                            <div className="font-medium text-ink">{req.companyName}</div>
                                        </td>
                                        <td className={`${adminTd} font-mono text-muted`}>{req.taxId}</td>
                                        <td className={adminTd}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-line overflow-hidden relative">
                                                    {req.user?.image ? (
                                                        <Image src={req.user.image} alt={req.user?.name || 'Usuario'} fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                                                            {(req.user?.name || req.user?.email || 'U').charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-ink">{req.user?.name || 'Usuario'}</div>
                                                    <div className="text-xs text-muted">{req.user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={adminTd}>
                                            {getStatusBadge(req.businessVerificationStatus)}
                                        </td>
                                        <td className={`${adminTd} text-muted`}>
                                            {new Date(req.updatedAt).toLocaleDateString('es-VE')}
                                        </td>
                                        <td className={adminTd}>
                                            <button
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
            </div>

            {/* Detail Modal */}
            {selectedRequest && (
                <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setSelectedRequest(null); }}>
                    <div className={`${adminModalPanel} sm:max-w-2xl`} role="dialog" aria-modal="true" aria-labelledby="verificacion-titulo">
                        <div className={adminModalHeader}>
                            <h3 id="verificacion-titulo" className={adminModalTitle}>Detalles de Verificación</h3>
                            <button type="button" onClick={() => setSelectedRequest(null)} className={adminIconButton} aria-label="Cerrar">
                                <IconoCerrar className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>

                        <div className={`${adminModalBody} flex-1 space-y-6`}>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-muted uppercase mb-1 block">Empresa</label>
                                    <p className="text-lg font-medium text-ink">{selectedRequest.companyName}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-muted uppercase mb-1 block">RIF / NIT</label>
                                    <p className="text-lg font-medium text-ink">{selectedRequest.taxId}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted uppercase mb-3 block">Documentos Adjuntos</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <a
                                        href={selectedRequest.businessConstitutiveAct}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-4 rounded-xl border border-line hover:border-brand-200 hover:bg-brand-50 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center group-hover:bg-brand-100">
                                            <IconoDocumento className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-ink truncate">Acta Constitutiva</p>
                                            <p className="text-xs text-muted">Clic para ver</p>
                                        </div>
                                        <IconoDescargar className="text-subtle group-hover:text-brand-600" />
                                    </a>

                                    <a
                                        href={selectedRequest.businessRIFDocument}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-4 rounded-xl border border-line hover:border-brand-200 hover:bg-brand-50 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center group-hover:bg-brand-100">
                                            <IconoDocumento className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-ink truncate">Documento RIF</p>
                                            <p className="text-xs text-muted">Clic para ver</p>
                                        </div>
                                        <IconoDescargar className="text-subtle group-hover:text-brand-600" />
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
                                        placeholder="Escribe aquí las razones del rechazo o notas de aprobación..."
                                        className={`${adminInput()} h-auto py-2.5`}
                                        rows={3}
                                    />
                                    <p className={adminHint}>Para rechazar, escribe el motivo: el cliente lo recibe.</p>
                                </div>
                            )}

                            {selectedRequest.businessVerificationNotes && selectedRequest.businessVerificationStatus !== 'PENDING' && (
                                <div className="bg-surface p-4 rounded-xl border border-line">
                                    <label className="text-xs font-bold text-muted uppercase mb-1 block">Notas de la revisión</label>
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
                                    {processing ? 'Procesando...' : 'Aprobar Verificación'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
