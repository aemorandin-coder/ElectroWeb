'use client';

import { useEffect, useState } from 'react';
import { FiCheckCircle, FiInfo, FiAlertTriangle, FiXCircle, FiX } from 'react-icons/fi';
import { useNotifications, ToastNotification } from './NotificationProvider';

const iconMap = {
    success: FiCheckCircle,
    info: FiInfo,
    warning: FiAlertTriangle,
    error: FiXCircle,
};

const colorMap = {
    success: {
        bg: 'bg-green-50',
        border: 'border-green-500',
        icon: 'text-green-600',
        text: 'text-green-900',
    },
    info: {
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        icon: 'text-blue-600',
        text: 'text-blue-900',
    },
    warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-500',
        icon: 'text-amber-600',
        text: 'text-amber-900',
    },
    error: {
        bg: 'bg-red-50',
        border: 'border-red-500',
        icon: 'text-red-600',
        text: 'text-red-900',
    },
};

interface ToastItemProps {
    toast: ToastNotification;
    onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
    const [isExiting, setIsExiting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const Icon = iconMap[toast.type];
    const colors = colorMap[toast.type];

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 300);
    };

    return (
        <div
            className={`
        relative flex items-start gap-3 p-4 rounded-xl border-l-4 shadow-lg backdrop-blur-sm
        ${colors.bg} ${colors.border}
        transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${isPaused ? '' : 'animate-slideInRight'}
        hover:scale-105 hover:shadow-xl
      `}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Icon */}
            <div className={`flex-shrink-0 ${colors.icon}`}>
                <Icon className="w-6 h-6" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h4 className={`font-bold text-sm ${colors.text}`}>{toast.title}</h4>
                <p className={`text-sm mt-0.5 ${colors.text} opacity-90`}>{toast.message}</p>
            </div>

            {/* Close Button */}
            <button
                onClick={handleDismiss}
                className={`flex-shrink-0 ${colors.icon} hover:opacity-70 transition-opacity`}
            >
                <FiX className="w-5 h-5" />
            </button>

            {/* Progress Bar */}
            {!isPaused && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-b-xl overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${toast.type === 'success' ? 'from-green-500 to-green-600' :
                                toast.type === 'info' ? 'from-blue-500 to-blue-600' :
                                    toast.type === 'warning' ? 'from-amber-500 to-amber-600' :
                                        'from-red-500 to-red-600'
                            }`}
                        style={{
                            animation: `shrink ${toast.duration}ms linear`,
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default function NotificationToast() {
    const { toasts, dismissToast } = useNotifications();

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md pointer-events-none">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <ToastItem toast={toast} onDismiss={dismissToast} />
                </div>
            ))}

            <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
        </div>
    );
}
