'use client';

import {
  adminBadge, adminCard, adminCardFlush, adminIconButton, adminInput, adminLabel, adminModalBody, adminModalFooter,
  adminModalHeader, adminModalTitle, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton,
  adminSecondaryButton, adminSpinner, adminTab, adminTabList, adminTabScroll,
} from '@/lib/admin-ui';
import ModalDialog from '@/components/ui/ModalDialog';
import { formatUSD } from '@/lib/currency';

import { useConfirm } from '@/contexts/ConfirmDialogContext';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  IconoBillete, IconoCalendario, IconoCerrar, IconoChat, IconoCheck, IconoChevronIzquierda, IconoCorreo, IconoCuenta,
  IconoConfirmado, IconoEliminar, IconoLista, IconoPaquete, IconoRechazado, IconoReloj, IconoTelefono, IconoVer,
} from '@/components/iconos';
import Filtros from '@/components/admin/Filtros';
import { toast } from 'react-hot-toast';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { mensajeError } from '@/lib/admin/respuesta';
import BorradorRespuesta from '@/components/admin/consultas/BorradorRespuesta';
import { BotonUrgencia, EnLaTienda, EnProveedor, PildoraUrgencia, porUrgencia } from '@/components/admin/consultas/Urgencia';

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
    // C-215: lo que dijo Claude (null = sin revisar)
    iaUrgencia?: string | null;
    iaTipo?: string | null;
    iaMotivo?: string | null;
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
    // C-215: lo que dijo Claude, y el producto de la tienda que es lo pedido o se le parece
    iaUrgencia?: string | null;
    iaMotivo?: string | null;
    iaCoincide?: string | null;
    iaProducto?: { nombre: string; slug: string; precioUSD: number } | null;
    // C-218: lo tiene un proveedor en su lista (no está en la tienda)
    iaArticulo?: { nombre: string; codigo: string; proveedor: string; existencia: number | null } | null;
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
    // C-215: más recientes (como antes) o más urgentes primero, en las dos pestañas
    const [ordenUrgencia, setOrdenUrgencia] = useState(false);
    const despuesDeOrdenar = async () => {
        await Promise.all([fetchMessages(), fetchRequests()]);
        setOrdenUrgencia(true);
    };

    // Requests State
    const [requests, setRequests] = useState<ProductRequest[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(null);
    const [requestFilterStatus, setRequestFilterStatus] = useState('all');
    const [requestModal, setRequestModal] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');
    const [newStatus, setNewStatus] = useState('');

    // Fetch data on mount
    useCargarAlMontar(() => {
        void fetchMessages();
        void fetchRequests();
    });

    // ============== MESSAGES FUNCTIONS ==============

    async function fetchMessages() {
        try {
            setMessagesLoading(true);
            const response = await fetch('/api/contact');
            if (response.ok) {
                const data = await response.json();
                setMessages(data);
            } else {
                toast.error(await mensajeError(response, 'No se pudieron cargar los mensajes'));
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error('No se pudieron cargar los mensajes');
        } finally {
            setMessagesLoading(false);
        }
    }

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
            } else {
                toast.error(await mensajeError(response, 'No se pudo actualizar el estado del mensaje'));
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
            } else {
                toast.error(await mensajeError(response, 'No se pudo eliminar el mensaje'));
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error('No se pudo eliminar el mensaje');
        }
    };

    const mensajesDelFiltro = messages.filter(msg =>
        messageFilterStatus === 'ALL' ? true : msg.status === messageFilterStatus
    );
    const filteredMessages = ordenUrgencia ? porUrgencia(mensajesDelFiltro) : mensajesDelFiltro;
    const selectorOrden = (
        <select
            value={ordenUrgencia ? 'urgencia' : 'recientes'}
            onChange={(e) => setOrdenUrgencia(e.target.value === 'urgencia')}
            aria-label="Orden"
            className={`${adminInput()} sm:w-auto`}
        >
            <option value="recientes">Más recientes</option>
            <option value="urgencia">Más urgentes primero</option>
        </select>
    );

    // C-216: como el resto del panel: lo que hay que responder en sello azul noche, lo leído en gris y lo respondido en verde
    const getMessageStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return adminBadge('warning');
            case 'RESPONDED': return adminBadge('success');
            default: return adminBadge('neutral');
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

    async function fetchRequests() {
        try {
            setRequestsLoading(true);
            const url = requestFilterStatus === 'all'
                ? '/api/product-requests'
                : `/api/product-requests?status=${requestFilterStatus}`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            } else {
                toast.error(await mensajeError(response, 'No se pudieron cargar las solicitudes'));
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
            toast.error('No se pudieron cargar las solicitudes');
        } finally {
            setRequestsLoading(false);
        }
    }

    useCargarAlMontar(() => {
        if (activeTab === 'requests') void fetchRequests();
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
            } else {
                toast.error(await mensajeError(response, 'No se pudo actualizar la solicitud'));
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
            } else {
                toast.error(await mensajeError(response, 'No se pudo eliminar la solicitud'));
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

    // C-216: como el resto del panel (C-210): por hacer en azul noche, en curso en azul, hecha en verde y rechazada en rojo
    const getRequestStatusBadge = (status: string) => {
        const variants: Record<string, { tono: 'warning' | 'brand' | 'success' | 'danger'; label: string }> = {
            PENDING: { tono: 'warning', label: 'Pendiente' },
            IN_PROGRESS: { tono: 'brand', label: 'En progreso' },
            FULFILLED: { tono: 'success', label: 'Cumplida' },
            REJECTED: { tono: 'danger', label: 'Rechazada' },
        };

        const config = variants[status] || variants.PENDING;
        return <span className={adminBadge(config.tono)}>{config.label}</span>;
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
        <div className="min-w-0 space-y-5">
            <div className={adminPageHeader}>
                <div>
                    <h1 className={adminPageTitle}>Mensajes y Solicitudes</h1>
                    <p className={adminPageSubtitle}>Mensajes de contacto y solicitudes de productos de los clientes.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className={adminTabScroll}>
                <div className={adminTabList} role="tablist" aria-label="Buzones de atención">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'messages'}
                        onClick={() => setActiveTab('messages')}
                        className={adminTab(activeTab === 'messages')}
                    >
                        <IconoChat className="h-4 w-4" aria-hidden="true" />
                        Mensajes
                        {messageStats.pending > 0 && (
                            <span className={activeTab === 'messages'
                                ? 'inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold tabular-nums text-white'
                                : adminBadge('warning')}
                            >
                                {messageStats.pending}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'requests'}
                        onClick={() => setActiveTab('requests')}
                        className={adminTab(activeTab === 'requests')}
                    >
                        <IconoPaquete className="h-4 w-4" aria-hidden="true" />
                        Solicitudes de Productos
                        {requestStats.pending > 0 && (
                            <span className={activeTab === 'requests'
                                ? 'inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold tabular-nums text-white'
                                : adminBadge('warning')}
                            >
                                {requestStats.pending}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="min-w-0">
                {activeTab === 'messages' && (
                    <div className="space-y-4">
                        {/* Filter */}
                        <div className="flex flex-wrap gap-2">
                            <div className="w-full">
                                <Filtros
                                    etiqueta="Filtrar mensajes"
                                    valor={messageFilterStatus}
                                    onCambiar={setMessageFilterStatus}
                                    filtros={[
                                        { valor: 'ALL', etiqueta: 'Todos', ayuda: 'Los de la lista', Icono: IconoLista, cuenta: messages.length },
                                        { valor: 'PENDING', etiqueta: 'Pendientes', ayuda: 'Sin leer', Icono: IconoReloj, tono: 'aviso', cuenta: messageStats.pending },
                                        { valor: 'READ', etiqueta: 'Leídos', ayuda: 'Falta responder', Icono: IconoVer },
                                        { valor: 'RESPONDED', etiqueta: 'Respondidos', ayuda: 'Ya tienen respuesta', Icono: IconoConfirmado },
                                    ]}
                                />
                            </div>
                            {selectorOrden}
                            <BotonUrgencia alTerminar={despuesDeOrdenar} />
                        </div>

                        {/* Messages List */}
                        <div className={`${adminCardFlush} flex min-h-[28rem]`}>
                            {/* List Sidebar */}
                            <div className={`w-full border-r border-line md:w-1/3 overflow-y-auto ${selectedMessage ? 'hidden md:block' : 'block'}`}>
                                {messagesLoading ? (
                                    <div className="flex h-64 items-center justify-center">
                                        <span className={adminSpinner} aria-label="Cargando mensajes" />
                                    </div>
                                ) : filteredMessages.length === 0 ? (
                                    <div className="flex h-64 flex-col items-center justify-center p-8 text-center text-muted">
                                        <IconoChat className="mb-3 h-10 w-10 text-subtle" aria-hidden="true" />
                                        <p className="text-sm">No hay mensajes</p>
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
                                                className={`cursor-pointer p-4 transition-colors hover:bg-surface ${selectedMessage?.id === msg.id ? 'bg-brand-50' : ''} ${msg.status === 'PENDING' ? 'border-l-4 border-brand-500' : ''}`}
                                            >
                                                <div className="mb-1 flex items-start justify-between gap-2">
                                                    <h3 className={`text-sm font-semibold ${msg.status === 'PENDING' ? 'text-ink' : 'text-muted'}`}>
                                                        {msg.name}
                                                    </h3>
                                                    <span className="shrink-0 text-xs tabular-nums text-muted">
                                                        {format(new Date(msg.createdAt), 'dd MMM', { locale: es })}
                                                    </span>
                                                </div>
                                                <p className="mb-1 truncate text-sm font-medium text-ink">{msg.subject}</p>
                                                <p className="truncate text-xs text-muted">{msg.message}</p>
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                    <span className={getMessageStatusColor(msg.status)}>
                                                        {getMessageStatusLabel(msg.status)}
                                                    </span>
                                                    <PildoraUrgencia urgencia={msg.iaUrgencia} tipo={msg.iaTipo} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Message Detail */}
                            <div className={`w-full bg-surface/50 md:w-2/3 flex-col ${selectedMessage ? 'flex' : 'hidden md:flex'}`}>
                                {selectedMessage ? (
                                    <div className="flex h-full flex-col">
                                        {/* Detail Header */}
                                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-white p-4 md:p-6">
                                            <div>
                                                <div className="mb-2 flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedMessage(null)}
                                                        aria-label="Volver a la lista"
                                                        className="rounded-lg p-1.5 hover:bg-surface md:hidden"
                                                    >
                                                        <IconoChevronIzquierda className="h-5 w-5" aria-hidden="true" />
                                                    </button>
                                                    <h2 className="text-lg font-bold text-ink text-balance">{selectedMessage.subject}</h2>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                                                    <span className="flex items-center gap-1">
                                                        <IconoCuenta className="h-4 w-4" aria-hidden="true" />
                                                        {selectedMessage.name}
                                                    </span>
                                                    <span className="flex min-w-0 items-center gap-1 [overflow-wrap:anywhere]">
                                                        <IconoCorreo className="h-4 w-4 shrink-0" aria-hidden="true" />
                                                        {selectedMessage.email}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <IconoTelefono className="h-4 w-4" aria-hidden="true" />
                                                        {selectedMessage.phone}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-xs text-muted">
                                                    {format(new Date(selectedMessage.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                                                </div>
                                                {selectedMessage.iaMotivo && (
                                                    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
                                                        <PildoraUrgencia urgencia={selectedMessage.iaUrgencia} tipo={selectedMessage.iaTipo} />
                                                        <span>{selectedMessage.iaMotivo}</span>
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={selectedMessage.status}
                                                    onChange={(e) => handleMessageStatusChange(selectedMessage.id, e.target.value)}
                                                    aria-label="Cambiar estado del mensaje"
                                                    className={`${adminInput()} w-auto`}
                                                >
                                                    <option value="PENDING">Pendiente</option>
                                                    <option value="READ">Leído</option>
                                                    <option value="RESPONDED">Respondido</option>
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteMessage(selectedMessage.id)}
                                                    className={`${adminSecondaryButton} w-11 px-0! text-deal!`}
                                                    title="Eliminar mensaje"
                                                    aria-label="Eliminar mensaje"
                                                >
                                                    <IconoEliminar className="h-5 w-5" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Detail Content */}
                                        <div className="flex-1 overflow-y-auto p-4 md:p-6">
                                            <div className={`${adminCard} min-h-[12rem]`}>
                                                <p className="whitespace-pre-wrap leading-relaxed text-ink">
                                                    {selectedMessage.message}
                                                </p>
                                            </div>

                                            <div className="mt-5">
                                                <BorradorRespuesta
                                                    key={selectedMessage.id}
                                                    mensaje={selectedMessage}
                                                    onRespondido={() => {
                                                        setMessages((lista) => lista.map((m) => (m.id === selectedMessage.id ? { ...m, status: 'RESPONDED' } : m)));
                                                        setSelectedMessage({ ...selectedMessage, status: 'RESPONDED' });
                                                        window.dispatchEvent(new Event('refresh-sidebar-counts'));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-1 flex-col items-center justify-center p-8 text-muted">
                                        <IconoChat className="mb-3 h-12 w-12 text-subtle" aria-hidden="true" />
                                        <p className="text-base font-medium">Selecciona un mensaje para leer</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'requests' && (
                    <div className="space-y-4">
                        <div className={adminCard}>
                            <Filtros
                                etiqueta="Filtrar solicitudes"
                                valor={requestFilterStatus}
                                onCambiar={setRequestFilterStatus}
                                filtros={[
                                    { valor: 'all', etiqueta: 'Todas', ayuda: 'Las de la lista', Icono: IconoLista, cuenta: requestStats.total },
                                    { valor: 'PENDING', etiqueta: 'Pendientes', ayuda: 'Esperan respuesta', Icono: IconoReloj, tono: 'aviso', cuenta: requestStats.pending },
                                    { valor: 'IN_PROGRESS', etiqueta: 'En progreso', ayuda: 'Se están buscando', Icono: IconoPaquete, cuenta: requestStats.inProgress },
                                    { valor: 'FULFILLED', etiqueta: 'Cumplidas', ayuda: 'Ya se consiguieron', Icono: IconoConfirmado, cuenta: requests.filter(r => r.status === 'FULFILLED').length },
                                    { valor: 'REJECTED', etiqueta: 'Rechazadas', ayuda: 'No se pudieron conseguir', Icono: IconoRechazado },
                                ]}
                            />
                            <div className="mt-3 flex flex-wrap gap-2">
                                {selectorOrden}
                                <BotonUrgencia alTerminar={despuesDeOrdenar} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            {requestsLoading ? (
                                <div className={`${adminCard} flex justify-center p-12`}>
                                    <span className={adminSpinner} aria-label="Cargando solicitudes" />
                                </div>
                            ) : requests.length === 0 ? (
                                <div className={`${adminCard} p-12 text-center`}>
                                    <IconoPaquete className="mx-auto mb-3 h-12 w-12 text-subtle" aria-hidden="true" />
                                    <h3 className="mb-1 text-lg font-semibold text-ink">No hay solicitudes</h3>
                                    <p className="text-sm text-muted">No se encontraron solicitudes de productos</p>
                                </div>
                            ) : (
                                (ordenUrgencia ? porUrgencia(requests) : requests).map((request) => (
                                    <div key={request.id} className={adminCard}>
                                        <div className="flex gap-4">
                                            <div className="hidden shrink-0 sm:block">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                                    <IconoPaquete className="h-6 w-6" aria-hidden="true" />
                                                </div>
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="mb-2 flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                                            <h3 className="text-base font-semibold text-ink">{request.productName}</h3>
                                                            {getRequestStatusBadge(request.status)}
                                                        </div>
                                                        <p className="mb-2 text-sm text-muted">{request.description}</p>
                                                        {(request.iaUrgencia || request.iaProducto || request.iaArticulo) && (
                                                            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                                                <PildoraUrgencia urgencia={request.iaUrgencia} />
                                                                <EnLaTienda coincide={request.iaCoincide} producto={request.iaProducto} />
                                                                <EnProveedor articulo={request.iaArticulo} />
                                                                {request.iaMotivo && <span className="text-xs text-ink-soft">{request.iaMotivo}</span>}
                                                            </div>
                                                        )}
                                                        <div className="flex flex-wrap gap-3 text-xs text-muted">
                                                            <span className="flex items-center gap-1">
                                                                <IconoCuenta className="h-4 w-4" aria-hidden="true" />
                                                                {request.customerName}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <IconoCorreo className="h-4 w-4" aria-hidden="true" />
                                                                {request.customerEmail}
                                                            </span>
                                                            {request.customerPhone && (
                                                                <span className="flex items-center gap-1">
                                                                    <IconoTelefono className="h-4 w-4" aria-hidden="true" />
                                                                    {request.customerPhone}
                                                                </span>
                                                            )}
                                                            {request.estimatedBudget && (
                                                                <span className="flex items-center gap-1 tabular-nums">
                                                                    <IconoBillete className="h-4 w-4" aria-hidden="true" />
                                                                    Presupuesto: {formatUSD(request.estimatedBudget)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="mt-2 text-xs text-muted">
                                                            <IconoCalendario className="mr-1 inline h-3 w-3" aria-hidden="true" />
                                                            {new Date(request.createdAt).toLocaleString('es-VE')}
                                                        </p>
                                                    </div>

                                                    <div className="flex shrink-0 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openRequestModal(request)}
                                                            className={`${adminSecondaryButton} h-10! min-h-10! px-3!`}
                                                            title="Gestionar"
                                                        >
                                                            <IconoCheck className="h-4 w-4 text-brand-500" aria-hidden="true" /> Gestionar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteRequest(request.id)}
                                                            className={`${adminIconButton} h-10 w-10 text-deal hover:bg-deal-bg`}
                                                            title="Eliminar"
                                                            aria-label="Eliminar solicitud"
                                                        >
                                                            <IconoEliminar className="h-4 w-4" aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {request.adminNotes && (
                                                    <div className="mt-3 rounded-lg bg-surface p-3">
                                                        <p className="mb-1 text-xs font-semibold text-ink">Notas del Admin:</p>
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
                )}
            </div>

            <ModalDialog
                open={Boolean(requestModal && selectedRequest)}
                onClose={() => setRequestModal(false)}
                ariaLabelledBy="solicitud-producto-titulo"
                size="lg"
            >
                {selectedRequest && (
                    <>
                        <div className={adminModalHeader}>
                            <h3 id="solicitud-producto-titulo" className={adminModalTitle}>Gestionar Solicitud</h3>
                            <button
                                type="button"
                                onClick={() => setRequestModal(false)}
                                aria-label="Cerrar"
                                className={adminIconButton}
                            >
                                <IconoCerrar className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                        <div className={`${adminModalBody} space-y-4`}>
                            <div>
                                <label htmlFor="solicitud-estado" className={adminLabel}>Estado</label>
                                <select
                                    id="solicitud-estado"
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className={adminInput()}
                                >
                                    <option value="PENDING">Pendiente</option>
                                    <option value="IN_PROGRESS">En Progreso</option>
                                    <option value="FULFILLED">Cumplida</option>
                                    <option value="REJECTED">Rechazada</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="solicitud-notas" className={adminLabel}>Notas del Administrador</label>
                                <textarea
                                    id="solicitud-notas"
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    rows={4}
                                    placeholder="Agrega notas internas sobre esta solicitud..."
                                    className={`${adminInput()} h-auto resize-none py-2.5`}
                                />
                            </div>
                        </div>
                        <div className={adminModalFooter}>
                            <button type="button" onClick={() => setRequestModal(false)} className={adminSecondaryButton}>
                                Cancelar
                            </button>
                            <button type="button" onClick={handleUpdateRequestStatus} className={adminPrimaryButton}>
                                Guardar Cambios
                            </button>
                        </div>
                    </>
                )}
            </ModalDialog>
        </div>
    );
}
