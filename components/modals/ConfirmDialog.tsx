'use client';

import { useEffect } from 'react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { FiAlertTriangle, FiInfo, FiAlertCircle, FiX } from 'react-icons/fi';
import {
    adminModalOverlay,
    adminModalPanel,
    adminPrimaryButton,
    adminSecondaryButton,
    adminDangerButton,
    adminIconChip,
    type AdminTone,
} from '@/lib/admin-ui';

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
    useBodyScrollLock(isOpen);

    // Close on ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onCancel();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const tone: AdminTone = type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'brand';

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <FiAlertCircle className="w-8 h-8" />;
            case 'warning':
                return <FiAlertTriangle className="w-8 h-8" />;
            case 'info':
                return <FiInfo className="w-8 h-8" />;
            default:
                return <FiAlertTriangle className="w-8 h-8" />;
        }
    };

    const confirmButtonClass = type === 'danger' ? adminDangerButton : adminPrimaryButton;

    return (
        <div className={adminModalOverlay}>
            {/* Backdrop click */}
            <div
                className="fixed inset-0"
                onClick={onCancel}
                aria-hidden="true"
            />

            {/* Dialog Panel */}
            <div
                className={`${adminModalPanel} max-w-md p-6 sm:p-8 text-center relative z-10 my-auto`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
            >
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-1.5 text-muted hover:text-ink rounded-lg transition-colors"
                    aria-label="Cerrar"
                >
                    <FiX className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${adminIconChip(tone)}`}>
                    {getIcon()}
                </div>

                {/* Title */}
                <h3 id="confirm-dialog-title" className="text-lg lg:text-xl font-bold text-ink mb-2">
                    {title}
                </h3>

                {/* Message */}
                <div id="confirm-dialog-message" className="mb-6">
                    <p className="text-sm text-muted leading-relaxed whitespace-pre-line break-words">
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-2.5">
                    <button
                        type="button"
                        className={`flex-1 ${adminSecondaryButton} py-2.5 font-semibold justify-center`}
                        onClick={onCancel}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`flex-1 ${confirmButtonClass} py-2.5 font-semibold justify-center`}
                        onClick={() => {
                            onConfirm();
                            onCancel();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
