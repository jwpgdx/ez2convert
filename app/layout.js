import { Geist, Geist_Mono } from "next/font/google";
import { getSiteUrl } from "@/lib/config/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();

export const metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "EZ2 File",
  title: {
    default: "EZ2 File",
    template: "%s | EZ2 File",
  },
  description:
    "Convert WebP, PNG, JPG, AVIF, GIF, and short videos locally in your browser.",
  keywords: [
    "webp converter",
    "webp to png",
    "image to webp",
    "video to webp",
    "jpg to png",
    "avif converter",
    "gif converter",
    "local image converter",
  ],
  openGraph: {
    title: "EZ2 File",
    description:
      "Convert WebP, PNG, JPG, AVIF, GIF, and short videos locally in your browser.",
    url: siteUrl,
    siteName: "EZ2 File",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "EZ2 File",
    description:
      "Convert WebP, PNG, JPG, AVIF, GIF, and short videos locally in your browser.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
