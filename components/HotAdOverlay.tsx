'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiX, FiEyeOff } from 'react-icons/fi';

// Helper function to convert hex color to rgba
function hexToRgba(hex: string, opacity: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return `rgba(0, 0, 0, ${opacity})`;
}

interface HotAdSettings {
    hotAdEnabled: boolean;
    hotAdImage: string | null;
    hotAdTransparentBg: boolean;
    hotAdShadowEnabled: boolean;
    hotAdShadowBlur: number;
    hotAdShadowOpacity: number;
    hotAdBackdropOpacity: number;
    hotAdBackdropColor: string;
    hotAdLink: string | null;
}

export default function HotAdOverlay() {
    const [mounted, setMounted] = useState(false);
    const [settings, setSettings] = useState<HotAdSettings | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    // Mark as mounted on client
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // Only run on client after mount
        if (!mounted) return;

        // Check if permanently dismissed (localStorage) or session dismissed (sessionStorage)
        const permanentlyDismissed = localStorage.getItem('hotAdPermanentlyDismissed');
        const sessionDismissed = sessionStorage.getItem('hotAdDismissed');

        if (permanentlyDismissed || sessionDismissed) return;

        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/settings/public');
                if (response.ok) {
                    const data = await response.json();
                    if (data.hotAdEnabled && data.hotAdImage) {
                        setSettings({
                            hotAdEnabled: data.hotAdEnabled,
                            hotAdImage: data.hotAdImage,
                            hotAdTransparentBg: data.hotAdTransparentBg ?? false,
                            hotAdShadowEnabled: data.hotAdShadowEnabled ?? true,
                            hotAdShadowBlur: data.hotAdShadowBlur ?? 20,
                            hotAdShadowOpacity: data.hotAdShadowOpacity ?? 50,
                            hotAdBackdropOpacity: data.hotAdBackdropOpacity ?? 70,
                            hotAdBackdropColor: data.hotAdBackdropColor || '#000000',
                            hotAdLink: data.hotAdLink,
                        });
                        // Block body scroll and show overlay
                        document.body.style.overflow = 'hidden';
                        // Hide other floating elements
                        document.body.classList.add('hot-ad-active');
                        // Small delay for smooth animation
                        setTimeout(() => setIsVisible(true), 100);
                    }
                }
            } catch (error) {
                console.error('Error fetching hot ad settings:', error);
            }
        };

        fetchSettings();
    }, [mounted]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            setSettings(null);
            // Restore body scroll and floating elements
            document.body.style.overflow = '';
            document.body.classList.remove('hot-ad-active');

            // If user checked "don't show again", save permanently
            if (dontShowAgain) {
                localStorage.setItem('hotAdPermanentlyDismissed', 'true');
            } else {
                // Otherwise, just dismiss for this session
                sessionStorage.setItem('hotAdDismissed', 'true');
            }
        }, 300);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Don't render anything on server or before mount
    if (!mounted || !settings || !settings.hotAdEnabled || !settings.hotAdImage) {
        return null;
    }

    const shadowStyle = settings.hotAdShadowEnabled
        ? `0 0 ${settings.hotAdShadowBlur}px ${settings.hotAdShadowBlur / 2}px rgba(0, 0, 0, ${settings.hotAdShadowOpacity / 100})`
        : 'none';

    const ImageContent = (
        <div className="relative max-w-[1400px] max-h-[95vh] mx-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={settings.hotAdImage}
                alt="Promoción especial"
                className={`
          w-auto h-auto max-w-full max-h-[95vh] object-contain
          ${settings.hotAdTransparentBg ? '' : 'rounded-2xl'}
          transition-transform duration-300 hover:scale-[1.02]
        `}
                style={{
                    boxShadow: shadowStyle,
                }}
            />
        </div>
    );

    return (
        <div
            className={`
        fixed z-[99999] flex items-center justify-center
        transition-all duration-300 ease-out
        ${isVisible && !isClosing ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
            style={{
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: hexToRgba(settings.hotAdBackdropColor, settings.hotAdBackdropOpacity / 100),
                backdropFilter: 'blur(8px)',
                overscrollBehavior: 'contain',
                touchAction: 'none',
            }}
            onWheel={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Close Button */}
            <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 p-3 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full transition-all duration-200 group"
                aria-label="Cerrar promoción"
            >
                <FiX className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </button>

            {/* Image Container */}
            <div
                className={`
          transform transition-all duration-500 ease-out
          ${isVisible && !isClosing ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}
        `}
            >
                {settings.hotAdLink ? (
                    <Link
                        href={settings.hotAdLink}
                        onClick={handleClose}
                        className="block cursor-pointer"
                    >
                        {ImageContent}
                    </Link>
                ) : (
                    <div className="cursor-default">
                        {ImageContent}
                    </div>
                )}
            </div>

            {/* Bottom Bar with "Don't show again" checkbox */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                {/* Premium Checkbox */}
                <label
                    className="flex items-center gap-3 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-full cursor-pointer hover:bg-white/15 transition-all group border border-white/20"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-5 h-5 rounded-md border-2 border-white/50 peer-checked:border-amber-400 peer-checked:bg-amber-400 transition-all flex items-center justify-center">
                            {dontShowAgain && (
                                <svg className="w-3 h-3 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    </div>
                    <span className="text-white/90 text-sm font-medium flex items-center gap-2">
                        <FiEyeOff className="w-4 h-4 text-white/60" />
                        No volver a mostrar
                    </span>
                </label>
            </div>
        </div>
    );
}

