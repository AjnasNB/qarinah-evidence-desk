import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, '.local/video/20261022T073821010Z');
const prior = path.join(root, '.local/video/r3-20261022');
const out = path.join(prior, 'revision-2');
const assets = path.join(out, 'assets');
await fs.mkdir(assets, { recursive: true });
await fs.mkdir(path.join(out, 'review'), { recursive: true });
if (!await fs.stat(path.join(assets, 'IBMPlexSans-Regular.ttf')).catch(() => null)
  && await fs.stat(path.join(prior, 'assets')).catch(() => null)
  && await fs.stat(path.join(prior, 'assets.json')).catch(() => null)) {
  await fs.cp(path.join(prior, 'assets'), assets, { recursive: true, force: false, errorOnExist: false });
  await fs.copyFile(path.join(prior, 'assets.json'), path.join(out, 'assets.json'));
}
const manifest = JSON.parse(await fs.readFile(path.join(source, 'manifest.json'), 'utf8'));
assert(!manifest.failure && !manifest.blocked.length && !manifest.pageErrors.length);
const seconds = [6, 10, 12, 12, 10, 10, 14, 14, 8];
const cues = ['A release claim needs receipts.', 'Choose. Inspect. Import.', 'Ready — within this evidence.',
  'Four citations. Exact source.', 'Memory you can trace.', 'Bytes measured. Tokens unknown.',
  'Failed tests → hold.', 'Missing build → abstain.', 'Local proof. Honest limits.'];
const captions = ['Inspect a developer handoff before accepting its recommendation.',
  'Actual local tests and build at clean commit d0c2bce. Import only chosen observations.',
  'Four sources support this local review. It is not authenticated CI or permission to deploy.',
  'Open the test observation: exact text, observed time and SHA-256 remain inspectable.',
  'Actual Meterless H-MEM reference audit. Retrieval uses deterministic hash embeddings.',
  'UTF-8 bytes include overhead. No model request was sent; provider tokens remain unknown.',
  'Invented failed tests override the invented ready recommendation. This is a synthetic replay.',
  'Remove the invented build artifact. The desk exposes missing evidence instead of inferring readiness.',
  'Zetaris live-query and actual Cursor development evidence remain pending. No submission claim.'];
const names = ['THE CLAIM', 'EXPLICIT IMPORT', 'THE REVIEW', 'THE RECEIPT', 'THE LINEAGE', 'THE MEASUREMENT', 'FAILURE / REPLAY', 'MISSING / REPLAY', 'THE LIMITS'];
let position = 0;
const scenes = manifest.events.map((event, i) => {
  const scene = { index: i, id: event.id, sourceStart: event.start, duration: seconds[i], start: position,
    crop: { x: 120, y: i === 3 ? 160 : 0, width: 1480, height: 740 }, cue: cues[i], caption: captions[i], name: names[i], synthetic: i === 6 || i === 7 };
  position += scene.duration; return scene;
});
assert.equal(position, 96);
await fs.writeFile(path.join(out, 'edl.json'), JSON.stringify({ source: path.relative(root, path.join(source, 'raw.webm')), duration: 96,
  fps: 30, bpm: 120, scenes, editing: 'Chronological excerpts of actual recorded interactions; trimmed reading holds. Diagram is an editorial map, not fabricated application UI.' }, null, 2));
