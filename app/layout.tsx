import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'CryptoViz',
  description: 'A visualizer for various cryptographic algorithms.',
  icons: {
    icon: '/icon.svg',
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
      // theme-init.js (public/theme-init.js) sets the `dark` class before
      // React hydrates, which will differ from the server-rendered markup.
      // That's expected here, so hydration warnings for this attribute
      // are suppressed rather than "fixed."
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Loaded as an external same-origin script (not inline) so CSP
            can allow the same-origin bootstrap script while keeping the rest
            of the policy restrictive. Mirrors the exact logic in Navbar's
            theme-init effect (same 'theme' localStorage key, same system-
            preference fallback) so the class it sets is never wrong or out
            of sync with what Navbar computes. */}
        <script src="/theme-init.js" />
      </head>
      <body className="min-h-full flex flex-col bg-[#060816] relative">
        {/* Full Page Border Glow */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">

          <div className="absolute -top-40 left-1/2 h-80 w-[1200px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[180px]" />

          <div className="absolute -bottom-40 left-1/2 h-80 w-[1200px] -translate-x-1/2 rounded-full bg-violet-500/15 blur-[180px]" />

          <div className="absolute top-1/2 -left-40 h-[900px] w-80 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[180px]" />

          <div className="absolute top-1/2 -right-40 h-[900px] w-80 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[180px]" />

        </div>
        {children}</body>
    </html>
  );
}
