'use client';

import { useState, useEffect } from 'react';
import { FiBell } from 'react-icons/fi';
import { useNotifications } from './NotificationProvider';
import NotificationCenter from './NotificationCenter';

export default function NotificationBell() {
    const { unreadCount } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const [shouldShake, setShouldShake] = useState(false);
    const [prevCount, setPrevCount] = useState(0);

    // Shake animation when new notification arrives
    useEffect(() => {
        if (unreadCount > prevCount && prevCount > 0) {
            setShouldShake(true);
            setTimeout(() => setShouldShake(false), 1000);
        }
        setPrevCount(unreadCount);
    }, [unreadCount, prevCount]);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          relative p-2 rounded-lg transition-all duration-300
          hover:bg-gray-100 hover:scale-110
          ${shouldShake ? 'animate-shake' : ''}
          ${isOpen ? 'bg-gray-100' : ''}
        `}
                aria-label="Notificaciones"
            >
                <FiBell className={`w-6 h-6 text-gray-700 transition-transform ${isOpen ? 'rotate-12' : ''}`} />

                {/* Badge Counter */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}

                {/* Pulse Ring */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full animate-ping opacity-75" />
                )}
            </button>

            {/* Notification Center Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 z-50 animate-scaleIn">
                        <NotificationCenter onClose={() => setIsOpen(false)} />
                    </div>
                </>
            )}

            <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
          20%, 40%, 60%, 80% { transform: rotate(10deg); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
        </div>
    );
}
