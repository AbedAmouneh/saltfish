// Turns the Instagram originals into responsive web images.
// Usage: npm run images
// Reads scripts/photo-sources.json, writes public/images/<slug>-<w>.{avif,webp,jpg}
// (240 px for thumbnails up to 1600 px for full-width heroes)
// and app/content/images.json (the manifest the <Photo> component uses).
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const srcDir = path.join(root, "research/instagram/photos");
const outDir = path.join(root, "public/images");
const manifestPath = path.join(root, "app/content/images.json");
const WIDTHS = [240, 480, 960, 1600];

const sources = JSON.parse(await readFile(path.join(root, "scripts/photo-sources.json"), "utf8"));
await mkdir(outDir, { recursive: true });

const manifest = {};
for (const [slug, entry] of Object.entries(sources)) {
  if (slug.startsWith("_")) continue;
  const file = path.join(srcDir, entry.src);
  try {
    await access(file);
  } catch {
    console.warn(`skip ${slug}: missing ${entry.src}`);
    continue;
  }
  const img = sharp(file).rotate();
  const meta = await img.metadata();
  const widths = WIDTHS.filter((w) => w < meta.width).concat(meta.width < WIDTHS.at(-1) ? [meta.width] : []);
  const unique = [...new Set(widths.length ? widths : [meta.width])].sort((a, b) => a - b);
  for (const w of unique) {
    const base = path.join(outDir, `${slug}-${w}`);
    // Skip sizes that already exist (pass --force to rebuild everything).
    if (!process.argv.includes("--force")) {
      try {
        await access(`${base}.avif`);
        await access(`${base}.jpg`);
        continue;
      } catch {}
    }
    const resized = sharp(file).rotate().resize({ width: w, withoutEnlargement: true });
    await resized.clone().avif({ quality: 52, effort: 4 }).toFile(`${base}.avif`);
    await resized.clone().webp({ quality: 74 }).toFile(`${base}.webp`);
    await resized.clone().jpeg({ quality: 76, mozjpeg: true, progressive: true }).toFile(`${base}.jpg`);
  }
  const blurBuf = await sharp(file).rotate().resize({ width: 16 }).blur(1.2).jpeg({ quality: 45 }).toBuffer();
  manifest[slug] = {
    alt: entry.alt,
    width: meta.width,
    height: meta.height,
    widths: unique,
    blur: `data:image/jpeg;base64,${blurBuf.toString("base64")}`,
    ...(entry.position ? { position: entry.position } : {}),
  };
  console.log(`${slug.padEnd(30)} ${meta.width}x${meta.height} → ${unique.join(", ")}`);
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\n${Object.keys(manifest).length} images → public/images, manifest → app/content/images.json`);
