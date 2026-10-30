import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const overwrite = args.includes('--overwrite');
const target = path.join(root, 'src/data/credits.json');
const baselineTarget = path.join(root, 'tests/fixtures/legacy-credits.json');
if (fs.existsSync(target) && !overwrite) {
  console.error('credits.json already exists. Use --dry-run to inspect or --overwrite to replace it.');
  process.exit(1);
}
const html = fs.readFileSync(path.join(root, 'legacy/catmastering_ca.html'), 'utf8');
const figures = [...html.matchAll(/<figure class="treballQuadricula"[\s\S]*?<\/figure>/g)].map((m) => m[0]);
const get = (block, cls) => block.match(new RegExp(`<p class="${cls}">([\\s\\S]*?)<\\/p>`))?.[1]?.trim() ?? '';
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const entries = figures.map((block) => {
  const encodedSource = decode(block.match(/<img class="treballPortada" src="([^"]+)/)?.[1] ?? '');
  const source = decodeURIComponent(encodedSource);
  const imageName = path.basename(source);
  const stem = path.parse(imageName).name;
  const fullPath = path.join(root, 'legacy/portades', imageName);
  const thumbPath = path.join(root, 'legacy/miniatures', imageName);
  const artist = decode(get(block, 'artista'));
  const title = decode(get(block, 'album'));
  const rawDate = decode(get(block, 'any'));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : /^\d{4}-\d{2}$/.test(rawDate) ? rawDate : /^\d{4}$/.test(rawDate) ? rawDate : '';
  const id = `${stem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}-${crypto.createHash('sha1').update(`${artist}\0${title}\0${rawDate}`).digest('hex').slice(0, 6)}`;
  return { id, artist, title, date, cover: imageName, thumbnail: imageName, fullExists: fs.existsSync(fullPath), thumbExists: fs.existsSync(thumbPath), rawDate };
});
entries.sort((a, b) => b.date.localeCompare(a.date) || a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
const missing = entries.filter((e) => !e.fullExists || !e.thumbExists);
const duplicates = entries.filter((e, i) => entries.findIndex((other) => other.artist === e.artist && other.title === e.title && other.date === e.date) !== i);
if (dryRun) {
  console.log(JSON.stringify({ count: entries.length, missing, duplicates: duplicates.length }, null, 2));
  process.exit(missing.length ? 1 : 0);
}
if (missing.length) throw new Error(`${missing.length} cover/thumbnail references are missing; inspect migration report.`);
for (const item of entries) {
  delete item.fullExists; delete item.thumbExists; delete item.rawDate;
  for (const [from, to] of [[`legacy/portades/${item.cover}`, `public/images/covers/${item.cover}`], [`legacy/miniatures/${item.thumbnail}`, `public/images/thumbs/${item.thumbnail}`]]) {
    fs.mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
    if (!fs.existsSync(path.join(root, to))) fs.copyFileSync(path.join(root, from), path.join(root, to));
  }
}
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(entries, null, 2)}\n`);
fs.mkdirSync(path.dirname(baselineTarget), { recursive: true });
fs.writeFileSync(baselineTarget, `${JSON.stringify(entries, null, 2)}\n`);
console.log(`Migrated ${entries.length} credits.`);
