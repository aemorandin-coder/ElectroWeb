import React from 'react';

interface CardProps {
    children: React.ReactNode;
    variant?: 'default' | 'glass' | 'gradient';
    hover?: boolean;
    className?: string;
}

export function Card({
    children,
    variant = 'default',
    hover = false,
    className = ''
}: CardProps) {
    const baseStyles = 'rounded-lg transition-all duration-300';

    const variantStyles = {
        default: 'bg-white border border-gray-200 shadow-sm',
        glass: 'bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg',
        gradient: 'bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-md',
    };

    const hoverStyles = hover ? 'hover:shadow-xl hover:scale-[1.02]' : '';

    return (
        <div className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}>
            {children}
        </div>
    );
}
