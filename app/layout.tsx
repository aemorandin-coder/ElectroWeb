import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import WhatsAppButton from "@/components/WhatsAppButton";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import NotificationToast from "@/components/notifications/NotificationToast";
import DynamicFavicon from "@/components/DynamicFavicon";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import MobileScrollProgress from "@/components/public/MobileScrollProgress";
import MobileNavBar from "@/components/public/MobileNavBar";
import { getSiteSettings } from "@/lib/site-settings";

// Use local fonts to avoid Google Fonts dependency during build
// Inter uses system font fallback
const inter = {
  variable: "--font-inter",
};

const nakadai = localFont({
  src: "../public/fonts/Nakadai.otf",
  variable: "--font-nakadai",
  display: "swap",
});

const tektrron = localFont({
  src: "../public/fonts/Tektrron.ttf",
  variable: "--font-tektrron",
  display: "swap",
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
  } else {
    // Fallback to static favicon
    icons.icon = '/favicon.ico';
  }

  // Open Graph image - use logo if available (ensure absolute URL)
  const ogImage = ensureAbsoluteUrl(settings.logo) || ensureAbsoluteUrl(settings.favicon) || `${baseUrl}/og-image.png`;

  return {
    title: {
      default: settings.companyName || "Electro Shop Morandin C.A. | Gaming, Laptops & Tecnología",
      template: `%s | ${settings.companyName || 'Electro Shop'}`,
    },
    description: settings.tagline || "Tienda de tecnología premium en Guanare. Computadoras gaming, laptops, consolas, CCTV y más. Servicio técnico especializado y cursos online.",
    keywords: ["gaming", "laptops", "tecnología", "Guanare", "Venezuela", "servicio técnico", "cursos online", "electro shop"],
    icons,
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: settings.companyName || "Electro Shop Morandin C.A.",
      description: settings.tagline || "Tienda de tecnología premium en Guanare",
      url: baseUrl,
      siteName: settings.companyName || "Electro Shop",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: settings.companyName || "Electro Shop",
        },
      ],
      locale: 'es_VE',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.companyName || "Electro Shop Morandin C.A.",
      description: settings.tagline || "Tienda de tecnología premium en Guanare",
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${inter.variable} ${nakadai.variable} ${tektrron.variable} antialiased`} suppressHydrationWarning>
        <Providers>
          <NotificationProvider>
            <MobileScrollProgress />
            <div className="page-transition-wrapper">
              {children}
            </div>
            {/* [MOBILE ONLY] Global floating nav bar - OUTSIDE wrapper for fixed positioning */}
            <MobileNavBar />
            <WhatsAppButton />
            <NotificationToast />
            <DynamicFavicon />
            <AnalyticsTracker />
          </NotificationProvider>
        </Providers>
      </body>
    </html>
  );
}

