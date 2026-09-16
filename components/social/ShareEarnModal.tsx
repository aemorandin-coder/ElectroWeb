'use client';
import { formatUSD } from '@/lib/currency';

import { useState, useEffect, useRef } from 'react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { adminModalOverlay, adminModalPanel, adminModalHeader, adminLabel, adminInput } from '@/lib/admin-ui';
import Image from 'next/image';
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
  useBodyScrollLock(isOpen);

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
      ? `¡Te recomiendo este producto de Electro Shop! ${item.title} por solo ${formatUSD(item.price)}. Compra desde este enlace: ${finalLink}`
      : `¡Mira este increíble curso de tecnología en Electro Shop! "${item.title}". Aprende hoy aquí: ${finalLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Compartir en Telegram
  const handleShareTelegram = () => {
    const text = item.type === 'product'
      ? `¡Te recomiendo este producto de Electro Shop! ${item.title}`
      : `¡Mira este increíble curso de tecnología en Electro Shop! "${item.title}"`;
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
      className={adminModalOverlay}
    >
      <div
        ref={modalRef}
        className={`${adminModalPanel} max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className={adminModalHeader}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
              <FiGift className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Compartir y Ganar</h2>
              <p className="text-xs font-bold text-muted uppercase tracking-wide">
                {item.type === 'product' ? 'Producto Recomendado' : 'Curso de Tecnología'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 text-muted hover:text-ink hover:bg-surface rounded-lg transition-colors"
            aria-label="Cerrar modal"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-hide">
          
          {/* Comisión Ganancia Banner (Si está enrolado) */}
          {hasReferralCode && commissionRate > 0 && (
            <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center text-success-strong flex-shrink-0">
                <FiGift className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-success-strong">
                  ¡Tu enlace de afiliado está activo!
                </p>
                <p className="text-xs text-ink mt-0.5">
                  Gana <strong className="font-bold text-success-strong">{commissionRate}%</strong> de comisión ({formatUSD(estimatedEarnings)}) si alguien compra este artículo a través de tu enlace.
                </p>
              </div>
            </div>
          )}

          {/* MOCKUP VISTA PREVIA */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted flex items-center gap-1.5">
              <FiInfo className="w-3.5 h-3.5 text-brand-500" />
              Vista previa del enlace compartido en redes
            </span>
            
            <div className="bg-surface rounded-xl p-4 border border-line relative overflow-hidden">
              <div className="bg-white rounded-xl p-3 max-w-[90%] shadow-sm border border-line flex flex-col gap-2 relative">
                <div className="bg-surface rounded-lg overflow-hidden border border-line flex flex-col">
                  {item.image ? (
                    <div className="relative aspect-video w-full bg-white flex items-center justify-center border-b border-line overflow-hidden">
                      <Image src={item.image} alt={item.title} width={320} height={180} className="max-h-full max-w-full object-contain p-2" />
                    </div>
                  ) : null}
                  <div className="p-2.5">
                    <h4 className="text-xs font-bold text-ink line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                      {item.description || 'Tienda de tecnología especializada en laptops, consolas, repuestos y cursos online.'}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-brand-500 break-all select-none hover:underline pr-4">
                  {finalLink}
                </div>
                
                <span className="text-[11px] text-muted self-end mt-0.5">
                  12:00 PM
                </span>
              </div>
            </div>
          </div>

          {/* INPUT ENLACE Y COPIAR */}
          <div className="space-y-1.5">
            <label className={adminLabel}>
              Enlace para compartir
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={finalLink}
                className={`${adminInput()} font-mono`}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm ${
                  copied
                    ? 'bg-success-strong text-white'
                    : 'bg-brand-500 text-white hover:bg-brand-600'
                }`}
              >
                {copied ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* BOTONES DE REDES SOCIALES */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted">Compartir en redes</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 bg-success-strong hover:bg-success text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </button>

            <button
              type="button"
              onClick={handleShareTelegram}
              className="py-2.5 px-3 bg-info hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Telegram
            </button>

            <button
              type="button"
              onClick={handleShareTwitter}
              className="py-2.5 px-3 bg-ink hover:bg-ink-soft text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Twitter / X
            </button>
          </div>
        </div>

        {/* CTA BANNER */}
        {!hasReferralCode && (
          <div className="bg-surface border border-line rounded-xl p-4 space-y-3">
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500 flex-shrink-0 mt-0.5">
                <FiGift className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink">
                  ¿Quieres ganar comisiones en Electro Shop?
                </h4>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                  Únete al Programa de Referidos e Influencers. Recomienda nuestros productos o cursos a tus seguidores y gana dinero real por cada venta exitosa.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-line">
              <span className="text-xs font-semibold text-muted">
                ¡Es 100% gratis y rápido!
              </span>
              
              {referralData === null ? (
                <a
                  href={`/registro?redirect=${encodeURIComponent(item.url)}`}
                  className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  Crear cuenta gratis
                  <FiExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <a
                  href="/customer/referrals"
                  className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
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
