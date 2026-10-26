import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegistrar } from "@/components/pwa/PwaRegistrar";

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Typist — Calibrated AI Writing Studio",
  description:
    "High-contrast OLED rich-text studio with OpenRouter streaming and Genre Calibration Engine for Fiction, Nonfiction, and Technical Manuals.",
  applicationName: "Typist",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Typist",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/icon-192.png"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#000000] text-neutral-100 antialiased min-h-screen selection:bg-amber-500/30 selection:text-amber-100">
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
