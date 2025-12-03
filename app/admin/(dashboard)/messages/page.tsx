'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

export default function MessagesPage() {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'READ' | 'RESPONDED'>('ALL');
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const response = await fetch('/api/contact');
            if (response.ok) {
                const data = await response.json();
                setMessages(data);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
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
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este mensaje?')) return;

        try {
            const response = await fetch(`/api/contact?id=${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setMessages(messages.filter(msg => msg.id !== id));
                if (selectedMessage?.id === id) {
                    setIsDetailOpen(false);
                    setSelectedMessage(null);
                }
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const filteredMessages = messages.filter(msg =>
        filterStatus === 'ALL' ? true : msg.status === filterStatus
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'READ': return 'bg-blue-100 text-blue-800';
            case 'RESPONDED': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PENDING': return 'Pendiente';
            case 'READ': return 'Leído';
            case 'RESPONDED': return 'Respondido';
            default: return status;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2a63cd]"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#212529]">Mensajes de Contacto</h1>
                    <p className="text-sm text-[#6a6c6b]">Gestiona las consultas de los clientes</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="px-4 py-2 border border-[#dee2e6] rounded-lg focus:outline-none focus:border-[#2a63cd] text-sm"
                    >
                        <option value="ALL">Todos</option>
                        <option value="PENDING">Pendientes</option>
                        <option value="READ">Leídos</option>
                        <option value="RESPONDED">Respondidos</option>
                    </select>
                </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 bg-white rounded-xl border border-[#e9ecef] shadow-sm overflow-hidden flex">
                {/* List Sidebar */}
                <div className={`w-full md:w-1/3 border-r border-[#e9ecef] overflow-y-auto ${isDetailOpen ? 'hidden md:block' : 'block'}`}>
                    {filteredMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#6a6c6b]">
                            <div className="w-12 h-12 bg-[#f8f9fa] rounded-full flex items-center justify-center mb-3">
                                <svg className="w-6 h-6 text-[#adb5bd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                            </div>
                            <p>No hay mensajes</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#e9ecef]">
                            {filteredMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    onClick={() => {
                                        setSelectedMessage(msg);
                                        setIsDetailOpen(true);
                                        if (msg.status === 'PENDING') {
                                            handleStatusChange(msg.id, 'READ');
                                        }
                                    }}
                                    className={`p-4 cursor-pointer hover:bg-[#f8f9fa] transition-colors ${selectedMessage?.id === msg.id ? 'bg-blue-50' : ''
                                        } ${msg.status === 'PENDING' ? 'border-l-4 border-[#2a63cd]' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`text-sm font-semibold ${msg.status === 'PENDING' ? 'text-[#212529]' : 'text-[#6a6c6b]'}`}>
                                            {msg.name}
                                        </h3>
                                        <span className="text-xs text-[#6a6c6b]">
                                            {format(new Date(msg.createdAt), 'dd MMM', { locale: es })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[#212529] font-medium truncate mb-1">
                                        {msg.subject}
                                    </p>
                                    <p className="text-xs text-[#6a6c6b] truncate">
                                        {msg.message}
                                    </p>
                                    <div className="mt-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusColor(msg.status)}`}>
                                            {getStatusLabel(msg.status)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Message Detail */}
                <div className={`w-full md:w-2/3 bg-[#f8f9fa] flex flex-col ${isDetailOpen ? 'flex' : 'hidden md:flex'}`}>
                    {selectedMessage ? (
                        <div className="h-full flex flex-col">
                            {/* Detail Header */}
                            <div className="bg-white p-6 border-b border-[#e9ecef] flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <button
                                            onClick={() => setIsDetailOpen(false)}
                                            className="md:hidden p-1 hover:bg-gray-100 rounded-full"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <h2 className="text-xl font-bold text-[#212529]">{selectedMessage.subject}</h2>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-[#6a6c6b]">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            {selectedMessage.name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            {selectedMessage.email}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            {selectedMessage.phone}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-xs text-[#6a6c6b]">
                                        {format(new Date(selectedMessage.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <select
                                        value={selectedMessage.status}
                                        onChange={(e) => handleStatusChange(selectedMessage.id, e.target.value)}
                                        className="px-3 py-1.5 border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:border-[#2a63cd]"
                                    >
                                        <option value="PENDING">Pendiente</option>
                                        <option value="READ">Leído</option>
                                        <option value="RESPONDED">Respondido</option>
                                    </select>
                                    <button
                                        onClick={() => handleDelete(selectedMessage.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar mensaje"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Detail Content */}
                            <div className="flex-1 p-8 overflow-y-auto">
                                <div className="bg-white p-8 rounded-xl shadow-sm border border-[#e9ecef] min-h-[200px]">
                                    <p className="text-[#212529] whitespace-pre-wrap leading-relaxed">
                                        {selectedMessage.message}
                                    </p>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <a
                                        href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                                        className="flex items-center gap-2 px-6 py-3 bg-[#2a63cd] hover:bg-[#1e4ba3] text-white rounded-xl transition-colors font-semibold shadow-lg shadow-[#2a63cd]/20"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Responder por Email
                                    </a>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-[#6a6c6b] p-8">
                            <div className="w-16 h-16 bg-[#e9ecef] rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-[#adb5bd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-lg font-medium">Selecciona un mensaje para leer</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
