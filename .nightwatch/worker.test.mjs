import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadRepository } from './worker.mjs';

const commit = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const writeup = '---\ntitle: "Existing writeup"\ndate: "2026-09-24"\ntags: [xss]\n---\n\n## Findings\n\nA writeup.';
const note = '---\ntitle: "My course note"\ndate: "2026-11-02"\n---\n\n## Key ideas\n\nA note.';
function fixture(files) {
  return async input => {
    const url = String(input);
    if (url === 'https://api.github.com/repos/llsohrabll/Writeups') return Response.json({ default_branch: 'main', private: false });
    if (url.endsWith('/branches/main')) return Response.json({ commit: { sha: commit, commit: { tree: { sha: tree } } } });
    if (url.includes('/git/trees/')) return Response.json({ truncated: false, tree: Object.entries(files).map(([path, content]) => ({ path, type: 'blob', size: content.length })) });
    const prefix = `https://raw.githubusercontent.com/llsohrabll/Writeups/${commit}/`;
    if (url.startsWith(prefix)) {
      const path = decodeURIComponent(url.slice(prefix.length));
      return new Response(files[path] ?? '', { status: Object.hasOwn(files, path) ? 200 : 404 });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
}
async function freshWorker(files) {
  const { default: worker } = await import(`./worker.mjs?test=${crypto.randomUUID()}`);
  const env = { FETCH: fixture(files), ASSETS: { fetch: () => new Response('asset', { status: 404 }) } };
  return (path, method = 'GET') => worker.fetch(new Request(`https://nightwatch.team${path}`, { method }), env);
}

test('home renders writeups and search while notes remain in the notebook', async () => {
  const request = await freshWorker({ 'posts/existing.md': writeup, 'notes/my-course-note.md': note });
  const home = await (await request('/')).text();
  assert.match(home, /class="post-card" href="\/writeups\/existing\/"/);
  assert.match(home, /data-writeup-search/);
  assert.match(home, /src="\/search.js"/);
  assert.doesNotMatch(home, /My course note|home-section-button|LLM Attacks|llm-visuals|notes.css/);
  assert.match(home, /href="\/note\/">Notes/);
});

test('the empty notebook has a UI and links to a Markdown template and guide', async () => {
  const request = await freshWorker({ 'notes/README.md': '# Documentation', 'posts/existing.md': writeup });
  const response = await request('/note/');
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /A fresh page/);
  assert.match(html, /No notes published yet/);
  assert.match(html, /Writeups\/new\/main\/notes\?filename=my-first-note.md/);
  assert.match(html, /blob\/main\/Readme.md/);
  assert.doesNotMatch(html, /LLM Attacks|Collections|class="post-card"/);
});

test('a new note publishes under the singular route with an article and notebook navigation', async () => {
  const request = await freshWorker({ 'notes/my-course-note.md': note });
  assert.match(await (await request('/note/')).text(), /href="\/note\/my-course-note\/"/);
  const article = await (await request('/note/my-course-note/')).text();
  assert.match(article, /My course note/);
  assert.match(article, /id="key-ideas"/);
  assert.match(article, /href="\/note\/">.*All notes/);
  assert.match(article, /aria-current="page" href="\/note\/"/);
  assert.equal((await request('/note/my-course-note')).status, 308);
});

test('legacy index URLs redirect and removed collections and interactive assets are gone', async () => {
  const request = await freshWorker({});
  for (const path of ['/writeups', '/writeups/']) assert.equal((await request(path)).headers.get('Location'), 'https://nightwatch.team/#writeups');
  assert.equal((await request('/notes/')).headers.get('Location'), 'https://nightwatch.team/note/');
  assert.equal((await request('/note')).headers.get('Location'), 'https://nightwatch.team/note/');
  for (const path of ['/notes/llm-attacks/', '/notes/llm-attacks/how-llm-apis-work/', '/notes.css', '/llm-visuals.css', '/llm-visuals.js']) assert.equal((await request(path)).status, 410);
});

test('drafts and documentation stay unpublished; notes and writeups can share a slug', async () => {
  const result = await loadRepository(fixture({
    'posts/lesson.md': writeup,
    'notes/lesson.md': note,
    'notes/draft.md': '---\ntitle: Draft\ndraft: true\n---\n\nDraft',
    'Readme.md': '# Guide', 'notes/README.md': '# Guide', '.nightwatch/README.md': '# Source', '.together/README.md': '# Source',
  }));
  assert.equal(result.posts.length, 1);
  assert.equal(result.notes.length, 1);
  assert.equal(result.notes[0].slug, 'lesson');
  await assert.rejects(loadRepository(fixture({ 'notes/one.md': note, 'notes/two.md': '---\nslug: one\n---\n\nDuplicate' })), /Duplicate content URL/);
});

test('relative article links and images resolve; HTML is escaped and missing attachments fail', async () => {
  const result = await loadRepository(fixture({
    'posts/existing.md': writeup + '\n\n[Note](../notes/lesson.md#key-ideas)\n\n<script>alert(1)</script>',
    'notes/lesson.md': note + '\n\n[Writeup](../posts/existing.md)\n\n![Image](../images/demo.svg)',
    'images/demo.svg': '<svg/>',
  }));
  assert.match(result.posts[0].html, /href="\/note\/lesson\/#key-ideas"/);
  assert.doesNotMatch(result.posts[0].html, /<script>/);
  assert.match(result.notes[0].html, /href="\/writeups\/existing\/"/);
  assert.match(result.notes[0].html, new RegExp(`raw.githubusercontent.com/llsohrabll/Writeups/${commit}/images/demo.svg`));
  await assert.rejects(loadRepository(fixture({ 'posts/missing.md': writeup + '\n\n![Missing](none.png)' })), /missing attachment/);
});

test('sitemap contains home, notebook and published articles without legacy collections', async () => {
  const request = await freshWorker({ 'posts/existing.md': writeup, 'notes/lesson.md': note });
  const xml = await (await request('/sitemap.xml')).text();
  for (const route of ['/', '/note/', '/writeups/existing/', '/note/lesson/']) assert.ok(xml.includes(`<loc>https://nightwatch.team${route}</loc>`));
  assert.doesNotMatch(xml, /\/notes\/|llm-attacks|<loc>https:\/\/nightwatch.team\/writeups\/<\/loc>/);
});

test('HEAD, asset fallback, empty homepage, unknown articles and method handling remain correct', async () => {
  const request = await freshWorker({});
  for (const route of ['/', '/note/', '/notebook.css', '/sitemap.xml']) assert.equal(await (await request(route, 'HEAD')).text(), '');
  assert.match((await request('/notebook.css')).headers.get('Content-Type'), /text\/css/);
  assert.equal(await (await request('/favicon.svg')).text(), 'asset');
  assert.equal((await request('/writeups/missing/')).status, 404);
  assert.equal((await request('/note/missing/')).status, 404);
  assert.equal((await request('/', 'POST')).status, 405);
  assert.match(await (await request('/')).text(), /No writeups yet/);
});

test('cold requests serve the bundled content while the repository refreshes in the background', async () => {
  const files = { 'posts/existing.md': writeup };
  const initial = await loadRepository(fixture(files));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const { default: worker } = await import(`./worker.mjs?test=${crypto.randomUUID()}`);
  const jobs = [];
  const env = { INITIAL_SNAPSHOT: initial, FETCH: async input => { await gate; return fixture(files)(input); } };
  const response = await worker.fetch(new Request('https://nightwatch.team/'), env, { waitUntil: promise => jobs.push(promise) });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Existing writeup/);
  assert.equal(jobs.length, 1);
  release();
  await Promise.all(jobs);
});

test('the posting guide is short and teaches notes, writeups, images, and drafts', async () => {
  const guide = await readFile(new URL('../Readme.md', import.meta.url), 'utf8');
  assert.ok(guide.split('\n').length < 65);
  for (const text of ['notes/my-first-note.md', 'posts/my-writeup.md', 'draft: true', '../images/my-photo.png', '/note/']) assert.ok(guide.includes(text));
});
