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

  // Badge styles as a complete inline style object - immune to CSS overrides
  const badgeStyles: React.CSSProperties = {
    position: 'absolute',
    top: '0px',
    right: '0px',
    width: '16px',
    height: '16px',
    minWidth: '16px',
    maxWidth: '16px',
    minHeight: '16px',
    maxHeight: '16px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '9px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    padding: 0,
    margin: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    zIndex: 10,
    pointerEvents: 'none' as const,
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-all duration-300 hover:bg-white/10 ${shouldShake ? 'animate-shake' : ''} ${isOpen ? 'bg-white/10' : ''}`}
        aria-label="Notificaciones"
        style={{ overflow: 'visible' }}
      >
        <FiBell
          className="transition-transform"
          style={{
            width: '20px',
            height: '20px',
            color: isOpen ? '#2a63cd' : 'rgba(255,255,255,0.9)',
            transform: isOpen ? 'rotate(12deg)' : 'none'
          }}
        />

        {/* Badge Counter - Pure inline styles */}
        {unreadCount > 0 && (
          <span style={badgeStyles}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
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
          <div
            className="notification-dropdown z-50 animate-scaleIn"
            style={{
              position: 'fixed',
              left: '12px',
              right: '12px',
              top: '54px',
            }}
          >
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
