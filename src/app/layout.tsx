import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "linger — Event Social Discovery",
  description:
    "Discover people around you, see how they look tonight, and express interest before the moment passes.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "linger.",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2b0712",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-[#1a040a] text-white antialiased selection:bg-white selection:text-burgundy-900">
        {/* Ambient radial burgundy glow behind the mobile viewport on larger screens */}
        <div className="min-h-[100dvh] w-full flex justify-center bg-[radial-gradient(ellipse_at_top,_#541126_0%,_#2b0712_55%,_#160308_100%)]">
          <div className="w-full max-w-[430px] min-h-[100dvh] bg-gradient-to-b from-[#420c1d] via-[#2b0712] to-[#1e040c] sm:border-x sm:border-white/10 shadow-[0_0_90px_rgba(0,0,0,0.75)] flex flex-col relative overflow-x-hidden">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
