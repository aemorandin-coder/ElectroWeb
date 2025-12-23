'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, ComponentProps } from 'react';
import dynamic from 'next/dynamic';

// Define the HCaptcha component type for external use
export interface HCaptchaRefMethods {
    resetCaptcha: () => void;
    execute: () => Promise<{ response: string }>;
    getResponse: () => string;
}

interface HCaptchaWrapperProps {
    sitekey: string;
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: (event: string) => void;
    theme?: 'light' | 'dark';
    size?: 'normal' | 'compact' | 'invisible';
}

// The actual HCaptcha import is done at the end of this file to avoid type issues
// Since dynamic import loses the ref, we need to use a different approach

// Wrapper component that handles client-side only rendering with ref forwarding
const HCaptchaWrapper = forwardRef<HCaptchaRefMethods, HCaptchaWrapperProps>((props, ref) => {
    const [mounted, setMounted] = useState(false);
    const [HCaptchaComponent, setHCaptchaComponent] = useState<any>(null);
    const internalRef = useRef<any>(null);

    useEffect(() => {
        setMounted(true);
        // Dynamic import on client side only
        import('@hcaptcha/react-hcaptcha').then((mod) => {
            setHCaptchaComponent(() => mod.default);
        });
    }, []);

    // Forward ref methods
    useImperativeHandle(ref, () => ({
        resetCaptcha: () => {
            internalRef.current?.resetCaptcha();
        },
        execute: () => {
            return internalRef.current?.execute() ?? Promise.resolve({ response: '' });
        },
        getResponse: () => {
            return internalRef.current?.getResponse() ?? '';
        }
    }));

    // Don't render on server to prevent hydration mismatch
    if (!mounted || !HCaptchaComponent) {
        return (
            <div className="flex items-center justify-center">
                <div className="w-[303px] h-[78px] bg-white/10 rounded-lg animate-pulse" />
            </div>
        );
    }

    return (
        <HCaptchaComponent
            ref={internalRef}
            sitekey={props.sitekey}
            onVerify={props.onVerify}
            onExpire={props.onExpire}
            onError={props.onError}
            theme={props.theme}
            size={props.size}
        />
    );
});

HCaptchaWrapper.displayName = 'HCaptchaWrapper';

export default HCaptchaWrapper;
