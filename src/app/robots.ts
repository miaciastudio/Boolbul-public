import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/docs", "/docs/*", "/demo", "/onboarding", "/login"],
        disallow: ["/api/*", "/dashboard/*", "/auth/*"],
      },
    ],
    sitemap: "https://boolbul.com/sitemap.xml",
    host: "https://boolbul.com",
  };
}
