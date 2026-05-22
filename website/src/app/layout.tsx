import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "RemoteHub — Find Remote Jobs Worldwide | Work From Anywhere",
  description:
    "Discover the best remote jobs from around the world. Curated daily by AI. Engineering, Design, Marketing, and more — updated every 24 hours.",
  keywords: ["remote jobs", "work from home", "worldwide jobs", "remote engineering", "remote design"],
  openGraph: {
    title: "RemoteHub — Find Remote Jobs Worldwide",
    description: "Discover the best remote jobs from around the world, curated daily by AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#06060a] text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
