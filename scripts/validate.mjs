import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Identical commands from npm, Cursor tasks or another terminal; no shell or API.
const root = fileURLToPath(new URL('..', import.meta.url));
if (process.argv.length !== 2) throw new Error('Usage: node scripts/validate.mjs');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
const startedAt = new Date().toISOString();
const revision = git('rev-parse', 'HEAD');
const initialStatus = git('status', '--porcelain=v1', '--untracked-files=normal');
const directory = path.join(root, '.local', 'editor-validation', `${startedAt.replace(/[^0-9TZ]/g, '')}-${randomUUID().slice(0, 8)}`);
await fs.mkdir(directory, { recursive: true });
const checks = [
  ['tests', ['scripts/test.mjs']],
  ['typecheck', ['node_modules/typescript/bin/tsc', '--project', 'tsconfig.json']],
  ['build', ['node_modules/vite/bin/vite.js', 'build']],
  ['vendor', ['scripts/verify-vendor.mjs']],
];
const results = [];
for (const [name, args] of checks) {
  const began = Date.now(), hash = createHash('sha256');
  const chunks = [];
  let retainedBytes = 0, outputBytes = 0, launchFailed = false;
  const exitCode = await new Promise(resolve => {
    const child = spawn(process.execPath, args, { cwd: root, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const receive = chunk => {
      hash.update(chunk); outputBytes += chunk.length;
      const keep = chunk.subarray(0, Math.max(0, 1_048_576 - retainedBytes));
      if (keep.length) { chunks.push(keep); retainedBytes += keep.length; }
      process.stdout.write(chunk);
    };
    child.stdout.on('data', receive); child.stderr.on('data', receive);
    child.on('error', () => { launchFailed = true; });
    child.on('close', code => resolve(code));
  });
  await fs.writeFile(path.join(directory, `${name}.log`), Buffer.concat(chunks));
  const result = { name, command: ['node', ...args], passed: !launchFailed && exitCode === 0, exitCode,
    elapsedMs: Date.now() - began, outputSha256: hash.digest('hex'), outputBytes, retainedBytes, truncated: outputBytes > retainedBytes };
  results.push(result);
  console.log(`${name}: ${result.passed ? 'PASS' : 'FAIL'}`);
  if (!result.passed) break;
}
const finalStatus = git('status', '--porcelain=v1', '--untracked-files=normal');
const revisionUnchanged = git('rev-parse', 'HEAD') === revision;
const workingTreeStatusUnchanged = initialStatus === finalStatus;
const passed = results.length === checks.length && results.every(result => result.passed) && revisionUnchanged && workingTreeStatusUnchanged;
const receipt = {
  schemaVersion: 'qarinah.editor-validation.v1', startedAt, completedAt: new Date().toISOString(),
  revision, dirty: Boolean(initialStatus || finalStatus), revisionUnchanged, workingTreeStatusUnchanged,
  nodeVersion: process.version, checks: results, passed,
  actualCursorDevelopmentUseVerified: false,
  note: 'Local validation only. A terminal receipt does not identify the editor or authenticate CI. Same-status source edits during execution are not detected.',
};
const receiptPath = path.join(directory, 'receipt.json');
await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(`Validation ${passed ? 'PASS' : 'FAIL'}; receipt: ${receiptPath}`);
if (!passed) process.exitCode = 1;
