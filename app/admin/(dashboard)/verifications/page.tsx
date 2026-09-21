'use client';

import { adminTableWrap, adminTable, adminRowHover, adminModalOverlay } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';


import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiCheckCircle, FiXCircle, FiClock, FiFileText, FiDownload, FiEye, FiUsers } from 'react-icons/fi';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

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

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/verifications?status=${filter}`);
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
            toast.error('No se pudieron cargar las solicitudes de verificación');
        } finally {
            setLoading(false);
        }
    };

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
                toast.error('Error al procesar la solicitud');
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
                return <span className="px-2 py-1 bg-success/10 text-success-strong rounded-full text-xs font-bold flex items-center gap-1"><FiCheckCircle /> Aprobado</span>;
            case 'REJECTED':
                return <span className="px-2 py-1 bg-deal/10 text-deal rounded-full text-xs font-bold flex items-center gap-1"><FiXCircle /> Rechazado</span>;
            default:
                return <span className="px-2 py-1 bg-warning/10 text-warning-strong rounded-full text-xs font-bold flex items-center gap-1"><FiClock /> Pendiente</span>;
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/customers"
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-line rounded-lg hover:bg-surface transition-colors text-sm text-muted hover:text-brand-600"
                    >
                        <FiUsers className="w-4 h-4" />
                        <span>Clientes</span>
                    </Link>
                    <h1 className="text-2xl font-bold text-ink">Verificación de Empresas</h1>
                </div>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                                ? 'bg-brand-500 text-white'
                                : 'bg-white text-muted hover:bg-surface border border-line'
                                }`}
                        >
                            {status === 'ALL' ? 'Todos' : status === 'PENDING' ? 'Pendientes' : status === 'APPROVED' ? 'Aprobados' : 'Rechazados'}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
                <div className={adminTableWrap}>
                    <table className={`${adminTable} min-w-[720px]`}>
                        <thead className="bg-surface border-b border-line">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-muted uppercase">Empresa</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted uppercase">RIF / NIT</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted uppercase">Solicitante</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted uppercase">Estado</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted uppercase">Fecha</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted">
                                        Cargando solicitudes...
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted">
                                        No hay solicitudes en esta categoría
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id} className={adminRowHover}>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-ink">{req.companyName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-muted font-mono text-sm">{req.taxId}</td>
                                        <td className="px-6 py-4">
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
                                        <td className="px-6 py-4">
                                            {getStatusBadge(req.businessVerificationStatus)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted">
                                            {new Date(req.updatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setSelectedRequest(req)}
                                                className="text-brand-600 hover:text-brand-700 font-medium text-sm flex items-center gap-1"
                                            >
                                                <FiEye /> Ver detalles
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
                <div className={adminModalOverlay} onClick={() => setSelectedRequest(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-line flex justify-between items-center bg-surface">
                            <h3 className="text-xl font-bold text-ink">Detalles de Verificación</h3>
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="text-subtle hover:text-muted"
                            >
                                <FiXCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
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
                                            <FiFileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-ink truncate">Acta Constitutiva</p>
                                            <p className="text-xs text-muted">Clic para ver</p>
                                        </div>
                                        <FiDownload className="text-subtle group-hover:text-brand-600" />
                                    </a>

                                    <a
                                        href={selectedRequest.businessRIFDocument}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-4 rounded-xl border border-line hover:border-brand-200 hover:bg-brand-50 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center group-hover:bg-brand-100">
                                            <FiFileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-ink truncate">Documento RIF</p>
                                            <p className="text-xs text-muted">Clic para ver</p>
                                        </div>
                                        <FiDownload className="text-subtle group-hover:text-brand-600" />
                                    </a>
                                </div>
                            </div>

                            {selectedRequest.businessVerificationStatus === 'PENDING' && (
                                <div className="bg-warning/10 p-4 rounded-xl border border-warning/20">
                                    <label className="block text-sm font-medium text-warning-strong mb-2">
                                        Notas de revisión (Requerido para rechazar)
                                    </label>
                                    <textarea
                                        value={actionNote}
                                        onChange={(e) => setActionNote(e.target.value)}
                                        placeholder="Escribe aquí las razones del rechazo o notas de aprobación..."
                                        className="w-full p-3 rounded-lg border border-warning/20 focus:outline-none focus:ring-2 focus:ring-warning text-sm"
                                        rows={3}
                                    />
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
                            <div className="p-6 border-t border-line bg-surface flex gap-3 justify-end">
                                <button
                                    onClick={() => handleAction('REJECTED')}
                                    disabled={processing}
                                    className="px-6 py-2.5 rounded-lg border border-deal/30 text-deal font-medium bg-deal/10 transition-colors disabled:opacity-50"
                                >
                                    Rechazar
                                </button>
                                <button
                                    onClick={() => handleAction('APPROVED')}
                                    disabled={processing}
                                    className="px-6 py-2.5 rounded-lg bg-success text-white font-medium bg-success transition-colors shadow-sm disabled:opacity-50"
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
