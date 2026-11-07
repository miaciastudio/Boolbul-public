import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { FAQS } from "@/lib/faq";
import { faqLd, ldJson, pageMetadata, SEO_PAGES, softwareApplicationLd } from "@/lib/seo";

describe("SEO engine", () => {
  it("lists all 11 high-value pages in the sitemap with absolute URLs and OG images", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toEqual(expect.arrayContaining([
      "https://boolbul.com", "https://boolbul.com/pricing", "https://boolbul.com/demo", "https://boolbul.com/docs",
      "https://boolbul.com/docs/quickstart", "https://boolbul.com/docs/client-sdk", "https://boolbul.com/docs/server-adapters",
      "https://boolbul.com/docs/mobile-apps", "https://boolbul.com/vs/stripe-portal", "https://boolbul.com/vs/churnkey",
      "https://boolbul.com/compliance/ftc-click-to-cancel",
    ]));
    expect(urls.some((u) => /dashboard|login|onboarding|api/.test(u))).toBe(false);
  });

  it("gives every page a canonical URL and a 1200x630 large card", () => {
    for (const page of SEO_PAGES) {
      const meta = pageMetadata({ path: page.path, title: "T", description: "D" });
      expect(meta.alternates?.canonical).toBe(`https://boolbul.com${page.path === "/" ? "" : page.path}`);
      expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
      expect(meta.openGraph?.images).toEqual([expect.objectContaining({ url: `/og/${page.og}.png`, width: 1200, height: 630 })]);
    }
  });

  it("welcomes AI crawlers but keeps app and API routes out", () => {
    const rules = robots().rules as { userAgent: string | string[]; allow?: string | string[]; disallow?: string | string[] }[];
    const ai = rules.find((r) => Array.isArray(r.userAgent) && r.userAgent.includes("GPTBot"))!;
    expect(ai.userAgent).toEqual(expect.arrayContaining(["ClaudeBot", "PerplexityBot", "OAI-SearchBot", "Google-Extended"]));
    for (const rule of rules) expect(rule.disallow).toEqual(expect.arrayContaining(["/api/", "/dashboard"]));
  });

  it("emits valid, script-safe SoftwareApplication + FAQPage JSON-LD matching the visible FAQ", () => {
    const json = ldJson(softwareApplicationLd, faqLd(FAQS));
    expect(json).not.toContain("</script");
    const graph = JSON.parse(json)["@graph"];
    expect(graph[0]["@type"]).toBe("SoftwareApplication");
    expect(graph[0].offers.map((o: { price: string }) => o.price)).toEqual(["0", "19.00", "49.00"]);
    expect(graph[1].mainEntity).toHaveLength(FAQS.length);
    expect(graph[1].mainEntity[0].name).toBe(FAQS[0].q);
  });
});
