import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/context";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import ServiceWorkerIntegrity from "@/components/offline/ServiceWorkerIntegrity";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = 'https://openprep.ai';

export const metadata: Metadata = {
  title: 'OpenPrep AI - Smarter Exam Preparation and Analytics',
  description: 'Master your curriculum, track study streaks, and simulate real testing conditions with AI-powered diagnostics.',
  icons: {
    icon: '/icon.svg',
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'OpenPrep AI - Smarter Exam Preparation and Analytics',
    description: 'Master your curriculum, track study streaks, and simulate real testing conditions with AI-powered diagnostics.',
    url: SITE_URL,
    siteName: 'OpenPrep AI',
    images: [
      {
        url: `${SITE_URL}/assets/og-sharing-banner.png`,
        width: 1200,
        height: 630,
        alt: 'OpenPrep AI Learning Workspace Preview Card Thumbnail',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenPrep AI - Smarter Exam Preparation and Analytics',
    description: 'Master your curriculum, track study streaks, and simulate real testing conditions with AI-powered diagnostics.',
    images: [`${SITE_URL}/assets/og-sharing-banner.png`],
    creator: '@OpenPrepAI',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLdStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#webapp`,
        "url": SITE_URL,
        "name": "OpenPrep AI",
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "All",
        "browserRequirements": "Requires JavaScript. Requires HTML5.",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "INR"
        }
      },
      {
        "@type": "Course",
        "@id": `${SITE_URL}/#course`,
        "name": "AI-Powered Adaptive Mock Examination Modules",
        "description": "Standardized competitive exam tracking grids with integrated optical mark recognition bubble sheets.",
        "provider": {
          "@type": "Organization",
          "name": "OpenPrep AI",
          "url": SITE_URL
        }
      }
    ]
  };

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdStructuredData) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white dark:bg-[#060816] relative">
        {/* Skip-to-content link for keyboard and screen reader users */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        {/* Full Page Border Glow */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">

        </div>
        <LanguageProvider>
          <ServiceWorkerIntegrity />
          <main id="main-content" tabIndex={-1} className="outline-none flex-1">
            {children}
          </main>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
