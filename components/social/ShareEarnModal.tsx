'use client';

import { useState, useEffect, useRef } from 'react';
import { FiX, FiCopy, FiCheck, FiGift, FiUser, FiInfo, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface ShareItem {
  url: string;
  title: string;
  description: string;
  image: string;
  price: number;
  type: 'product' | 'course';
}

interface ReferralData {
  enrolled: boolean;
  influencer?: {
    code: string;
    commissionRate: number;
    status: string;
  };
}

export default function ShareEarnModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<ShareItem | null>(null);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [copied, setCopied] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteUrl(window.location.origin);
    }
  }, []);

  // Escuchar el evento personalizado para abrir el modal
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<ShareItem>;
      if (customEvent.detail) {
        setItem(customEvent.detail);
        setIsOpen(true);
        // Si no tenemos datos de referidos cargados, o si el modal se abre por primera vez
        fetchReferralInfo();
      }
    };

    window.addEventListener('open-share-modal', handleOpen);
    return () => window.removeEventListener('open-share-modal', handleOpen);
  }, []);

  const fetchReferralInfo = async () => {
    setLoadingReferral(true);
    try {
      const res = await fetch('/api/customer/referrals');
      if (res.ok) {
        const data = await res.json();
        setReferralData(data);
      } else {
        // Probablemente no logueado (401)
        setReferralData(null);
      }
    } catch (err) {
      console.error('Error fetching referrals info:', err);
      setReferralData(null);
    } finally {
      setLoadingReferral(false);
    }
  };

  // Cerrar el modal al presionar Esc o hacer clic afuera
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  if (!isOpen || !item) return null;

  const hasReferralCode = referralData?.enrolled && referralData?.influencer?.code;
  const referralCode = referralData?.influencer?.code || '';
  const commissionRate = referralData?.influencer?.commissionRate || 0;

  // Generar link final
  const baseLink = `${siteUrl}${item.url}`;
  const finalLink = hasReferralCode ? `${baseLink}?ref=${referralCode}` : baseLink;

  // Cálculo de ganancias estimadas (porcentaje de comisión)
  const estimatedEarnings = item.price * (commissionRate / 100);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(finalLink);
      setCopied(true);
      toast.success('¡Enlace de referido copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Error al copiar el enlace');
    }
  };

  // Compartir en WhatsApp
  const handleShareWhatsApp = () => {
    const text = item.type === 'product'
      ? `🔥 ¡Te recomiendo este producto de Electro Shop! ${item.title} por solo $${item.price.toFixed(2)}. Compra desde este enlace: ${finalLink}`
      : `🎓 ¡Mira este increíble curso de tecnología en Electro Shop! "${item.title}". Aprende hoy aquí: ${finalLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Compartir en Telegram
  const handleShareTelegram = () => {
    const text = item.type === 'product'
      ? `🔥 ¡Te recomiendo este producto de Electro Shop! ${item.title}`
      : `🎓 ¡Mira este increíble curso de tecnología en Electro Shop! "${item.title}"`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(finalLink)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  // Compartir en Twitter/X
  const handleShareTwitter = () => {
    const text = item.type === 'product'
      ? `Recomiendo este producto de Electro Shop: ${item.title}. ¡Echa un vistazo!`
      : `Recomiendo este curso online de tecnología en Electro Shop: "${item.title}"`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(finalLink)}`, '_blank');
  };

  return (
    <div
      onClick={handleOutsideClick}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 transition-all duration-300"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative border border-gray-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2a63cd]/10 flex items-center justify-center text-[#2a63cd]">
              <FiGift className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#212529]">Compartir y Ganar</h2>
              <p className="text-[10px] font-bold text-[#6a6c6b] uppercase tracking-wide">
                {item.type === 'product' ? 'Producto Recomentado' : 'Curso de Tecnología'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-[#212529] transition-all"
            aria-label="Cerrar modal"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-hide">
          
          {/* Comisión Ganancia Banner (Si está enrolado) */}
          {hasReferralCode && commissionRate > 0 && (
            <div className="bg-green-50 border border-green-200/60 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                <FiGift className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-green-800">
                  ¡Tu enlace de afiliado está activo!
                </p>
                <p className="text-xs text-green-700 mt-0.5">
                  Gana <strong className="font-bold text-green-800">{commissionRate}%</strong> de comisión (${estimatedEarnings.toFixed(2)} USD) si alguien compra este artículo a través de tu enlace.
                </p>
              </div>
            </div>
          )}

          {/* MOCKUP VISTA PREVIA (SOCIAL OPEN GRAPH CARD SIMULATOR) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#6a6c6b] flex items-center gap-1.5">
              <FiInfo className="w-3.5 h-3.5 text-[#2a63cd]" />
              Vista previa del enlace compartido en redes
            </span>
            
            {/* Contenedor del Mockup tipo WhatsApp */}
            <div className="bg-[#e5ddd5] dark:bg-gray-900 rounded-2xl p-4 border border-gray-200/50 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#128c7e]/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Burbuja de Mensaje */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-2.5 max-w-[85%] sm:max-w-[75%] ml-2 shadow-sm border border-gray-100 flex flex-col gap-2 relative">
                {/* Rabito de la burbuja */}
                <div className="absolute left-[-6px] top-4 w-3 h-3 bg-white dark:bg-gray-800 rotate-45 border-l border-b border-transparent" />
                
                {/* Meta Card */}
                <div className="bg-[#f0f2f5] dark:bg-gray-700/50 rounded-xl overflow-hidden border border-gray-200/40 flex flex-col">
                  {/* Thumbnail Imagen */}
                  {item.image ? (
                    <div className="relative aspect-video w-full bg-white dark:bg-gray-800 flex items-center justify-center border-b border-gray-200/30 overflow-hidden">
                      <img src={item.image} alt={item.title} className="max-h-full max-w-full object-contain p-2 hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <FiGift className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  {/* Info Metadatos */}
                  <div className="p-3 space-y-1">
                    <p className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase">
                      electroshopve.com
                    </p>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white line-clamp-1 leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-300 line-clamp-2 leading-relaxed">
                      {item.description || 'Tienda de tecnología especializada en laptops, consolas, repuestos y cursos online.'}
                    </p>
                  </div>
                </div>

                {/* Texto del link */}
                <div className="text-[11px] text-blue-600 dark:text-blue-400 break-all select-none hover:underline pr-4">
                  {finalLink}
                </div>
                
                {/* Hora del mensaje */}
                <span className="text-[9px] text-gray-400 self-end mt-0.5">
                  12:00 PM
                </span>
              </div>
            </div>
          </div>

          {/* INPUT ENLACE Y COPIAR */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#6a6c6b]">
              Enlace para compartir
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={finalLink}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none focus:border-[#2a63cd] select-all"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                  copied
                    ? 'bg-green-600 text-white shadow-green-100'
                    : 'bg-[#2a63cd] text-white hover:bg-[#1e4ba3] shadow-blue-100'
                }`}
              >
                {copied ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* BOTONES DE REDES SOCIALES */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#6a6c6b]">Compartir en redes</span>
            <div className="grid grid-cols-3 gap-2">
              {/* WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-[#25D366]/20"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </button>

              {/* Telegram */}
              <button
                onClick={handleShareTelegram}
                className="py-2.5 px-3 bg-[#229ED9] hover:bg-[#1f93cb] active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-[#229ED9]/20"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Telegram
              </button>

              {/* Twitter / X */}
              <button
                onClick={handleShareTwitter}
                className="py-2.5 px-3 bg-black hover:bg-gray-900 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-black/10"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter / X
              </button>
            </div>
          </div>

          {/* CTA BANNER (SI NO ESTÁ AFILIADO O NO LOGUEADO) */}
          {!hasReferralCode && (
            <div className="bg-gradient-to-br from-[#1e4ba3]/5 to-[#2a63cd]/10 border border-[#2a63cd]/15 rounded-2xl p-4 space-y-3">
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2a63cd]/10 flex items-center justify-center text-[#2a63cd] flex-shrink-0 mt-0.5">
                  <FiGift className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#212529]">
                    ¿Quieres ganar comisiones en Electro Shop?
                  </h4>
                  <p className="text-[11px] text-[#6a6c6b] mt-0.5 leading-relaxed">
                    Únete al Programa de Referidos e Influencers. Recomienda nuestros productos o cursos a tus seguidores y gana dinero real por cada venta exitosa.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between border-t border-gray-150/40">
                <span className="text-[10px] font-semibold text-gray-500">
                  ¡Es 100% gratis y rápido!
                </span>
                
                {/* Redirección dependiendo de si está logueado o no */}
                {referralData === null ? (
                  <a
                    href={`/registro?redirect=${encodeURIComponent(item.url)}`}
                    className="px-3.5 py-1.5 bg-[#2a63cd] hover:bg-[#1e4ba3] text-white text-[11px] font-bold rounded-lg shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1"
                  >
                    Crear cuenta gratis
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <a
                    href="/customer/referrals"
                    className="px-3.5 py-1.5 bg-[#2a63cd] hover:bg-[#1e4ba3] text-white text-[11px] font-bold rounded-lg shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1"
                  >
                    Activar referidos
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
