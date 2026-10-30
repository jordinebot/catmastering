import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { parseIssueBody, downloadAttachment, hasDuplicateCredit, stableCreditId } from '../scripts/process-credit-issue.mjs';

const body = (fields = {}) => `### Artista\n${fields.artist ?? 'Àrtista'}\n\n### Títol\n${fields.title ?? 'Disc'}\n\n### Data de publicació\n${fields.date ?? '2024-02-29'}\n\n### Portada\n${fields.cover ?? 'https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abc'}`;

test('parses all required issue form fields', () => {
  assert.deepEqual(parseIssueBody(body()), {
    artist: 'Àrtista', title: 'Disc', date: '2024-02-29',
    cover: 'https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abc',
  });
});

test('rejects missing fields and malformed or impossible dates', () => {
  assert.throws(() => parseIssueBody('### Artista\nA'), /Falten camps/);
  assert.throws(() => parseIssueBody(body({ date: '2023-02-29' })), /no existeix/);
  assert.throws(() => parseIssueBody(body({ date: 'March 2, 2024' })), /AAAA-MM-DD/);
  assert.throws(() => parseIssueBody(`${body()}\n\n### Títol\nInjected heading`), /més d’una vegada/);
  assert.throws(() => parseIssueBody(body({ artist: 'Artist\nInjected' })), /una sola línia/);
});

test('supports year only and flags exact artist/title duplicates case-insensitively', () => {
  const parsed = parseIssueBody(body({ date: '2004' }));
  assert.equal(parsed.date, '2004');
  assert.equal(hasDuplicateCredit([{ artist: 'Km.0', title: 'Les coses' }], 'km.0', 'LES COSES'), true);
  assert.equal(hasDuplicateCredit([], 'Nou', 'Disc'), false);
});

test('stable ID uses only a safe normalized artist, title and date', () => {
  const id = stableCreditId('../../Àrtista', 'A & B', '2024-01-02');
  assert.equal(id, 'artista-a-b-20240102');
  assert.equal(stableCreditId('../../Àrtista', 'A & B', '2024-01-02'), id);
  assert.doesNotMatch(id, /\.\./);
});

test('rejects unapproved attachment URLs before making a request', async () => {
  let called = false;
  await assert.rejects(downloadAttachment('https://example.com/image.jpg', async () => { called = true; }), /no és un adjunt/);
  assert.equal(called, false);
});

test('rejects redirects to unapproved hosts and non-image bytes', async () => {
  const redirect = async () => new Response(null, { status: 302, headers: { location: 'https://example.com/payload.jpg' } });
  await assert.rejects(downloadAttachment('https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abc', redirect), /domini no permès/);
  const notImage = async () => new Response(Buffer.from('not an image'), { status: 200, headers: { 'content-length': '12' } });
  await assert.rejects(downloadAttachment('https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abc', notImage), /no és una imatge/);
});

test('accepts an actual bounded image from an approved GitHub attachment URL', async () => {
  const image = await sharp({ create: { width: 240, height: 240, channels: 3, background: '#cc5533' } }).png().toBuffer();
  const fetchMock = async () => new Response(image, { status: 200, headers: { 'content-length': String(image.length) } });
  const result = await downloadAttachment('https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abc', fetchMock);
  assert.equal(result.metadata.format, 'png');
  assert.equal(result.metadata.width, 240);
  assert.equal(result.metadata.height, 240);
});

test('rejects uploads above size limit from headers without downloading them', async () => {
  const huge = async () => new Response(null, { status: 200, headers: { 'content-length': `${11 * 1024 * 1024}` } });
  await assert.rejects(downloadAttachment('https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abc', huge), /supera el límit/);
});