function run(binary, args, options = {}) {
  const result = spawnSync(binary, args, { cwd: out, encoding: 'utf8', maxBuffer: 4_000_000, ...options });
  if (result.status !== 0) throw new Error(`${binary} failed: ${result.stderr?.slice(-1600) || result.error}`);
  return result;
}
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const ledgerPath = path.join(out, 'assets.json');
let ledger;
try { ledger = JSON.parse(await fs.readFile(ledgerPath, 'utf8')); } catch {}
if (!ledger) {
  // Primary IBM repository revision verified 22 October 2026; never silently follow master.
  const revision = '71f558992315a12ca1f06a2215d57962a1992162';
  assert(/^[a-f0-9]{40}$/.test(revision));
  ledger = { fetchedAt: new Date().toISOString(), repository: 'https://github.com/IBM/plex', revision, assets: [] };
  for (const [name, relative] of [['IBMPlexSans-Regular.ttf', 'packages/plex-sans/fonts/complete/ttf/IBMPlexSans-Regular.ttf'], ['IBMPlexSans-Bold.ttf', 'packages/plex-sans/fonts/complete/ttf/IBMPlexSans-Bold.ttf'], ['LICENSE-IBM-PLEX.txt', 'LICENSE.txt']]) {
    const url = `https://raw.githubusercontent.com/IBM/plex/${revision}/${relative}`;
    const fetched = await fetch(url, { signal: AbortSignal.timeout(20000) });
    assert(fetched.ok, `Font source unavailable: ${name}`);
    const buffer = Buffer.from(await fetched.arrayBuffer());
    assert(buffer.length > 100 && buffer.length < 1_000_000);
    await fs.writeFile(path.join(assets, name), buffer);
    ledger.assets.push({ file: name, url, sha256: hash(buffer), bytes: buffer.length, license: 'SIL OFL 1.1', modification: 'None' });
  }
  await fs.writeFile(ledgerPath, JSON.stringify(ledger, null, 2));
}
for (const entry of ledger.assets) assert.equal(hash(await fs.readFile(path.join(assets, entry.file))), entry.sha256);
await fs.copyFile(path.join(assets, 'LICENSE-IBM-PLEX.txt'), path.join(root, 'docs/video/r3/LICENSE-IBM-PLEX.txt'));

