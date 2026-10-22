import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

// Native camera treatment of recorded pixels. No UI reconstruction or CSS video.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const job = path.resolve(root, process.argv[2] || '');
assert(job.startsWith(path.join(root, 'showtime-out') + path.sep));
const latest = JSON.parse(await fs.readFile(path.join(root, '.local/receipt-demo/latest.json'), 'utf8'));
const raw = path.join(latest.out, 'receipt-workflow.webm');
assert(path.resolve(raw).startsWith(path.join(root, '.local/receipt-demo') + path.sep));
const derivative = path.join(job, 'camera-footage.mp4');
const filter = "fps=30,zoompan=z='1.025+0.025*(1-cos(on/90))/2':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:fps=30:s=1920x1080,setsar=1";
const run = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', '-i', raw, '-vf', filter, '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', derivative], { encoding: 'utf8', windowsHide: true });
assert.equal(run.status, 0, run.stderr.slice(-2000));
const addonPath = path.join(job, 'edit/edl.json'), addon = JSON.parse(await fs.readFile(addonPath, 'utf8'));
addon.sources.recording = derivative;
await fs.writeFile(path.join(job, 'edit/motion-edl.json'), JSON.stringify(addon, null, 2));
const full = JSON.parse(await fs.readFile(path.join(job, 'edit/full-edl.json'), 'utf8'));
full.sources.upgrade = path.join(job, 'receipt-proof-motion.mp4');
await fs.writeFile(path.join(job, 'edit/full-motion-edl.json'), JSON.stringify(full, null, 2));
const sha = async file => createHash('sha256').update(await fs.readFile(file)).digest('hex');
await fs.writeFile(path.join(job, 'camera-treatment.json'), JSON.stringify({ originalSha256: await sha(raw), derivativeSha256: await sha(derivative), method: 'Native FFmpeg centered camera movement over actual frames; zoom 1.025–1.05, 30fps; no reconstruction or source timestamp change', filter, originalPreserved: true }, null, 2));
console.log(JSON.stringify({ derivative, originalPreserved: true }));
