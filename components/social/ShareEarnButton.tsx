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
      type="button"
      className={`w-8 h-8 rounded-full bg-white border border-line shadow-sm flex items-center justify-center text-ink hover:bg-brand-500 hover:text-white hover:border-brand-500 transition-colors ${className}`}
      title="Compartir y Ganar"
      aria-label="Compartir y Ganar"
    >
      <FiShare2 className="w-4 h-4" />
    </button>
  );
}
