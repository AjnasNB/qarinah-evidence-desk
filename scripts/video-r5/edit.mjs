import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, '.local/video/r5-repair'), assets = path.join(out, 'assets');
const prior = path.join(root, '.local/video/r3-20261022/revision-2');
const plan = JSON.parse(await fs.readFile(path.join(out, 'edl.json'), 'utf8'));
assert.equal(plan.duration, 96); assert.equal(plan.scenes.length, 9);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(await fs.readFile(path.join(root, plan.sourceManifest))), plan.sourceManifestSha256);
for (const file of new Set(plan.scenes.map(scene => scene.source))) {
  const expected = plan.scenes.find(scene => scene.source === file).sourceSha256;
  assert.equal(hash(await fs.readFile(path.join(root, file))), expected, 'Actual raw source footage changed.');
}
await fs.mkdir(assets, { recursive: true }); await fs.mkdir(path.join(out, 'review'), { recursive: true });
for (const file of ['editorial-ground.png', 'qarinah-mark.png', 'IBMPlexSans-Regular.ttf', 'IBMPlexSans-Bold.ttf', 'LICENSE-IBM-PLEX.txt', 'logo-provenance.json']) {
  await fs.copyFile(path.join(prior, 'assets', file), path.join(assets, file));
}
await fs.copyFile(path.join(prior, 'assets.json'), path.join(out, 'assets.json'));
const ledger = JSON.parse(await fs.readFile(path.join(out, 'assets.json'), 'utf8'));
for (const item of ledger.assets) assert.equal(hash(await fs.readFile(path.join(assets, item.file))), item.sha256);
assert.equal(hash(await fs.readFile(path.join(assets, 'qarinah-mark.png'))), '29d47683da59a031f23284d056cabf3a200fe9c9aca4d99d4ed10c575c2b594c');
const palette = { cream: 'E7F2EA', muted: '9FB9AA', dim: '547264', green: 'A9E2B5', amber: 'E9BD7A' };
const bgr = h => h.match(/../g).reverse().join('');
const time = s => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(Math.floor(s) % 60).padStart(2, '0')}.${String(Math.round(s * 100) % 100).padStart(2, '0')}`;
const assHeader = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Type,IBM Plex Sans,24,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
const wrap = value => { const rows = ['']; for (const word of value.split(' ')) rows.at(-1).length + word.length > 122 ? rows.push(word) : rows[rows.length - 1] += (rows.at(-1) ? ' ' : '') + word; return rows.join('\\N'); };
const circle = (x, y, r) => Array.from({ length: 24 }, (_, i) => `${i ? 'l' : 'm'} ${Math.round(x + r * Math.cos(i * Math.PI / 12))} ${Math.round(y + r * Math.sin(i * Math.PI / 12))}`).join(' ') + ' c';
function subtitles(scene) {
  const rows = [], d = scene.duration, accent = scene.synthetic || [1, 2].includes(scene.index) ? palette.amber : palette.green;
  const event = (text, start = 0, end = d, layer = 1) => { if (end > start) rows.push(`Dialogue: ${layer},${time(start)},${time(end)},Type,,0,0,0,,${text}`); };
  const text = (value, x, y, size, tint = palette.cream, extra = '', start = 0, end = d) => event(`{\\an7\\pos(${x},${y})\\fs${size}\\c&H${bgr(tint)}&${extra}}${value}`, start, end);
  const shape = (drawing, tint, extra = '', start = 0, end = d, layer = 0) => event(`{\\an7\\pos(0,0)\\p1\\c&H${bgr(tint)}&${extra}}${drawing}{\\p0}`, start, end, layer);
  text('Qarinah / Evidence desk', 114, 14, 28, palette.cream, '\\b1');
  text('ACTUAL REPAIR WORKFLOW   /   ORIGINAL 120 BPM SCORE', 116, 50, 12, palette.muted);
  text('REVIEW PATH · EDITORIAL MAP', 840, 11, 11, palette.muted);
  const xs = [1090, 1380, 1670], labels = ['OBSERVATIONS', 'NEXT STEPS', 'CITED REVIEW'];
  shape('m 1112 32 l 1358 32 l 1358 34 l 1112 34 c m 1402 32 l 1648 32 l 1648 34 l 1402 34 c', palette.dim);
  for (let i = 0; i < 3; i++) { shape(circle(xs[i], 33, 7), palette.dim); text(labels[i], xs[i] - 69, 52, 14, palette.muted); }
  const active = scene.live ? 0 : scene.index < 2 ? 0 : scene.index === 2 || scene.synthetic ? 1 : 2;
  const gate = scene.gate;
  shape(circle(xs[active], 33, 9), accent, '', gate, d);
  for (let n = 0; n < 3; n++) shape(circle(xs[active], 33, 18), accent, '\\alpha&H90&\\t(0,550,\\alpha&HFF&)', Math.max(gate, .5) + n * 2, Math.max(gate, .5) + n * 2 + .6, 2);
  if (scene.index === 2 || scene.index === 3 || scene.index === 4) {
    const left = scene.index === 2 ? 1090 : 1380, right = left + 290;
    for (let n = 0; n < 2; n++) event(`{\\an5\\move(${left},33,${right},33,0,1100)\\p1\\c&H${bgr(accent)}&}m -5 -5 l 5 -5 l 5 5 l -5 5 c{\\p0}`, gate + .5 + n * 2, gate + 1.6 + n * 2, 2);
  }
  const provenance = scene.synthetic ? 'SYNTHETIC REPLAY / INVENTED OBSERVATIONS' : scene.live ? 'ACTUAL ZETARIS READ / SEPARATE RECORDED CHECK' : scene.index === 8 ? plan.live ? 'EARLIER SYNTHETIC BACKGROUND / CURSOR PENDING' : 'SYNTHETIC BACKGROUND / SPONSOR PROOF PENDING' : scene.index === 1 || scene.index === 2 ? 'OLD ACTUAL PACKET / ORIGINAL TIMES PRESERVED' : 'ACTUAL LOCAL PRODUCT / NO MODEL REQUEST';
  text(`${String(scene.index + 1).padStart(2, '0')} / ${scene.name}`, 60, 945, 13, accent, '\\b1\\fsp1');
  text(provenance, 1110, 945, 13, accent);
  if (gate) {
    text(scene.synthetic ? 'Explicit synthetic replay.' : scene.live ? 'Separate live source check.' : scene.index === 1 ? 'Import the old packet.' : 'Import the separate fresh capture.', 60, 970, 36, accent, '\\b1', 0, gate);
    text(scene.live ? 'Actual fixed-source query in the recorded product.' : 'Actual application actions are resolving the supplied observations.', 62, 1024, 23, palette.cream, '', 0, gate);
  }
  event(`{\\an7\\move(60,982,60,970,0,300)\\fad(180,100)\\fs36\\b1\\c&H${bgr(accent)}&}${scene.cue}`, gate, d);
  text(wrap(scene.caption), 62, 1024, 23, palette.cream, '\\fad(180,100)', gate, d);
  shape('m 60 1077 l 1860 1077 l 1860 1079 l 60 1079 c', palette.dim);
  shape('m 60 1077 l 1860 1077 l 1860 1079 l 60 1079 c', accent, `\\clip(60,1077,60,1080)\\t(0,${d * 1000},\\clip(60,1077,1860,1080))`, 0, d, 2);
  if (scene.index) shape('m 0 78 l 1920 78 l 1920 80 l 0 80 c', accent, '\\alpha&H10&\\t(0,260,\\alpha&HFF&)', 0, .3, 2);
  if (scene.index === 2 || scene.index === 4) {
    const repair = scene.index === 2;
    text(repair ? 'A BOUNDED NEXT STEP' : 'TRACE THE SOURCE', 1404, 150, 25, palette.cream, '\\b1');
    text('EDITORIAL MAP · ACTUAL APP AT LEFT', 1406, 192, 12, palette.muted);
    shape('m 1406 294 l 1408 294 l 1408 638 l 1406 638 c', palette.dim);
    const items = repair ? [['Preserve', 'Keep original timestamps'], ['Inspect', 'Trace the cited observations'], ['Capture', 'Obtain genuine new results']] : [['Observation', 'Exact text + observed time'], ['H-MEM reference', 'Retained source provenance'], ['Cited review', 'Known IDs in this snapshot']];
    items.forEach(([title, sub], i) => { const y = 280 + i * 180; shape(circle(1407, y, 9), accent, '\\fad(150,0)', i * 1.5); text(title, 1438, y - 15, 27, palette.cream, '\\b1\\fad(180,0)', i * 1.5); text(sub, 1438, y + 29, 16, palette.muted, '\\fad(180,0)', i * 1.5); });
    text(repair ? 'Importing does not\\Nrun CI or deploy.' : 'Hash retrieval, not\\Na learned semantic model.', 1406, 778, 21, palette.muted);
  }
  if (scene.synthetic) {
    text('SYNTHETIC RULE CHECK', 1410, 210, 17, accent, '\\b1\\fsp1');
    text(scene.index === 6 ? 'HOLD' : 'ABSTAIN', 1400, 322, scene.index === 6 ? 92 : 64, accent, '\\b1\\fad(220,0)', gate);
    text(scene.index === 6 ? 'Failed tests' : 'Missing build artifact', 1410, 438, 27, palette.cream, '\\fad(200,0)', gate);
    text(scene.index === 6 ? 'Real fixes and new results\\Nare needed at the source.' : 'Current evidence is needed.\\NDo not infer readiness.', 1410, 500, 21, palette.muted, '\\fad(200,0)', gate);
    text('INVENTED OBSERVATIONS\\NACTUAL PRODUCT RESPONSE', 1410, 725, 15, accent, '\\fsp1', gate);
  }
  return assHeader + rows.join('\n') + '\n';
}
for (const scene of plan.scenes) await fs.writeFile(path.join(out, `scene-${scene.index}.ass`), subtitles(scene));
function camera(scene, still = false) {
  const split = [2, 4, 6, 7].includes(scene.index), count = Math.ceil(scene.duration / 4);
  const rightPanel = scene.index === 0 || scene.index === 5;
  const target = split ? '1240x850' : '1696x848';
  const base = rightPanel ? [0, 0, 1600, 800] : split ? [220, scene.crop.y, 1000, 686] : [scene.crop.x, scene.crop.y, 1360, 680];
  const closer = rightPanel ? base : split ? [240, scene.crop.y + 20, 960, 658] : [240, scene.crop.y + 20, 1280, 640];
  const parts = [`[0:v]setpts=PTS-STARTPTS,fps=30,split=${count}${Array.from({ length: count }, (_, i) => `[cam${i}]`).join('')}`];
  for (let i = 0; i < count; i++) {
    const start = i * 4, end = Math.min(scene.duration, start + 4), frames = Math.round((end - start) * 30), [x, y, w, h] = i % 2 ? closer : base;
    parts.push(`[cam${i}]trim=start=${start}:end=${end},setpts=PTS-STARTPTS,crop=${w}:${h}:${x}:${y},zoompan=z='1+0.025*(1-cos(PI*on/${frames - 1}))/2':x='${rightPanel ? 'iw-iw/zoom' : 'iw/2-iw/zoom/2'}':y='0':d=1:s=${target}:fps=30[shot${i}]`);
  }
  parts.push(`${Array.from({ length: count }, (_, i) => `[shot${i}]`).join('')}concat=n=${count}:v=1:a=0${scene.index && !still ? ',fade=t=in:st=0:d=0.14' : ''}[screen]`);
  parts.push('[1:v][screen]overlay=112:80:shortest=1[ground];[2:v]scale=56:56[mark]');
  parts.push(`[ground][mark]overlay=48:12,subtitles=scene-${scene.index}.ass:fontsdir=assets,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]`);
  return parts.join(';');
}
const run = args => { const r = spawnSync(process.env.FFMPEG || 'ffmpeg', ['-hide_banner', '-nostdin', ...args], { cwd: out, windowsHide: true, encoding: 'utf8', maxBuffer: 5e6 }); if (r.status !== 0) throw new Error(r.stderr?.slice(-2200) || r.error?.message); return r; };
const inputs = scene => ['-ss', String(scene.sourceStart), '-i', path.join(root, scene.source), '-loop', '1', '-framerate', '30', '-i', 'assets/editorial-ground.png', '-loop', '1', '-i', 'assets/qarinah-mark.png'];
const lookIndex = process.argv.find(arg => arg.startsWith('--look='))?.slice(7);
if (process.argv.includes('--look') || lookIndex !== undefined) {
  for (const scene of plan.scenes.filter(s => lookIndex === undefined || s.index === Number(lookIndex))) run(['-y', '-loglevel', 'error', ...inputs(scene), '-filter_complex', camera(scene, true), '-map', '[v]', '-ss', String(scene.index === 4 ? 10 : Math.max(4, scene.gate + 1)), '-frames:v', '1', `review/look-${scene.index}.png`]);
  console.log(JSON.stringify({ firstLooks: path.join(out, 'review'), count: plan.scenes.length })); process.exit(0);
}
assert(process.argv.includes('--render'), 'Use --look for first frames; --render explicitly starts the picture render.');
for (const scene of plan.scenes) {
  const fingerprint = hash(Buffer.from(JSON.stringify(scene) + camera(scene) + subtitles(scene)));
  const tag = path.join(out, `picture-${scene.index}.sha256`), clip = path.join(out, `picture-${scene.index}.mp4`);
  if ((await fs.readFile(tag, 'utf8').catch(() => '')) !== fingerprint || !await fs.stat(clip).catch(() => null)) {
    run(['-y', '-loglevel', 'warning', ...inputs(scene), '-filter_complex', camera(scene), '-map', '[v]', '-t', String(scene.duration), '-an',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', clip]);
    await fs.writeFile(tag, fingerprint);
  }
  console.log(JSON.stringify({ rendered: scene.id, seconds: scene.duration }));
}
await fs.writeFile(path.join(out, 'concat.txt'), plan.scenes.map(s => `file 'picture-${s.index}.mp4'`).join('\n'));
run(['-y', '-loglevel', 'warning', '-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-map', '0:v:0', '-c:v', 'copy', '-bsf:v',
  'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1', '-t', '96', '-movflags', '+faststart', 'r5-picture.mp4']);
const receipt = { picture: path.join(out, 'r5-picture.mp4'), sha256: hash(await fs.readFile(path.join(out, 'r5-picture.mp4'))),
  edlSha256: hash(await fs.readFile(path.join(out, 'edl.json'))), sourceManifestSha256: plan.sourceManifestSha256 };
await fs.writeFile(path.join(out, 'picture-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
