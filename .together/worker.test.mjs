import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker, TogetherRoom, digest } from './app.mjs';
import { MemoryStorage } from './test-storage.mjs';
import { page } from './ui.mjs';

async function fixture({ storySample = false } = {}) {
  const storage = new MemoryStorage();
  if (!storySample) await storage.put('meta:story-begin-v1', true);
  const env = { SESSION_SECRET: crypto.randomUUID(), ROOM_PASSWORD_HASH: await digest('test-only-passphrase') };
  let room = new TogetherRoom({ storage }, env);
  env.ROOM = { idFromName: id => id, get: () => room };
  const worker = createWorker({ page: (authorized, items) => page(authorized, 'test', items), css: '', js: '', illustration: '' });
  let cookie = '';
  async function request(path, method = 'GET', input, options = {}) {
    return worker.fetch(new Request('https://we.nightwatch.team' + path, { method, headers: { Origin: options.origin ?? 'https://we.nightwatch.team', 'Content-Type': options.contentType ?? 'application/json', Cookie: options.cookie ?? cookie, 'CF-Connecting-IP': options.ip || '192.0.2.1' }, ...(options.bytes ? { body: options.bytes } : input !== undefined ? { body: JSON.stringify(input) } : {}) }), env);
  }
  async function unlock() {
    const result = await request('/auth/login', 'POST', { password: 'test-only-passphrase' });
    assert.equal(result.status, 200);
    cookie = result.headers.get('Set-Cookie').split(';')[0];
    return result;
  }
  return { request, unlock, getCookie: () => cookie, storage, restart: () => { room = new TogetherRoom({ storage }, env); } };
}
const plan = { title: 'A test adventure', type: 'quest', notes: 'Bring a camera.', date: '2026-11-10', time: '17:30', place: 'The park' };

