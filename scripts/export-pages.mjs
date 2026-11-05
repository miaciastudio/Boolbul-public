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
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, outDir, { recursive: true });
}

// 3. Copy _next/static to out/_next/static
const targetStatic = path.join(outDir, "_next", "static");
fs.mkdirSync(path.dirname(targetStatic), { recursive: true });
fs.cpSync(nextStaticDir, targetStatic, { recursive: true });

// 4. Copy pages
const pages = [
  { src: "index.html", dest: "index.html" },
  { src: "login.html", dest: "login.html", folder: "login" },
  { src: "dashboard.html", dest: "dashboard.html", folder: "dashboard" },
  { src: "demo.html", dest: "demo.html", folder: "demo" },
  { src: "onboarding.html", dest: "onboarding.html", folder: "onboarding" },
  { src: "_not-found.html", dest: "404.html" },
];

for (const p of pages) {
  const srcPath = path.join(nextAppDir, p.src);
  if (fs.existsSync(srcPath)) {
    const destPath = path.join(outDir, p.dest);
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

console.log("Pages export complete into:", outDir);
