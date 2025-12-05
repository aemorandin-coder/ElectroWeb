'use client';

import { useEffect } from 'react';
import { FiAlertTriangle, FiInfo, FiAlertCircle, FiX } from 'react-icons/fi';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    type = 'warning',
}: ConfirmDialogProps) {
    // Close on ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onCancel();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <FiAlertCircle className="w-12 h-12" />;
            case 'warning':
                return <FiAlertTriangle className="w-12 h-12" />;
            case 'info':
                return <FiInfo className="w-12 h-12" />;
            default:
                return <FiAlertTriangle className="w-12 h-12" />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'danger':
                return {
                    iconBg: 'bg-red-100',
                    iconText: 'text-red-600',
                    confirmBg: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                    confirmText: 'text-white',
                };
            case 'warning':
                return {
                    iconBg: 'bg-yellow-100',
                    iconText: 'text-yellow-600',
                    confirmBg: 'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
                    confirmText: 'text-white',
                };
            case 'info':
                return {
                    iconBg: 'bg-blue-100',
                    iconText: 'text-blue-600',
                    confirmBg: 'from-[#2a63cd] to-[#1e4ba3] hover:from-[#1e4ba3] hover:to-[#1a3b7e]',
                    confirmText: 'text-white',
                };
            default:
                return {
                    iconBg: 'bg-yellow-100',
                    iconText: 'text-yellow-600',
                    confirmBg: 'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
                    confirmText: 'text-white',
                };
        }
    };

    const colors = getColors();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
                onClick={onCancel}
            />

            {/* Dialog Panel */}
            <div
                className="relative w-full transform overflow-hidden rounded-2xl bg-white p-8 text-left shadow-2xl animate-scaleIn"
                style={{ maxWidth: '42rem', width: '95%' }} // Forzando ancho a ~670px
            >
                {/* Close Button */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-2 text-[#6a6c6b] hover:text-[#212529] hover:bg-[#f8f9fa] rounded-lg transition-colors"
                >
                    <FiX className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${colors.iconBg} mb-4`}>
                    <div className={colors.iconText}>{getIcon()}</div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-[#212529] text-center mb-2">
                    {title}
                </h3>

                {/* Message */}
                <div className="mt-2 mb-6">
                    <p className="text-base text-[#6a6c6b] text-center whitespace-normal break-words leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        className="flex-1 px-4 py-3 bg-white text-[#6a6c6b] font-semibold border-2 border-[#e9ecef] rounded-xl hover:bg-[#f8f9fa] hover:border-[#dee2e6] transition-all"
                        onClick={onCancel}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`flex-1 px-4 py-3 bg-gradient-to-r ${colors.confirmBg} ${colors.confirmText} font-semibold rounded-xl transition-all shadow-md hover:shadow-lg`}
                        onClick={() => {
                            onConfirm();
                            onCancel();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
        </div>
    );
}
