'use client';

import { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiClock, FiFileText, FiEye, FiX, FiShield } from 'react-icons/fi';

interface VerificationRequest {
    id: string;
    companyName: string;
    taxId: string;
    businessVerificationStatus: string;
    businessConstitutiveAct: string;
    businessRIFDocument: string;
    businessVerificationNotes: string;
    updatedAt: string;
    user: { name: string; email: string; image: string };
}

interface VerificationsTabProps {
    className?: string;
}

export default function VerificationsTab({ className = '' }: VerificationsTabProps) {
    const [requests, setRequests] = useState<VerificationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING');
    const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
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
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
        if (!selectedRequest) return;
        if (status === 'REJECTED' && !actionNote.trim()) {
            alert('Indica el motivo del rechazo');
            return;
        }
        setProcessing(true);
        try {
            const response = await fetch('/api/admin/verifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId: selectedRequest.id, status, notes: actionNote }),
            });
            if (response.ok) {
                alert(`Solicitud ${status === 'APPROVED' ? 'aprobada' : 'rechazada'}`);
                setSelectedRequest(null);
                setActionNote('');
                fetchRequests();
            }
        } catch (error) {
            alert('Error al procesar');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className={className}>
            <div className="bg-white rounded-xl border border-[#e9ecef] shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-bold text-[#212529]">Solicitudes de Verificación Empresarial</h3>
                    <div className="flex gap-1">
                        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-3 py-1 text-xs rounded-lg transition-colors ${filter === status
                                        ? 'bg-[#2a63cd] text-white'
                                        : 'bg-[#f8f9fa] text-[#6a6c6b] hover:bg-[#e9ecef]'
                                    }`}
                            >
                                {status === 'ALL' ? 'Todos' : status === 'PENDING' ? 'Pendientes' : status === 'APPROVED' ? 'Aprobados' : 'Rechazados'}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <svg className="animate-spin h-5 w-5 text-[#2a63cd] mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-xs text-[#6a6c6b]">Cargando...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="p-8 text-center">
                        <FiShield className="w-8 h-8 text-[#dee2e6] mx-auto mb-2" />
                        <p className="text-sm text-[#6a6c6b]">No hay solicitudes en esta categoría</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#f8f9fa]">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Empresa</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">RIF/NIT</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Solicitante</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Estado</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Fecha</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-[#6a6c6b]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e9ecef]">
                                {requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-[#f8f9fa] transition-colors">
                                        <td className="px-4 py-3 font-medium text-[#212529]">{req.companyName}</td>
                                        <td className="px-4 py-3 text-[#6a6c6b] font-mono text-xs">{req.taxId}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center text-white text-[10px] font-bold">
                                                    {req.user.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-[#212529]">{req.user.name}</p>
                                                    <p className="text-[10px] text-[#6a6c6b]">{req.user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {req.businessVerificationStatus === 'APPROVED' ? (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                                                    <FiCheckCircle className="w-3 h-3" /> Aprobado
                                                </span>
                                            ) : req.businessVerificationStatus === 'REJECTED' ? (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                                                    <FiXCircle className="w-3 h-3" /> Rechazado
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                                                    <FiClock className="w-3 h-3" /> Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-[#6a6c6b] text-xs">{new Date(req.updatedAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setSelectedRequest(req)}
                                                className="text-[#2a63cd] hover:text-[#1e4ba3] text-xs font-medium flex items-center gap-1 ml-auto"
                                            >
                                                <FiEye className="w-3 h-3" /> Ver
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-4 border-b border-[#e9ecef] bg-[#f8f9fa] flex justify-between items-center">
                            <h3 className="font-bold text-[#212529]">Detalles de Verificación</h3>
                            <button onClick={() => setSelectedRequest(null)} className="text-[#6a6c6b] hover:text-[#212529]">
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-[#6a6c6b]">Empresa</label>
                                    <p className="font-medium text-[#212529]">{selectedRequest.companyName}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-[#6a6c6b]">RIF/NIT</label>
                                    <p className="font-medium text-[#212529]">{selectedRequest.taxId}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#6a6c6b] mb-2 block">Documentos</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {selectedRequest.businessConstitutiveAct && (
                                        <a href={selectedRequest.businessConstitutiveAct} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-2 rounded-lg border border-[#e9ecef] hover:bg-[#f8f9fa] transition-colors">
                                            <FiFileText className="w-4 h-4 text-[#2a63cd]" />
                                            <span className="text-xs">Acta Constitutiva</span>
                                        </a>
                                    )}
                                    {selectedRequest.businessRIFDocument && (
                                        <a href={selectedRequest.businessRIFDocument} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-2 rounded-lg border border-[#e9ecef] hover:bg-[#f8f9fa] transition-colors">
                                            <FiFileText className="w-4 h-4 text-[#2a63cd]" />
                                            <span className="text-xs">Documento RIF</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                            {selectedRequest.businessVerificationStatus === 'PENDING' && (
                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                    <label className="text-xs font-semibold text-yellow-800 mb-1 block">Notas (requerido para rechazar)</label>
                                    <textarea
                                        value={actionNote}
                                        onChange={(e) => setActionNote(e.target.value)}
                                        placeholder="Escribe aquí..."
                                        className="w-full p-2 rounded border border-yellow-200 text-sm"
                                        rows={2}
                                    />
                                </div>
                            )}
                            {selectedRequest.businessVerificationNotes && selectedRequest.businessVerificationStatus !== 'PENDING' && (
                                <div className="bg-[#f8f9fa] p-3 rounded-lg">
                                    <label className="text-xs font-semibold text-[#6a6c6b]">Notas de revisión</label>
                                    <p className="text-sm text-[#212529]">{selectedRequest.businessVerificationNotes}</p>
                                </div>
                            )}
                        </div>
                        {selectedRequest.businessVerificationStatus === 'PENDING' && (
                            <div className="p-4 border-t border-[#e9ecef] bg-[#f8f9fa] flex gap-2 justify-end">
                                <button
                                    onClick={() => handleAction('REJECTED')}
                                    disabled={processing}
                                    className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                                >
                                    Rechazar
                                </button>
                                <button
                                    onClick={() => handleAction('APPROVED')}
                                    disabled={processing}
                                    className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                                >
                                    {processing ? 'Procesando...' : 'Aprobar'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
