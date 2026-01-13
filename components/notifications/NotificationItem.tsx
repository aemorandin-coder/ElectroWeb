'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiPackage, FiStar, FiInfo, FiGift, FiTrendingUp, FiTrash2, FiExternalLink, FiDollarSign, FiCreditCard, FiCheckCircle, FiTruck, FiBox, FiTag, FiAlertCircle, FiZap } from 'react-icons/fi';
import { useNotifications, Notification } from './NotificationProvider';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Enhanced icon map with more specific icons
const iconMap: Record<string, any> = {
    ORDER_CONFIRMED: FiCheckCircle,
    ORDER_PAID: FiDollarSign,
    ORDER_SHIPPED: FiTruck,
    ORDER_DELIVERED: FiBox,
    REVIEW_APPROVED: FiStar,
    REVIEW_REPLIED: FiStar,
    SYSTEM_UPDATE: FiZap,
    SYSTEM_MAINTENANCE: FiAlertCircle,
    PROMOTION: FiTag,
    STOCK_ALERT: FiTrendingUp,
    BALANCE_RECHARGED: FiDollarSign,
    NEW_RECHARGE_REQUEST: FiCreditCard,
    RECHARGE_APPROVED: FiDollarSign,
    RECHARGE_REJECTED: FiCreditCard,
    DISCOUNT_APPROVED: FiGift,
    DISCOUNT_REJECTED: FiInfo,
};

// Desktop colors (unchanged)
const colorMap: Record<string, string> = {
    ORDER_CONFIRMED: 'bg-blue-100 text-blue-600',
    ORDER_PAID: 'bg-green-100 text-green-600',
    ORDER_SHIPPED: 'bg-indigo-100 text-indigo-600',
    ORDER_DELIVERED: 'bg-green-100 text-green-600',
    REVIEW_APPROVED: 'bg-yellow-100 text-yellow-600',
    REVIEW_REPLIED: 'bg-yellow-100 text-yellow-600',
    SYSTEM_UPDATE: 'bg-gray-100 text-gray-600',
    SYSTEM_MAINTENANCE: 'bg-orange-100 text-orange-600',
    PROMOTION: 'bg-pink-100 text-pink-600',
    STOCK_ALERT: 'bg-purple-100 text-purple-600',
    BALANCE_RECHARGED: 'bg-green-100 text-green-600',
    NEW_RECHARGE_REQUEST: 'bg-blue-100 text-blue-600',
    RECHARGE_APPROVED: 'bg-green-100 text-green-600',
    RECHARGE_REJECTED: 'bg-red-100 text-red-600',
    DISCOUNT_APPROVED: 'bg-green-100 text-green-600',
    DISCOUNT_REJECTED: 'bg-red-100 text-red-600',
};

// Mobile gradient colors for glassmorphism bubbles
const mobileGradientMap: Record<string, string> = {
    ORDER_CONFIRMED: 'from-blue-500 to-blue-600',
    ORDER_PAID: 'from-emerald-500 to-emerald-600',
    ORDER_SHIPPED: 'from-indigo-500 to-purple-600',
    ORDER_DELIVERED: 'from-green-500 to-emerald-600',
    REVIEW_APPROVED: 'from-amber-400 to-orange-500',
    REVIEW_REPLIED: 'from-amber-400 to-orange-500',
    SYSTEM_UPDATE: 'from-slate-500 to-slate-600',
    SYSTEM_MAINTENANCE: 'from-orange-500 to-red-500',
    PROMOTION: 'from-pink-500 to-rose-600',
    STOCK_ALERT: 'from-purple-500 to-violet-600',
    BALANCE_RECHARGED: 'from-green-500 to-emerald-600',
    NEW_RECHARGE_REQUEST: 'from-blue-500 to-cyan-600',
    RECHARGE_APPROVED: 'from-green-500 to-teal-600',
    RECHARGE_REJECTED: 'from-red-500 to-rose-600',
    DISCOUNT_APPROVED: 'from-emerald-500 to-green-600',
    DISCOUNT_REJECTED: 'from-red-500 to-rose-600',
};

interface NotificationItemProps {
    notification: Notification;
    isMobile?: boolean;
}

