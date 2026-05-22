'use client';

import { useState, useEffect } from 'react';
import { FiShield, FiPackage, FiRefreshCw, FiClock, FiCheck, FiAlertCircle, FiChevronRight, FiFileText, FiHelpCircle, FiMail, FiPhone } from 'react-icons/fi';
import Link from 'next/link';

interface Order {
    id: string;
    orderNumber: string;
    status: string;
    totalUSD: number;
    createdAt: string;
    deliveredAt?: string;
    items: {
        id: string;
        productName: string;
        productImage?: string;
        quantity: number;
    }[];
}

interface WarrantyRequest {
    id: string;
    orderNumber: string;
    productName: string;
    type: 'WARRANTY' | 'RETURN' | 'EXCHANGE';
    status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    createdAt: string;
    reason: string;
}

export default function WarrantyPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState<'info' | 'requests' | 'new'>('info');
    const [showFormModal, setShowFormModal] = useState(false);
    const [selectedOrderForWarranty, setSelectedOrderForWarranty] = useState<Order | null>(null);
    const [warrantyReason, setWarrantyReason] = useState('');
    const [warrantyDescription, setWarrantyDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Simulate stored requests
    const [submittedRequests, setSubmittedRequests] = useState<WarrantyRequest[]>([]);

    useEffect(() => {
        fetchDeliveredOrders();
    }, []);

    const fetchDeliveredOrders = async () => {
        try {
            const response = await fetch('/api/orders?status=DELIVERED');
            if (response.ok) {
                const result = await response.json();
                // Handle both paginated format { orders: [...] } and legacy array format
                const data = Array.isArray(result) ? result : (result.orders || []);
                setOrders(data.filter((o: any) => o.status === 'DELIVERED').slice(0, 5));
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDaysSinceDelivery = (deliveredAt?: string) => {
        if (!deliveredAt) return null;
        const diff = Date.now() - new Date(deliveredAt).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const isWithinWarranty = (deliveredAt?: string) => {
        const days = getDaysSinceDelivery(deliveredAt);
        return days !== null && days <= 30;
    };

    const handleOpenForm = (order: Order) => {
        if (!isWithinWarranty(order.deliveredAt)) return;
        setSelectedOrderForWarranty(order);
        setShowFormModal(true);
    };

    const handleSubmitWarranty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrderForWarranty || !warrantyReason || !warrantyDescription) return;

        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const newReq: WarrantyRequest = {
            id: `WAR-${Date.now()}`,
            orderNumber: selectedOrderForWarranty.orderNumber,
            productName: selectedOrderForWarranty.items[0]?.productName || 'Producto',
            type: warrantyReason === 'DEFECT' ? 'WARRANTY' : (warrantyReason === 'RETURN' ? 'RETURN' : 'EXCHANGE'),
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            reason: warrantyDescription,
        };

        setSubmittedRequests(prev => [newReq, ...prev]);
        setIsSubmitting(false);
        setShowFormModal(false);
        setSelectedOrderForWarranty(null);
        setWarrantyReason('');
        setWarrantyDescription('');
        setSelectedTab('requests');
        
        // Show success toast here if toast was imported, but we'll use simple UI feedback
    };

    return (
        <div className="h-full space-y-3 lg:space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center shadow-lg shadow-[#2a63cd]/20">
                    <FiShield className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-base lg:text-lg font-black text-[#212529]">Garantía</h1>
                    <p className="text-xs text-[#6a6c6b]">Gestiona tus solicitudes</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-[#e9ecef]">
                {[
                    { id: 'info', label: 'Info', icon: FiHelpCircle },
                    { id: 'requests', label: 'Mis Solicitudes', icon: FiFileText },
                    { id: 'new', label: 'Nueva', icon: FiRefreshCw },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-bold border-b-2 transition-all active:scale-95 ${selectedTab === tab.id
                            ? 'border-[#2a63cd] text-[#2a63cd] bg-blue-50/50'
                            : 'border-transparent text-[#6a6c6b] hover:text-[#212529]'
                            }`}
                    >
                        <tab.icon className={`w-3.5 h-3.5 ${selectedTab === tab.id ? 'animate-bounce' : ''}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {selectedTab === 'info' && (
                <div className="space-y-4">
                    {/* Policy Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white rounded-xl border border-[#e9ecef] p-4 hover:shadow-md transition-shadow">
                            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center mb-2">
                                <FiShield className="w-4 h-4 text-emerald-600" />
                            </div>
                            <h3 className="font-bold text-[#212529] text-sm mb-0.5">Garantía de 30 días</h3>
                            <p className="text-xs text-[#6a6c6b]">
                                Todos nuestros productos tienen garantía de 30 días por defectos de fábrica.
                            </p>
                        </div>
                        <div className="bg-white rounded-xl border border-[#e9ecef] p-4 hover:shadow-md transition-shadow">
                            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                                <FiRefreshCw className="w-4 h-4 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-[#212529] text-sm mb-0.5">Devoluciones Fáciles</h3>
                            <p className="text-xs text-[#6a6c6b]">
                                Puedes devolver productos sin usar en su empaque original dentro de 7 días.
                            </p>
                        </div>
                        <div className="bg-white rounded-xl border border-[#e9ecef] p-4 hover:shadow-md transition-shadow">
                            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                                <FiPackage className="w-4 h-4 text-purple-600" />
                            </div>
                            <h3 className="font-bold text-[#212529] text-sm mb-0.5">Soporte Técnico</h3>
                            <p className="text-xs text-[#6a6c6b]">
                                Asistencia especializada para configuración y problemas técnicos.
                            </p>
                        </div>
                    </div>

                    {/* How It Works */}
                    <div className="bg-white rounded-xl border border-[#e9ecef] p-4">
                        <h3 className="font-bold text-[#212529] text-sm mb-3">¿Cómo funciona?</h3>
                        <div className="space-y-3">
                            {[
                                { step: 1, title: 'Inicia tu solicitud', desc: 'Selecciona el pedido y producto afectado' },
                                { step: 2, title: 'Describe el problema', desc: 'Cuéntanos qué sucedió con tu producto' },
                                { step: 3, title: 'Revisión', desc: 'Nuestro equipo evaluará tu caso en 24-48 horas' },
                                { step: 4, title: 'Resolución', desc: 'Te contactaremos con la solución' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-[#2a63cd] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {item.step}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[#212529] text-xs">{item.title}</p>
                                        <p className="text-xs text-[#6a6c6b]">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="bg-gradient-to-r from-[#2a63cd]/10 to-[#2a63cd]/5 rounded-xl p-4 border border-[#2a63cd]/20">
                        <h3 className="font-bold text-[#212529] text-sm mb-1">¿Necesitas ayuda?</h3>
                        <p className="text-xs text-[#6a6c6b] mb-3">
                            Nuestro equipo de soporte está disponible para ayudarte.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <a href="mailto:soporte@electroshop.com" className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-[#2a63cd] border border-[#2a63cd]/30 hover:bg-[#2a63cd] hover:text-white transition-colors">
                                <FiMail className="w-3.5 h-3.5" />
                                Email
                            </a>
                            <a href="tel:+584121234567" className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-[#2a63cd] border border-[#2a63cd]/30 hover:bg-[#2a63cd] hover:text-white transition-colors">
                                <FiPhone className="w-3.5 h-3.5" />
                                Llamar
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {selectedTab === 'requests' && (
                <div className="space-y-3">
                    {submittedRequests.length === 0 ? (
                        <div className="text-center py-10 bg-[#f8f9fa] rounded-xl border border-dashed border-[#dee2e6]">
                            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <FiFileText className="w-6 h-6 text-[#adb5bd]" />
                            </div>
                            <h3 className="text-sm font-bold text-[#212529] mb-1">Sin solicitudes</h3>
                            <p className="text-xs text-[#6a6c6b] mb-3">No tienes solicitudes de garantía o devolución activas</p>
                            <button
                                onClick={() => setSelectedTab('new')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2a63cd] text-white text-xs font-medium rounded-lg hover:bg-[#1e4ba3] transition-colors"
                            >
                                <FiRefreshCw className="w-3.5 h-3.5" />
                                Nueva Solicitud
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {submittedRequests.map((req) => (
                                <div key={req.id} className="bg-white rounded-xl border border-[#e9ecef] p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-[#212529] text-sm">Pedido #{req.orderNumber}</h3>
                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">En Revisión</span>
                                            </div>
                                            <p className="text-xs text-[#6a6c6b]">{new Date(req.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-[#6a6c6b] uppercase">{req.type}</span>
                                            <p className="text-xs font-medium text-[#2a63cd] mt-0.5">{req.id}</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#f8f9fa] rounded-lg p-3 text-xs text-[#212529]">
                                        <p className="font-semibold mb-1">Motivo:</p>
                                        <p className="text-[#6a6c6b]">{req.reason}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {selectedTab === 'new' && (
                <div className="space-y-4">
                    {/* Eligible Orders */}
                    <div>
                        <h3 className="text-xs font-bold text-[#212529] mb-2">Pedidos Elegibles</h3>
                        {loading ? (
                            <div className="flex items-center justify-center py-6">
                                <div className="w-6 h-6 border-2 border-[#e9ecef] border-t-[#2a63cd] rounded-full animate-spin" />
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-6 bg-[#f8f9fa] rounded-xl">
                                <FiAlertCircle className="w-6 h-6 text-[#adb5bd] mx-auto mb-1" />
                                <p className="text-xs text-[#6a6c6b]">No tienes pedidos entregados elegibles para garantía</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {orders.map((order) => {
                                    const withinWarranty = isWithinWarranty(order.deliveredAt);
                                    const daysSince = getDaysSinceDelivery(order.deliveredAt);

                                    return (
                                        <div
                                            key={order.id}
                                            onClick={() => handleOpenForm(order)}
                                            className={`bg-white rounded-xl border p-3 transition-all ${withinWarranty
                                                ? 'border-[#e9ecef] hover:border-[#2a63cd] hover:shadow-md cursor-pointer'
                                                : 'border-red-100 bg-red-50/50 opacity-60 cursor-not-allowed'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-[#f8f9fa] rounded-lg flex items-center justify-center">
                                                    <FiPackage className="w-4 h-4 text-[#6a6c6b]" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <h4 className="font-bold text-[#212529] text-xs">#{order.orderNumber}</h4>
                                                        {withinWarranty ? (
                                                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full flex items-center gap-0.5">
                                                                <FiCheck className="w-2.5 h-2.5" />
                                                                Elegible
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                                                                Expirado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-[#6a6c6b]">
                                                        {order.items.length} producto{order.items.length > 1 ? 's' : ''} •
                                                        Entregado hace {daysSince} días
                                                        {!withinWarranty && ' (fuera de garantía)'}
                                                    </p>
                                                </div>
                                                {withinWarranty && (
                                                    <button className="p-1.5 bg-[#f8f9fa] text-[#2a63cd] rounded-lg transition-colors group-hover:bg-[#2a63cd] group-hover:text-white">
                                                        <FiChevronRight className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Info Note */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <FiAlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs">
                            <p className="font-semibold text-amber-800 mb-0.5">Importante</p>
                            <p className="text-amber-700">
                                Solo los pedidos entregados en los últimos 30 días son elegibles para garantía.
                                Para devoluciones, el producto debe estar sin usar y en su empaque original.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {/* Interactive Warranty Form Modal */}
            {showFormModal && selectedOrderForWarranty && (
                <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-t-[32px] sm:rounded-2xl shadow-2xl w-full max-w-lg h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden animate-slideInUp sm:animate-scaleIn">
                        <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] p-5 text-white flex-shrink-0 flex justify-between items-center rounded-t-[32px] sm:rounded-none">
                            <div>
                                <h2 className="text-lg font-bold">Solicitar Garantía</h2>
                                <p className="text-xs text-blue-100">Pedido #{selectedOrderForWarranty.orderNumber}</p>
                            </div>
                            <button onClick={() => setShowFormModal(false)} className="p-2 hover:bg-white/20 rounded-lg">
                                <FiAlertCircle className="w-5 h-5 hidden sm:block" />
                                <FiChevronRight className="w-5 h-5 sm:hidden rotate-90" />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            <form onSubmit={handleSubmitWarranty} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">Motivo</label>
                                    <select
                                        value={warrantyReason}
                                        onChange={(e) => setWarrantyReason(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-white/70 border border-gray-200 focus:border-[#2a63cd] focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none hover:border-blue-400 transition-all duration-200 font-medium text-gray-700 shadow-sm text-sm"
                                    >
                                        <option value="">Selecciona un motivo...</option>
                                        <option value="DEFECT">Defecto de fábrica</option>
                                        <option value="RETURN">Devolución (no me gustó)</option>
                                        <option value="EXCHANGE">Cambio por otro producto</option>
                                        <option value="OTHER">Soporte Técnico</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">Descripción del problema</label>
                                    <textarea
                                        value={warrantyDescription}
                                        onChange={(e) => setWarrantyDescription(e.target.value)}
                                        required
                                        rows={4}
                                        placeholder="Por favor describe detalladamente el problema que presenta tu producto..."
                                        className="w-full px-4 py-3 bg-white/70 border border-gray-200 focus:border-[#2a63cd] focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none hover:border-blue-400 transition-all duration-200 resize-none text-[#212529] text-sm shadow-sm"
                                    ></textarea>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <p className="text-xs text-blue-800">
                                        <strong>Nota:</strong> Nuestro equipo de soporte revisará tu caso y te responderá en un plazo máximo de 24-48 horas laborables.
                                    </p>
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !warrantyReason || !warrantyDescription}
                                        className="w-full py-3.5 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Enviando...
                                            </>
                                        ) : (
                                            <>Confirmar Solicitud</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
