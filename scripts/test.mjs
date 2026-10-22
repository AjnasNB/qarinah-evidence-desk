import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const files = (await readdir(new URL('../tests/', import.meta.url))).filter(file => /\.test\.(?:ts|mjs)$/.test(file)).sort().map(file => `tests/${file}`);
files.push(...(await readdir(new URL('../src/', import.meta.url))).filter(file => /\.test\.mjs$/.test(file)).sort().map(file => `src/${file}`));
if (!files.length) throw new Error('No tests found');
const child = spawn(process.execPath, ['--import', 'tsx', '--test', ...files], { stdio: 'inherit', windowsHide: true });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
