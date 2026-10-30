const SESSION_SECONDS = 60 * 60 * 24 * 30;
const COOKIE = '__Host-we-session';
const encoder = new TextEncoder();
const TYPES = new Set(['quest', 'meet', 'shop', 'little']);
const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store',
};

function response(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { ...SECURITY, ...headers } });
}
function json(body, status = 200, headers = {}) {
  return response(JSON.stringify(body), status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
}
class InputError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map(n => n.toString(16).padStart(2, '0')).join('');
}
function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
async function signingKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function newSession(secret) {
  const payload = `${Math.floor(Date.now() / 1000) + SESSION_SECONDS}.${crypto.randomUUID()}`;
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(payload));
  return `${payload}.${base64url(new Uint8Array(signature))}`;
}
async function authenticated(request, secret) {
  if (!secret) return false;
  const value = request.headers.get('Cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (!value || value.length > 200) return false;
  const [expires, nonce, signature, extra] = value.split('.');
  if (extra || !/^\d{10}$/.test(expires || '') || !/^[\da-f-]{36}$/.test(nonce || '') || !/^[\w-]{43}$/.test(signature || '')) return false;
  const now = Math.floor(Date.now() / 1000);
  if (+expires <= now || +expires > now + SESSION_SECONDS + 60) return false;
  try {
    const bytes = Uint8Array.from(atob(signature.replaceAll('-', '+').replaceAll('_', '/') + '='), c => c.charCodeAt(0));
    return crypto.subtle.verify('HMAC', await signingKey(secret), bytes, encoder.encode(`${expires}.${nonce}`));
  } catch { return false; }
}
async function readJson(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '')) throw new InputError('Please send JSON.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError('A request body is required.');
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 16384) { await reader.cancel(); throw new InputError('This plan is too long.', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
    return value;
  } catch { throw new InputError('Please check the form and try again.'); }
}
function text(value, name, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new InputError(`${name} ${required ? 'is required and ' : ''}must be at most ${max} characters.`);
  return value.trim();
}
function planFields(input, partial = false) {
  const fields = {};
  for (const [name, max] of [['title', 140], ['notes', 2000], ['place', 200]]) {
    if (!partial || Object.hasOwn(input, name)) fields[name] = text(input[name] ?? '', name[0].toUpperCase() + name.slice(1), max, name === 'title');
  }
  if (!partial || Object.hasOwn(input, 'type')) {
    if (!TYPES.has(input.type)) throw new InputError('Choose a plan type.');
    fields.type = input.type;
  }
  if (!partial || Object.hasOwn(input, 'date')) {
    const date = text(input.date ?? '', 'Date', 10);
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + 'T12:00:00Z')) || new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) !== date)) throw new InputError('Choose a valid date.');
    fields.date = date;
  }
  if (!partial || Object.hasOwn(input, 'time')) {
    const time = text(input.time ?? '', 'Time', 5);
    if (time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new InputError('Choose a valid time.');
    fields.time = time;
  }
  if (Object.hasOwn(input, 'done')) {
    if (typeof input.done !== 'boolean') throw new InputError('Invalid completion value.');
    fields.done = input.done;
  }
  return fields;
}

