import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

export function parseIssueBody(body) {
  const fields = {};
  const names = { Artista: 'artist', Títol: 'title', 'Data de publicació': 'date', Portada: 'cover', Notes: 'notes' };
  const parts = body.split(/^###\s+/m).slice(1);
  for (const part of parts) {
    const newline = part.indexOf('\n');
    if (newline < 0) continue;
    const heading = part.slice(0, newline).trim();
    const value = part.slice(newline + 1).trim();
    const key = names[heading];
    if (key) {
      if (fields[key] !== undefined) throw new Error(`El camp "${heading}" apareix més d’una vegada.`);
      fields[key] = value;
    }
  }
  const required = ['artist', 'title', 'date', 'cover'];
  const missing = required.filter((key) => !fields[key] || fields[key] === '_No response_');
  if (missing.length) throw new Error(`Falten camps obligatoris: ${missing.join(', ')}.`);
  if ([fields.artist, fields.title, fields.date].some((value) => /[\r\n]/.test(value))) throw new Error('Artista, títol i data han d’anar en una sola línia.');
  if (fields.artist.length > 160 || fields.title.length > 220) throw new Error('El nom de l’artista o el títol és massa llarg.');
  if (!/^\d{4}(?:-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))?$/.test(fields.date)) throw new Error('La data ha de ser AAAA-MM-DD o només AAAA.');
  const date = fields.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (date && new Date(`${fields.date}T00:00:00Z`).toISOString().slice(0, 10) !== fields.date) throw new Error('La data no existeix al calendari.');
  const urls = [...fields.cover.matchAll(/https:\/\/[^\s)<>]+/g)].map(([url]) => url.replace(/[.,]+$/, ''));
  if (urls.length !== 1) throw new Error('Adjunta una sola portada al camp Portada.');
  fields.cover = urls[0];
  return fields;
}

