import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import WhatsAppButton from "@/components/WhatsAppButton";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import ShareEarnModal from "@/components/social/ShareEarnModal";
import NotificationToast from "@/components/notifications/NotificationToast";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import MobileNavBar from "@/components/public/MobileNavBar";
import { GuidedTourWrapper } from "@/components/onboarding/GuidedTourWrapper";
import { getPublicSettings, getSiteSettings } from "@/lib/site-settings";
import { getNavCategories } from "@/lib/queries/navigation";

// Los settings públicos se leen aquí para todo el sitio: cada ruta se regenera como mucho
// cada 60 s para que la tasa BCV no quede congelada en las páginas estáticas.
export const revalidate = 60;

// Fuentes locales (sin depender de Google Fonts en el build).
// Inter variable, subconjunto latino (español, € y ™). Licencia OFL: public/fonts/Inter-LICENSE.txt
const inter = localFont({
  src: "../public/fonts/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

// Tektrron: solo el wordmark "ELECTRO SHOP" (clase font-brand)
const tektrron = localFont({
  src: "../public/fonts/Tektrron.ttf",
  variable: "--font-tektrron",
  display: "swap",
  preload: false,
});

// Generate dynamic metadata with favicon and Open Graph from database
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshopve.com';

  // Helper to ensure absolute URL
  const ensureAbsoluteUrl = (url: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${cleanUrl}`;
  };

  const icons: Metadata['icons'] = {};
  const absoluteFavicon = ensureAbsoluteUrl(settings.favicon);

  if (absoluteFavicon) {
    icons.icon = [
      { url: absoluteFavicon, type: 'image/png' },
      { url: absoluteFavicon, sizes: '16x16', type: 'image/png' },
      { url: absoluteFavicon, sizes: '32x32', type: 'image/png' },
      { url: absoluteFavicon, sizes: '192x192', type: 'image/png' },
    ];
    icons.apple = absoluteFavicon;
    icons.shortcut = absoluteFavicon;
  }
  // Sin favicon en settings no se declara ninguno: /favicon.ico no existe en public/

  // Open Graph image: homeMetaImage, logo o favicon (no hay imagen por defecto en public/)
  const ogImage = ensureAbsoluteUrl(settings.homeMetaImage) || ensureAbsoluteUrl(settings.logo) || ensureAbsoluteUrl(settings.favicon);

  const titleText = settings.metaTitle || settings.companyName || "Electro Shop Morandin C.A. | Gaming, Laptops & Tecnología";
  const descText = settings.metaDescription || settings.tagline || "Tienda de tecnología especializada en Guanare. Computadoras gaming, laptops, consolas, CCTV y más.";
  const defaultKeywords = ["gaming", "laptops", "tecnología", "Guanare", "Venezuela", "servicio técnico", "cursos online", "electro shop", "electroshopve", "computadoras Venezuela", "pago móvil"];
  const keywordsList = settings.metaKeywords ? settings.metaKeywords.split(',').map(k => k.trim()) : defaultKeywords;

  return {
    title: {
      default: titleText,
      template: `%s | ${settings.companyName || 'Electro Shop'}`,
    },
    description: descText,
    keywords: keywordsList,
    icons,
    metadataBase: new URL(baseUrl),
    // Open Graph — Optimizado para WhatsApp, Facebook, Telegram
    openGraph: {
      title: titleText,
      description: descText,
      url: baseUrl,
      siteName: settings.companyName || "Electro Shop",
      images: ogImage ? [
        {
          url: ogImage,             // URL absoluta requerida para WhatsApp
          secureUrl: ogImage,       // HTTPS requerido para iOS preview
          width: 1200,              // WhatsApp requiere mínimo 300x200, ideal 1200x630
          height: 630,
          alt: `${settings.companyName || 'Electro Shop'} — Tecnología especializada en Venezuela`,
          type: 'image/jpeg',       // WhatsApp prefiere JPEG vs PNG
        },
      ] : undefined,
      locale: 'es_VE',
      type: 'website',
    },
    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: titleText,
      description: descText,
      images: ogImage ? [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: settings.companyName || 'Electro Shop',
      }] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    // Datos adicionales estructurados
    other: {
      'og:type': 'website',
      'business:contact_data:locality': 'Guanare',
      'business:contact_data:country_name': 'Venezuela',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [publicSettings, navCategories] = await Promise.all([getPublicSettings(), getNavCategories()]);

  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${inter.variable} ${tektrron.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Providers initialSettings={publicSettings} navCategories={navCategories}>
          <NotificationProvider>
            <div className="page-transition-wrapper">
              {children}
            </div>
            {/* Barra inferior móvil: fuera del wrapper para que "fixed" sea relativo a la ventana */}
            <MobileNavBar />
            <WhatsAppButton />
            <NotificationToast />
            <ShareEarnModal />
            <AnalyticsTracker />
            {/* Issue #26 — Tour guiado post-registro */}
            <GuidedTourWrapper />
          </NotificationProvider>
        </Providers>
      </body>
    </html>
  );
}

