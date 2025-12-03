'use client';

import { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiClock, FiFileText, FiDownload, FiSearch, FiFilter, FiEye } from 'react-icons/fi';
import Image from 'next/image';

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
        name: string;
        email: string;
        image: string;
    };
}

export default function VerificationsPage() {
    const [requests, setRequests] = useState<VerificationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING'); // ALL, PENDING, APPROVED, REJECTED
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
            alert('Por favor indica el motivo del rechazo');
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
                alert(`Solicitud ${status === 'APPROVED' ? 'aprobada' : 'rechazada'} exitosamente`);
                setSelectedRequest(null);
                setActionNote('');
                fetchRequests();
            } else {
                alert('Error al procesar la solicitud');
            }
        } catch (error) {
            console.error('Error processing request:', error);
            alert('Error al procesar la solicitud');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1"><FiCheckCircle /> Aprobado</span>;
            case 'REJECTED':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1"><FiXCircle /> Rechazado</span>;
            default:
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold flex items-center gap-1"><FiClock /> Pendiente</span>;
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Verificación de Empresas</h1>
                <div className="flex gap-2">
                    {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                }`}
                        >
                            {status === 'ALL' ? 'Todos' : status === 'PENDING' ? 'Pendientes' : status === 'APPROVED' ? 'Aprobados' : 'Rechazados'}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">RIF / NIT</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Solicitante</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        Cargando solicitudes...
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        No hay solicitudes en esta categoría
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{req.companyName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-sm">{req.taxId}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden relative">
                                                    {req.user.image ? (
                                                        <Image src={req.user.image} alt={req.user.name} fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                                                            {req.user.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{req.user.name}</div>
                                                    <div className="text-xs text-gray-500">{req.user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(req.businessVerificationStatus)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(req.updatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setSelectedRequest(req)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">Detalles de Verificación</h3>
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FiXCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Empresa</label>
                                    <p className="text-lg font-medium text-gray-900">{selectedRequest.companyName}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">RIF / NIT</label>
                                    <p className="text-lg font-medium text-gray-900">{selectedRequest.taxId}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Documentos Adjuntos</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <a
                                        href={selectedRequest.businessConstitutiveAct}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-200">
                                            <FiFileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">Acta Constitutiva</p>
                                            <p className="text-xs text-gray-500">Clic para ver</p>
                                        </div>
                                        <FiDownload className="text-gray-400 group-hover:text-blue-500" />
                                    </a>

                                    <a
                                        href={selectedRequest.businessRIFDocument}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-200">
                                            <FiFileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">Documento RIF</p>
                                            <p className="text-xs text-gray-500">Clic para ver</p>
                                        </div>
                                        <FiDownload className="text-gray-400 group-hover:text-blue-500" />
                                    </a>
                                </div>
                            </div>

                            {selectedRequest.businessVerificationStatus === 'PENDING' && (
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                    <label className="block text-sm font-medium text-yellow-800 mb-2">
                                        Notas de revisión (Requerido para rechazar)
                                    </label>
                                    <textarea
                                        value={actionNote}
                                        onChange={(e) => setActionNote(e.target.value)}
                                        placeholder="Escribe aquí las razones del rechazo o notas de aprobación..."
                                        className="w-full p-3 rounded-lg border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                                        rows={3}
                                    />
                                </div>
                            )}

                            {selectedRequest.businessVerificationNotes && selectedRequest.businessVerificationStatus !== 'PENDING' && (
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Notas de la revisión</label>
                                    <p className="text-sm text-gray-700">{selectedRequest.businessVerificationNotes}</p>
                                </div>
                            )}
                        </div>

                        {selectedRequest.businessVerificationStatus === 'PENDING' && (
                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
                                <button
                                    onClick={() => handleAction('REJECTED')}
                                    disabled={processing}
                                    className="px-6 py-2.5 rounded-lg border border-red-200 text-red-700 font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    Rechazar
                                </button>
                                <button
                                    onClick={() => handleAction('APPROVED')}
                                    disabled={processing}
                                    className="px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
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
