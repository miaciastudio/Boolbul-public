// Crawls every page in sitemap.xml plus each internal link found on them and
// reports anything that isn't 2xx/3xx. Usage: node scripts/crawl-links.mjs https://boolbul.com
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const seen = new Map();
const queue = [];
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) queue.push(new URL(m[1]).pathname || "/");
queue.push("/login", "/login?mode=apply", "/robots.txt", "/llms.txt", "/llms-full.txt", "/v1/boolbul.js", "/404-check-should-404");
const skip = (p) => p.startsWith("/api/") || p.startsWith("/auth/") || p.startsWith("/_next/") || p.startsWith("mailto:");
while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  const res = await fetch(base + path, { redirect: "manual" }).catch((e) => ({ status: 0, text: async () => String(e) }));
  seen.set(path, res.status);
  const type = res.headers?.get?.("content-type") ?? "";
  if (res.status === 200 && type.includes("text/html")) {
    const html = await res.text();
    for (const m of html.matchAll(/href="(\/[^"#]*)"/g)) {
      const href = m[1].replace(/&amp;/g, "&");
      if (!skip(href) && !seen.has(href) && !/\.(png|webp|ico|svg|css|js|txt|xml)$/.test(href.split("?")[0])) queue.push(href);
    }
    for (const m of html.matchAll(/(?:src|href)="(\/(?:og|brand|banners|integrations|compliance|illustrations|memes)\/[^"]+)"/g)) if (!seen.has(m[1])) queue.push(m[1]);
  }
}
const bad = [...seen].filter(([p, s]) => !(s >= 200 && s < 400) && p !== "/404-check-should-404");
const notFound = seen.get("/404-check-should-404");
console.log(`checked ${seen.size} URLs on ${base}`);
console.log(`unknown page returns ${notFound} (expected 404)`);
console.log(bad.length ? `BROKEN:\n${bad.map(([p, s]) => `  ${s} ${p}`).join("\n")}` : "no broken links");
process.exitCode = bad.length || notFound !== 404 ? 1 : 0;
