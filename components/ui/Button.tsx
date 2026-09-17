'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    className?: string;
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = 'group inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden';

    const variantStyles = {
        primary: 'bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-500 shadow-sm',
        secondary: 'bg-surface text-ink hover:bg-line border border-line focus:ring-brand-500 shadow-sm',
        outline: 'border border-brand-500 text-brand-500 hover:bg-brand-50 focus:ring-brand-500',
        ghost: 'text-ink-soft hover:text-ink hover:bg-surface focus:ring-brand-500',
        danger: 'bg-deal text-white hover:bg-deal/90 focus:ring-deal shadow-sm',
        success: 'bg-success-strong text-white hover:bg-success focus:ring-success-strong shadow-sm',
    };

    const sizeStyles = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {/* Ripple effect overlay */}
            <span className="absolute inset-0 overflow-hidden rounded-xl">
                <span className="absolute inset-0 bg-white/20 transform scale-0 group-active:scale-100 transition-transform duration-300 rounded-full"></span>
            </span>

            {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            <span className="relative z-10">{children}</span>
        </button>
    );
}
