import type { Metadata } from "next";
import "./globals.css";
import { ldJson, organizationLd, SITE_URL, websiteLd } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "BoolBul — In-App Cancellation Flow & Churn Reduction for SaaS", template: "%s | BoolBul" },
  applicationName: "BoolBul",
  description: "In-app cancellation flow for SaaS: exit survey, pause and discount offers, one-click cancel. Dodo Payments + Stripe.",
  // Default social card; indexable pages override this (and set their own canonical) via pageMetadata().
  openGraph: { type: "website", siteName: "BoolBul", locale: "en_US", images: [{ url: "/og/home.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", creator: "@miaciastudio", images: ["/og/home.png"] },
  keywords: [
    "cancellation flow", "churn reduction", "subscription retention", "SaaS churn", "exit survey",
    "Dodo Payments retention", "Stripe cancellation flow", "Stripe customer portal alternative", "Churnkey alternative",
    "pause subscription", "retention offer", "click to cancel", "indie hacker SaaS tools",
  ],
  authors: [{ name: "Miacia Studio", url: SITE_URL }],
  creator: "Miacia Studio",
  publisher: "BoolBul",
  formatDetection: { email: false, address: false, telephone: false },
  icons: {
    icon: [{ url: "/brand/logo.png", type: "image/png" }, { url: "/favicon.ico", sizes: "any" }],
    shortcut: ["/brand/logo.png"],
    apple: [{ url: "/brand/logo.png", sizes: "180x180", type: "image/png" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Site-wide identity; page-specific schema (software, FAQ, articles) lives on each page. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationLd, websiteLd) }} />
      </head>
      <body className="antialiased min-h-screen selection:bg-lime selection:text-pitch">
        {children}
      </body>
    </html>
  );
}
