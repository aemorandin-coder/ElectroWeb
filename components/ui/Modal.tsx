import { ReactNode, useEffect } from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-[100000] overflow-y-auto animate-fadeIn">
      <div className="flex items-center justify-center min-h-screen px-3 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* FLOATING CLOSE BUTTON - OUTSIDE MODAL */}
        <button
          onClick={onClose}
          className="fixed top-3 right-3 lg:top-4 lg:right-4 w-11 h-11 lg:w-12 lg:h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all z-10"
          aria-label="Cerrar"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Content */}
        <div className={`relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:w-full ${sizes[size]} animate-scaleIn max-h-[90vh] flex flex-col`}>
          {/* Header */}
          <div className="bg-white px-4 lg:px-6 pt-4 lg:pt-6 pb-3 lg:pb-4 border-b border-[#e9ecef] flex-shrink-0">
            <h3 className="text-base lg:text-xl font-semibold text-[#212529]">
              {title}
            </h3>
          </div>

          {/* Body */}
          <div className="bg-white px-4 lg:px-6 py-4 lg:py-6 overflow-y-auto flex-1">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="bg-[#f8f9fa] px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-end gap-2 lg:gap-3 border-t border-[#e9ecef] flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ModalFooterProps {
  onCancel?: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export function ModalFooter({
  onCancel,
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
}: ModalFooterProps) {
  return (
    <>
      {onCancel && (
        <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
          {cancelText}
        </Button>
      )}
      {onConfirm && (
        <Button variant="primary" onClick={onConfirm} isLoading={isLoading}>
          {confirmText}
        </Button>
      )}
    </>
  );
}
