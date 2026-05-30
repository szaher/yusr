import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { getLocale } from "next-intl/server";
import { Cairo, Inter, Amiri } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "@/app/globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
});

export const metadata: Metadata = {
  title: "Yusr Academy",
  description: "Yusr Academy for Quran Learning",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yusr",
  },
  icons: {
    icon: "/icons/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16a34a",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const fontClass = locale === "ar" ? cairo.variable : inter.variable;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${cairo.variable} ${inter.variable} ${amiri.variable} ${fontClass} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster position="top-center" dir={dir} />
        </ThemeProvider>
      </body>
    </html>
  );
}
