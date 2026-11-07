import type { MetadataRoute } from "next";
import { SEO_PAGES, SITE_URL } from "@/lib/seo";

/** Generated from SEO_PAGES so every indexable page (and only those) is listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return SEO_PAGES.map((page) => ({
    url: `${SITE_URL}${page.path === "/" ? "" : page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    images: [`${SITE_URL}/og/${page.og}.png`],
  }));
}
