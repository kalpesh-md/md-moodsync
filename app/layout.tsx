import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "MoodScale - Mental Health & Wellness Platform",
  description:
    "Transform your mental well-being with MoodScale's personalized therapy, counseling, and wellness services.",
  applicationName: "MoodSync",
  keywords: [
    "mental health",
    "therapy",
    "counseling",
    "wellness",
    "mood tracking",
    "MoodSync",
  ],
  authors: [{ name: "MoodScale Team" }],
  creator: "MoodScale",
  publisher: "Almasoul Consulting Private Limited",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "MoodScale - Mental Health & Wellness Platform",
    description:
      "Transform your mental well-being with personalized therapy and evidence-based wellness solutions.",
    siteName: "MoodScale",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} font-sans`}>{children}</body>
    </html>
  );
}
