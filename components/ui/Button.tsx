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
        primary: 'bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white hover:shadow-lg hover:shadow-[#2a63cd]/30 hover:scale-[1.02] active:scale-[0.98] focus:ring-[#2a63cd]',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] focus:ring-gray-400',
        outline: 'border-2 border-[#2a63cd] text-[#2a63cd] hover:bg-[#2a63cd] hover:text-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98] focus:ring-[#2a63cd]',
        ghost: 'text-gray-700 hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] focus:ring-gray-400',
        danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] focus:ring-red-500',
        success: 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-lg hover:shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98] focus:ring-green-500',
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
