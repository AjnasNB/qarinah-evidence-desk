import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const required = ['postgres', 'driver', 'api', 'ui'];
const destination = '/home/zetaris/customer-data/shared/qarinah-evidence-desk';
const failure = code => { const error = new Error(code); error.safeCode = code; throw error; };
export function servicesFrom(raw) {
  let values; try { const text = raw.trim(); values = !text ? [] : text.startsWith('[') ? JSON.parse(text) : text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); } catch { failure('HEALTH_RESPONSE_UNVERIFIED'); }
  if (!Array.isArray(values) || values.length > 20) failure('HEALTH_RESPONSE_UNVERIFIED');
  return required.map(service => {
    const matches = values.filter(item => item?.Service === service);
    if (matches.length > 1) failure('HEALTH_SERVICE_AMBIGUOUS');
    return { service, running: matches[0]?.State === 'running', healthy: matches[0]?.Health === 'healthy' };
  });
}
export function localFile(file, category, basename) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) failure('LOCAL_PATH_UNVERIFIED');
  const resolved = path.resolve(file), base = path.join(root, '.local', category) + path.sep;
  if (!resolved.startsWith(base) || path.basename(resolved) !== basename) failure('LOCAL_PATH_UNVERIFIED');
  return resolved;
}
function lastJson(stdout) { try { return JSON.parse(stdout.trim().split(/\r?\n/).reverse().find(line => line.trim().startsWith('{'))); } catch { failure('COMMAND_RESULT_UNVERIFIED'); } }
async function configuration(args) {
  let checkOnly = false, runtimeRoot = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'QarinahEvidenceDesk') : undefined;
  for (let index = 0; index < args.length; index++) { if (args[index] === '--check-only') checkOnly = true; else if (args[index] === '--runtime-root' && args[index + 1]) runtimeRoot = args[++index]; else failure('UNSUPPORTED_ARGUMENT'); }
  if (!runtimeRoot || !path.isAbsolute(runtimeRoot)) failure('RUNTIME_PATH_REQUIRED');
  const vendor = path.join(runtimeRoot, 'runtime', 'zetaris-platform');
  const config = { checkOnly, docker: path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'), npmCli: path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'), auth: path.join(runtimeRoot, 'docker-auth'), env: path.join(vendor, '.env'), compose: path.join(vendor, 'docker-compose.yml'), override: path.join(root, 'runtime', 'zetaris-compose.override.yml'), oldPacket: path.join(root, '.local', 'handoff', '20261022T072947054Z', 'packet.json') };
  for (const file of [config.docker, config.npmCli, config.auth, config.env, config.compose, config.override, config.oldPacket]) { try { await fs.access(file); } catch { failure('REQUIRED_LOCAL_INPUT_MISSING'); } }
  return config;
}
export async function complete(config, { execute, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), clock = Date.now } = {}) {
  const directory = path.join(root, '.local', 'integration-runs', new Date(clock()).toISOString().replace(/[^0-9TZ]/g, '') + '-' + randomUUID().slice(0, 8));
  await fs.mkdir(directory, { recursive: true });
  const report = { format: 'qarinah.local-integration-run.v1', execution: execute ? 'mock' : 'actual', startedAt: new Date(clock()).toISOString(), status: 'failed', stage: 'health', pollCount: 0, steps: [] };
  const compose = ['--config', config.auth, '--host', 'npipe:////./pipe/dockerDesktopLinuxEngine', 'compose', '--env-file', config.env, '-f', config.compose, '-f', config.override];
  const run = async (stage, executable, args, timeout = 120_000, allowed = [0]) => {
    report.stage = stage;
    const result = execute ? await execute(stage, executable, args, timeout) : await new Promise(resolve => {
      const output = { stdout: [], stderr: [] }, counts = { stdout: 0, stderr: 0 }; let retained = 0, truncated = false, timedOut = false, launchFailed = false;
      const child = spawn(executable, args, { cwd: root, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      const timer = setTimeout(() => { timedOut = true; if (process.platform === 'win32' && child.pid) { const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore' }); killer.on('error', () => child.kill()); } else child.kill(); }, timeout);
      for (const stream of ['stdout', 'stderr']) child[stream].on('data', chunk => { counts[stream] += chunk.length; const room = Math.max(0, 262_144 - retained); if (chunk.length > room) truncated = true; if (room) { const keep = chunk.subarray(0, room); output[stream].push(keep); retained += keep.length; } });
      child.on('error', () => { launchFailed = true; });
      child.on('close', code => { clearTimeout(timer); resolve({ code, timedOut, launchFailed, truncated, stdout: Buffer.concat(output.stdout).toString('utf8'), stderr: Buffer.concat(output.stderr).toString('utf8'), stdoutBytes: counts.stdout, stderrBytes: counts.stderr }); });
    });
    const log = path.join(directory, String(report.steps.length + 1).padStart(3, '0') + '-' + stage + '.log');
    await fs.writeFile(log, result.stdout + '\n--- stderr ---\n' + (result.stderr || ''), { mode: 0o600 });
    const step = { stage, exitCode: result.code, timedOut: Boolean(result.timedOut), truncated: Boolean(result.truncated), outputSha256: sha256(result.stdout + '\n' + (result.stderr || '')), privateLog: log }; report.steps.push(step);
    if (result.launchFailed || result.timedOut || result.truncated || !allowed.includes(result.code)) failure('COMMAND_FAILED_OR_UNCERTAIN');
    return result.stdout;
  };
  const guard = async expected => { const status = await run('git-clean', 'git.exe', ['status', '--porcelain=v1', '--untracked-files=normal']); const head = (await run('git-head', 'git.exe', ['rev-parse', 'HEAD'])).trim(); if (status.trim() || !/^[a-f0-9]{40,64}$/.test(head) || expected && head !== expected) failure('SOURCE_CHANGED_OR_DIRTY'); return head; };
  try {
    const intendedCommit = await guard(); report.intendedCommit = intendedCommit;
    const deadline = clock() + 120 * 60_000;
    while (true) {
      const health = servicesFrom(await run('health', config.docker, [...compose, 'ps', '--format', 'json'], 20_000)); report.pollCount++; report.services = health;
      await fs.writeFile(path.join(directory, 'progress.json'), JSON.stringify({ status: health.every(item => item.running && item.healthy) ? 'services-healthy' : 'waiting-for-services', checkedAt: new Date(clock()).toISOString(), intendedCommit, pollCount: report.pollCount, services: health }, null, 2) + '\n', { mode: 0o600 });
      if (health.every(item => item.running && item.healthy)) break;
      if (clock() + 30_000 > deadline) failure('HEALTH_WAIT_EXPIRED');
      await sleep(30_000);
    }
    const commit = await guard(intendedCommit); report.commit = commit;
    await run('typecheck', process.execPath, [config.npmCli, 'run', 'typecheck']); await guard(commit);
    const began = clock();
    const captured = lastJson(await run('capture', process.execPath, [config.npmCli, 'run', 'evidence', '--', '--recommendation=ready'], 300_000));
    const fresh = localFile(captured.packet, 'handoff', 'packet.json');
    const freshRaw = await fs.readFile(fresh); if (freshRaw.length > 16_384) failure('CAPTURE_SIZE');
    const packet = JSON.parse(freshRaw), revision = packet.revisions?.find(item => item.id === packet.currentRevisionRef);
    if (captured.dirty !== false || captured.commit !== commit || packet.format !== 'qarinah-handoff-v1' || packet.provenance !== 'local-observation' || revision?.dirty !== false || revision?.commit !== commit || !Number.isFinite(Date.parse(revision.observedAt)) || Date.parse(revision.observedAt) < began || Date.parse(revision.observedAt) > clock() + 60_000 || !Array.isArray(packet.ci) || packet.ci.length !== 2 || new Set(packet.ci.map(item => item.check)).size !== 2 || packet.ci.some(item => !['tests', 'build'].includes(item.check) || item.outcome !== 'passed' || item.revisionRef !== packet.currentRevisionRef) || packet.releases?.[0]?.decision !== 'ready') failure('CAPTURE_UNVERIFIED');
    await guard(commit);
    const old = localFile(config.oldPacket, 'handoff', 'packet.json'), oldRaw = await fs.readFile(old); if (oldRaw.length > 16_384) failure('OLD_PACKET_UNVERIFIED');
    const oldPacket = JSON.parse(oldRaw), oldRevision = oldPacket.revisions?.find(item => item.id === oldPacket.currentRevisionRef);
    if (oldPacket.provenance !== 'local-observation' || !oldRevision?.commit?.startsWith('d0c2bce')) failure('OLD_PACKET_UNVERIFIED');
    const exported = lastJson(await run('export', process.execPath, ['--import', 'tsx', 'scripts/export-zetaris-handoff.ts', old, fresh]));
    const csv = localFile(exported.csv, 'zetaris-source', 'handoffs.csv'), csvRaw = await fs.readFile(csv);
    if (csvRaw.length > 65_536 || sha256(csvRaw) !== exported.csvSha256) failure('CSV_UNVERIFIED');
    report.source = { oldPacket: old, oldSha256: sha256(oldRaw), freshPacket: fresh, freshSha256: sha256(freshRaw), packetSha256: sha256(JSON.stringify(packet)), freshObservedAt: revision.observedAt, csv, csvSha256: exported.csvSha256, csvBytes: csvRaw.length };
    await guard(commit);
    await run('driver-directory', config.docker, [...compose, 'exec', '-T', 'driver', 'mkdir', '-p', destination], 20_000);
    await run('driver-copy', config.docker, [...compose, 'cp', csv, 'driver:' + destination + '/handoffs.csv']);
    const remoteHash = (await run('driver-hash', config.docker, [...compose, 'exec', '-T', 'driver', 'sha256sum', destination + '/handoffs.csv'], 20_000)).match(/^([a-f0-9]{64})\s/);
    if (!remoteHash || remoteHash[1] !== exported.csvSha256) failure('DRIVER_COPY_UNVERIFIED');
    report.source.driverCopyVerified = true;
    const verified = lastJson(await run('verify', process.execPath, ['--import', 'tsx', 'scripts/verify-local-zetaris.mjs', '--register-source', '--csv-prepared', csv], 360_000, [0, 1]));
    const receipt = localFile(verified.receipt, 'zetaris-verification', 'receipt.json'), receiptRaw = await fs.readFile(receipt); if (receiptRaw.length > 262_144) failure('VERIFIER_RECEIPT_UNVERIFIED');
    const detail = JSON.parse(receiptRaw); if (detail.format !== 'qarinah.zetaris-local-verification.v1' || detail.status !== verified.status) failure('VERIFIER_RECEIPT_UNVERIFIED');
    report.verification = { status: verified.status, receipt, sha256: sha256(receiptRaw) };
    if (verified.status !== 'passed') { report.status = verified.status === 'uncertain' ? 'uncertain' : 'failed'; failure('VERIFICATION_STOPPED'); }
    if (detail.source?.csvSha256 !== report.source.csvSha256 || detail.source?.packetSha256 !== report.source.packetSha256 || detail.source?.commit !== commit || detail.application?.sourceMatchesPreparedPacket !== true) failure('FRESH_VERIFICATION_UNCONFIRMED');
    await guard(commit); report.status = 'passed'; report.stage = 'complete';
    report.recording = { status: 'pending', reason: 'PLAYWRIGHT_MODULE_NOT_PROVIDED' };
    const coreReceipt = path.join(directory, 'verified-integration.json'); report.integrationReceipt = coreReceipt;
    await fs.writeFile(coreReceipt, JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    if (process.env.PLAYWRIGHT_MODULE) {
      try {
        const recorded = lastJson(await run('record', process.execPath, ['scripts/record-live-integration.mjs', '--packet=' + fresh], 180_000, [0, 1]));
        const output = path.resolve(recorded.output); if (!output.startsWith(path.join(root, '.local', 'video') + path.sep)) failure('RECORDING_PATH_UNVERIFIED');
        report.recording = { status: recorded.passed === true ? 'recorded' : 'failed', output, reviewRequired: true };
      } catch { report.recording = { status: 'failed', reason: 'RECORDING_UNCONFIRMED', reviewRequired: true }; }
      report.stage = 'complete';
    }
  } catch (error) { if (report.status === 'passed') report.status = 'failed'; report.failure = { stage: report.stage, code: error.safeCode || 'LOCAL_OPERATION_UNCONFIRMED' }; }
  report.finishedAt = new Date(clock()).toISOString();
  const receipt = path.join(directory, 'orchestration.json'); await fs.writeFile(receipt, JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  await fs.writeFile(path.join(directory, 'progress.json'), JSON.stringify({ status: report.status, finishedAt: report.finishedAt, stage: report.stage, intendedCommit: report.intendedCommit, recording: report.recording ?? null, failure: report.failure ?? null, receipt }, null, 2) + '\n', { mode: 0o600 });
  return { status: report.status, receipt, stage: report.stage, failure: report.failure ?? null, recording: report.recording ?? null };
}
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { console.log('node scripts/complete-local-integration.mjs [--check-only] [--runtime-root <absolute QarinahEvidenceDesk directory>]. Waits up to 120 minutes; never starts/restarts services or retries failed operations.'); return; }
  const config = await configuration(args);
  if (config.checkOnly) { console.log(JSON.stringify({ status: 'inputs-present', processesExecuted: 0, credentialsRead: false, networkCalls: 0 })); return; }
  const result = await complete(config); console.log(JSON.stringify(result)); if (result.status !== 'passed') process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(JSON.stringify({ status: 'failed', code: error.safeCode || 'LOCAL_RUNNER_UNCONFIRMED' })); process.exitCode = 1; });
