import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import worker from './worker.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const assetRoot = process.env.NIGHTWATCH_PREVIEW_ASSETS || fileURLToPath(new URL('../../preview-assets/', import.meta.url));
const files = new Map();
async function scan(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const relative = prefix + entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await scan(absolute, relative + '/');
    else files.set(relative, await readFile(absolute));
  }
}
await scan(root);
const commit = 'a'.repeat(40);
const fetcher = async (input) => {
  const url = String(input);
  if (url === 'https://api.github.com/repos/llsohrabll/Writeups') return Response.json({ default_branch: 'main', private: false });
  if (url.endsWith('/branches/main')) return Response.json({ commit: { sha: commit, commit: { tree: { sha: commit } } } });
  if (url.includes('/git/trees/')) return Response.json({ truncated: false, tree: [...files].map(([file, content]) => ({ path: file, type: 'blob', size: content.length })) });
  const prefix = `https://raw.githubusercontent.com/llsohrabll/Writeups/${commit}/`;
  if (url.startsWith(prefix)) {
    const file = files.get(decodeURIComponent(url.slice(prefix.length)));
    return new Response(file || '', { status: file ? 200 : 404 });
  }
  return new Response('', { status: 404 });
};
const types = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const env = {
  FETCH: fetcher,
  ASSETS: { fetch: async (request) => {
    const pathname = new URL(request.url).pathname;
    try {
      const body = await readFile(path.join(assetRoot, pathname.replaceAll('/', '_')));
      return new Response(body, { headers: { 'Content-Type': types[path.extname(pathname)] || 'application/octet-stream' } });
    } catch { return new Response('Asset not found', { status: 404 }); }
  } },
};
const server = createServer(async (incoming, outgoing) => {
  try {
    const response = await worker.fetch(new Request(`http://127.0.0.1:8787${incoming.url}`, { method: incoming.method }), env);
    outgoing.writeHead(response.status, { ...Object.fromEntries(response.headers), 'Cache-Control': 'no-store' });
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { outgoing.writeHead(500); outgoing.end(error.stack); }
});
server.listen(8787, '127.0.0.1', () => console.log('Local: http://127.0.0.1:8787/notes/'));
