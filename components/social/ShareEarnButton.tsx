'use client';

import { FiShare2 } from 'react-icons/fi';

interface ShareEarnButtonProps {
  url: string;
  title: string;
  description: string;
  image: string;
  price: number;
  type: 'product' | 'course';
  className?: string;
}

export default function ShareEarnButton({
  url,
  title,
  description,
  image,
  price,
  type,
  className = '',
}: ShareEarnButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Disparar evento personalizado para abrir el modal global
    const event = new CustomEvent('open-share-modal', {
      detail: {
        url,
        title,
        description,
        image,
        price,
        type,
      },
    });
    window.dispatchEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-md flex items-center justify-center text-[#212529] hover:bg-[#2a63cd] hover:text-white hover:border-[#2a63cd] hover:scale-105 active:scale-95 transition-all duration-300 ${className}`}
      title="Compartir y Ganar"
      aria-label="Compartir y Ganar"
    >
      <FiShare2 className="w-4 h-4" />
    </button>
  );
}
