import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { createWorker, TogetherRoom } from './app.mjs';
import { page, icons } from './ui.mjs';
import { MemoryStorage } from './test-storage.mjs';

const dataPath = new URL('.preview-data.json', import.meta.url);
const storage = new MemoryStorage(await readFile(dataPath, 'utf8').then(text => JSON.parse(text, (key, value) => value?.__bytes ? Uint8Array.from(value.__bytes) : value)).catch(() => []));
const env = { SESSION_SECRET: 'local-preview-session-secret-not-for-production' };
const room = new TogetherRoom({ storage }, env);
env.ROOM = { idFromName: value => value, get: () => room };
const css = await readFile(new URL('style.css', import.meta.url), 'utf8');
const js = 'const icons = ' + JSON.stringify(icons) + ';\n' + await readFile(new URL('client.js', import.meta.url), 'utf8');
const illustration = await readFile(new URL('assets/couple.webp', import.meta.url));
const worker = createWorker({ page: (authorized, items) => page(authorized, 'preview', items), css, js, illustration });
const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const request = new Request('http://127.0.0.1:8788' + incoming.url, { method: incoming.method, headers: incoming.headers, ...(!['GET', 'HEAD'].includes(incoming.method) ? { body: Buffer.concat(chunks) } : {}) });
    const result = await worker.fetch(request, env);
    outgoing.writeHead(result.status, { ...Object.fromEntries(result.headers), 'Cache-Control': 'no-store' });
    outgoing.end(Buffer.from(await result.arrayBuffer()));
    await writeFile(dataPath, JSON.stringify([...storage.data], (key, value) => value instanceof Uint8Array ? { __bytes: [...value] } : value));
  } catch (error) { outgoing.writeHead(500); outgoing.end(error.message); }
});
server.listen(8788, '127.0.0.1', () => console.log('Shared-space preview: http://127.0.0.1:8788/'));