const assTime = s => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(Math.floor(s) % 60).padStart(2, '0')}.${String(Math.round(s * 100) % 100).padStart(2, '0')}`;
const color = { cream: 'E7F2EA', muted: '9FB9AA', dim: '547264', green: 'A9E2B5', amber: 'E9BD7A' };
const bgr = hex => hex.match(/../g).reverse().join('');
const head = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Type,IBM Plex Sans,24,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
const wrap = text => {
  const words = text.split(' '), lines = [''];
  for (const word of words) (lines.at(-1).length + word.length > 125) ? lines.push(word) : lines[lines.length - 1] += (lines.at(-1) ? ' ' : '') + word;
  return lines.join('\\N');
};
function circle(cx, cy, radius) {
  return Array.from({ length: 24 }, (_, i) => `${i === 0 ? 'm' : 'l'} ${Math.round(cx + radius * Math.cos(i * Math.PI / 12))} ${Math.round(cy + radius * Math.sin(i * Math.PI / 12))}`).join(' ') + ' c';
}
function makeAss(scene) {
  const lines = [], d = scene.duration, accent = scene.synthetic ? color.amber : color.green;
  const event = (text, first = 0, last = d, layer = 1) => { if (last > first) lines.push(`Dialogue: ${layer},${assTime(first)},${assTime(last)},Type,,0,0,0,,${text}`); };
  const text = (value, x, y, size, tint = color.cream, extra = '', first = 0, last = d) => event(`{\\an7\\pos(${x},${y})\\fs${size}\\c&H${bgr(tint)}&${extra}}${value}`, first, last);
  const shape = (drawing, tint, extra = '', first = 0, last = d, layer = 0) => event(`{\\an7\\pos(0,0)\\p1\\c&H${bgr(tint)}&${extra}}${drawing}{\\p0}`, first, last, layer);
  text('Qarinah / Evidence desk', 114, 14, 28, color.cream, '\\b1');
  text('LOCAL PRODUCT FILM   /   120 BPM ORIGINAL SCORE', 116, 50, 12, color.muted);
  text('REVIEW PATH · EDITORIAL MAP', 840, 11, 11, color.muted);
  const xs = [1090, 1380, 1670], labels = ['CHOSEN SOURCES', 'H-MEM', 'CITED REVIEW'];
  shape('m 1112 32 l 1358 32 l 1358 34 l 1112 34 c m 1402 32 l 1648 32 l 1648 34 l 1402 34 c', color.dim);
  for (let i = 0; i < 3; i++) { shape(circle(xs[i], 33, 7), color.dim); text(labels[i], xs[i] - 69, 52, 14, color.muted); }
  const active = scene.index < 2 ? 0 : scene.index === 4 ? 1 : 2;
  if (scene.index === 2 || scene.synthetic) {
    for (let i = 0; i < 3; i++) shape(circle(xs[i], 33, 9), accent, '', i ? 2.5 + i : 0, d);
    shape('m 1112 32 l 1358 32 l 1358 34 l 1112 34 c', accent, '\\clip(1112,30,1112,36)\\t(2500,3500,\\clip(1112,30,1358,36))');
    shape('m 1402 32 l 1648 32 l 1648 34 l 1402 34 c', accent, '\\clip(1402,30,1402,36)\\t(3500,4500,\\clip(1402,30,1648,36))');
    event(`{\\an5\\move(1090,33,1380,33,0,1000)\\p1\\c&H${bgr(accent)}&}m -5 -5 l 5 -5 l 5 5 l -5 5 c{\\p0}`, 2.5, 3.5, 2);
    event(`{\\an5\\move(1380,33,1670,33,0,1000)\\p1\\c&H${bgr(accent)}&}m -5 -5 l 5 -5 l 5 5 l -5 5 c{\\p0}`, 3.5, 4.5, 2);
    for (let i = 0; i < 3; i++) shape(circle(xs[i], 33, 18), accent, '\\alpha&H70&\\t(0,550,\\alpha&HFF&)', 2.5 + i, 3.15 + i, 2);
  } else shape(circle(xs[active], 33, 9), accent);
  if (scene.index === 3 || scene.index === 4) {
    for (let n = 0; n < 3; n++) shape(circle(xs[active], 33, 17), accent, '\\alpha&H90&\\t(0,600,\\alpha&HFF&)', 1 + n * 2, 1.65 + n * 2, 2);
  }
  const provenance = scene.synthetic ? 'SYNTHETIC REPLAY / INVENTED OBSERVATIONS' : scene.index === 8 ? 'SYNTHETIC REPLAY BACKGROUND / SPONSOR EVIDENCE PENDING' : scene.index === 0 ? 'REAL LOCAL PRODUCT / NO PROVIDER CALL' : 'REAL LOCAL OBSERVATIONS / NO PROVIDER CALL';
  text(`${String(scene.index + 1).padStart(2, '0')} / ${scene.name}`, 60, 945, 13, accent, '\\b1\\fsp1');
  text(provenance, 1150, 945, 13, accent);
  const gated = scene.index === 2 || scene.synthetic;
  if (gated) {
    text(scene.synthetic ? 'Replay: change the evidence.' : 'Import. Then review.', 60, 970, 36, scene.synthetic ? color.amber : color.cream, '\\b1', 0, 4.5);
    text(scene.synthetic ? 'Explicit synthetic packet. Import before interpreting the product response.' : 'Chosen observations are being resolved by the local desk.', 62, 1024, 23, color.cream, '', 0, 4.5);
  }
  event(`{\\an7${scene.index ? '\\move(60,985,60,970,0,320)\\fad(220,160)' : '\\pos(60,970)'}\\fs36\\b1\\c&H${bgr(scene.synthetic ? color.amber : color.cream)}&}${scene.cue}`, gated ? 4.5 : 0, d);
  text(wrap(scene.caption), 62, 1024, 23, color.cream, scene.index ? '\\fad(250,120)' : '', gated ? 4.5 : 0, d);
  shape('m 60 1077 l 1860 1077 l 1860 1079 l 60 1079 c', color.dim);
  shape('m 60 1077 l 1860 1077 l 1860 1079 l 60 1079 c', accent, `\\clip(60,1077,60,1080)\\t(0,${d * 1000},\\clip(60,1077,1860,1080))`, 0, d, 2);
  if (scene.index > 0) shape('m 0 78 l 1920 78 l 1920 80 l 0 80 c', accent, '\\alpha&H10&\\t(0,260,\\alpha&HFF&)', 0, .3, 2);
  if (scene.index === 4) {
    text('TRACE THE SOURCE', 1404, 150, 26, color.cream, '\\b1');
    text('EDITORIAL MAP · ACTUAL AUDIT AT LEFT', 1406, 190, 12, color.muted);
    shape('m 1406 294 l 1408 294 l 1408 638 l 1406 638 c', color.dim);
    for (const [i, title, sub] of [[0, 'Observation', 'Exact text + observed time'], [1, 'H-MEM reference', 'Source-resolved memory'], [2, 'Cited review', 'Known IDs in this snapshot']]) {
      const cy = 280 + i * 180;
      shape(circle(1407, cy, 9), accent, '\\fad(150,0)', i * 1.5, d);
      text(title, 1438, cy - 15, 27, color.cream, '\\b1\\fad(180,0)', i * 1.5, d);
      text(sub, 1438, cy + 29, 17, color.muted, '\\fad(180,0)', i * 1.5, d);
    }
    for (let i = 0; i < 2; i++) event(`{\\an5\\move(1407,${300 + i * 180},1407,${440 + i * 180},0,1100)\\p1\\c&H${bgr(accent)}&}m -5 -5 l 5 -5 l 5 5 l -5 5 c{\\p0}`, .5 + i * 1.5, 1.6 + i * 1.5, 2);
    text('No hidden leap from\nstatement to permission.'.replace('\n', '\\N'), 1406, 778, 21, color.muted);
  }
  if (scene.synthetic) {
    text('SYNTHETIC RULE CHECK', 1414, 210, 17, accent, '\\b1\\fsp1');
    text(scene.index === 6 ? 'HOLD' : 'ABSTAIN', 1400, 322, scene.index === 6 ? 92 : 64, accent, '\\b1\\fad(220,0)', 4.5, d);
    text(scene.index === 6 ? 'Failed tests' : 'Missing build artifact', 1410, 438, 27, color.cream, '\\fad(200,0)', 4.25, d);
    text(scene.index === 6 ? 'A ready statement\ncannot override failure.'.replace('\n', '\\N') : 'Do not infer readiness\nfrom incomplete evidence.'.replace('\n', '\\N'), 1410, 500, 21, color.muted, '\\fad(200,0)', 4.5, d);
    shape('m 1410 600 l 1770 600 l 1770 603 l 1410 603 c', accent, '\\clip(1410,599,1410,605)\\t(0,800,\\clip(1410,599,1770,605))', 4, d);
    text('INVENTED OBSERVATIONS\nACTUAL PRODUCT RESPONSE'.replace('\n', '\\N'), 1410, 725, 15, accent, '\\fsp1', 4, d);
  }
  return head + lines.join('\n') + '\n';
}
for (const scene of scenes) await fs.writeFile(path.join(out, `scene-${scene.index}.ass`), makeAss(scene));
const raw = path.join(source, 'raw.webm');
const stillMode = process.argv.includes('--look');
const select = scenes.filter(scene => [0, 2, 3, 4, 5, 6, 7, 8].includes(scene.index));
function filter(scene, still = false) {
  const split = scene.index === 4 || scene.synthetic;
  const count = Math.ceil(scene.duration / 4), output = split ? '1240x850' : '1696x848';
  const base = scene.index === 0 ? [200, 80, 1400, 700] : split ? [200, 0, 1080, 740] : [120, scene.crop.y, 1480, 740];
  const closer = scene.index === 0 ? [200, 90, 1320, 660] : split ? [220, 0, 1040, 712] : scene.index === 2 ? [200, 0, 1200, 600] : scene.index === 3 ? [220, 360, 1080, 540] : [160, 0, 1440, 720];
  const parts = [`[0:v]setpts=PTS-STARTPTS,fps=30,split=${count}${Array.from({ length: count }, (_, i) => `[camera${i}]`).join('')}`];
  for (let i = 0; i < count; i++) {
    const first = i * 4, last = Math.min(scene.duration, first + 4), frames = Math.round((last - first) * 30);
    const [x, y, w, h] = i % 2 ? closer : base;
    parts.push(`[camera${i}]trim=start=${first}:end=${last},setpts=PTS-STARTPTS,crop=${w}:${h}:${x}:${y},zoompan=z='1+0.025*(1-cos(PI*on/${frames - 1}))/2':x='${scene.index === 0 ? '0' : 'iw/2-iw/zoom/2'}':y='0':d=1:s=${output}:fps=30[shot${i}]`);
  }
  parts.push(`${Array.from({ length: count }, (_, i) => `[shot${i}]`).join('')}concat=n=${count}:v=1:a=0${scene.index > 0 && !still ? ',fade=t=in:st=0:d=0.14' : ''}[screen]`);
  parts.push(`[1:v][screen]overlay=112:80:shortest=1[ground];[2:v]scale=56:56[mark];[ground][mark]overlay=48:12,subtitles=scene-${scene.index}.ass:fontsdir=assets,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]`);
  return parts.join(';');
}
if (stillMode) {
  for (const scene of select) {
    // Settled first look. Actual source footage, no fabricated UI.
    run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(scene.sourceStart), '-i', raw, '-loop', '1', '-i', 'assets/editorial-ground.png', '-loop', '1', '-i', 'assets/qarinah-mark.png', '-filter_complex', filter(scene, true), '-map', '[v]', '-ss', scene.synthetic ? '6' : '4', '-frames:v', '1', `review/look-${scene.index}.png`]);
  }
  console.log(JSON.stringify({ look: path.join(out, 'review'), scenes: select.length }));
  process.exit(0);
}
if (!await fs.stat(path.join(assets, 'original-score.wav')).catch(() => null)) run('python', [path.join(root, 'scripts/video-r3/compose.py'), assets]);
for (const scene of scenes) {
  const file = `picture-${scene.index}.mp4`;
  if (!await fs.stat(path.join(out, file)).catch(() => null) || process.argv.includes('--fresh')) {
    run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'warning', '-ss', String(scene.sourceStart), '-i', raw, '-loop', '1', '-framerate', '30', '-i', 'assets/editorial-ground.png', '-loop', '1', '-i', 'assets/qarinah-mark.png', '-filter_complex', filter(scene), '-map', '[v]', '-t', String(scene.duration), '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', file]);
  }
  console.log(JSON.stringify({ rendered: scene.id, duration: scene.duration }));
}
await fs.writeFile(path.join(out, 'concat.txt'), scenes.map(s => `file 'picture-${s.index}.mp4'`).join('\n'));
const parseLoudness = value => JSON.parse(value.slice(value.lastIndexOf('{'), value.lastIndexOf('}') + 1));
const firstMeter = parseLoudness(run('ffmpeg', ['-hide_banner', '-nostats', '-i', 'assets/original-score.wav', '-af', 'highpass=f=38,loudnorm=I=-18:TP=-1.5:LRA=5:print_format=json', '-f', 'null', '-']).stderr);
const master = `highpass=f=38,loudnorm=I=-18:TP=-1.5:LRA=5:measured_I=${firstMeter.input_i}:measured_TP=${firstMeter.input_tp}:measured_LRA=${firstMeter.input_lra}:measured_thresh=${firstMeter.input_thresh}:offset=${firstMeter.target_offset}:linear=true:print_format=json`;
run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'warning', '-i', 'assets/original-score.wav', '-af', master, '-ar', '48000', '-c:a', 'pcm_s24le', 'assets/original-score-master.wav']);
if (await fs.stat(path.join(out, 'qarinah-evidence-r3.mp4')).catch(() => null)
  && !await fs.stat(path.join(out, 'qarinah-evidence-r3.pre-tag.mp4')).catch(() => null))
  await fs.copyFile(path.join(out, 'qarinah-evidence-r3.mp4'), path.join(out, 'qarinah-evidence-r3.pre-tag.mp4'));
run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'warning', '-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-i', 'assets/original-score-master.wav', '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', '96', '-movflags', '+faststart', '-metadata', 'title=Qarinah Evidence Desk — Evidence before output', '-metadata', 'comment=Real localhost product footage. Synthetic cases labeled. Original local instrumental; no narration. Sponsor evidence pending.', 'qarinah-evidence-r3.mp4']);
const finalMeter = parseLoudness(run('ffmpeg', ['-hide_banner', '-nostats', '-i', 'qarinah-evidence-r3.mp4', '-af', 'loudnorm=I=-18:TP=-1.5:LRA=5:print_format=json', '-f', 'null', '-']).stderr);
const metadata = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'stream=codec_name,width,height,avg_frame_rate,nb_read_frames,sample_rate,channels,color_range,color_primaries,color_transfer,color_space:format=duration,size,tags', '-of', 'json', 'qarinah-evidence-r3.mp4']).stdout);
const decode = run('ffmpeg', ['-v', 'error', '-i', 'qarinah-evidence-r3.mp4', '-f', 'null', '-']);
const black = run('ffmpeg', ['-hide_banner', '-nostats', '-i', 'qarinah-evidence-r3.mp4', '-vf', 'blackdetect=d=0.25:pix_th=0.1:pic_th=0.98', '-an', '-f', 'null', '-']).stderr.split(/\r?\n/).filter(line => line.includes('black_start:'));
assert.equal(black.length, 0);
assert(Math.abs(Number(finalMeter.input_i) + 18) < 1);
assert(Number(finalMeter.input_tp) <= -1);
const shots = [0, 6.3, 16.7, 17.8, 19.7, 21, 23, 32, 34, 43, 46, 53, 55, 62, 66, 77, 80, 90, 95.4];
for (const at of shots) run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(at), '-i', 'qarinah-evidence-r3.mp4', '-frames:v', '1', `review/frame-${String(at).replace('.', '-')}.png`]);
run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', 'qarinah-evidence-r3.mp4', '-filter_complex', '[0:a]showwavespic=s=1600x240:colors=0xA9E2B5|0xE9BD7A:split_channels=1[a]', '-map', '[a]', '-frames:v', '1', 'review/waveform.png']);
run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'qarinah-evidence-r3.mp4', '-vf', 'crop=1100:700:150:130,signalstats,metadata=print:file=review/screen-luma.txt', '-an', '-f', 'null', '-']);
const luma = (await fs.readFile(path.join(out, 'review/screen-luma.txt'), 'utf8')).split(/\r?\n/).filter(line => line.startsWith('lavfi.signalstats.YAVG=')).map(line => Number(line.split('=')[1]));
let longestLow = 0, currentLow = 0;
for (const value of luma) { currentLow = value < 80 ? currentLow + 1 : 0; longestLow = Math.max(longestLow, currentLow); }
assert(longestLow <= 6, 'Recorded picture is missing beyond the deliberate 0.14 second transition.');
const buffer = await fs.readFile(path.join(out, 'qarinah-evidence-r3.mp4'));
await fs.writeFile(path.join(out, 'qa.json'), JSON.stringify({ metadata, sha256: hash(buffer), finalAudio: finalMeter, target: { integratedLufs: -18, maximumTruePeakDbtp: -1 }, decodeErrors: decode.stderr.trim() || null, blackIntervals: black,
  screenContent: { checkedFrames: luma.length, maximumConsecutiveDarkFrames: longestLow, threshold: 80, maximumAllowedFrames: 6, note: 'Center product ROI; brief fade transitions intentionally allowed.' },
  sourcePacketUnmodified: manifest.packetHash, narration: 'None; original instrumental and on-screen captions', reviewerLimit: 'No claim of human listening or manual review of every frame.', claims: 'Original local packet plus labeled synthetic failure/missing copies. Sponsor query/Cursor use remain pending.' }, null, 2));
console.log(JSON.stringify({ final: path.join(out, 'qarinah-evidence-r3.mp4'), duration: metadata.format.duration, lufs: finalMeter.input_i, truePeak: finalMeter.input_tp, sha256: hash(buffer) }));
