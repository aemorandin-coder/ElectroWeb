'use client';

import { adminModalOverlay, adminModalPanel } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { formatUSD } from '@/lib/currency';

import { useConfirm } from '@/contexts/ConfirmDialogContext';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FiMessageSquare, FiPackage, FiMail, FiPhone, FiUser, FiCalendar, FiTrash2, FiCheck, FiDollarSign } from 'react-icons/fi';
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
    const { confirm } = useConfirm();
    useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    // Las alertas del sistema tienen su propia página desde C-73: los enlaces viejos ?tab=alerts van allá
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<Tab>(tabParam === 'requests' ? 'requests' : 'messages');
    useEffect(() => {
        if (tabParam === 'alerts') router.replace('/admin/notifications');
    }, [tabParam, router]);

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
    useBodyScrollLock(requestModal);
    const [adminNotes, setAdminNotes] = useState('');
    const [newStatus, setNewStatus] = useState('');

    // Fetch data on mount
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
                    msg.id === id ? { ...msg, status: newStatus as ContactMessage['status'] } : msg
                ));
                if (selectedMessage?.id === id) {
                    setSelectedMessage({ ...selectedMessage, status: newStatus as ContactMessage['status'] });
                }
                toast.success('Estado actualizado');
                window.dispatchEvent(new Event('refresh-sidebar-counts'));
            }
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('No se pudo actualizar el estado del mensaje');
        }
    };

    const handleDeleteMessage = async (id: string) => {
        const confirmed = await confirm({ title: 'Eliminar mensaje', message: '¿Estás seguro de eliminar este mensaje?', confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
        if (!confirmed) return;

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
                window.dispatchEvent(new Event('refresh-sidebar-counts'));
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error('No se pudo eliminar el mensaje');
        }
    };

    const filteredMessages = messages.filter(msg =>
        messageFilterStatus === 'ALL' ? true : msg.status === messageFilterStatus
    );

    const getMessageStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-warning/10 text-warning-strong';
            case 'READ': return 'bg-brand-100 text-brand-700';
            case 'RESPONDED': return 'bg-success/10 text-success-strong';
            default: return 'bg-surface text-ink';
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
            toast.error('No se pudieron cargar las solicitudes');
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
                window.dispatchEvent(new Event('refresh-sidebar-counts'));
            }
        } catch (error) {
            console.error('Error updating request:', error);
            toast.error('No se pudo actualizar la solicitud');
        }
    };

    const handleDeleteRequest = async (id: string) => {
        const confirmed = await confirm({ title: 'Eliminar solicitud', message: '¿Estás seguro de eliminar esta solicitud?', confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/product-requests?id=${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchRequests();
                toast.success('Solicitud eliminada');
                window.dispatchEvent(new Event('refresh-sidebar-counts'));
            }
        } catch (error) {
            console.error('Error deleting request:', error);
            toast.error('No se pudo eliminar la solicitud');
        }
    };

    const openRequestModal = (request: ProductRequest) => {
        setSelectedRequest(request);
        setAdminNotes(request.adminNotes || '');
        setNewStatus(request.status);
        setRequestModal(true);
    };

    const getRequestStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'warning' | 'info' | 'success' | 'danger'; label: string }> = {
            PENDING: { variant: 'warning', label: 'Pendiente' },
            IN_PROGRESS: { variant: 'info', label: 'En Progreso' },
            FULFILLED: { variant: 'success', label: 'Cumplida' },
            REJECTED: { variant: 'danger', label: 'Rechazada' },
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
                        <h1 className="text-2xl font-bold text-ink">Mensajes y Solicitudes</h1>
                        <p className="text-sm text-muted mt-1">Mensajes de contacto y solicitudes de productos de los clientes</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex max-w-full gap-2 overflow-x-auto rounded-xl bg-surface p-1 sm:w-fit">
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`shrink-0 whitespace-nowrap px-4 sm:px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'messages'
                                ? 'bg-white text-brand-500 shadow-sm'
                                : 'text-muted hover:text-ink'
                            }`}
                    >
                        <FiMessageSquare className="w-4 h-4" />
                        Mensajes
                        {messageStats.pending > 0 && (
                            <span className="w-5 h-5 bg-brand-500 text-white text-xs rounded-full flex items-center justify-center">
                                {messageStats.pending}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`shrink-0 whitespace-nowrap px-4 sm:px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'requests'
                                ? 'bg-white text-brand-500 shadow-sm'
                                : 'text-muted hover:text-ink'
                            }`}
                    >
                        <FiPackage className="w-4 h-4" />
                        Solicitudes de Productos
                        {requestStats.pending > 0 && (
                            <span className="w-5 h-5 bg-brand-500 text-white text-xs rounded-full flex items-center justify-center">
                                {requestStats.pending}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'messages' && (
                    // ============== MESSAGES TAB ==============
                    <div className="h-full flex flex-col">
                        {/* Filter */}
                        <div className="flex-shrink-0 mb-4">
                            <div className="flex gap-2">
                                <select
                                    value={messageFilterStatus}
                                    onChange={(e) => setMessageFilterStatus(e.target.value as 'ALL' | 'PENDING' | 'READ' | 'RESPONDED')}
                                    className="px-4 py-2 border border-line rounded-lg focus:outline-none focus:border-brand-500 text-sm bg-white"
                                >
                                    <option value="ALL">Todos ({messages.length})</option>
                                    <option value="PENDING">Pendientes ({messageStats.pending})</option>
                                    <option value="READ">Leídos</option>
                                    <option value="RESPONDED">Respondidos</option>
                                </select>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 bg-white rounded-xl border border-line shadow-sm overflow-hidden flex">
                            {/* List Sidebar */}
                            <div className={`w-full md:w-1/3 border-r border-line overflow-y-auto ${selectedMessage ? 'hidden md:block' : 'block'}`}>
                                {messagesLoading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : filteredMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted">
                                        <FiMessageSquare className="w-12 h-12 text-subtle mb-3" />
                                        <p>No hay mensajes</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-line">
                                        {filteredMessages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                onClick={() => {
                                                    setSelectedMessage(msg);
                                                    if (msg.status === 'PENDING') {
                                                        handleMessageStatusChange(msg.id, 'READ');
                                                    }
                                                }}
                                                className={`p-4 cursor-pointer hover:bg-surface transition-colors ${selectedMessage?.id === msg.id ? 'bg-brand-50' : ''
                                                    } ${msg.status === 'PENDING' ? 'border-l-4 border-brand-500' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className={`text-sm font-semibold ${msg.status === 'PENDING' ? 'text-ink' : 'text-muted'}`}>
                                                        {msg.name}
                                                    </h3>
                                                    <span className="text-xs text-muted">
                                                        {format(new Date(msg.createdAt), 'dd MMM', { locale: es })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-ink font-medium truncate mb-1">{msg.subject}</p>
                                                <p className="text-xs text-muted truncate">{msg.message}</p>
                                                <div className="mt-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getMessageStatusColor(msg.status)}`}>
                                                        {getMessageStatusLabel(msg.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Message Detail */}
                            <div className={`w-full md:w-2/3 bg-surface flex flex-col ${selectedMessage ? 'flex' : 'hidden md:flex'}`}>
                                {selectedMessage ? (
                                    <div className="h-full flex flex-col">
                                        {/* Detail Header */}
                                        <div className="bg-white p-6 border-b border-line flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <button
                                                        onClick={() => setSelectedMessage(null)}
                                                        className="md:hidden p-1 hover:bg-surface rounded-full"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                        </svg>
                                                    </button>
                                                    <h2 className="text-xl font-bold text-ink">{selectedMessage.subject}</h2>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted">
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
                                                <div className="mt-2 text-xs text-muted">
                                                    {format(new Date(selectedMessage.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <select
                                                    value={selectedMessage.status}
                                                    onChange={(e) => handleMessageStatusChange(selectedMessage.id, e.target.value)}
                                                    className="px-3 py-1.5 border border-line rounded-lg text-sm focus:outline-none focus:border-brand-500"
                                                >
                                                    <option value="PENDING">Pendiente</option>
                                                    <option value="READ">Leído</option>
                                                    <option value="RESPONDED">Respondido</option>
                                                </select>
                                                <button
                                                    onClick={() => handleDeleteMessage(selectedMessage.id)}
                                                    className="p-2 text-deal bg-deal/10 rounded-lg transition-colors"
                                                    title="Eliminar mensaje"
                                                >
                                                    <FiTrash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Detail Content */}
                                        <div className="flex-1 p-8 overflow-y-auto">
                                            <div className="bg-white p-8 rounded-xl shadow-sm border border-line min-h-[200px]">
                                                <p className="text-ink whitespace-pre-wrap leading-relaxed">
                                                    {selectedMessage.message}
                                                </p>
                                            </div>

                                            <div className="mt-8 flex justify-end">
                                                <a
                                                    href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                                                    className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-colors font-semibold shadow-lg shadow-brand-500/20"
                                                >
                                                    <FiMail className="w-5 h-5" />
                                                    Responder por Email
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted p-8">
                                        <FiMessageSquare className="w-16 h-16 text-subtle mb-4" />
                                        <p className="text-lg font-medium">Selecciona un mensaje para leer</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'requests' && (
                    // ============== REQUESTS TAB ==============
                    <div className="h-full flex flex-col">
                        {/* Stats and Filter */}
                        <div className="flex-shrink-0 space-y-4 mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="bg-white rounded-lg border border-line p-3 shadow-sm">
                                    <p className="text-xs text-muted font-medium mb-1">Total</p>
                                    <p className="text-2xl font-semibold text-ink">{requestStats.total}</p>
                                </div>
                                <div className="bg-white rounded-lg border border-line p-3 shadow-sm">
                                    <p className="text-xs text-muted font-medium mb-1">Pendientes</p>
                                    <p className="text-2xl font-semibold text-warning-strong">{requestStats.pending}</p>
                                </div>
                                <div className="bg-white rounded-lg border border-line p-3 shadow-sm">
                                    <p className="text-xs text-muted font-medium mb-1">En Progreso</p>
                                    <p className="text-2xl font-semibold text-brand-600">{requestStats.inProgress}</p>
                                </div>
                                <div className="bg-white rounded-lg border border-line p-3 shadow-sm">
                                    <p className="text-xs text-muted font-medium mb-1">Cumplidas</p>
                                    <p className="text-2xl font-semibold text-success-strong">
                                        {requests.filter(r => r.status === 'FULFILLED').length}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg border border-line p-3 shadow-sm">
                                <select
                                    value={requestFilterStatus}
                                    onChange={(e) => setRequestFilterStatus(e.target.value)}
                                    className="px-3 py-2 text-sm bg-surface border border-line rounded-lg focus:outline-none focus:border-brand-500"
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
                                    <div className="bg-white rounded-lg border border-line p-12 text-center">
                                        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                        <p className="text-sm text-muted mt-3">Cargando solicitudes...</p>
                                    </div>
                                ) : requests.length === 0 ? (
                                    <div className="bg-white rounded-lg border border-line p-12 text-center">
                                        <FiPackage className="w-16 h-16 text-subtle mx-auto mb-3" />
                                        <h3 className="text-lg font-semibold text-ink mb-1">No hay solicitudes</h3>
                                        <p className="text-sm text-muted">No se encontraron solicitudes de productos</p>
                                    </div>
                                ) : (
                                    requests.map((request) => (
                                        <div
                                            key={request.id}
                                            className="bg-white rounded-lg border border-line p-4 shadow-sm hover:shadow-md transition-all"
                                        >
                                            <div className="flex gap-4">
                                                <div className="flex-shrink-0">
                                                    <div className="w-12 h-12 rounded-lg bg-brand-100 flex items-center justify-center">
                                                        <FiPackage className="w-6 h-6 text-brand-600" />
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="text-base font-semibold text-ink">
                                                                    {request.productName}
                                                                </h3>
                                                                {getRequestStatusBadge(request.status)}
                                                            </div>
                                                            <p className="text-sm text-muted mb-2">
                                                                {request.description}
                                                            </p>
                                                            <div className="flex flex-wrap gap-3 text-xs text-muted">
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
                                                                        Presupuesto: {formatUSD(request.estimatedBudget)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-subtle mt-2">
                                                                <FiCalendar className="inline w-3 h-3 mr-1" />
                                                                {new Date(request.createdAt).toLocaleString('es-VE')}
                                                            </p>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => openRequestModal(request)}
                                                                className="p-2 hover:bg-surface rounded-lg transition-colors"
                                                                title="Gestionar"
                                                            >
                                                                <FiCheck className="w-4 h-4 text-brand-500" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRequest(request.id)}
                                                                className="p-2 bg-deal/10 rounded-lg transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <FiTrash2 className="w-4 h-4 text-deal" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {request.adminNotes && (
                                                        <div className="mt-3 p-3 bg-surface rounded-lg">
                                                            <p className="text-xs font-semibold text-ink mb-1">Notas del Admin:</p>
                                                            <p className="text-xs text-muted">{request.adminNotes}</p>
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
                <div className={adminModalOverlay} onClick={() => setRequestModal(false)}>
                    <div className={`${adminModalPanel} sm:max-w-lg`} onClick={(e) => e.stopPropagation()}>
                            <div className="bg-white px-6 pt-6 pb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-ink">
                                        Gestionar Solicitud
                                    </h3>
                                    <button
                                        onClick={() => setRequestModal(false)}
                                        className="p-2 hover:bg-surface rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-ink mb-2">
                                            Estado
                                        </label>
                                        <select
                                            value={newStatus}
                                            onChange={(e) => setNewStatus(e.target.value)}
                                            className="w-full px-4 py-3 bg-surface border border-line rounded-lg focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                                        >
                                            <option value="PENDING">Pendiente</option>
                                            <option value="IN_PROGRESS">En Progreso</option>
                                            <option value="FULFILLED">Cumplida</option>
                                            <option value="REJECTED">Rechazada</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-ink mb-2">
                                            Notas del Administrador
                                        </label>
                                        <textarea
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            rows={4}
                                            placeholder="Agrega notas internas sobre esta solicitud..."
                                            className="w-full px-4 py-3 bg-surface border border-line rounded-lg text-ink placeholder:text-subtle focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface px-6 py-4 flex items-center justify-end gap-3 border-t border-line">
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
            )}
        </div>
    );
}
