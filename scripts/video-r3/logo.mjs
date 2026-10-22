import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, '.local/video/r3-20261022/revision-2/assets');
await fs.mkdir(out, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const svg = await fs.readFile(path.join(root, 'public/brand/qarinah-mark.svg'));
assert.equal(sha(svg), '2a822527d0a41a2bdc24625cf78641f6caf7206ea5007bbfb20bb2214cd9d84b');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 96, height: 96 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:5183' ? route.continue() : route.abort());
  const page = await context.newPage();
  const response = await page.goto('http://127.0.0.1:5183/brand/qarinah-mark.svg', { waitUntil: 'networkidle' });
  assert.equal(sha(await response.body()), sha(svg));
  await page.screenshot({ path: path.join(out, 'qarinah-mark.png'), omitBackground: true });
  await context.close();
} finally { await browser.close(); }
const png = await fs.readFile(path.join(out, 'qarinah-mark.png'));
await fs.writeFile(path.join(out, 'logo-provenance.json'), JSON.stringify({ original: 'public/brand/qarinah-mark.svg', originalUrl: 'https://qarinah.io/assets/qarinah-mark.svg', sourceSha256: sha(svg), pngSha256: sha(png), method: 'Unchanged original SVG served by localhost; fresh headless Chromium native SVG rasterization at 96x96 with transparent background. No path, color, title or description edits.', publication: 'None' }, null, 2));
console.log(JSON.stringify({ svgSha256: sha(svg), pngSha256: sha(png), output: out }));
