import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configuration } from '../server/index.ts';
import { EvidenceDesk } from '../server/desk.ts';
import { createDeskServer } from '../server/http.ts';

// Separate loopback preview; existing development services and their memory stay intact.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localEnv = path.join(root, '.env.local');
if (fs.existsSync(localEnv)) process.loadEnvFile(localEnv);
const config = configuration(root, { ...process.env, QED_DATA_DIR: path.join(root, '.local/receipt-preview'), QED_ENABLE_NEMOTRON: 'false' });
createDeskServer(new EvidenceDesk(config)).listen(5184, '127.0.0.1', () => console.log('Qarinah receipt preview: http://127.0.0.1:5184/ (loopback only, model disabled)'));
