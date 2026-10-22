import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { verifyReceipt, RECEIPT_BYTES } from '../server/receipt.ts';
import { DeskError } from '../server/types.ts';

const args = process.argv.slice(2);
try {
  if (args.length < 1 || args.length > 2 || (args[1] && !/^--sha256=[a-f0-9]{64}$/.test(args[1]))) throw new DeskError(400, 'USAGE', 'Usage: npm run verify:receipt -- receipt.json [--sha256=TRUSTED_FILE_DIGEST]');
  const stat = fs.statSync(args[0]);
  if (!stat.isFile() || stat.size > RECEIPT_BYTES) throw new DeskError(400, 'RECEIPT_SIZE', 'Choose a receipt file of at most 128 KiB.');
  const bytes = fs.readFileSync(args[0]);
  if (bytes.length > RECEIPT_BYTES) throw new DeskError(400, 'RECEIPT_SIZE', 'The receipt exceeds 128 KiB.');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (args[1] && sha256 !== args[1].slice('--sha256='.length)) throw new DeskError(400, 'RECEIPT_DIGEST', 'The file differs from the supplied trusted digest.');
  let receipt: unknown;
  try { receipt = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new DeskError(400, 'RECEIPT_JSON', 'Choose a complete UTF-8 JSON receipt.'); }
  console.log(JSON.stringify({ ...await verifyReceipt(receipt), fileSha256: sha256, trustedDigestMatched: args[1] ? true : null }, null, 2));
} catch (error) {
  const safe = error instanceof DeskError ? error : new DeskError(400, 'RECEIPT_UNAVAILABLE', 'The local receipt could not be read or replayed.');
  console.log(JSON.stringify({ status: 'rejected', code: safe.code, message: safe.message }));
  process.exitCode = 1;
}
