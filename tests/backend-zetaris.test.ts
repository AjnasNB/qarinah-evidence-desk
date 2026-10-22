import { test } from 'node:test';
import assert from 'node:assert/strict';
import { queryBundledZetaris, SQL } from '../server/providers.ts';
import { DeskError, LIMITS } from '../server/types.ts';

const token = 'syntheticheader.syntheticpayload.syntheticsignature';
const secret = 'SYNTHETIC-PRIVATE-PASSWORD';
const config = { origin: 'http://127.0.0.1:3000', username: 'synthetic@example.invalid', password: secret };
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers });

test('bundled vendor transport logs in once and uses the response organisation with fixed bounded SQL', async () => {
  const seen: { url: string; init?: RequestInit }[] = [];
  const queryBody = { deliberatelyUnverifiedEnvelope: [{ one: '1' }] };
  const fake = (async (input, init) => { seen.push({ url: String(input), init }); return seen.length === 1 ? json({ idToken: token, refreshToken: 'unused-private-refresh-token', orgId: 37 }) : json(queryBody); }) as typeof fetch;
  const result = await queryBundledZetaris(config, 'probe', fake);
  assert.equal(seen.length, 2);
  assert.equal(seen[0].url, config.origin + '/api/auth/login');
  assert.deepEqual(JSON.parse(String(seen[0].init?.body)), { username: config.username, password: secret });
  assert.equal(new Headers(seen[0].init?.headers).has('authorization'), false);
  assert.equal(seen[1].url, config.origin + '/api/proxy/query/sql/start');
  const headers = new Headers(seen[1].init?.headers);
  assert.equal(headers.get('authorization'), 'Bearer ' + token);
  assert.equal(headers.get('x-org-id'), '37');
  assert.match(headers.get('x-request-id')!, /^[a-f0-9-]{36}$/);
  assert.deepEqual(JSON.parse(String(seen[1].init?.body)), { select: SQL.probe, pageLimit: 5 });
  assert.equal(seen[0].init?.redirect, 'manual'); assert.equal(seen[1].init?.redirect, 'manual');
  assert.equal(seen[0].init?.signal, seen[1].init?.signal, 'Login and SQL share one bounded deadline.');
  assert.deepEqual(result.body, queryBody, 'Transport does not guess an unverified result schema.');
  assert.equal(result.bytes, Buffer.byteLength(JSON.stringify(queryBody)));
  assert.equal(JSON.stringify(result).includes(secret), false); assert.equal(JSON.stringify(result).includes(token), false);
});

test('invalid or ambiguous login metadata cannot cause a SQL request', async () => {
  for (const body of [{ idToken: token }, { idToken: token, orgId: '37' }, { idToken: token, orgId: 0 }, { idToken: token, orgId: 1.5 }, { idToken: token, orgId: [37] }, { idToken: [token], orgId: 37 }, { message: token, orgId: 37 }, { idToken: token, accessToken: token + 'different', orgId: 37 }, { idToken: token + '\n', orgId: 37 }]) {
    let calls = 0;
    await assert.rejects(queryBundledZetaris(config, 'probe', (async () => { calls++; return json(body); }) as typeof fetch), (error: DeskError) => error.code === 'ZETARIS_AUTH_SHAPE' && !String(error).includes(token));
    assert.equal(calls, 1);
  }
});

test('bundled transport refuses redirects, oversized bodies and secret-bearing exceptions without following or retrying', async () => {
  for (const failure of [() => json({}, 302, { location: 'https://private.invalid/' + secret }), () => new Response('x'.repeat(LIMITS.sourceResponseBytes + 1)), () => { throw new Error(secret + token); }]) {
    for (const failedStep of [1, 2]) {
      let calls = 0;
      await assert.rejects(queryBundledZetaris(config, 'probe', (async () => { calls++; if (calls === failedStep) return failure(); return json({ idToken: token, orgId: 37 }); }) as typeof fetch), error => !String(error).includes(secret) && !String(error).includes(token));
      assert.equal(calls, failedStep);
    }
  }
});

test('unsupported UI origin, credentials or query cannot make a network request', async () => {
  let calls = 0; const fake = (async () => { calls++; return json({}); }) as typeof fetch;
  for (const origin of ['http://remote.invalid', 'http://127.0.0.1:3000/path', 'http://user:password@127.0.0.1:3000', 'http://127.0.0.1:3000?secret=x', 'file:///private']) await assert.rejects(queryBundledZetaris({ ...config, origin }, 'probe', fake));
  await assert.rejects(queryBundledZetaris({ ...config, password: '' }, 'probe', fake));
  await assert.rejects(queryBundledZetaris(config, 'DROP TABLE x' as 'probe', fake));
  assert.equal(calls, 0);
});
