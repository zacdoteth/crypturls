import type { Metadata } from "next";
import { JetBrains_Mono, DM_Sans, Outfit } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "CRYPTURLS — The entire crypto world on a single page",
  description:
    "Real-time crypto news aggregator pulling from 15+ sources and 6 communities. The BizToc of crypto.",
  keywords: [
    "crypto",
    "bitcoin",
    "ethereum",
    "news",
    "aggregator",
    "defi",
    "web3",
  ],
  openGraph: {
    title: "CRYPTURLS",
    description: "The entire crypto world on a single page",
    siteName: "CryptUrls",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jetbrainsMono.variable} ${dmSans.variable} ${outfit.variable}`}
        style={{ background: "#080C18", margin: 0 }}
      >
        {children}
      </body>
    </html>
  );
}
