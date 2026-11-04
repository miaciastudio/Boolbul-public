import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://boolbul.com"),
  title: {
    default: "BoolBul — #1 Retention & Churn-Buster Engine for Dodo Payments",
    template: "%s | BoolBul",
  },
  description:
    "Stop losing MRR. BoolBul is the first native retention interceptor & cancel-deflection modal for Dodo Payments and Stripe. Zero-trust security, 1500ms fail-open guarantee, 45-second setup.",
  keywords: [
    "dodo payments",
    "dodo payments retention",
    "dodo payments cancel modal",
    "dodo payments subscription pause",
    "subscription churn prevention",
    "cancel deflection modal",
    "saas retention engine",
    "stripe churn buster",
    "stripe cancellation flow",
    "indie hacker micro-saas",
    "reduce saas churn",
    "customer retention software",
    "lemonsqueezy churn prevention",
    "click to cancel compliance",
    "ftc cancel rule compliance",
    "california ab 390 compliance",
    "zero-trust retention widget",
    "vibe coding saas tools",
    "mrr protection",
  ],
  authors: [{ name: "Miacia Studio", url: "https://boolbul.com" }],
  creator: "Miacia Studio",
  publisher: "BoolBul",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://boolbul.com",
  },
  openGraph: {
    title: "BoolBul — Drop Churn, Keep The Cash",
    description:
      "The first native retention & cancel deflection engine for Dodo Payments. Intercept cancellations with dynamic offers in 45 seconds.",
    url: "https://boolbul.com",
    siteName: "BoolBul",
    images: [
      {
        url: "/banners/stop-churn-banner.png",
        width: 1200,
        height: 630,
        alt: "BoolBul Retention Interceptor for Dodo Payments",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BoolBul — Drop Churn, Keep The Cash",
    description:
      "The first native retention & churn-buster engine for Dodo Payments. Protect your MRR in 45 seconds.",
    images: ["/banners/stop-churn-banner.png"],
    creator: "@miaciastudio",
  },
  icons: {
    icon: [
      { url: "/brand/logo.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: ["/brand/logo.png"],
    apple: [{ url: "/brand/logo.png", sizes: "180x180", type: "image/png" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://boolbul.com/#organization",
        name: "BoolBul",
        url: "https://boolbul.com",
        logo: {
          "@type": "ImageObject",
          url: "https://boolbul.com/brand/logo.png",
          caption: "BoolBul Red-whiskered Bulbul Mascot Logo",
        },
        sameAs: [
          "https://github.com/miaciastudio/Boolbul-public",
          "https://twitter.com/miaciastudio",
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://boolbul.com/#website",
        url: "https://boolbul.com",
        name: "BoolBul",
        description:
          "The first native retention & cancel deflection engine for Dodo Payments.",
        publisher: {
          "@id": "https://boolbul.com/#organization",
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "BoolBul Retention Interceptor",
        operatingSystem: "Cloud / All",
        applicationCategory: "BusinessApplication",
        url: "https://boolbul.com",
        offers: {
          "@type": "Offer",
          price: "19.00",
          priceCurrency: "USD",
        },
        featureList:
          "Dodo Payments Subscriptions API Integration, Zero-Trust Signed JWT Offer Tokens, 1500ms Fail-Open Guarantee, FTC Click-to-Cancel Compliance, Dynamic Discounts and Pauses",
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased min-h-screen selection:bg-lime selection:text-pitch">
        {children}
      </body>
    </html>
  );
}
