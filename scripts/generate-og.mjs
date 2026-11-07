// Renders 1200x630 social cards for every SEO page into public/og/*.png.
// Run: node scripts/generate-og.mjs  (outputs are committed; no runtime image generation).
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const PAGES = {
  home: ["IN-APP CANCELLATION FLOW", "Drop churn. Keep the cash.", "Exit survey · pause & discount offers · one-click cancel"],
  pricing: ["PRICING", "$19 Starter · $49 Pro", "First 100 SaaS founders: 3 months free, no card"],
  demo: ["LIVE DEMO", "Try the real cancellation flow", "Desktop + mobile · nothing is charged"],
  docs: ["DOCS", "Ship a fair cancel flow today", "Web, React, servers and mobile apps"],
  quickstart: ["QUICKSTART", "Live in about 10 minutes", "Script tag + two server routes"],
  "client-sdk": ["CLIENT SDK", "BoolBul.open() reference", "Callbacks · fail-open · React hook"],
  "server-adapters": ["SERVER ADAPTERS", "Dodo Payments + Stripe", "Verify signed offers, apply pause & discounts"],
  "mobile-apps": ["MOBILE APPS", "Cancel flows in WebViews", "React Native · Flutter · iOS · Android"],
  "vs-stripe-portal": ["COMPARISON", "In-app vs Stripe portal", "Keep cancelling customers inside your app"],
  "vs-churnkey": ["COMPARISON", "BoolBul vs Churnkey", "The indie-priced cancellation flow"],
  "ftc-click-to-cancel": ["COMPLIANCE GUIDE", "FTC click-to-cancel in 2026", "Where the rule stands + a practical checklist"],
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function wrap(text, max) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if ((line + " " + word).trim().length > max) { lines.push(line.trim()); line = word; } else line += " " + word;
  }
  lines.push(line.trim());
  return lines.slice(0, 3);
}

mkdirSync("public/og", { recursive: true });
const logo = await sharp("public/brand/logo.png").resize(96, 96, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

for (const [name, [label, title, sub]] of Object.entries(PAGES)) {
  const lines = wrap(title, 22);
  const size = lines.length > 2 ? 64 : 76;
  const titleSvg = lines.map((l, i) => `<text x="110" y="${300 + i * (size + 10)}" font-size="${size}" font-weight="900" fill="#0A0A0A" font-family="Segoe UI, Arial, sans-serif" letter-spacing="-1">${esc(l.toUpperCase())}</text>`).join("");
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#2B4CFF"/>
  <rect x="62" y="62" width="1096" height="526" fill="#0A0A0A"/>
  <rect x="50" y="50" width="1096" height="526" fill="#FBF8EF" stroke="#0A0A0A" stroke-width="6"/>
  <rect x="110" y="170" width="${label.length * 17 + 40}" height="50" fill="#CCFF00" stroke="#0A0A0A" stroke-width="4"/>
  <text x="130" y="205" font-size="26" font-weight="900" fill="#0A0A0A" font-family="Consolas, Courier New, monospace">${esc(label)}</text>
  ${titleSvg}
  <text x="110" y="${300 + lines.length * (size + 10) + 30}" font-size="30" fill="#3F3F46" font-family="Consolas, Courier New, monospace">${esc(sub)}</text>
  <text x="230" y="125" font-size="40" font-weight="900" fill="#0A0A0A" font-family="Segoe UI, Arial, sans-serif">BOOLBUL</text>
  <text x="1090" y="545" text-anchor="end" font-size="26" font-weight="700" fill="#0A0A0A" font-family="Consolas, Courier New, monospace">boolbul.com</text>
  <rect x="110" y="528" width="300" height="22" fill="#CCFF00" stroke="#0A0A0A" stroke-width="3"/>
  <text x="122" y="545" font-size="15" font-weight="900" fill="#0A0A0A" font-family="Consolas, Courier New, monospace">DODO PAYMENTS + STRIPE</text>
</svg>`;
  await sharp(Buffer.from(svg)).composite([{ input: logo, left: 110, top: 70 }]).png({ compressionLevel: 9, palette: true }).toFile(`public/og/${name}.png`);
  console.log(`public/og/${name}.png`);
}
