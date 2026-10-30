import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const credits = JSON.parse(fs.readFileSync('src/data/credits.json', 'utf8'));
const assetFilename = (filename) => {
  const extension = path.extname(filename);
  const stem = path.basename(filename, extension).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${stem}${extension.toLowerCase()}`;
};
const thumbnailFilename = (filename) => `${path.basename(assetFilename(filename), path.extname(filename))}.webp`;

let originalBytes = 0;
let optimizedBytes = 0;
for (const credit of credits) {
  const source = path.join('public/images/thumbs', assetFilename(credit.thumbnail));
  const destination = path.join('public/images/thumbs', thumbnailFilename(credit.thumbnail));
  const metadata = await sharp(source).metadata();
  originalBytes += fs.statSync(source).size;
  await sharp(source).rotate().resize({ width: 420, height: 420, fit: 'cover', withoutEnlargement: true }).webp({ quality: 80, effort: 5 }).toFile(destination);
  optimizedBytes += fs.statSync(destination).size;
  if (!metadata.width || !metadata.height) throw new Error(`Could not read thumbnail dimensions: ${source}`);
}
console.log(`Optimized ${credits.length} thumbnails: ${(originalBytes / 1024 / 1024).toFixed(2)} MiB → ${(optimizedBytes / 1024 / 1024).toFixed(2)} MiB (${(100 * (1 - optimizedBytes / originalBytes)).toFixed(1)}% smaller).`);
