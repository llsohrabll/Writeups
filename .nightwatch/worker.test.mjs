import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRepository } from './worker.mjs';

const commit = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const writeup = '---\ntitle: "Existing writeup"\n---\n\n## Findings\n\nA writeup.';
const note = '---\ntitle: "Prompt injection notes"\ntags: [llm]\n---\n\n## Key ideas\n\nA course note.';

function fixture(files) {
  return async (input) => {
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

test('notes stay out of writeups, docs and hidden files stay out of both', async () => {
  const result = await loadRepository(fixture({
    'posts/existing.md': writeup,
    'notes/llm-attacks/injection.md': note,
    'Readme.md': '# Docs',
    'notes/README.md': '# Docs',
    'notes/llm-attacks/README.md': '# Docs',
    '.nightwatch/README.md': '# Worker docs',
    'notes/llm-attacks/.template.md': '# Hidden',
  }));
  assert.equal(result.posts.length, 1);
  assert.equal(result.notes.length, 1);
  assert.equal(result.notes[0].section, 'llm-attacks');
  assert.equal(result.notes[0].slug, 'injection');
  assert.match(result.notes[0].html, /id="key-ideas"/);
});

test('draft notes are not published', async () => {
  const result = await loadRepository(fixture({ 'notes/llm-attacks/draft.md': '---\ntitle: "Draft"\ndraft: true\n---\n\nDraft text.' }));
  assert.equal(result.notes.length, 0);
});

test('relative links resolve between notes and writeups, images use pinned commits', async () => {
  const result = await loadRepository(fixture({
    'posts/existing.md': writeup + '\n\n[Course note](../notes/llm-attacks/injection.md#key-ideas)',
    'notes/llm-attacks/injection.md': note + '\n\n[Research](../../posts/existing.md)\n\n![Diagram](../../images/diagram.svg)',
    'images/diagram.svg': '<svg/>',
  }));
  assert.match(result.posts[0].html, /href="\/notes\/llm-attacks\/injection\/#key-ideas"/);
  assert.match(result.notes[0].html, /href="\/writeups\/existing\/"/);
  assert.match(result.notes[0].html, new RegExp(`raw.githubusercontent.com/llsohrabll/Writeups/${commit}/images/diagram.svg`));
});

test('same slug can exist in different collections but not twice in one', async () => {
  const files = { 'notes/llm-attacks/lesson.md': note, 'notes/security-class/lesson.md': note };
  assert.equal((await loadRepository(fixture(files))).notes.length, 2);
  await assert.rejects(loadRepository(fixture({ ...files, 'notes/llm-attacks/second.md': '---\nslug: lesson\n---\n\nDuplicate' })), /Duplicate content URL/);
});

test('Markdown escapes HTML and rejects links to drafts or missing attachments', async () => {
  const result = await loadRepository(fixture({ 'notes/llm-attacks/injection.md': note + '\n\n<script>alert(1)</script>' }));
  assert.doesNotMatch(result.notes[0].html, /<script>/);
  await assert.rejects(loadRepository(fixture({ 'notes/llm-attacks/injection.md': note + '\n\n![Missing](missing.png)' })), /missing attachment/);
});

test('notes index and empty LLM collection provide working GitHub creation links', async () => {
  const request = await freshWorker({ 'posts/existing.md': writeup });
  const index = await request('/notes/');
  assert.equal(index.status, 200);
  assert.match(await index.text(), /href="\/notes\/llm-attacks\/"/);
  const topic = await request('/notes/llm-attacks/');
  const html = await topic.text();
  assert.equal(topic.status, 200);
  assert.match(html, /A fresh page/);
  assert.match(html, /Writeups\/new\/main\/notes\/llm-attacks\?filename=my-note.md/);
  assert.match(html, /value=---/);
});

test('published note has collection navigation, table of contents, and GitHub edit link', async () => {
  const request = await freshWorker({ 'notes/llm-attacks/injection.md': note });
  const response = await request('/notes/llm-attacks/injection/');
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Prompt injection notes/);
  assert.match(html, /href="#key-ideas"/);
  assert.match(html, /Writeups\/edit\/main\/notes\/llm-attacks\/injection.md/);
  assert.match(html, /aria-current="page" href="\/notes\/"/);
});

test('new topic folders become collections automatically', async () => {
  const request = await freshWorker({ 'notes/security-class/lesson.md': note });
  const index = await request('/notes/');
  assert.match(await index.text(), /Security Class/);
  assert.equal((await request('/notes/security-class/')).status, 200);
});

test('notes routes canonicalize, unknown notes return 404, and assets still pass through', async () => {
  const request = await freshWorker({});
  const redirect = await request('/notes?source=test');
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('Location'), 'https://nightwatch.team/notes/?source=test');
  assert.equal((await request('/notes/unknown/')).status, 404);
  assert.equal((await request('/notes/llm-attacks/missing/')).status, 404);
  assert.equal(await (await request('/favicon.svg')).text(), 'asset');
});

test('HEAD responses omit bodies, CSS and icon use the correct content types', async () => {
  const request = await freshWorker({});
  assert.equal(await (await request('/notes/', 'HEAD')).text(), '');
  const css = await request('/notes.css');
  assert.match(css.headers.get('Content-Type'), /text\/css/);
  const icon = await request('/notes/llm.svg');
  assert.match(icon.headers.get('Content-Type'), /image\/svg\+xml/);
  assert.equal((await request('/notes/', 'POST')).status, 405);
});

test('sitemap includes collections, published notes and existing writeups', async () => {
  const request = await freshWorker({ 'posts/existing.md': writeup, 'notes/llm-attacks/injection.md': note });
  const xml = await (await request('/sitemap.xml')).text();
  for (const path of ['/notes/', '/notes/llm-attacks/', '/notes/llm-attacks/injection/', '/writeups/existing/']) assert.ok(xml.includes(`https://nightwatch.team${path}`));
});

test('existing writeup homepage still links to writeups and now has Notes navigation', async () => {
  const request = await freshWorker({ 'posts/existing.md': writeup, 'notes/llm-attacks/injection.md': note });
  const home = await (await request('/')).text();
  assert.match(home, /href="\/writeups\/existing\/"/);
  assert.doesNotMatch(home, /Prompt injection notes/);
  assert.match(home, /href="\/notes\/"/);
  assert.equal((await request('/writeups/existing/')).status, 200);
});
