import type { Metadata } from "next";
import { Inter, Tektur } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import WhatsAppButton from "@/components/WhatsAppButton";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import NotificationToast from "@/components/notifications/NotificationToast";


const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const tektur = Tektur({
  variable: "--font-tektur",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Electro Shop Morandin C.A. | Gaming, Laptops & Tecnología",
  description: "Tienda de tecnología premium en Guanare. Computadoras gaming, laptops, consolas, CCTV y más. Servicio técnico especializado y cursos online.",
  keywords: ["gaming", "laptops", "tecnología", "Guanare", "Venezuela", "servicio técnico", "cursos online"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${tektur.variable} antialiased`}>
        <Providers>
          <NotificationProvider>
            <div className="page-transition-wrapper">
              {children}
            </div>
            <WhatsAppButton />
            <NotificationToast />
          </NotificationProvider>
        </Providers>
      </body>
    </html>
  );
}
