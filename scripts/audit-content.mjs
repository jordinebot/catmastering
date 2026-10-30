import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
const credits = JSON.parse(fs.readFileSync('src/data/credits.json', 'utf8'));
const errors = [];
const assetFilename = (filename) => {
  const extension = path.extname(filename);
  const stem = path.basename(filename, extension).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${stem}${extension.toLowerCase()}`;
};
const thumbnailFilename = (filename) => `${path.basename(assetFilename(filename), path.extname(filename))}.webp`;
const isValidDate = (value) => {
  if (value === '' || /^\d{4}$/.test(value)) return true;
  if (/^\d{4}-(?:0[1-9]|1[0-2])$/.test(value)) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
};
const schema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  artist: z.string().trim().min(1),
  title: z.string(),
  date: z.string().refine(isValidDate, 'date must be empty, YYYY, YYYY-MM, or a real YYYY-MM-DD'),
  cover: z.string().min(1).refine((value) => path.basename(value) === value && !value.includes('..'), 'unsafe cover filename'),
  thumbnail: z.string().min(1).refine((value) => path.basename(value) === value && !value.includes('..'), 'unsafe thumbnail filename'),
});
const decodeHtml = (value) => value
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
const sourceRecords = (html) => [...html.matchAll(/<figure class="treballQuadricula"[\s\S]*?<\/figure>/g)].map(([figure]) => {
  const get = (field) => decodeHtml(figure.match(new RegExp(`<p class="${field}">([\\s\\S]*?)<\\/p>`))?.[1]?.trim() ?? '');
  return { artist: get('artista'), title: get('album'), date: get('any') };
});
const ids = new Set();
for (const [index, credit] of credits.entries()) {
  const parsed = schema.safeParse(credit);
  if (!parsed.success) errors.push(`Row ${index + 1}: ${parsed.error.issues.map((issue) => issue.message).join(', ')}`);
  if (!credit.id || ids.has(credit.id)) errors.push(`Row ${index + 1}: missing/duplicate id ${credit.id}`);
  ids.add(credit.id);
  if (!credit.artist.trim()) errors.push(`Row ${index + 1}: artist is empty`);
  if (credit.date !== '' && !/^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(credit.date)) errors.push(`Row ${index + 1}: invalid date "${credit.date}"`);
  if (!credit.cover || path.basename(credit.cover) !== credit.cover) errors.push(`Row ${index + 1}: unsafe cover path`);
  for (const file of [`public/images/covers/${assetFilename(credit.cover)}`, `public/images/thumbs/${thumbnailFilename(credit.thumbnail)}`]) if (!fs.existsSync(file)) errors.push(`Missing file: ${file}`);
}
for (const photo of Array.from({ length: 13 }, (_, i) => `public/images/studio/CatMastering${String(i + 1).padStart(2, '0')}.jpg`)) if (!fs.existsSync(photo)) errors.push(`Missing studio photo: ${photo}`);
if (!fs.existsSync('public/videos/Catmastering.mp4')) errors.push('Missing legacy studio video.');
const legacy = fs.readFileSync('legacy/catmastering_ca.html', 'utf8');
const canonicalRecords = sourceRecords(legacy);
const count = canonicalRecords.length;
if (credits.length < count) errors.push(`Credit count ${credits.length} is lower than legacy inventory ${count}`);
const baseline = JSON.parse(fs.readFileSync('tests/fixtures/legacy-credits.json', 'utf8'));
if (baseline.length !== count) errors.push(`Migration baseline ${baseline.length} does not match legacy inventory ${count}`);
const key = ({ artist, title, date }) => JSON.stringify([artist, title, date]);
const baselineKeys = new Set(baseline.map(key));
const canonicalKeys = new Set(canonicalRecords.map(key));
if (baselineKeys.size !== count || canonicalKeys.size !== count || [...canonicalKeys].some((item) => !baselineKeys.has(item))) errors.push('Migration baseline differs from the canonical legacy source.');
for (const original of baseline) {
  const current = credits.find((item) => item.id === original.id);
  if (!current || ['artist', 'title', 'date', 'cover', 'thumbnail'].some((key) => current[key] !== original[key])) errors.push(`Migrated legacy credit is missing or changed: ${original.artist} — ${original.title}`);
}
for (const lang of ['es', 'en']) {
  const html = fs.readFileSync(`legacy/catmastering_${lang}.html`, 'utf8');
  const localeRecords = sourceRecords(html);
  if (localeRecords.length !== count) errors.push(`${lang} legacy credit count ${localeRecords.length} does not match canonical ${count}`);
  if (JSON.stringify(localeRecords) !== JSON.stringify(canonicalRecords)) errors.push(`${lang} legacy artist/title/date data differs from the canonical version`);
}
for (let i = 1; i < credits.length; i++) if (credits[i - 1].date.localeCompare(credits[i].date) < 0) errors.push(`Credits are not sorted newest first at row ${i + 1}`);
if (process.argv.includes('--dist')) {
  for (const lang of ['ca', 'es', 'en']) if (!fs.existsSync(`dist/${lang}/index.html`)) errors.push(`Missing built locale: ${lang}`);
  for (const file of ['dist/index.html', 'dist/robots.txt', 'dist/sitemap.xml', 'dist/catmastering_ca.html', 'dist/catmastering_es.html', 'dist/catmastering_en.html']) if (!fs.existsSync(file)) errors.push(`Missing build output: ${file}`);
  if (fs.existsSync('dist/legacy') || fs.existsSync('dist/.github')) errors.push('Private source or legacy files leaked into the public build.');
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Content audit passed: ${credits.length} credits, ${ids.size} unique IDs, all image files present; legacy inventory matches.`);
