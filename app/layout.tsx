import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Astro Palm — Your future, written in your hands",
  description:
    "Photograph your palm and receive an AI palm reading across love, career, wealth, health and personal growth.",
};

export const viewport: Viewport = {
  themeColor: "#F6F6FB",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="starfield min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
