/**
 * One-off: convert the generated PNG comps into sized WebP assets under
 * public/images. Run with `node scripts/import-images.mjs <sourceDir>`.
 */
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) {
  console.error("usage: node scripts/import-images.mjs <sourceDir>");
  process.exit(1);
}

const publicImages = path.join(process.cwd(), "public", "images");

/** Longest-edge budget per bucket, keeps the repo light without visible loss. */
const buckets = [
  { prefix: "prod-", dir: "products", width: 1100 },
  { prefix: "life-", dir: "lifestyle", width: 1600 },
  { prefix: "cat-", dir: "categories", width: 1100 },
  { prefix: "hero-", dir: "lifestyle", width: 1600 },
  { prefix: "craft-", dir: "lifestyle", width: 1600 },
];

const files = (await readdir(source)).filter((file) => file.endsWith(".png"));
let written = 0;

for (const file of files) {
  const bucket = buckets.find((candidate) => file.startsWith(candidate.prefix));
  if (!bucket) continue;

  const targetDir = path.join(publicImages, bucket.dir);
  await mkdir(targetDir, { recursive: true });

  const target = path.join(targetDir, file.replace(/\.png$/, ".webp"));
  await sharp(path.join(source, file))
    .resize({ width: bucket.width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(target);

  written += 1;
  console.log(`${bucket.dir}/${path.basename(target)}`);
}

console.log(`\n${written} images written`);
