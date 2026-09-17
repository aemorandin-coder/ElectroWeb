import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function Badge({
    children,
    variant = 'default',
    size = 'md',
    className = ''
}: BadgeProps) {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-colors';

    const variantStyles = {
        default: 'bg-surface text-ink-soft border border-line',
        success: 'bg-success-strong/10 text-success-strong border border-success-strong/20',
        warning: 'bg-warning/15 text-warning-strong border border-warning/30',
        danger: 'bg-deal-bg text-deal border border-deal/30',
        info: 'bg-brand-50 text-brand-700 border border-brand-200',
        secondary: 'bg-surface text-ink border border-line',
    };

    const sizeStyles = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
    };

    return (
        <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
            {children}
        </span>
    );
}
