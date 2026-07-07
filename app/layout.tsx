import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ЕППБ — Единый портал поддержки бизнеса",
  description:
    "Цифровая платформа поддержки бизнеса с no-code конструктором услуг и форм.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={cn("min-h-screen font-sans antialiased", geistSans.variable)}
      >
        {children}
      </body>
    </html>
  );
}
