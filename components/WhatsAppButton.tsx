'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
}

export default function WhatsAppButton({
  phoneNumber,
  message
}: WhatsAppButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [settings, setSettings] = useState<{ whatsapp: string | null; companyName: string | null } | null>(null);
  const pathname = usePathname();
  const isAdminPanel = pathname?.startsWith('/admin');
  const isCustomerPanel = pathname?.startsWith('/customer');

  useEffect(() => {
    if (!isAdminPanel) {
      fetch('/api/settings/public')
        .then(res => res.json())
        .then(data => {
          setSettings(data);
        })
        .catch(err => console.error('Error fetching WhatsApp settings:', err));
    }
  }, [isAdminPanel]);

  // Don't render WhatsApp button in admin panel
  if (isAdminPanel) {
    return null;
  }

  // Don't render if no WhatsApp number is configured
  const whatsappNumber = phoneNumber || settings?.whatsapp;
  if (!whatsappNumber) {
    return null;
  }

  const defaultMessage = message || `Hola! Tengo una consulta sobre los productos de ${settings?.companyName || 'Electro Shop'}`;

  const handleClick = () => {
    const encodedMessage = encodeURIComponent(defaultMessage);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 transition-all duration-500 ease-out ${isCustomerPanel && !isHovered ? 'scale-50 opacity-60' : 'scale-100 opacity-100'
        }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Epic Tooltip - Only show when hovered and not minimized */}
      {isHovered && (
        <div className="absolute bottom-full right-0 mb-3 animate-fade-in">
          <div className="relative px-4 py-2.5 bg-gradient-to-br from-green-500/90 to-green-600/90 backdrop-blur-xl border border-green-400/30 rounded-xl shadow-2xl min-w-[200px]">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-green-400/20 rounded-xl blur-xl -z-10"></div>

            {/* Content */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-white font-medium leading-snug">
                ¿Necesitas ayuda? Escríbenos
              </p>
            </div>

            {/* Arrow */}
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-gradient-to-br from-green-500/90 to-green-600/90 border-b border-r border-green-400/30 transform rotate-45"></div>
          </div>
        </div>
      )}

      {/* Minimized indicator - pulse when minimized in customer panel */}
      {isCustomerPanel && !isHovered && (
        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30"></div>
      )}

      {/* Button */}
      <button
        onClick={handleClick}
        className={`group relative w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${isHovered ? 'hover:scale-110' : ''
          } active:scale-95`}
        aria-label="Contactar por WhatsApp"
      >
        {/* Ripple effect */}
        <div className="absolute inset-0 rounded-full bg-green-400 opacity-0 group-hover:opacity-20 animate-ping"></div>

        {/* WhatsApp Icon */}
        <svg
          className="w-7 h-7 text-white relative z-10"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>

        {/* Notification badge - hide when minimized */}
        {(!isCustomerPanel || isHovered) && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">1</span>
          </div>
        )}
      </button>
    </div>
  );
}
