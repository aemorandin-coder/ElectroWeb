'use client';

import { useEffect, useRef } from 'react';

interface SubtleParticlesProps {
    className?: string;
    particleCount?: number;
    color?: string;
}

export default function SubtleParticles({
    className = '',
    particleCount = 20,
    color = 'rgba(150, 150, 150, 0.15)'
}: SubtleParticlesProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Clear existing particles
        container.innerHTML = '';

        // Create particles
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');

            // Random properties
            const size = Math.random() * 4 + 2; // 2-6px
            const left = Math.random() * 100;
            const delay = Math.random() * 20;
            const duration = Math.random() * 15 + 20; // 20-35s
            const startY = Math.random() * 100;

            particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        left: ${left}%;
        top: ${startY}%;
        opacity: 0;
        pointer-events: none;
        animation: particleFloat ${duration}s ease-in-out ${delay}s infinite;
      `;

            container.appendChild(particle);
        }
    }, [particleCount, color]);

    return (
        <>
            <style jsx global>{`
        @keyframes particleFloat {
          0%, 100% {
            opacity: 0;
            transform: translateY(0) translateX(0);
          }
          10% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.3;
            transform: translateY(-30px) translateX(10px);
          }
          90% {
            opacity: 0.6;
          }
        }
      `}</style>
            <div
                ref={containerRef}
                className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
                aria-hidden="true"
            />
        </>
    );
}