test('private data and board are inaccessible without a valid signed session', async () => {
  const f = await fixture();
  assert.match(await (await f.request('/')).text(), /id="login-form"/);
  assert.equal((await f.request('/api/items')).status, 401);
  assert.equal((await f.request('/api/items/list', 'POST', {})).status, 401);
  const login = await f.unlock();
  assert.match(login.headers.get('Set-Cookie'), /Secure; HttpOnly; SameSite=Strict/);
  assert.match(await (await f.request('/')).text(), /id="plan-form"/);
  assert.deepEqual(await (await f.request('/api/items/list', 'POST', {})).json(), { items: [] });
  const parts = f.getCookie().split('.');
  parts[0] = parts[0].replace(/\d+$/, '9999999999');
  assert.equal((await f.request('/api/items', 'GET', undefined, { cookie: parts.join('.') })).status, 401);
});
test('cross-origin mutations and login are refused', async () => {
  const f = await fixture();
  assert.equal((await f.request('/auth/login', 'POST', { password: 'test-only-passphrase' }, { origin: 'https://example.com' })).status, 403);
  await f.unlock();
  assert.equal((await f.request('/api/items', 'POST', plan, { origin: 'https://nightwatch.team' })).status, 403);
});
test('plans persist across room instances and are visible from another signed-in device', async () => {
  const f = await fixture();
  await f.unlock();
  const result = await f.request('/api/items', 'POST', plan);
  assert.equal(result.status, 201);
  const { item } = await result.json();
  f.restart();
  await f.unlock();
  const list = await (await f.request('/api/items')).json();
  assert.equal(list.items[0].id, item.id);
  assert.equal(list.items[0].place, plan.place);
});
test('editing detects stale versions and completion preserves the current plan', async () => {
  const f = await fixture(); await f.unlock();
  const { item } = await (await f.request('/api/items', 'POST', plan)).json();
  assert.equal((await f.request('/api/items/' + item.id, 'PATCH', { title: 'Updated adventure', revision: item.revision })).status, 200);
  assert.equal((await f.request('/api/items/' + item.id, 'PATCH', { title: 'Stale adventure', revision: item.revision })).status, 409);
  const { item: done } = await (await f.request('/api/items/' + item.id, 'PATCH', { done: true })).json();
  assert.equal(done.title, 'Updated adventure'); assert.equal(done.done, true);
});
test('removal can be undone without losing plan details', async () => {
  const f = await fixture(); await f.unlock();
  const { item } = await (await f.request('/api/items', 'POST', plan)).json();
  assert.equal((await f.request('/api/items/' + item.id, 'DELETE')).status, 200);
  assert.equal((await (await f.request('/api/items')).json()).items.length, 0);
  assert.equal((await f.request('/api/items/' + item.id + '/restore', 'POST')).status, 200);
  assert.equal((await (await f.request('/api/items')).json()).items[0].notes, plan.notes);
});
test('retrying a create request after a connection timeout does not duplicate or overwrite plans', async () => {
  const f = await fixture(); await f.unlock();
  const input = { ...plan, id: crypto.randomUUID() };
  assert.equal((await f.request('/api/items', 'POST', input)).status, 201);
  assert.equal((await f.request('/api/items', 'POST', input)).status, 201);
  assert.equal((await (await f.request('/api/items')).json()).items.length, 1);
  assert.equal((await f.request('/api/items', 'POST', { ...input, title: 'Changed draft' })).status, 409);
  assert.equal((await (await f.request('/api/items')).json()).items[0].title, plan.title);
});
test('invalid types, oversized content, invalid dates and time-only plans are rejected', async () => {
  const f = await fixture(); await f.unlock();
  for (const changes of [{ type: '__proto__' }, { title: '' }, { notes: 'x'.repeat(2001) }, { date: '2026-02-31' }, { time: '25:00' }, { date: '' }]) assert.equal((await f.request('/api/items', 'POST', { ...plan, ...changes })).status, 400);
  assert.equal((await f.request('/api/items', 'POST', { ...plan, notes: 'x'.repeat(20000) })).status, 413);
});
test('repeated bad passphrases are throttled; expired attempts can be cleaned', async () => {
  const f = await fixture();
  for (let i = 0; i < 12; i++) assert.equal((await f.request('/auth/login', 'POST', { password: 'wrong' })).status, 401);
  assert.equal((await f.request('/auth/login', 'POST', { password: 'wrong' })).status, 429);
  for (const [key, value] of f.storage.data) if (key.startsWith('auth:')) await f.storage.put(key, { ...value, until: 0 });
  await f.unlock();
});
test('private responses are never cached; public assets keep strict security headers', async () => {
  const f = await fixture(); await f.unlock();
  const list = await f.request('/api/items');
  assert.equal(list.headers.get('Cache-Control'), 'no-store');
  assert.equal(list.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  const style = await f.request('/we.css');
  assert.equal(style.headers.get('Content-Type'), 'text/css; charset=utf-8');
  assert.match(style.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
});

test('the story begins on 14 August 2026 and the sample is seeded only once', async () => {
  const f = await fixture({ storySample: true }); await f.unlock();
  const first = (await (await f.request('/api/items/list', 'POST', {})).json()).items;
  assert.equal(first.length, 1);
  assert.equal(first[0].title, 'Our story begins');
  assert.equal(first[0].date, '2026-08-14');
  assert.equal(first[0].time, '');
  f.restart();
  assert.equal((await (await f.request('/api/items/list', 'POST', {})).json()).items.length, 1);
  await f.request('/api/items/' + first[0].id, 'DELETE');
  assert.equal((await (await f.request('/api/items/list', 'POST', {})).json()).items.length, 0);
});
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8ioAAAAASUVORK5CYII=', 'base64');
test('photos persist privately and attach to an editable memory', async () => {
  const f = await fixture();
  const id = crypto.randomUUID();
  assert.equal((await f.request('/api/photos/' + id, 'GET')).status, 401);
  assert.equal((await f.request('/api/photos/' + id, 'POST', undefined, { contentType: 'image/png', bytes: png })).status, 401);
  await f.unlock();
  assert.equal((await f.request('/api/photos/' + id, 'POST', undefined, { contentType: 'image/png', bytes: png })).status, 201);
  f.restart();
  const photo = await f.request('/api/photos/' + id);
  assert.equal(photo.headers.get('Content-Type'), 'image/png');
  assert.equal(photo.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()), png);
  const created = await f.request('/api/items', 'POST', { title: 'Our photo', notes: 'A lovely afternoon.', date: '2026-08-14', time: '17:30', photoId: id });
  assert.equal(created.status, 201);
  const { item } = await created.json();
  assert.equal(item.photoId, id);
  assert.equal(item.type, 'memory');
  const edited = await f.request('/api/items/' + item.id, 'PATCH', { notes: 'A changed caption.', revision: item.revision });
  assert.equal((await edited.json()).item.photoId, id);
});
test('photo chunk boundaries and idempotent retries preserve uploaded bytes', async () => {
  const f = await fixture(); await f.unlock();
  const id = crypto.randomUUID();
  const bytes = new Uint8Array(150000);
  bytes.set(png);
  for (let index = png.length; index < bytes.length; index++) bytes[index] = index % 251;
  for (let attempt = 0; attempt < 2; attempt++) assert.equal((await f.request('/api/photos/' + id, 'POST', undefined, { contentType: 'image/png', bytes })).status, 201);
  const restored = new Uint8Array(await (await f.request('/api/photos/' + id)).arrayBuffer());
  assert.deepEqual(restored, bytes);
  assert.equal((await f.storage.list({ prefix: 'photo-data:' + id })).size, 3);
  assert.equal((await f.request('/api/photos/' + id, 'POST', undefined, { contentType: 'image/png', bytes: png })).status, 409);
});
test('unsafe or oversized photos, missing references and cross-origin uploads are refused', async () => {
  const f = await fixture(); await f.unlock();
  const path = '/api/photos/' + crypto.randomUUID();
  assert.equal((await f.request(path, 'POST', undefined, { contentType: 'image/svg+xml', bytes: new TextEncoder().encode('<svg/>') })).status, 415);
  assert.equal((await f.request(path, 'POST', undefined, { contentType: 'image/png', bytes: new TextEncoder().encode('<script>bad</script>') })).status, 415);
  assert.equal((await f.request(path, 'POST', undefined, { contentType: 'image/png', bytes: new Uint8Array(2 * 1024 * 1024 + 1) })).status, 413);
  assert.equal((await f.request(path, 'POST', undefined, { contentType: 'image/png', bytes: png, origin: 'https://example.com' })).status, 403);
  assert.equal((await f.request('/api/items', 'POST', { ...plan, photoId: crypto.randomUUID() })).status, 400);
});
test('memory page provides photo and date fields without plan filters, counts or categories', () => {
  const html = page(true);
  assert.match(html, /Made for two/);
  assert.match(html, /type="file"/);
  assert.match(html, /Add a memory/);
  assert.doesNotMatch(html, /data-filter|data-count|status-filter|Quests|Meets|Shops|Little things|Add a plan/);
});
test('the authenticated page renders memories immediately and escapes captions and initial JSON', async () => {
  const f = await fixture(); await f.unlock();
  await f.request('/api/items', 'POST', { title: 'Our moment', notes: '</script><script>alert(1)</script>', date: '2026-08-14', time: '' });
  const response = await f.request('/');
  const html = await response.text();
  assert.match(html, /<h2>Our moment<\/h2>/);
  assert.match(html, /14 Aug/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /\\u003c\/script/);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const locked = await f.request('/', 'GET', undefined, { cookie: '' });
  assert.doesNotMatch(await locked.text(), /Our moment/);
});
