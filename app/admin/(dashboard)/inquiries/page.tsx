'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FiMessageSquare, FiPackage, FiMail, FiPhone, FiUser, FiCalendar, FiTrash2, FiCheck, FiClock, FiCheckCircle, FiXCircle, FiDollarSign } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'react-hot-toast';

// ============== TYPES ==============

interface ContactMessage {
    id: string;
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    status: 'PENDING' | 'READ' | 'RESPONDED';
    createdAt: string;
}

interface ProductRequest {
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    productName: string;
    description: string;
    category?: string;
    estimatedBudget?: number;
    status: string;
    adminNotes?: string;
    createdAt: string;
}

type Tab = 'messages' | 'requests';

// ============== MAIN COMPONENT ==============

export default function InquiriesPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<Tab>('messages');

    // Messages State
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const [messageFilterStatus, setMessageFilterStatus] = useState<'ALL' | 'PENDING' | 'READ' | 'RESPONDED'>('ALL');

    // Requests State
    const [requests, setRequests] = useState<ProductRequest[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(null);
    const [requestFilterStatus, setRequestFilterStatus] = useState('all');
    const [requestModal, setRequestModal] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');
    const [newStatus, setNewStatus] = useState('');

    // Fetch data on mount and tab change
    useEffect(() => {
        fetchMessages();
        fetchRequests();
    }, []);

    // ============== MESSAGES FUNCTIONS ==============

    const fetchMessages = async () => {
        try {
            setMessagesLoading(true);
            const response = await fetch('/api/contact');
            if (response.ok) {
                const data = await response.json();
                setMessages(data);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setMessagesLoading(false);
        }
    };

    const handleMessageStatusChange = async (id: string, newStatus: string) => {
        try {
            const response = await fetch('/api/contact', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus }),
            });

            if (response.ok) {
                setMessages(messages.map(msg =>
                    msg.id === id ? { ...msg, status: newStatus as any } : msg
                ));
                if (selectedMessage?.id === id) {
                    setSelectedMessage({ ...selectedMessage, status: newStatus as any });
                }
                toast.success('Estado actualizado');
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDeleteMessage = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este mensaje?')) return;

        try {
            const response = await fetch(`/api/contact?id=${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setMessages(messages.filter(msg => msg.id !== id));
                if (selectedMessage?.id === id) {
                    setSelectedMessage(null);
                }
                toast.success('Mensaje eliminado');
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const filteredMessages = messages.filter(msg =>
        messageFilterStatus === 'ALL' ? true : msg.status === messageFilterStatus
    );

    const getMessageStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'READ': return 'bg-blue-100 text-blue-800';
            case 'RESPONDED': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getMessageStatusLabel = (status: string) => {
        switch (status) {
            case 'PENDING': return 'Pendiente';
            case 'READ': return 'Leído';
            case 'RESPONDED': return 'Respondido';
            default: return status;
        }
    };

    // ============== REQUESTS FUNCTIONS ==============

    const fetchRequests = async () => {
        try {
            setRequestsLoading(true);
            const url = requestFilterStatus === 'all'
                ? '/api/product-requests'
                : `/api/product-requests?status=${requestFilterStatus}`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setRequestsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'requests') {
            fetchRequests();
        }
    }, [requestFilterStatus]);

    const handleUpdateRequestStatus = async () => {
        if (!selectedRequest) return;

        try {
            const response = await fetch(`/api/product-requests?id=${selectedRequest.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    adminNotes,
                }),
            });

            if (response.ok) {
                fetchRequests();
                setRequestModal(false);
                setSelectedRequest(null);
                setAdminNotes('');
                setNewStatus('');
                toast.success('Solicitud actualizada');
            }
        } catch (error) {
            console.error('Error updating request:', error);
        }
    };

    const handleDeleteRequest = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta solicitud?')) return;

        try {
            const response = await fetch(`/api/product-requests?id=${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchRequests();
                toast.success('Solicitud eliminada');
            }
        } catch (error) {
            console.error('Error deleting request:', error);
        }
    };

    const openRequestModal = (request: ProductRequest) => {
        setSelectedRequest(request);
        setAdminNotes(request.adminNotes || '');
        setNewStatus(request.status);
        setRequestModal(true);
    };

    const getRequestStatusBadge = (status: string) => {
        const variants: any = {
            PENDING: { variant: 'warning', label: 'Pendiente' },
            IN_PROGRESS: { variant: 'info', label: 'En Progreso' },
            FULFILLED: { variant: 'success', label: 'Cumplida' },
            REJECTED: { variant: 'error', label: 'Rechazada' },
        };

        const config = variants[status] || variants.PENDING;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    // ============== STATS ==============

    const messageStats = {
        total: messages.length,
        pending: messages.filter(m => m.status === 'PENDING').length,
    };

    const requestStats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'PENDING').length,
        inProgress: requests.filter(r => r.status === 'IN_PROGRESS').length,
    };

    // ============== RENDER ==============

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Centro de Consultas</h1>
                        <p className="text-sm text-gray-500 mt-1">Gestiona los mensajes y solicitudes de productos de tus clientes</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'messages'
                                ? 'bg-white text-[#2a63cd] shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <FiMessageSquare className="w-4 h-4" />
                        Mensajes
                        {messageStats.pending > 0 && (
                            <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                {messageStats.pending}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'requests'
                                ? 'bg-white text-[#2a63cd] shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <FiPackage className="w-4 h-4" />
                        Solicitudes de Productos
                        {requestStats.pending > 0 && (
                            <span className="w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                                {requestStats.pending}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'messages' ? (
                    // ============== MESSAGES TAB ==============
                    <div className="h-full flex flex-col">
                        {/* Filter */}
                        <div className="flex-shrink-0 mb-4">
                            <div className="flex gap-2">
                                <select
                                    value={messageFilterStatus}
                                    onChange={(e) => setMessageFilterStatus(e.target.value as any)}
                                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#2a63cd] text-sm bg-white"
                                >
                                    <option value="ALL">Todos ({messages.length})</option>
                                    <option value="PENDING">Pendientes ({messageStats.pending})</option>
                                    <option value="READ">Leídos</option>
                                    <option value="RESPONDED">Respondidos</option>
                                </select>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex">
                            {/* List Sidebar */}
                            <div className={`w-full md:w-1/3 border-r border-gray-200 overflow-y-auto ${selectedMessage ? 'hidden md:block' : 'block'}`}>
                                {messagesLoading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="w-8 h-8 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : filteredMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                                        <FiMessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                                        <p>No hay mensajes</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {filteredMessages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                onClick={() => {
                                                    setSelectedMessage(msg);
                                                    if (msg.status === 'PENDING') {
                                                        handleMessageStatusChange(msg.id, 'READ');
                                                    }
                                                }}
                                                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedMessage?.id === msg.id ? 'bg-blue-50' : ''
                                                    } ${msg.status === 'PENDING' ? 'border-l-4 border-[#2a63cd]' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className={`text-sm font-semibold ${msg.status === 'PENDING' ? 'text-gray-900' : 'text-gray-600'}`}>
                                                        {msg.name}
                                                    </h3>
                                                    <span className="text-xs text-gray-500">
                                                        {format(new Date(msg.createdAt), 'dd MMM', { locale: es })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-900 font-medium truncate mb-1">{msg.subject}</p>
                                                <p className="text-xs text-gray-500 truncate">{msg.message}</p>
                                                <div className="mt-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getMessageStatusColor(msg.status)}`}>
                                                        {getMessageStatusLabel(msg.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Message Detail */}
                            <div className={`w-full md:w-2/3 bg-gray-50 flex flex-col ${selectedMessage ? 'flex' : 'hidden md:flex'}`}>
                                {selectedMessage ? (
                                    <div className="h-full flex flex-col">
                                        {/* Detail Header */}
                                        <div className="bg-white p-6 border-b border-gray-200 flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <button
                                                        onClick={() => setSelectedMessage(null)}
                                                        className="md:hidden p-1 hover:bg-gray-100 rounded-full"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                        </svg>
                                                    </button>
                                                    <h2 className="text-xl font-bold text-gray-900">{selectedMessage.subject}</h2>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <FiUser className="w-4 h-4" />
                                                        {selectedMessage.name}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <FiMail className="w-4 h-4" />
                                                        {selectedMessage.email}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <FiPhone className="w-4 h-4" />
                                                        {selectedMessage.phone}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-xs text-gray-500">
                                                    {format(new Date(selectedMessage.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <select
                                                    value={selectedMessage.status}
                                                    onChange={(e) => handleMessageStatusChange(selectedMessage.id, e.target.value)}
                                                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2a63cd]"
                                                >
                                                    <option value="PENDING">Pendiente</option>
                                                    <option value="READ">Leído</option>
                                                    <option value="RESPONDED">Respondido</option>
                                                </select>
                                                <button
                                                    onClick={() => handleDeleteMessage(selectedMessage.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar mensaje"
                                                >
                                                    <FiTrash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Detail Content */}
                                        <div className="flex-1 p-8 overflow-y-auto">
                                            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 min-h-[200px]">
                                                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                                                    {selectedMessage.message}
                                                </p>
                                            </div>

                                            <div className="mt-8 flex justify-end">
                                                <a
                                                    href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                                                    className="flex items-center gap-2 px-6 py-3 bg-[#2a63cd] hover:bg-[#1e4ba3] text-white rounded-xl transition-colors font-semibold shadow-lg shadow-[#2a63cd]/20"
                                                >
                                                    <FiMail className="w-5 h-5" />
                                                    Responder por Email
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                                        <FiMessageSquare className="w-16 h-16 text-gray-300 mb-4" />
                                        <p className="text-lg font-medium">Selecciona un mensaje para leer</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    // ============== REQUESTS TAB ==============
                    <div className="h-full flex flex-col">
                        {/* Stats and Filter */}
                        <div className="flex-shrink-0 space-y-4 mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                                    <p className="text-xs text-gray-500 font-medium mb-1">Total</p>
                                    <p className="text-2xl font-semibold text-gray-900">{requestStats.total}</p>
                                </div>
                                <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                                    <p className="text-xs text-gray-500 font-medium mb-1">Pendientes</p>
                                    <p className="text-2xl font-semibold text-orange-600">{requestStats.pending}</p>
                                </div>
                                <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                                    <p className="text-xs text-gray-500 font-medium mb-1">En Progreso</p>
                                    <p className="text-2xl font-semibold text-blue-600">{requestStats.inProgress}</p>
                                </div>
                                <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                                    <p className="text-xs text-gray-500 font-medium mb-1">Cumplidas</p>
                                    <p className="text-2xl font-semibold text-green-600">
                                        {requests.filter(r => r.status === 'FULFILLED').length}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                                <select
                                    value={requestFilterStatus}
                                    onChange={(e) => setRequestFilterStatus(e.target.value)}
                                    className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#2a63cd]"
                                >
                                    <option value="all">Todas</option>
                                    <option value="PENDING">Pendientes</option>
                                    <option value="IN_PROGRESS">En Progreso</option>
                                    <option value="FULFILLED">Cumplidas</option>
                                    <option value="REJECTED">Rechazadas</option>
                                </select>
                            </div>
                        </div>

                        {/* Requests List */}
                        <div className="flex-1 overflow-y-auto pr-2">
                            <div className="space-y-3">
                                {requestsLoading ? (
                                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                                        <div className="w-8 h-8 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin mx-auto" />
                                        <p className="text-sm text-gray-500 mt-3">Cargando solicitudes...</p>
                                    </div>
                                ) : requests.length === 0 ? (
                                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                                        <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">No hay solicitudes</h3>
                                        <p className="text-sm text-gray-500">No se encontraron solicitudes de productos</p>
                                    </div>
                                ) : (
                                    requests.map((request) => (
                                        <div
                                            key={request.id}
                                            className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all"
                                        >
                                            <div className="flex gap-4">
                                                <div className="flex-shrink-0">
                                                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                                                        <FiPackage className="w-6 h-6 text-purple-600" />
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="text-base font-semibold text-gray-900">
                                                                    {request.productName}
                                                                </h3>
                                                                {getRequestStatusBadge(request.status)}
                                                            </div>
                                                            <p className="text-sm text-gray-600 mb-2">
                                                                {request.description}
                                                            </p>
                                                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                                                <span className="flex items-center gap-1">
                                                                    <FiUser className="w-4 h-4" />
                                                                    {request.customerName}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <FiMail className="w-4 h-4" />
                                                                    {request.customerEmail}
                                                                </span>
                                                                {request.customerPhone && (
                                                                    <span className="flex items-center gap-1">
                                                                        <FiPhone className="w-4 h-4" />
                                                                        {request.customerPhone}
                                                                    </span>
                                                                )}
                                                                {request.estimatedBudget && (
                                                                    <span className="flex items-center gap-1">
                                                                        <FiDollarSign className="w-4 h-4" />
                                                                        Presupuesto: ${request.estimatedBudget.toFixed(2)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-400 mt-2">
                                                                <FiCalendar className="inline w-3 h-3 mr-1" />
                                                                {new Date(request.createdAt).toLocaleString('es-VE')}
                                                            </p>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => openRequestModal(request)}
                                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                                title="Gestionar"
                                                            >
                                                                <FiCheck className="w-4 h-4 text-[#2a63cd]" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRequest(request.id)}
                                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <FiTrash2 className="w-4 h-4 text-red-500" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {request.adminNotes && (
                                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                            <p className="text-xs font-semibold text-gray-900 mb-1">Notas del Admin:</p>
                                                            <p className="text-xs text-gray-600">{request.adminNotes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Request Modal */}
            {requestModal && selectedRequest && (
                <div className="fixed inset-0 z-50 overflow-y-auto animate-fadeIn">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                            onClick={() => setRequestModal(false)}
                        />

                        <div className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full animate-scaleIn">
                            <div className="bg-white px-6 pt-6 pb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        Gestionar Solicitud
                                    </h3>
                                    <button
                                        onClick={() => setRequestModal(false)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                                            Estado
                                        </label>
                                        <select
                                            value={newStatus}
                                            onChange={(e) => setNewStatus(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-2 focus:ring-[#2a63cd]/10"
                                        >
                                            <option value="PENDING">Pendiente</option>
                                            <option value="IN_PROGRESS">En Progreso</option>
                                            <option value="FULFILLED">Cumplida</option>
                                            <option value="REJECTED">Rechazada</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                                            Notas del Administrador
                                        </label>
                                        <textarea
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            rows={4}
                                            placeholder="Agrega notas internas sobre esta solicitud..."
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-2 focus:ring-[#2a63cd]/10 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
                                <Button
                                    variant="ghost"
                                    onClick={() => setRequestModal(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button variant="primary" onClick={handleUpdateRequestStatus}>
                                    Guardar Cambios
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
