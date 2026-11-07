import type { Metadata } from "next";

export const SITE_URL = "https://boolbul.com";
export const SITE_NAME = "BoolBul";

/** Every indexable route: drives sitemap.xml, llms.txt and per-page OG images. */
export const SEO_PAGES = [
  { path: "/", og: "home", priority: 1.0, changeFrequency: "weekly" },
  { path: "/pricing", og: "pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/demo", og: "demo", priority: 0.9, changeFrequency: "monthly" },
  { path: "/docs", og: "docs", priority: 0.8, changeFrequency: "weekly" },
  { path: "/docs/quickstart", og: "quickstart", priority: 0.9, changeFrequency: "weekly" },
  { path: "/docs/client-sdk", og: "client-sdk", priority: 0.8, changeFrequency: "weekly" },
  { path: "/docs/server-adapters", og: "server-adapters", priority: 0.8, changeFrequency: "weekly" },
  { path: "/docs/mobile-apps", og: "mobile-apps", priority: 0.7, changeFrequency: "monthly" },
  { path: "/vs/stripe-portal", og: "vs-stripe-portal", priority: 0.8, changeFrequency: "monthly" },
  { path: "/vs/churnkey", og: "vs-churnkey", priority: 0.8, changeFrequency: "monthly" },
  { path: "/compliance/ftc-click-to-cancel", og: "ftc-click-to-cancel", priority: 0.8, changeFrequency: "monthly" },
] as const;

export type SeoPath = (typeof SEO_PAGES)[number]["path"];

/**
 * Canonical URL, OpenGraph and Twitter large-card metadata for one page.
 * `title` is the page name; the root template appends "| BoolBul".
 */
export function pageMetadata({ path, title, description, socialTitle }: {
  path: SeoPath; title: string; description: string; socialTitle?: string;
}): Metadata {
  const page = SEO_PAGES.find((p) => p.path === path)!;
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  const image = { url: `/og/${page.og}.png`, width: 1200, height: 630, alt: socialTitle ?? title };
  return {
    title: path === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, siteName: SITE_NAME, locale: "en_US", title: socialTitle ?? title, description, images: [image] },
    twitter: { card: "summary_large_image", title: socialTitle ?? title, description, images: [image.url], creator: "@miaciastudio" },
  };
}

export const organizationLd = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/logo.png` },
  email: "hello@boolbul.com",
  sameAs: ["https://github.com/miaciastudio/Boolbul-public", "https://www.npmjs.com/package/@boolbul/sdk", "https://twitter.com/miaciastudio"],
};

export const websiteLd = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: "In-app cancellation flows with exit surveys, pause and discount offers for SaaS on Dodo Payments and Stripe.",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export const softwareApplicationLd = {
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#software`,
  name: "BoolBul",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Churn reduction / subscription retention",
  operatingSystem: "Web, iOS, Android (WebView)",
  description: "Drop-in cancellation flow for SaaS: one-tap exit survey, reason-matched pause and discount offers, and an always-visible one-click cancel link. Works with Dodo Payments and Stripe; fails open in 1.5 seconds.",
  featureList: [
    "In-app cancellation flow (web, React, mobile WebView)",
    "Exit survey mapped to Dodo Payments and Stripe cancellation feedback",
    "Pause and discount offers applied by your own server",
    "Signed single-use offer tokens (zero-trust, no gateway keys shared)",
    "1.5 second fail-open",
    "Always-visible one-click cancel link, WCAG AA themes",
  ],
  softwareVersion: "1.0.0",
  publisher: { "@id": `${SITE_URL}/#organization` },
  offers: [
    { "@type": "Offer", name: "Invite-only beta (first 100 SaaS)", price: "0", priceCurrency: "USD", description: "Pro free for 3 months for approved beta founders. No credit card." },
    { "@type": "Offer", name: "Starter", price: "19.00", priceCurrency: "USD", description: "Up to 500 saved subscribers per month.",
      priceSpecification: { "@type": "UnitPriceSpecification", price: "19.00", priceCurrency: "USD", billingDuration: "P1M", unitText: "MONTH" } },
    { "@type": "Offer", name: "Pro", price: "49.00", priceCurrency: "USD", description: "Unlimited saved subscribers.",
      priceSpecification: { "@type": "UnitPriceSpecification", price: "49.00", priceCurrency: "USD", billingDuration: "P1M", unitText: "MONTH" } },
  ],
};

export function faqLd(faqs: readonly { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function breadcrumbLd(items: readonly { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: `${SITE_URL}${item.path === "/" ? "" : item.path}` })),
  };
}

export function articleLd({ path, headline, description, dateModified }: { path: string; headline: string; description: string; dateModified: string }) {
  return {
    "@type": "TechArticle",
    headline, description, dateModified, datePublished: dateModified,
    mainEntityOfPage: `${SITE_URL}${path}`,
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    image: `${SITE_URL}/og/${SEO_PAGES.find((p) => p.path === path)?.og ?? "home"}.png`,
  };
}

/** Serialise JSON-LD safely for a <script> tag (no "</script>" breakouts). */
export function ldJson(...nodes: object[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c");
}
