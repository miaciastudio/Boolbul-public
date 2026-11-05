import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const publicDir = path.join(process.cwd(), "public");

async function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (file === "_raw_source" || file === ".git") continue;
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = await getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }

  return arrayOfFiles;
}

async function optimizeImages() {
  console.log("Optimizing images in:", publicDir);
  const files = await getAllFiles(publicDir);
  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const relPath = path.relative(publicDir, filePath).replace(/\\/g, "/");

    if (ext === ".png") {
      const stats = fs.statSync(filePath);
      const originalSize = stats.size;
      totalOriginal += originalSize;

      const metadata = await sharp(filePath).metadata();
      let targetWidth = metadata.width || 800;
      let targetHeight = metadata.height || 800;

      // Classify sizing based on folder
      if (relPath.startsWith("brand/") || relPath.startsWith("integrations/") || relPath.startsWith("stickers/")) {
        targetWidth = Math.min(targetWidth, 256);
        targetHeight = Math.min(targetHeight, 256);
      } else if (relPath.startsWith("compliance/")) {
        targetWidth = Math.min(targetWidth, 384);
        targetHeight = Math.min(targetHeight, 384);
      } else if (relPath.startsWith("mascot/")) {
        targetWidth = Math.min(targetWidth, 400);
        targetHeight = Math.min(targetHeight, 400);
      } else if (relPath.startsWith("banners/") || relPath.startsWith("illustrations/") || relPath.startsWith("screenshots/") || relPath.startsWith("memes/")) {
        targetWidth = Math.min(targetWidth, 1200);
        targetHeight = undefined; // maintain aspect ratio
      }

      // 1. Generate optimized PNG (overwriting original so existing src="..." paths work instantly)
      let pipelinePng = sharp(filePath);
      if (targetHeight) {
        pipelinePng = pipelinePng.resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true });
      } else {
        pipelinePng = pipelinePng.resize(targetWidth, null, { withoutEnlargement: true });
      }

      const optPngBuffer = await pipelinePng
        .png({ compressionLevel: 9, quality: 85, effort: 7 })
        .toBuffer();

      fs.writeFileSync(filePath, optPngBuffer);
      const newPngSize = optPngBuffer.length;
      totalOptimized += newPngSize;

      // 2. Also generate WebP equivalent
      const webpPath = filePath.replace(/\.png$/i, ".webp");
      let pipelineWebp = sharp(optPngBuffer);
      const webpBuffer = await pipelineWebp.webp({ quality: 80, effort: 5 }).toBuffer();
      fs.writeFileSync(webpPath, webpBuffer);

      const savingsPct = (((originalSize - newPngSize) / originalSize) * 100).toFixed(1);
      console.log(`[OPTIMIZED] ${relPath}: ${(originalSize / 1024).toFixed(0)}KB -> ${(newPngSize / 1024).toFixed(0)}KB (WebP: ${(webpBuffer.length / 1024).toFixed(0)}KB) [-${savingsPct}%]`);
    } else if (ext === ".ico" && relPath === "favicon.ico") {
      const stats = fs.statSync(filePath);
      totalOriginal += stats.size;
      const faviconBuffer = await sharp(path.join(publicDir, "brand", "logo.png"))
        .resize(48, 48)
        .png()
        .toBuffer();
      fs.writeFileSync(filePath, faviconBuffer);
      totalOptimized += faviconBuffer.length;
      console.log(`[OPTIMIZED] favicon.ico: ${(stats.size / 1024).toFixed(0)}KB -> ${(faviconBuffer.length / 1024).toFixed(0)}KB`);
    }
  }

  const savedMb = ((totalOriginal - totalOptimized) / (1024 * 1024)).toFixed(2);
  const totalOrigMb = (totalOriginal / (1024 * 1024)).toFixed(2);
  const totalOptMb = (totalOptimized / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 Summary: Total size reduced from ${totalOrigMb} MB -> ${totalOptMb} MB (Saved ${savedMb} MB!)`);
}

optimizeImages().catch(err => {
  console.error("Image optimization failed:", err);
  process.exit(1);
});

