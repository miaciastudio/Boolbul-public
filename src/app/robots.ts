import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/demo", "/onboarding"],
        disallow: ["/api/", "/dashboard"],
      },
    ],
    sitemap: "https://boolbul.com/sitemap.xml",
    host: "https://boolbul.com",
  };
}

