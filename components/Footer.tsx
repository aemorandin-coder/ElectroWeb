'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/contexts/SettingsContext';
import { FiBox, FiMapPin, FiPhone, FiMessageCircle, FiMail } from 'react-icons/fi';
import { FaInstagram, FaTiktok, FaTelegram, FaYoutube } from 'react-icons/fa6';

const SEED_PHONES = ['584241234567', '4241234567'];
const isSeedPhone = (p: string | null | undefined) => {
  if (!p) return false;
  return SEED_PHONES.some(s => p.replace(/[\s\-\+]/g, '').includes(s));
};

export default function Footer() {
  const currentYear = new Date().getFullYear();
  // Settings públicos del servidor (SettingsProvider): sin fetch propio
  const { settings } = useSettings();

  // Sanitizar el número de WhatsApp (eliminar +, espacios, guiones)
  const waNumber = settings?.whatsapp?.replace(/\D/g, '') || '';

  // data-site-footer: en móvil, globals.css le suma el alto de la barra inferior (C-21)
  return (
    <footer data-site-footer className="bg-ink text-white pt-10 pb-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          {/* Brand */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              {settings?.logo ? (
                <Image src={settings.logo} alt={settings.companyName || 'Logo'} width={32} height={32} unoptimized={!settings.logo.startsWith('/')} className="w-8 h-8 object-contain rounded-lg" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                  <FiBox className="w-5 h-5 text-white" />
                </div>
              )}
              <h3 className="font-brand text-base font-bold">
                {settings?.companyName || 'Electro Shop'}
              </h3>
            </div>
            <p className="text-xs text-subtle mb-3">
              {settings?.tagline || 'Tu tienda de tecnología en Venezuela'}
            </p>
            <div className="flex justify-center md:justify-start gap-2 flex-wrap">
              {settings?.instagram && (
                <a href={settings.instagram} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-brand-500 hover:scale-110 transition-all">
                  <FaInstagram className="w-4 h-4 text-white" />
                </a>
              )}
              {settings?.tiktok && (
                <a href={settings.tiktok} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-brand-500 hover:scale-110 transition-all">
                  <FaTiktok className="w-4 h-4 text-white" />
                </a>
              )}
              {settings?.telegram && (
                <a href={settings.telegram} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-brand-500 hover:scale-110 transition-all">
                  <FaTelegram className="w-4 h-4 text-white" />
                </a>
              )}
              {settings?.youtube && (
                <a href={settings.youtube} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-brand-500 hover:scale-110 transition-all">
                  <FaYoutube className="w-4 h-4 text-white" />
                </a>
              )}
            </div>
          </div>

          {/* Tienda Links */}
          <div className="hidden lg:block">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Tienda</h4>
            <ul className="space-y-1.5 text-xs text-subtle">
              {[
                ['Productos', '/productos'],
                ['Gift Cards', '/gift-cards'],
                ['Categorías', '/categorias'],
                ['Cursos', '/cursos'],
                ['Enseña en ElectroShop', '/creator'],
              ].map(([l, h]) => (
                <li key={h}>
                  <Link href={h} className="hover:text-brand-500 transition-colors">{l}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Servicios Links */}
          <div className="hidden lg:block">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Servicios</h4>
            <ul className="space-y-1.5 text-xs text-subtle">
              {[
                ['Servicio Técnico', '/servicios'],
                ['CCTV', '/servicios'],
                ['PC Gaming', '/servicios'],
                ['Software', '/servicios'],
              ].map(([l, h]) => (
                <li key={l}>
                  <Link href={h} className="hover:text-brand-500 transition-colors">{l}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Contacto</h4>
            <ul className="space-y-2 text-xs text-subtle">
              {settings?.address && (
                <li className="flex justify-center md:justify-start items-center gap-2">
                  <FiMapPin className="w-4 h-4 flex-shrink-0" /> {settings.address}
                </li>
              )}
              {settings?.phone && !isSeedPhone(settings.phone) && (
                <li>
                  <a href={`tel:${settings.phone}`}
                    className="hover:text-brand-500 flex justify-center md:justify-start items-center gap-2">
                    <FiPhone className="w-4 h-4 flex-shrink-0" /> {settings.phone}
                  </a>
                </li>
              )}
              {waNumber && !isSeedPhone(waNumber) && (
                <li>
                  {/* FIX #3: número sanitizado con .replace(/\D/g,'') */}
                  <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
                    className="hover:text-brand-500 flex justify-center md:justify-start items-center gap-2">
                    <FiMessageCircle className="w-4 h-4 flex-shrink-0" /> WhatsApp
                  </a>
                </li>
              )}
              {settings?.email && (
                <li>
                  <a href={`mailto:${settings.email}`}
                    className="hover:text-brand-500 flex justify-center md:justify-start items-center gap-2">
                    <FiMail className="w-4 h-4 flex-shrink-0" /> {settings.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar — ahora con RIF y Razón Social */}
        <div className="pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
            <p>© {currentYear} {settings?.companyName || 'Electro Shop Morandin C.A.'} Todos los derechos reservados.</p>
            {(settings?.rif || settings?.legalName) && (
              <span className="hidden sm:inline text-muted">·</span>
            )}
            {settings?.legalName && (
              <p className="text-muted">{settings.legalName}</p>
            )}
            {settings?.rif && (
              <p className="text-muted">RIF: {settings.rif}</p>
            )}
          </div>
          <div className="flex gap-4">
            <Link href="/terminos" className="hover:text-brand-500 transition-colors">Términos</Link>
            <Link href="/privacidad" className="hover:text-brand-500 transition-colors">Privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
