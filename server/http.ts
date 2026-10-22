import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { EvidenceDesk } from './desk.ts';
import { DeskError, LIMITS } from './types.ts';

function reply(response: ServerResponse, status: number, value: unknown) {
  const body = JSON.stringify(value);
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
  response.end(body);
}
async function body(request: IncomingMessage): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] ?? '')) throw new DeskError(415, 'CONTENT_TYPE', 'Send application/json.');
  if (Number(request.headers['content-length']) > LIMITS.requestBytes) throw new DeskError(413, 'REQUEST_SIZE', 'The request exceeds the supported byte bound.');
  let size = 0; const chunks: Buffer[] = [];
  for await (const chunk of request) { size += chunk.length; if (size > LIMITS.requestBytes) throw new DeskError(413, 'REQUEST_SIZE', 'The request exceeds the supported byte bound.'); chunks.push(chunk); }
  try { return JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(Buffer.concat(chunks))); } catch { throw new DeskError(400, 'REQUEST_JSON', 'Send a complete JSON object.'); }
}
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon' };
export function createDeskServer(desk: EvidenceDesk, distDir = desk.config.distDir) {
  const server = http.createServer(async (request, response) => {
    try {
      const host = request.headers.host ?? '';
      if (!/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host)) throw new DeskError(403, 'HOST', 'Use this application through its local address.');
      const origin = request.headers.origin;
      if (origin && !['http://' + host, 'http://127.0.0.1:5183', 'http://localhost:5183'].includes(origin)) throw new DeskError(403, 'ORIGIN', 'This request did not come from the local application.');
      if (request.headers['sec-fetch-site'] === 'cross-site') throw new DeskError(403, 'ORIGIN', 'Cross-site requests are not supported.');
      const url = new URL(request.url ?? '/', 'http://' + host);
      if (url.pathname.startsWith('/api/')) {
        if (url.search) throw new DeskError(400, 'QUERY_PARAMETERS', 'API inputs belong in the JSON body.');
        if (request.method === 'GET' && url.pathname === '/api/status') return reply(response, 200, desk.status());
        if (request.method === 'POST' && url.pathname === '/api/demo/load') return reply(response, 200, await desk.loadDemo(await body(request)));
        if (request.method === 'POST' && url.pathname === '/api/source/query') return reply(response, 200, await desk.querySource(await body(request)));
        if (request.method === 'POST' && url.pathname === '/api/answer') return reply(response, 200, await desk.answer(await body(request)));
        if (request.method === 'GET' && /^\/api\/audit\/mem-\d{1,8}$/.test(url.pathname)) return reply(response, 200, desk.audit(url.pathname.split('/').at(-1)!));
        throw new DeskError(404, 'NOT_FOUND', 'That API route was not found.');
      }
      if (!['GET', 'HEAD'].includes(request.method ?? '')) throw new DeskError(405, 'METHOD', 'Use GET to read the application.');
      let decoded: string; try { decoded = decodeURIComponent(url.pathname); } catch { throw new DeskError(400, 'PATH', 'The requested path is invalid.'); }
      if (decoded.includes('\0') || decoded.includes('\\')) throw new DeskError(400, 'PATH', 'The requested path is invalid.');
      let file = path.resolve(distDir, '.' + decoded);
      const relative = path.relative(path.resolve(distDir), file);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new DeskError(403, 'PATH', 'The requested file is outside the application.');
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(distDir, 'index.html');
      if (!fs.existsSync(file)) throw new DeskError(503, 'BUILD_REQUIRED', 'Build the frontend first, or open the development UI at http://127.0.0.1:5183.');
      const contentType = mime[path.extname(file)];
      if (!contentType || fs.statSync(file).size > 5_242_880) throw new DeskError(404, 'NOT_FOUND', 'That application file was not found.');
      response.writeHead(200, { 'content-type': contentType, 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'content-security-policy': "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'" });
      if (request.method === 'HEAD') return response.end();
      fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
    } catch (error) {
      if (response.headersSent || response.destroyed) return;
      const safe = error instanceof DeskError ? error : new DeskError(500, 'UNAVAILABLE', 'The local operation could not complete. No provider or credential details are exposed.');
      reply(response, safe.status, { error: { code: safe.code, message: safe.message } });
    }
  });
  server.requestTimeout = 30_000; server.headersTimeout = 10_000; server.maxHeadersCount = 50;
  return server;
}
