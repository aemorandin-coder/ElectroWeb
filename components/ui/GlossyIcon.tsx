import React from 'react';

interface GlossyIconProps {
    children: React.ReactNode;
    gradient: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    animate?: boolean;
}

export default function GlossyIcon({
    children,
    gradient,
    className = '',
    size = 'md',
    animate = true
}: GlossyIconProps) {
    const sizeClasses = {
        sm: 'w-10 h-10',
        md: 'w-14 h-14',
        lg: 'w-20 h-20'
    };

    return (
        <div className={`relative ${sizeClasses[size]} ${className}`}>
            {/* Main glossy container */}
            <div
                className={`
          relative w-full h-full rounded-2xl flex items-center justify-center
          bg-gradient-to-br ${gradient}
          shadow-2xl
          ${animate ? 'group-hover:scale-110 transition-all duration-500' : ''}
        `}
                style={{
                    boxShadow: `
            0 10px 40px -10px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.6),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2)
          `
                }}
            >
                {/* Top glossy highlight */}
                <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 100%)',
                        pointerEvents: 'none'
                    }}
                />

                {/* Shine effect on hover */}
                {animate && (
                    <div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                        style={{
                            background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                            backgroundSize: '200% 200%',
                            animation: 'shine 2s infinite'
                        }}
                    />
                )}

                {/* Icon content */}
                <div className={`relative z-10 ${animate ? 'group-hover:rotate-12 transition-transform duration-500' : ''}`}>
                    {children}
                </div>

                {/* Bottom shadow for 3D effect */}
                <div
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3/4 h-2 bg-black/20 blur-md rounded-full"
                    style={{ filter: 'blur(8px)' }}
                />
            </div>

            <style jsx>{`
        @keyframes shine {
          0% {
            background-position: -200% -200%;
          }
          100% {
            background-position: 200% 200%;
          }
        }
      `}</style>
        </div>
    );
}
