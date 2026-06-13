import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import PWAProvider from "@/components/PWAProvider";
import Script from "next/script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#06060a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.futuretalent.online"),
  alternates: {
    canonical: "/",
  },
  title: "FutureTalent — Find Remote, Hybrid & On-Site Jobs Worldwide",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
  description:
    "Discover the best remote, hybrid, and on-site jobs from around the world. Curated daily by AI. Engineering, Design, Marketing, and more — updated every 24 hours.",
  keywords: ["remote jobs", "hybrid jobs", "on-site jobs", "work from home", "worldwide jobs", "remote engineering", "remote design", "futuretalent", "futuretalent.online"],
  openGraph: {
    title: "FutureTalent — Find Remote, Hybrid & On-Site Jobs Worldwide",
    description: "Discover the best remote, hybrid, and on-site jobs from around the world, curated daily by AI.",
    type: "website",
  },
  verification: {
    google: "2vEd6NYdXeVZTXlbsJtssfTBMEJzDlAePixBngSHC-o",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {adsenseClient && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
            strategy="lazyOnload"
          />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-[#06060a] text-white" suppressHydrationWarning>
        <PWAProvider>
          {children}
        </PWAProvider>
      </body>
    </html>
  );
}
