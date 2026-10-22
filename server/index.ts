import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EvidenceDesk } from './desk.ts';
import { createDeskServer } from './http.ts';
import type { AppConfig } from './types.ts';

export function configuration(workspace = path.resolve(fileURLToPath(new URL('..', import.meta.url))), env = process.env): AppConfig {
  const model = env.NEMOTRON_MODEL || 'nvidia/llama-3.3-nemotron-super-49b-v1';
  if (!/^nvidia\/[a-z0-9._-]*nemotron[a-z0-9._-]*$/.test(model) || model.length > 120) throw new Error('Choose an explicit supported NVIDIA Nemotron model identifier.');
  return { workspace, dataDir: env.QED_DATA_DIR ? path.resolve(env.QED_DATA_DIR) : path.join(workspace, '.local', 'evidence-desk'), distDir: path.join(workspace, 'dist'), zetarisUrl: env.ZETARIS_REST_URL, zetarisKey: env.ZETARIS_API_KEY, zetarisOrgId: env.ZETARIS_ORG_ID, nemotronKey: env.NVIDIA_API_KEY, nemotronModel: model, allowNemotron: env.QED_ENABLE_NEMOTRON === 'true' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const workspace = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const localEnv = path.join(workspace, '.env.local');
  if (fs.existsSync(localEnv)) process.loadEnvFile(localEnv);
  const desk = new EvidenceDesk(configuration(workspace));
  createDeskServer(desk).listen(4318, '127.0.0.1', () => console.log('Qarinah Evidence Desk listening at http://127.0.0.1:4318 (local only)'));
}
