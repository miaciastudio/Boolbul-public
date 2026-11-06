import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "out");
const nextAppDir = path.join(rootDir, ".next", "server", "app");
const nextStaticDir = path.join(rootDir, ".next", "static");
const publicDir = path.join(rootDir, "public");

// 1. Reset out directory
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

// 2. Copy public directory assets if present
const possiblePublicDirs = [
  path.join(rootDir, "public"),
  path.join(rootDir, "Public"),
];
for (const pDir of possiblePublicDirs) {
  if (fs.existsSync(pDir)) {
    fs.cpSync(pDir, outDir, { recursive: true });
    break;
  }
}

// 3. Copy _next/static to out/_next/static
const targetStatic = path.join(outDir, "_next", "static");
fs.mkdirSync(path.dirname(targetStatic), { recursive: true });
fs.cpSync(nextStaticDir, targetStatic, { recursive: true });

// 4. Copy pages
const pages = [
  { src: "index.html", dest: "index.html" },
  { src: "login.html", dest: "login.html", folder: "login" },
  { src: "auth/reset-password.html", dest: "auth/reset-password.html", folder: "auth/reset-password" },
  { src: "dashboard.html", dest: "dashboard.html", folder: "dashboard" },
  { src: "dashboard/customizer.html", dest: "dashboard/customizer.html", folder: "dashboard/customizer" },
  { src: "dashboard/settings.html", dest: "dashboard/settings.html", folder: "dashboard/settings" },
  { src: "demo.html", dest: "demo.html", folder: "demo" },
  { src: "onboarding.html", dest: "onboarding.html", folder: "onboarding" },
  { src: "docs.html", dest: "docs.html", folder: "docs" },
  { src: "docs/quickstart.html", dest: "docs/quickstart.html", folder: "docs/quickstart" },
  { src: "docs/client-sdk.html", dest: "docs/client-sdk.html", folder: "docs/client-sdk" },
  { src: "docs/webhooks.html", dest: "docs/webhooks.html", folder: "docs/webhooks" },
  { src: "docs/ftc-compliance.html", dest: "docs/ftc-compliance.html", folder: "docs/ftc-compliance" },
  { src: "_not-found.html", dest: "404.html" },
];

for (const p of pages) {
  const srcPath = path.join(nextAppDir, p.src);
  if (fs.existsSync(srcPath)) {
    const destPath = path.join(outDir, p.dest);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    if (p.folder) {
      const folderPath = path.join(outDir, p.folder);
      fs.mkdirSync(folderPath, { recursive: true });
      fs.copyFileSync(srcPath, path.join(folderPath, "index.html"));
    }
    console.log(`Copied ${p.src} -> ${p.dest}${p.folder ? ` and ${p.folder}/index.html` : ""}`);
  } else {
    console.warn(`Warning: ${srcPath} does not exist`);
  }
}

// 5. Generate static sitemap.xml
const sitemapUrls = [
  { url: "https://boolbul.com", priority: "1.0", changefreq: "weekly" },
  { url: "https://boolbul.com/docs", priority: "0.9", changefreq: "weekly" },
  { url: "https://boolbul.com/docs/quickstart", priority: "0.9", changefreq: "weekly" },
  { url: "https://boolbul.com/docs/client-sdk", priority: "0.8", changefreq: "weekly" },
  { url: "https://boolbul.com/docs/webhooks", priority: "0.8", changefreq: "weekly" },
  { url: "https://boolbul.com/docs/ftc-compliance", priority: "0.8", changefreq: "weekly" },
  { url: "https://boolbul.com/demo", priority: "0.8", changefreq: "weekly" },
  { url: "https://boolbul.com/onboarding", priority: "0.7", changefreq: "monthly" },
  { url: "https://boolbul.com/login", priority: "0.6", changefreq: "monthly" },
];

const currentDate = new Date().toISOString().split("T")[0];
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (item) => `  <url>
    <loc>${item.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemapXml.trim(), "utf-8");
console.log("Generated static out/sitemap.xml");

// 6. Generate static robots.txt
const robotsTxt = `User-agent: *
Allow: /
Allow: /docs
Allow: /docs/*
Allow: /demo
Allow: /onboarding
Allow: /login
Disallow: /api/*
Disallow: /dashboard/*
Disallow: /auth/*

Sitemap: https://boolbul.com/sitemap.xml
Host: https://boolbul.com
`;

fs.writeFileSync(path.join(outDir, "robots.txt"), robotsTxt.trim(), "utf-8");
console.log("Generated static out/robots.txt");

console.log("Pages export complete into:", outDir);
