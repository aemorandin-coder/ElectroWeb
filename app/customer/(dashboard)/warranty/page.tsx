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

    useEffect(() => {
        fetchDeliveredOrders();
    }, []);

    const fetchDeliveredOrders = async () => {
        try {
            const response = await fetch('/api/orders?status=DELIVERED');
            if (response.ok) {
                const data = await response.json();
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

    return (
        <div className="h-full overflow-y-auto pr-2 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center shadow-lg shadow-[#2a63cd]/20">
                    <FiShield className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-[#212529]">Garantía y Devoluciones</h1>
                    <p className="text-xs text-[#6a6c6b]">Gestiona tus reclamos y solicitudes de devolución</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-[#e9ecef]">
                {[
                    { id: 'info', label: 'Información', icon: FiHelpCircle },
                    { id: 'requests', label: 'Mis Solicitudes', icon: FiFileText },
                    { id: 'new', label: 'Nueva Solicitud', icon: FiRefreshCw },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${selectedTab === tab.id
                                ? 'border-[#2a63cd] text-[#2a63cd]'
                                : 'border-transparent text-[#6a6c6b] hover:text-[#212529]'
                            }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
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
                            <h3 className="font-bold text-[#212529] text-sm mb-0.5">Cambios por Talla</h3>
                            <p className="text-xs text-[#6a6c6b]">
                                Realizamos cambios por talla o color sujeto a disponibilidad.
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
                    {/* Empty State */}
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
                                            className={`bg-white rounded-xl border p-3 transition-all ${withinWarranty
                                                    ? 'border-[#e9ecef] hover:border-[#2a63cd]/30 hover:shadow-md cursor-pointer'
                                                    : 'border-red-100 bg-red-50/50 opacity-60'
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
                                                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-semibold rounded-full flex items-center gap-0.5">
                                                                <FiCheck className="w-2.5 h-2.5" />
                                                                Elegible
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-semibold rounded-full">
                                                                Expirado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-[#6a6c6b]">
                                                        {order.items.length} producto{order.items.length > 1 ? 's' : ''} •
                                                        Entregado hace {daysSince} días
                                                        {!withinWarranty && ' (fuera de garantía)'}
                                                    </p>
                                                </div>
                                                {withinWarranty && (
                                                    <button className="p-1.5 bg-[#f8f9fa] hover:bg-[#2a63cd] text-[#6a6c6b] hover:text-white rounded-lg transition-colors">
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
        </div>
    );
}
