// Local preview server that can also receive a recording: serves proto/ like serve.mjs, and a POST to
// /__save?name=<file> writes the body to tools/out/<file>. Listens on 127.0.0.1 only.
// Usage: node tools/receive.mjs 8768
import { createServer } from 'node:http';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join, basename, resolve, extname, sep } from 'node:path';

const port = Number(process.argv[2] || 8768);
const root = resolve(join(import.meta.dirname, '..', 'proto'));
const out = join(import.meta.dirname, 'out');
await mkdir(out, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/__save') {
    const name = basename(url.searchParams.get('name') || 'capture.webm');
    const chunks = [];
    for await (const c of req) chunks.push(c);
    await writeFile(join(out, name), Buffer.concat(chunks));
    res.end(`saved ${name}`);
    return;
  }
  const file = resolve(join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)));
  if (!file.startsWith(root + sep)) { res.statusCode = 403; res.end(); return; }
  try {
    const body = await readFile(file);
    res.setHeader('content-type', types[extname(file)] || 'application/octet-stream');
    res.setHeader('cache-control', 'no-store');
    res.end(body);
  } catch { res.statusCode = 404; res.end(); }
}).listen(port, '127.0.0.1', () => console.log(`preview + receiver on ${port}`));
