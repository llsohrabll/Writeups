import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker, TogetherRoom, digest } from './app.mjs';
import { MemoryStorage } from './test-storage.mjs';
import { page } from './ui.mjs';

async function fixture() {
  const storage = new MemoryStorage();
  const env = { SESSION_SECRET: crypto.randomUUID(), ROOM_PASSWORD_HASH: await digest('test-only-passphrase') };
  let room = new TogetherRoom({ storage }, env);
  env.ROOM = { idFromName: id => id, get: () => room };
  const worker = createWorker({ page, css: '', js: '', illustration: '' });
  let cookie = '';
  async function request(path, method = 'GET', input, options = {}) {
    return worker.fetch(new Request('https://we.nightwatch.team' + path, { method, headers: { Origin: options.origin ?? 'https://we.nightwatch.team', 'Content-Type': 'application/json', Cookie: options.cookie ?? cookie, 'CF-Connecting-IP': options.ip || '192.0.2.1' }, ...(input !== undefined ? { body: JSON.stringify(input) } : {}) }), env);
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
  const login = await f.unlock();
  assert.match(login.headers.get('Set-Cookie'), /Secure; HttpOnly; SameSite=Strict/);
  assert.match(await (await f.request('/')).text(), /id="plan-form"/);
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
