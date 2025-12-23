'use client';

import { useState, useEffect } from 'react';

interface YouTubeEmbedProps {
    videoUrl: string;
    className?: string;
}

// Helper to get YouTube Embed URL
const getYouTubeEmbedUrl = (url: string | null) => {
    if (!url) return null;
    let videoId = null;
    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/embed/')) {
        return url;
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&showinfo=0&rel=0` : null;
};

export default function YouTubeEmbed({ videoUrl, className = '' }: YouTubeEmbedProps) {
    const [isMounted, setIsMounted] = useState(false);

    // Only render iframe on client side to avoid hydration mismatch
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const embedUrl = getYouTubeEmbedUrl(videoUrl);

    if (!isMounted || !embedUrl) {
        // Return a placeholder with same dimensions during SSR
        return (
            <div
                className={`bg-gradient-to-br from-[#1a3b7e] to-[#2a63cd] ${className}`}
                aria-hidden="true"
            />
        );
    }

    return (
        <iframe
            className={className}
            src={embedUrl}
            allow="autoplay; encrypted-media"
            allowFullScreen
            loading="lazy"
            title="Background Video"
        />
    );
}