// One private room provides durable, consistent shared storage. Nothing is stored in GitHub.
export class TogetherRoom {
  constructor(ctx, env) { this.storage = ctx.storage; this.env = env; }
  async fetch(request) {
    try {
      const url = new URL(request.url);
      if (url.pathname === '/login' && request.method === 'POST') {
        const input = await readJson(request);
        const now = Date.now();
        const key = 'auth:' + await digest(String(input.bucket).slice(0, 200));
        const permitted = await this.storage.transaction(async tx => {
          const previous = await tx.get(key);
          const attempt = previous?.until > now ? previous : { count: 0, until: now + 15 * 60 * 1000 };
          if (attempt.count >= 12) return false;
          await tx.put(key, { ...attempt, count: attempt.count + 1 });
          return true;
        });
        if (!(await this.storage.getAlarm())) await this.storage.setAlarm(now + 15 * 60 * 1000);
        if (!permitted) return json({ error: 'Too many tries. Please try again in 15 minutes.' }, 429, { 'Retry-After': '900' });
        if (typeof input.password !== 'string' || input.password.length > 256 || !this.env.ROOM_PASSWORD_HASH) return json({ error: 'That passphrase does not match.' }, 401);
        const candidate = await digest(input.password);
        let difference = candidate.length ^ this.env.ROOM_PASSWORD_HASH.length;
        for (let i = 0; i < candidate.length; i++) difference |= candidate.charCodeAt(i) ^ (this.env.ROOM_PASSWORD_HASH.charCodeAt(i) || 0);
        if (difference) return json({ error: 'That passphrase does not match.' }, 401);
        await this.storage.delete(key);
        return json({ ok: true });
      }
      if (url.pathname === '/items' && request.method === 'GET') {
        const entries = await this.storage.list({ prefix: 'plan:', limit: 1000 });
        return json({ items: [...entries.values()].filter(item => !item.deletedAt) });
      }
      if (url.pathname === '/items' && request.method === 'POST') {
        const fields = planFields(await readJson(request));
        if (fields.time && !fields.date) throw new InputError('Add a date with the time.');
        const item = { ...fields, id: crypto.randomUUID(), done: false, revision: 1, createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null };
        await this.storage.transaction(async tx => {
          const existing = await tx.list({ prefix: 'plan:', limit: 1000 });
          if (existing.size >= 1000) throw new InputError('Your space is full. Download your plans before adding more.', 409);
          await tx.put('plan:' + item.id, item);
        });
        return json({ item }, 201);
      }
      const match = url.pathname.match(/^\/items\/([\da-f-]{36})(\/restore)?$/);
      if (!match) return json({ error: 'Not found.' }, 404);
      const input = request.method === 'PATCH' ? await readJson(request) : {};
      if (!['PATCH', 'DELETE', 'POST'].includes(request.method) || (request.method === 'POST') !== Boolean(match[2])) return json({ error: 'Method not allowed.' }, 405);
      const updated = await this.storage.transaction(async tx => {
        const key = 'plan:' + match[1];
        const current = await tx.get(key);
        if (!current || (current.deletedAt && !match[2])) throw new InputError('This plan is no longer here.', 404);
        let changes;
        if (request.method === 'DELETE') changes = { deletedAt: Date.now() };
        else if (match[2]) changes = { deletedAt: null };
        else {
          changes = planFields(input, true);
          const editing = Object.keys(changes).some(key => key !== 'done');
          if (editing && input.revision !== current.revision) throw new InputError('This plan was changed on another device. Close this form and open it again to see the latest version.', 409);
          if ((changes.time ?? current.time) && !(changes.date ?? current.date)) throw new InputError('Add a date with the time.');
        }
        const item = { ...current, ...changes, revision: current.revision + 1, updatedAt: Date.now() };
        await tx.put(key, item);
        return item;
      });
      return json({ item: updated });
    } catch (error) {
      if (error instanceof InputError) return json({ error: error.message }, error.status);
      throw error;
    }
  }
  async alarm() {
    const entries = await this.storage.list({ prefix: 'auth:', limit: 1000 });
    const expired = [...entries].filter(([, value]) => value.until <= Date.now()).map(([key]) => key);
    if (expired.length) await this.storage.delete(expired);
    if (entries.size > expired.length) await this.storage.setAlarm(Date.now() + 15 * 60 * 1000);
  }
}

export function createWorker({ page, css, js, illustration }) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      try {
        if (url.pathname === '/robots.txt') return response('User-agent: *\nDisallow: /\n', 200, { 'Content-Type': 'text/plain' });
        if (['/we.css', '/we.js', '/couple.webp'].includes(url.pathname)) {
          if (!['GET', 'HEAD'].includes(request.method)) return response('Method not allowed', 405, { Allow: 'GET, HEAD' });
          const [body, type] = url.pathname === '/we.css' ? [css, 'text/css; charset=utf-8'] : url.pathname === '/we.js' ? [js, 'text/javascript; charset=utf-8'] : [illustration, 'image/webp'];
          return response(request.method === 'HEAD' ? null : body, 200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' });
        }
        const write = ['POST', 'PATCH', 'DELETE'].includes(request.method);
        if (write && (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site')) return json({ error: 'Please use the form on this site.' }, 403);
        const room = () => env.ROOM.get(env.ROOM.idFromName('sohrab-and-parmis'));
        if (url.pathname === '/auth/login' && request.method === 'POST') {
          if (!env.SESSION_SECRET || !env.ROOM_PASSWORD_HASH || !env.ROOM) return json({ error: 'Your space is not ready yet. Please try again shortly.' }, 503);
          const input = await readJson(request);
          const result = await room().fetch(new Request('https://room/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: input.password, bucket: await digest(env.SESSION_SECRET + ':' + (request.headers.get('CF-Connecting-IP') || 'unknown')) }) }));
          if (!result.ok) return result;
          return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=${await newSession(env.SESSION_SECRET)}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}` });
        }
        if (url.pathname === '/auth/logout' && request.method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0` });
        const authorized = await authenticated(request, env.SESSION_SECRET);
        if (url.pathname.startsWith('/api/')) {
          if (!authorized) return json({ error: 'Unlock your space to continue.' }, 401);
          if (!/^\/api\/items(?:\/[\da-f-]{36}(?:\/restore)?)?$/.test(url.pathname)) return json({ error: 'Not found.' }, 404);
          if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
          return room().fetch(new Request('https://room' + url.pathname.slice(4), request));
        }
        if (url.pathname === '/' && ['GET', 'HEAD'].includes(request.method)) return response(request.method === 'HEAD' ? null : page(authorized), 200, { 'Content-Type': 'text/html; charset=utf-8', Vary: 'Cookie' });
        return response('Page not found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
      } catch (error) {
        if (error instanceof InputError) return json({ error: error.message }, error.status);
        console.error('Shared space request failed.');
        return json({ error: 'We could not save that right now. Please try again.' }, 503);
      }
    },
  };
}
