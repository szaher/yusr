import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { Cairo, Inter } from "next/font/google";
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

export const metadata = {
  title: "Yusr Academy",
  description: "Yusr Academy for Quran Learning",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const fontClass = locale === "ar" ? cairo.variable : inter.variable;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${cairo.variable} ${inter.variable} ${fontClass} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster position="top-center" dir={dir} />
        </ThemeProvider>
      </body>
    </html>
  );
}