export default function NotificationItem({ notification, isMobile = false }: NotificationItemProps) {
    const { markAsRead, deleteNotification } = useNotifications();
    const [isDeleting, setIsDeleting] = useState(false);
    const Icon = iconMap[notification.type] || FiInfo;
    const iconColor = colorMap[notification.type] || 'bg-gray-100 text-gray-600';
    const mobileGradient = mobileGradientMap[notification.type] || 'from-gray-500 to-gray-600';

    const handleClick = () => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDeleting(true);
        await deleteNotification(notification.id);
    };

    const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
        addSuffix: true,
        locale: es,
    });

    // Shorten time for mobile
    const shortTimeAgo = timeAgo
        .replace('hace ', '')
        .replace('menos de un minuto', '1min')
        .replace(' minutos', 'min')
        .replace(' minuto', 'min')
        .replace(' horas', 'h')
        .replace(' hora', 'h')
        .replace(' días', 'd')
        .replace(' día', 'd');

    // ============== MOBILE VERSION (Ultra-Compact) ==============
    if (isMobile) {
        const mobileContent = (
            <div
                className={`
                    relative px-3 py-2.5 transition-all duration-200 cursor-pointer group active:bg-gray-50
                    ${!notification.read ? 'bg-blue-50/40' : ''}
                    ${isDeleting ? 'opacity-0 translate-x-full' : 'opacity-100'}
                `}
                onClick={handleClick}
            >
                <div className="flex items-start gap-2.5">
                    {/* Glassmorphism Icon Bubble with micro-bounce */}
                    <div
                        className={`flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br ${mobileGradient} flex items-center justify-center shadow-lg animate-microBounce`}
                        style={{
                            boxShadow: '0 4px 14px -3px rgba(0, 0, 0, 0.25)',
                        }}
                    >
                        <Icon className="w-4 h-4 text-white" />
                    </div>

                    {/* Content - Full width for message wrapping */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <h4 className={`text-[10px] text-gray-900 whitespace-nowrap ${!notification.read ? 'font-black' : 'font-bold'}`}>
                                    {notification.title}
                                </h4>
                                {!notification.read && (
                                    <div className="w-1.5 h-1.5 bg-[#2a63cd] rounded-full flex-shrink-0 animate-pulse" />
                                )}
                            </div>
                            <span className="text-[9px] text-gray-400 font-medium flex-shrink-0">{shortTimeAgo}</span>
                        </div>
                        {/* Message - No truncation, full text visible */}
                        <p className="text-[10px] text-gray-600 mt-0.5 leading-relaxed">
                            {notification.message}
                        </p>
                    </div>

                    {/* Delete button */}
                    <button
                        onClick={handleDelete}
                        className="flex-shrink-0 w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center opacity-0 group-active:opacity-100 transition-all hover:bg-red-100 self-start mt-0.5"
                        title="Eliminar"
                    >
                        <FiTrash2 className="w-3 h-3 text-red-500" />
                    </button>
                </div>

                <style jsx>{`
                    @keyframes microBounce {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                    }
                    .animate-microBounce {
                        animation: microBounce 0.3s ease-out;
                    }
                `}</style>
            </div>
        );

        if (notification.link) {
            return (
                <Link href={notification.link} className="block">
                    {mobileContent}
                </Link>
            );
        }

        return mobileContent;
    }

    // ============== DESKTOP VERSION (Unchanged) ==============
    const content = (
        <div
            className={`
        relative p-4 hover:bg-gray-50 transition-all duration-300 cursor-pointer group
        ${!notification.read ? 'bg-blue-50/30 border-l-4 border-l-[#2a63cd]' : ''}
        ${isDeleting ? 'opacity-0 translate-x-full' : 'opacity-100'}
      `}
            onClick={handleClick}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconColor}`}>
                    <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-semibold text-gray-900 ${!notification.read ? 'font-bold' : ''}`}>
                            {notification.title}
                        </h4>
                        {notification.link && (
                            <FiExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                    </div>

                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">{timeAgo}</span>

                        {/* Delete Button */}
                        <button
                            onClick={handleDelete}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
                            title="Eliminar notificación"
                        >
                            <FiTrash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Unread Indicator */}
                {!notification.read && (
                    <div className="flex-shrink-0 w-2 h-2 bg-[#2a63cd] rounded-full animate-pulse" />
                )}
            </div>
        </div>
    );

    if (notification.link) {
        return (
            <Link href={notification.link} className="block">
                {content}
            </Link>
        );
    }

    return content;
}