export function hasDuplicateCredit(credits, artist, title) {
  return credits.some((item) => item.artist.trim().toLocaleLowerCase() === artist.trim().toLocaleLowerCase() && item.title.trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase());
}
export function stableCreditId(artist, title, date) {
  const slug = `${artist}-${title}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  return `${slug}-${date.replaceAll('-', '')}`;
}

function allowedAttachment(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return false; }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) return false;
  return (parsed.hostname === 'github.com' && /^\/user-attachments\/assets\/[0-9a-f-]{20,}$/i.test(parsed.pathname)) ||
    (parsed.hostname === 'user-images.githubusercontent.com' && /^\/[0-9]+\/[A-Za-z0-9._/-]+\.(?:png|jpe?g|webp)$/i.test(parsed.pathname));
}

export async function downloadAttachment(url, fetchImpl = fetch) {
  if (!allowedAttachment(url)) throw new Error('L’enllaç de la portada no és un adjunt de GitHub admès.');
  let target = url;
  let response;
  for (let attempt = 0; attempt < 4; attempt++) {
    response = await fetchImpl(target, { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'CatMastering-credit-intake' } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || attempt === 3) throw new Error('GitHub no ha pogut obrir l’adjunt de manera segura.');
      const redirected = new URL(location, target).href;
      if (!allowedAttachment(redirected)) throw new Error('L’adjunt redirigeix a un domini no permès.');
      target = redirected;
      continue;
    }
    if (!response.ok) throw new Error(`No s’ha pogut recuperar la portada (HTTP ${response.status}).`);
    break;
  }
  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > 10 * 1024 * 1024) throw new Error('La portada supera el límit de 10 MB.');
  const chunks = [];
  let received = 0;
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No es pot llegir la portada adjunta.');
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > 10 * 1024 * 1024) { await reader.cancel(); throw new Error('La portada supera el límit de 10 MB.'); }
    chunks.push(Buffer.from(value));
  }
  const bytes = Buffer.concat(chunks);
  if (!bytes.length) throw new Error('La portada és buida o supera el límit de 10 MB.');
  const jpeg = bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!jpeg && !png && !webp) throw new Error('El fitxer no és una imatge JPG, PNG o WebP vàlida.');
  const metadata = await sharp(bytes, { limitInputPixels: 36_000_000 }).metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || !metadata.width || !metadata.height || metadata.width < 200 || metadata.height < 200 || metadata.width > 6000 || metadata.height > 6000) throw new Error('La portada ha de mesurar entre 200×200 i 6000×6000 píxels.');
  return { bytes, metadata };
}

const failComment = (message) => `No he pogut preparar la proposta automàticament: ${message}\n\nLa incidència continua oberta. Un mantenidor revisarà les dades i la portada. No tornis a enviar la mateixa entrada.`;
async function main() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const issue = event.issue;
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const authorized = (process.env.CREDIT_AUTHORIZED_USERS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!authorized.includes(issue.user.login.toLowerCase())) throw new Error('Aquest compte no està autoritzat per enviar treballs.');
  const api = `https://api.github.com/repos/${repo}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
  const request = async (route, options = {}) => { const response = await fetch(`${api}${route}`, { ...options, headers: { ...headers, ...options.headers } }); if (!response.ok) throw new Error(`GitHub API error (${response.status}).`); return response.status === 204 ? null : response.json(); };
  const existing = await request(`/pulls?state=all&head=${repo.split('/')[0]}:add-credit/issue-${issue.number}`);
  if (existing.length) { await request(`/issues/${issue.number}/comments`, { method: 'POST', body: JSON.stringify({ body: `Ja hi ha una proposta per a aquesta incidència: #${existing[0].number} (${existing[0].html_url}).` }) }); return; }
  try {
    const fields = parseIssueBody(issue.body ?? '');
    const { bytes } = await downloadAttachment(fields.cover);
    const creditsPath = 'src/data/credits.json';
    const credits = JSON.parse(fs.readFileSync(creditsPath, 'utf8'));
    const duplicate = credits.find((item) => item.artist.trim().toLocaleLowerCase() === fields.artist.trim().toLocaleLowerCase() && item.title.trim().toLocaleLowerCase() === fields.title.trim().toLocaleLowerCase());
    if (duplicate || hasDuplicateCredit(credits, fields.artist, fields.title)) throw new Error(`Aquest artista i títol ja són al catàleg (${duplicate.artist} — ${duplicate.title}).`);
    const id = stableCreditId(fields.artist, fields.title, fields.date);
    if (credits.some((item) => item.id === id)) throw new Error('Aquest identificador ja existeix; cal una revisió manual.');
    const filename = `${id}.webp`;
    const coverPath = `public/images/covers/${filename}`;
    const thumbPath = `public/images/thumbs/${filename}`;
    fs.mkdirSync(path.dirname(coverPath), { recursive: true }); fs.mkdirSync(path.dirname(thumbPath), { recursive: true });
    await sharp(bytes).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(coverPath);
    await sharp(bytes).rotate().resize({ width: 420, height: 420, fit: 'cover' }).webp({ quality: 78 }).toFile(thumbPath);
    credits.push({ id, artist: fields.artist.trim(), title: fields.title.trim(), date: fields.date, cover: filename, thumbnail: filename });
    credits.sort((a, b) => b.date.localeCompare(a.date) || a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
    fs.writeFileSync(creditsPath, `${JSON.stringify(credits, null, 2)}\n`);
    let result = spawnSync('git', ['checkout', '-b', `add-credit/issue-${issue.number}`], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Could not prepare the pull request branch: ${result.stderr.slice(0, 500)}`);
    for (const cmd of [['run', 'check'], ['run', 'test'], ['run', 'build']]) {
      const result = spawnSync('npm', cmd, { encoding: 'utf8', stdio: 'inherit' });
      if (result.status !== 0) throw new Error(`La validació ${cmd[1]} no ha passat.`);
    }
    for (const cmd of [['add', creditsPath, coverPath, thumbPath], ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', `Add credit: ${fields.artist} — ${fields.title}`], ['push', 'origin', `HEAD:add-credit/issue-${issue.number}`]]) {
      result = spawnSync('git', cmd, { encoding: 'utf8' });
      if (result.status !== 0) throw new Error(`Could not prepare the pull request branch: ${result.stderr.slice(0, 500)}`);
    }
    const pr = await request('/pulls', { method: 'POST', body: JSON.stringify({ title: `Afegir treball: ${fields.artist} — ${fields.title}`, head: `add-credit/issue-${issue.number}`, base: 'main', body: `Closes #${issue.number}\n\n- Artista: ${fields.artist}\n- Títol: ${fields.title}\n- Data: ${fields.date}\n- Portada: \`${filename}\`\n\nGenerada automàticament; s’han executat auditoria, tests i build. Revisió humana pendent.` }) });
    await request(`/issues/${issue.number}/comments`, { method: 'POST', body: JSON.stringify({ body: `He preparat una proposta de revisió: #${pr.number} (${pr.html_url}). El treball es publicarà quan s’aprovi i es fusioni la PR.` }) });
  } catch (error) {
    await request(`/issues/${issue.number}/comments`, { method: 'POST', body: JSON.stringify({ body: failComment(error.message) }) });
    throw error;
  }
}
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution && process.env.GITHUB_EVENT_PATH) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
