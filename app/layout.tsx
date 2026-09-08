import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { PWAInstall } from "@/components/PWAInstall";
import "./globals.css";

export const metadata: Metadata = {
  title: "FanControl — Atomberg Cloud",
  description: "Direct-to-cloud control for Atomberg smart ceiling fans.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FanControl",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b1329",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-cyan-500/20 selection:text-cyan-200 safe-area-inset">
        <Providers>
          <PWAInstall />
          <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-12 sm:pb-8">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
