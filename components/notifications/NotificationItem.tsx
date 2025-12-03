'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiPackage, FiStar, FiInfo, FiGift, FiTrendingUp, FiTrash2, FiExternalLink } from 'react-icons/fi';
import { useNotifications, Notification } from './NotificationProvider';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const iconMap = {
    ORDER_CONFIRMED: FiPackage,
    ORDER_PAID: FiPackage,
    ORDER_SHIPPED: FiPackage,
    ORDER_DELIVERED: FiPackage,
    REVIEW_APPROVED: FiStar,
    REVIEW_REPLIED: FiStar,
    SYSTEM_UPDATE: FiInfo,
    SYSTEM_MAINTENANCE: FiInfo,
    PROMOTION: FiGift,
    STOCK_ALERT: FiTrendingUp,
};

const colorMap = {
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
};

interface NotificationItemProps {
    notification: Notification;
}

export default function NotificationItem({ notification }: NotificationItemProps) {
    const { markAsRead, deleteNotification } = useNotifications();
    const [isDeleting, setIsDeleting] = useState(false);
    const Icon = iconMap[notification.type] || FiInfo;
    const iconColor = colorMap[notification.type] || 'bg-gray-100 text-gray-600';

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
