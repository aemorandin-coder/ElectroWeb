import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import WhatsAppButton from "@/components/WhatsAppButton";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import ShareEarnModal from "@/components/social/ShareEarnModal";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import MobileNavBar from "@/components/public/MobileNavBar";
import { GuidedTourWrapper } from "@/components/onboarding/GuidedTourWrapper";
import { getPublicSettings, getSiteSettings } from "@/lib/site-settings";
import { getNavCategories } from "@/lib/queries/navigation";
import { imagenDePagina } from "@/lib/og/datos";
import { absoluteUrl, siteUrl } from "@/lib/seo";

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

  const baseUrl = siteUrl();
  // Las imágenes subidas salen por /uploads/… (robots.txt cierra /api/): lib/seo.ts
  const ensureAbsoluteUrl = absoluteUrl;

  const icons: Metadata['icons'] = {};
  // Sin favicon se usa el logo: sin ningún ícono declarado, el navegador pide /favicon.ico y da 404 (F6)
  const absoluteFavicon = ensureAbsoluteUrl(settings.favicon) || ensureAbsoluteUrl(settings.logo);

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

  // C-178: la imagen al compartir es la de Configuración → SEO → Inicio si se subió; si no, la que arma la tienda
  // (1200 × 630, lib/og). Antes, sin imagen subida, salía el logo cuadrado.
  const ogImage = await imagenDePagina('inicio', settings.homeMetaImage);

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
      // Sin `url`: lo heredaban todas las páginas sin Open Graph propio y decían ser la portada (C-149)
      siteName: settings.companyName || "Electro Shop",
      // URL absoluta y HTTPS: WhatsApp y la vista previa de iOS no aceptan otra cosa
      images: [{ ...ogImage, secureUrl: ogImage.url }],
      locale: 'es_VE',
      type: 'website',
    },
    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: titleText,
      description: descText,
      images: [{ url: ogImage.url, alt: ogImage.alt }],
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

