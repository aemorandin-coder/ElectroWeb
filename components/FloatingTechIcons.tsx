'use client';

import { useEffect, useState } from 'react';

export default function FloatingTechIcons() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Icons with staggered delays and starting positions spread across the screen
  const icons = [
    // Row 1 - spread horizontally
    { startX: '8%', top: '12%', duration: 18, path: 'M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6M9 21a1 1 0 100-2 1 1 0 000 2zM20 21a1 1 0 100-2 1 1 0 000 2z' }, // Cart
    { startX: '28%', top: '18%', duration: 20, path: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35' }, // Search/Lupa
    { startX: '48%', top: '15%', duration: 16, path: 'M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07' }, // Speaker
    { startX: '68%', top: '20%', duration: 22, path: 'M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M6 6h12a1 1 0 011 1v10a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1zM9 9h6v6H9V9z' }, // CPU
    { startX: '88%', top: '14%', duration: 17, path: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' }, // Connection/Loading

    // Row 2
    { startX: '5%', top: '35%', duration: 21, path: 'M4 7a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7zM8 21h8M12 17v4' }, // TV
    { startX: '22%', top: '42%', duration: 19, path: 'M7 2a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2H7zM12 18h.01' }, // Phone
    { startX: '42%', top: '38%', duration: 23, path: 'M6 12h4m8 0h-4m-2-2v4M17 21a4 4 0 004-4V9a4 4 0 00-4-4H7a4 4 0 00-4 4v8a4 4 0 004 4h10z' }, // Controller
    { startX: '62%', top: '44%', duration: 15, path: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z' }, // Globe/Internet
    { startX: '82%', top: '40%', duration: 18, path: 'M6.5 6.5h11v11h-11z M8.5 2v4M15.5 2v4M8.5 17.5V22M15.5 17.5V22M2 8.5h4M2 15.5h4M17.5 8.5H22M17.5 15.5H22' }, // USB/Chip

    // Row 3
    { startX: '3%', top: '58%', duration: 20, path: 'M3 18v-6a9 9 0 0118 0v6M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z' }, // Headphones
    { startX: '18%', top: '65%', duration: 16, path: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11zM12 17a4 4 0 100-8 4 4 0 000 8z' }, // Camera
    { startX: '35%', top: '60%', duration: 22, path: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v8H4V6zM2 18h20M8 14v0M12 14v0M16 14v0' }, // Laptop
    { startX: '52%', top: '68%', duration: 17, path: 'M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01' }, // Wifi
    { startX: '70%', top: '62%', duration: 21, path: 'M23 6l-9.5 9.5-5-5L1 18' }, // Trending/Analytics
    { startX: '88%', top: '66%', duration: 19, path: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' }, // Users

    // Row 4
    { startX: '10%', top: '82%', duration: 18, path: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12' }, // Package
    { startX: '28%', top: '78%', duration: 20, path: 'M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z' }, // Printer
    { startX: '45%', top: '85%', duration: 15, path: 'M12 2v6M12 22v-6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M22 12h-6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24' }, // Bluetooth
    { startX: '62%', top: '80%', duration: 22, path: 'M23 12a11 11 0 11-22 0 11 11 0 0122 0zM16 8l-4 4-4-4M8 16l4-4 4 4' }, // Battery
    { startX: '78%', top: '88%', duration: 17, path: 'M4 4l7.07 17 2.51-7.39L21 11.07 4 4zM13.5 13.5L21 21' }, // Mouse/Cursor
    { startX: '92%', top: '75%', duration: 19, path: 'M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z' }, // Link/Connection
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <style jsx>{`
        @keyframes floatDrift {
          0%, 100% { 
            transform: translateY(0) translateX(0);
          }
          25% { 
            transform: translateY(-8px) translateX(15px);
          }
          50% { 
            transform: translateY(-12px) translateX(-10px);
          }
          75% { 
            transform: translateY(-5px) translateX(8px);
          }
        }
      `}</style>

      {icons.map((icon, index) => (
        <svg
          key={index}
          className="absolute"
          style={{
            top: icon.top,
            left: icon.startX,
            animation: `floatDrift ${icon.duration}s ease-in-out infinite`,
            animationDelay: `${index * 0.3}s`,
            opacity: 0.2,
          }}
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={icon.path} />
        </svg>
      ))}
    </div>
  );
}
