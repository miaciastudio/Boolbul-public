import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const PRIVATE = ["/api/", "/dashboard", "/onboarding", "/auth/", "/w/"];

// Search and AI assistants are explicitly welcome on public pages; app and API routes stay out.
const AI_CRAWLERS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot-Extended", "Bingbot", "DuckAssistBot", "CCBot", "cohere-ai", "Meta-ExternalAgent", "Amazonbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
