import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
if (args.length > 1 || args[0] && !['--recommendation=ready', '--recommendation=hold'].includes(args[0])) {
  throw new Error('Use npm run evidence -- [--recommendation=ready|--recommendation=hold]');
}
const recommendation = args[0]?.split('=')[1] ?? 'hold';
const npmCli = process.env.npm_execpath;
if (!npmCli || !path.isAbsolute(npmCli)) throw new Error('Run this through npm run evidence.');
const git = (...parameters) => execFileSync('git', parameters, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
const commit = git('rev-parse', 'HEAD');
const startStatus = git('status', '--porcelain=v1', '--untracked-files=normal');
const startedAt = new Date().toISOString();
const runId = startedAt.replace(/[^0-9TZ]/g, '');
const directory = path.join(root, '.local', 'handoff', runId);
await fs.mkdir(path.dirname(directory), { recursive: true });
await fs.mkdir(directory, { recursive: false });
const receipts = [];

async function run(check, parameters) {
  const began = Date.now();
  const hash = createHash('sha256');
  let chunks = [], retained = 0, truncated = false, launchError = false;
  const outcome = await new Promise(resolve => {
    const child = spawn(process.execPath, [npmCli, ...parameters], {
      cwd: root, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, 120_000);
    const receive = chunk => {
      hash.update(chunk);
      const room = Math.max(0, 262_144 - retained);
      if (chunk.length > room) truncated = true;
      if (room) { const keep = chunk.subarray(0, room); chunks.push(keep); retained += keep.length; }
    };
    child.stdout.on('data', receive); child.stderr.on('data', receive);
    child.on('error', () => { launchError = true; });
    child.on('close', code => {
      clearTimeout(timer);
      resolve(timedOut ? 'cancelled' : launchError ? 'unknown' : code === 0 ? 'passed' : 'failed');
    });
  });
  const observedAt = new Date().toISOString();
  const outputHash = hash.digest('hex');
  await fs.writeFile(path.join(directory, `${check}.log`), Buffer.concat(chunks));
  const receipt = { check, command: ['npm', ...parameters], outcome, observedAt,
    elapsedMs: Date.now() - began, outputSha256: outputHash, retainedBytes: retained, truncated };
  receipts.push(receipt);
  console.log(`${check}: ${outcome}; output SHA-256 ${outputHash}; ${receipt.elapsedMs} ms`);
  return { id: `ci-${check}`, revisionRef: 'revision-current', check, outcome, observedAt,
    detail: `Actual local npm ${parameters.join(' ')} outcome ${outcome}; output SHA-256 ${outputHash}${truncated ? '; retained log truncated at 256 KiB' : ''}.` };
}

const ci = [await run('tests', ['test']), await run('build', ['run', 'build'])];
if (git('rev-parse', 'HEAD') !== commit) throw new Error('HEAD changed during capture; no packet was produced.');
const dirty = Boolean(startStatus || git('status', '--porcelain=v1', '--untracked-files=normal'));
const packet = {
  format: 'qarinah-handoff-v1', provenance: 'local-observation', project: 'qarinah-evidence-desk',
  currentRevisionRef: 'revision-current',
  revisions: [{ id: 'revision-current', commit, dirty, observedAt: startedAt }], ci,
  releases: [{ id: 'release-current', revisionRef: 'revision-current', decision: recommendation,
    requiredChecks: ['tests', 'build'], ciRefs: ci.map(item => item.id), observedAt: new Date().toISOString(),
    detail: `Explicit local review recommendation: ${recommendation}. Not deployment authorization, sponsor verification or competition eligibility.` }],
};
await fs.writeFile(path.join(directory, 'packet.json'), JSON.stringify(packet, null, 2) + '\n');
await fs.writeFile(path.join(directory, 'capture.json'), JSON.stringify({ commit, dirty, startedAt, receipts }, null, 2) + '\n');
console.log(JSON.stringify({ packet: path.join(directory, 'packet.json'), commit, dirty,
  recommendation, note: 'Caller-declared local observations; no upload or provider call.' }));
if (ci.some(item => item.outcome !== 'passed')) process.exitCode = 1;
