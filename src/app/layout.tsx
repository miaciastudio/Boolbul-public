import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://boolbul.com"),
  title: {
    default: "BoolBul — In-App Cancellation Interceptor & Churn Prevention",
    template: "%s | BoolBul",
  },
  description:
    "Lightweight, in-app cancellation interceptor for indie SaaS builders. Keep subscribers inside your app with customizable exit pauses, discounts, and real exit feedback.",
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
      "Lightweight, in-app cancellation interceptor for indie SaaS builders. Keep subscribers inside your app with pauses, discounts, and exit feedback.",
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
      "Lightweight, in-app cancellation interceptor for indie SaaS builders. Protect your MRR with zero dark patterns.",
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
          "Lightweight, in-app cancellation interceptor for indie SaaS builders.",
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
      {
        "@type": "HowTo",
        name: "How to Integrate BoolBul in Your SaaS in 2 Minutes",
        description: "Step-by-step guide to installing BoolBul's lightweight cancellation interceptor snippet and rescuing churning subscribers.",
        step: [
          {
            "@type": "HowToStep",
            name: "Embed the Client Script",
            text: "Include the 4KB client SDK script on your billing or subscription management page.",
            url: "https://boolbul.com/docs/quickstart",
          },
          {
            "@type": "HowToStep",
            name: "Trigger the Interceptor on Cancel Click",
            text: "Call window.BoolBul.intercept() when a user clicks the cancel button with their subscription ID and customer email.",
            url: "https://boolbul.com/docs/client-sdk",
          },
          {
            "@type": "HowToStep",
            name: "Verify Webhook and Apply Rescue Offer",
            text: "Handle the webhook to pause subscription or apply a discount in Dodo Payments or Stripe.",
            url: "https://boolbul.com/docs/webhooks",
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Is BoolBul compliant with the FTC Click-to-Cancel rule?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. BoolBul guarantees zero dark patterns. An immediate high-contrast 'Proceed to Cancel' escape hatch is always visible and clickable with WCAG AA 4.5:1 contrast, satisfying 16 CFR Part 425 and California ARL.",
            },
          },
          {
            "@type": "Question",
            name: "Does BoolBul require sharing my payment gateway secret keys?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. BoolBul operates on a zero-trust model. You use a public key for client-side deflection and verify exit events on your own server using HMAC signatures. Your gateway API keys never touch BoolBul servers.",
            },
          },
          {
            "@type": "Question",
            name: "What happens if the retention interceptor fails or times out?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "BoolBul enforces a strict 1500ms fail-open SLA. If network latency exceeds 1.5 seconds, the user is immediately allowed to cancel smoothly without blocking their workflow.",
            },
          },
        ],
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
