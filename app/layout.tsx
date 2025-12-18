import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import WhatsAppButton from "@/components/WhatsAppButton";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import NotificationToast from "@/components/notifications/NotificationToast";
import DynamicFavicon from "@/components/DynamicFavicon";
import AnalyticsTracker from "@/components/AnalyticsTracker";
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

// Generate dynamic metadata with favicon from database
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  const icons: Metadata['icons'] = {};

  if (settings.favicon) {
    icons.icon = [
      { url: settings.favicon, type: 'image/png' },
      { url: settings.favicon, sizes: '16x16', type: 'image/png' },
      { url: settings.favicon, sizes: '32x32', type: 'image/png' },
    ];
    icons.apple = settings.favicon;
    icons.shortcut = settings.favicon;
  }

  return {
    title: settings.companyName || "Electro Shop Morandin C.A. | Gaming, Laptops & Tecnología",
    description: settings.tagline || "Tienda de tecnología premium en Guanare. Computadoras gaming, laptops, consolas, CCTV y más. Servicio técnico especializado y cursos online.",
    keywords: ["gaming", "laptops", "tecnología", "Guanare", "Venezuela", "servicio técnico", "cursos online"],
    icons,
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
            <div className="page-transition-wrapper">
              {children}
            </div>
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

