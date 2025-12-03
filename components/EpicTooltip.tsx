interface EpicTooltipProps {
    message: string;
    visible: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function EpicTooltip({ message, visible, position = 'bottom' }: EpicTooltipProps) {
    if (!visible) return null;

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-t-cyan-500/30 border-l-transparent border-r-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-cyan-500/30 border-l-transparent border-r-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-l-cyan-500/30 border-t-transparent border-b-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 -mr-1 border-r-cyan-500/30 border-t-transparent border-b-transparent border-l-transparent',
    };

    return (
        <div
            className={`absolute ${positionClasses[position]} z-50 animate-fade-in`}
            role="alert"
        >
            <div className="relative px-4 py-2.5 bg-gradient-to-br from-red-500/90 to-red-600/90 backdrop-blur-xl border border-red-400/30 rounded-xl shadow-2xl min-w-[200px] max-w-[300px]">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-red-400/20 rounded-xl blur-xl -z-10"></div>

                {/* Icon */}
                <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-white font-medium leading-snug">
                        {message}
                    </p>
                </div>

                {/* Arrow */}
                <div className={`absolute ${arrowClasses[position]} w-0 h-0 border-[6px]`}></div>
            </div>
        </div>
    );
}
