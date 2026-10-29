import site_config_default from './site.mjs';
import { parsePost, renderPost, slugify, escape3 } from './content.mjs';
import { vulnerabilityIcon } from './vulnerability-icons.mjs';
import { notesIndex, notesTopic, noteArticle, noteSections, notesCss, llmIcon } from './notes.mjs';
import { page as layoutPage } from './layout.mjs';
import { llmVisualsCss, llmVisualsJs } from './llm-visuals.mjs';
const __name = (value) => value;
var SOURCE = { owner: "llsohrabll", repo: "Writeups" };
var API = `https://api.github.com/repos/${SOURCE.owner}/${SOURCE.repo}`;
var REFRESH_SECONDS = 600;
var MISSING_SECONDS = 60;
var MAX_POSTS = 40;
var MAX_MARKDOWN_BYTES = 512e3;
var HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' https:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
};
var TAG_TONES = /* @__PURE__ */ new Map([["xss", "blue"], ["ssrf", "teal"], ["waf_bypass", "amber"]]);
var hotSnapshot;
var refreshPromise;
var encodedPath = /* @__PURE__ */ __name((path) => path.split("/").map(encodeURIComponent).join("/"), "encodedPath");
var postHref = (post) => post.section
  ? `/notes/${encodeURIComponent(post.section)}/${encodeURIComponent(post.slug)}/`
  : `/writeups/${encodeURIComponent(post.slug)}/`;
var prettyDate = /* @__PURE__ */ __name((value) => value ? (/* @__PURE__ */ new Date(`${value}T12:00:00Z`)).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "", "prettyDate");
function markdownPaths(tree) {
  return tree.filter((item) => item.type === "blob" && /\.md$/i.test(item.path) && !item.path.split("/").some((part) => part.startsWith(".")) && !/(?:^|\/)(README|CONTRIBUTING|LICENSE)\.md$/i.test(item.path)).map((item) => item.path).sort();
}
__name(markdownPaths, "markdownPaths");
function derivedSlug(file) {
  const parts = file.replace(/\.md$/i, "").split("/");
  if (/^(index|readme)$/i.test(parts.at(-1))) parts.pop();
  if (/^(posts|writeups|articles)$/i.test(parts[0]) && parts.length > 1) parts.shift();
  return slugify(parts.join("-"));
}
__name(derivedSlug, "derivedSlug");
function repositoryPath(fromFile, reference2, rootRelative = false) {
  const match2 = reference2.match(/^([^?#]+)(.*)$/);
  if (!match2 || /^(?:\/|\\|[a-z][a-z\d+.-]*:)/i.test(match2[1]) || match2[1].includes("\\")) throw new Error(`Invalid repository path: ${reference2}`);
  let decoded;
  try {
    decoded = decodeURIComponent(match2[1]);
  } catch {
    throw new Error(`Invalid path encoding: ${reference2}`);
  }
  if (decoded.includes("\\") || decoded.startsWith("/") || decoded.includes("\0")) throw new Error(`Invalid repository path: ${reference2}`);
  const segments = rootRelative ? [] : fromFile.split("/").slice(0, -1);
  for (const part of decoded.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!segments.length) throw new Error(`Path leaves repository: ${reference2}`);
      segments.pop();
    } else segments.push(part);
  }
  if (!segments.length || segments.some((part) => part.startsWith("."))) throw new Error(`Invalid repository path: ${reference2}`);
  return { path: segments.join("/"), suffix: match2[2] };
}
__name(repositoryPath, "repositoryPath");
function rawUrl(commit, path) {
  return `https://raw.githubusercontent.com/${SOURCE.owner}/${SOURCE.repo}/${commit}/${encodedPath(path)}`;
}
__name(rawUrl, "rawUrl");
function resolveLocal(post, reference2, paths, commit, markdownByFile) {
  const { path, suffix } = repositoryPath(post.file, reference2);
  if (!paths.has(path)) throw new Error(`${post.file}: missing attachment ${reference2}`);
  if (/\.md$/i.test(path)) {
    const linked = markdownByFile.get(path);
    if (!linked) throw new Error(`${post.file}: link to unpublished Markdown ${reference2}`);
    return postHref(linked) + suffix;
  }
  if (!/\.(png|jpe?g|gif|webp|avif|svg|ico|pdf|txt)$/i.test(path)) throw new Error(`${post.file}: unsupported attachment ${reference2}`);
  return rawUrl(commit, path) + suffix;
}
__name(resolveLocal, "resolveLocal");
function resolveIcon(post, paths, commit) {
  if (!post.icon) return null;
  const rootRelative = !post.icon.startsWith("./") && !post.icon.startsWith("../");
  const { path, suffix } = repositoryPath(post.file, post.icon, rootRelative);
  if (suffix || !paths.has(path) || !/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(path)) throw new Error(`${post.file}: icon must point to an image in the repository`);
  return rawUrl(commit, path);
}
__name(resolveIcon, "resolveIcon");
async function getJson(fetcher, url) {
  const response = await fetcher(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "nightwatch-team-writeups" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub returned ${response.status} for ${url}`);
  return response.json();
}
__name(getJson, "getJson");
async function listViaApi(fetcher) {
  const repo = await getJson(fetcher, API);
  if (!repo) return { status: "missing", commit: null, entries: [] };
  if (!repo.default_branch || repo.private) throw new Error("Repository is not a public GitHub repository");
  const branch = await getJson(fetcher, `${API}/branches/${encodeURIComponent(repo.default_branch)}`);
  const commit = branch?.commit?.sha;
  if (!/^[0-9a-f]{40}$/i.test(commit || "")) throw new Error("GitHub did not return a valid branch commit");
  const treeSha = branch?.commit?.commit?.tree?.sha;
  if (!/^[0-9a-f]{40}$/i.test(treeSha || "")) throw new Error("GitHub did not return a valid branch tree");
  const tree = await getJson(fetcher, `${API}/git/trees/${treeSha}?recursive=1`);
  if (!tree) {
    const root = await getJson(fetcher, `${API}/contents?ref=${commit}`);
    if (Array.isArray(root) && root.length === 0) return { status: "ready", commit, entries: [] };
  }
  if (!tree || tree.truncated || !Array.isArray(tree.tree)) throw new Error("GitHub repository tree is incomplete");
  return { status: "ready", commit, entries: tree.tree };
}
__name(listViaApi, "listViaApi");
async function listViaHtml(fetcher) {
  const origin = `https://github.com/${SOURCE.owner}/${SOURCE.repo}`;
  const getPage = /* @__PURE__ */ __name(async (url) => {
    const response = await fetcher(url, { headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (compatible; Nightwatch/1.0)" } });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub page returned ${response.status}`);
    const html = await response.text();
    const match2 = html.match(/<script\b(?=[^>]*\btype="application\/json")(?=[^>]*\bdata-target="react-app\.embeddedData")[^>]*>([\s\S]*?)<\/script>/i);
    if (!match2) throw new Error("GitHub page did not include a file listing");
    return JSON.parse(match2[1]).payload;
  }, "getPage");
  const root = await getPage(origin);
  if (!root) return { status: "missing", commit: null, entries: [] };
  if (root.codeViewLayoutRoute?.repo?.public !== true) throw new Error("GitHub repository is not public");
  const route = root.codeViewRepoRoute;
  const commit = route?.refInfo?.currentOid;
  if (!/^[0-9a-f]{40}$/i.test(commit || "")) throw new Error("GitHub page did not include a valid commit");
  const entries = [];
  const queue = [{ path: "", route }];
  let directoryCount = 0;
  while (queue.length) {
    const current = queue.shift();
    const directory = current.route || (await getPage(`${origin}/tree/${commit}/${encodedPath(current.path)}`))?.codeViewTreeRoute;
    const items = directory?.tree?.items;
    if (!Array.isArray(items) || directory.tree.totalCount !== items.length) throw new Error("GitHub page file listing is incomplete");
    directoryCount++;
    if (directoryCount > 46) throw new Error("GitHub repository has too many directories for anonymous import");
    for (const item of items) {
      if (typeof item.path !== "string" || item.path.split("/").some((part) => part.startsWith("."))) continue;
      if (item.contentType === "directory") queue.push({ path: item.path });
      else if (item.contentType === "file") entries.push({ path: item.path, type: "blob" });
    }
  }
  const mdCount = markdownPaths(entries).length;
  if (directoryCount + mdCount > 46) throw new Error("GitHub repository needs more requests than the Worker limit allows");
  return { status: "ready", commit, entries };
}
__name(listViaHtml, "listViaHtml");
async function loadRepository(fetcher = fetch) {
  let listing;
  try {
    listing = await listViaApi(fetcher);
  } catch (apiError) {
    try {
      listing = await listViaHtml(fetcher);
    } catch (htmlError) {
      throw new Error(`GitHub listing failed: ${apiError.message}; ${htmlError.message}`);
    }
  }
  if (listing.status === "missing") return { status: "missing", posts: [], notes: [], commit: null };
  const { commit, entries } = listing;
  const paths = new Set(entries.filter((item) => item.type === "blob").map((item) => item.path));
  const byPath = new Map(entries.filter((item) => item.type === "blob").map((item) => [item.path, item]));
  const mdFiles = markdownPaths(entries);
  if (mdFiles.length > MAX_POSTS) throw new Error(`Repository has more than ${MAX_POSTS} Markdown files`);
  const sourcePosts = await Promise.all(mdFiles.map(async (file) => {
    const entry = byPath.get(file);
    if (entry.size > MAX_MARKDOWN_BYTES) throw new Error(`${file} exceeds Markdown size limit`);
    const response = await fetcher(rawUrl(commit, file));
    if (!response.ok) throw new Error(`GitHub raw returned ${response.status} for ${file}`);
    const source = await response.text();
    if (new TextEncoder().encode(source).length > MAX_MARKDOWN_BYTES) throw new Error(`${file} exceeds Markdown size limit`);
    const post = parsePost(source, file);
    if (!post.explicitSlug) post.slug = derivedSlug(file) || post.slug;
    const noteParts = file.startsWith("notes/") ? file.split("/") : null;
    if (noteParts && noteParts.length < 3) throw new Error(`${file}: put notes inside notes/<topic>/`);
    const section = noteParts ? slugify(noteParts[1]) : null;
    if (noteParts && (!section || section !== noteParts[1])) throw new Error(`${file}: use a lowercase, hyphenated topic folder`);
    if (section && !post.explicitSlug) post.slug = derivedSlug(noteParts.slice(2).join("/"));
    return { ...post, section, author: post.author || site_config_default.author };
  }));
  const posts = sourcePosts.filter((post) => !post.draft).sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title));
  const bySlug = /* @__PURE__ */ new Set();
  const byFile = new Map(posts.map((post) => [post.file, post]));
  for (const post of posts) {
    const route = postHref(post);
    if (bySlug.has(route)) throw new Error(`Duplicate content URL: ${route}`);
    bySlug.add(route);
  }
  return {
    status: "ready",
    commit,
    posts: posts.filter((post) => !post.section).map((post) => ({ ...post, iconUrl: resolveIcon(post, paths, commit), ...renderPost(post, (ref) => resolveLocal(post, ref, paths, commit, byFile)) })),
    notes: posts.filter((post) => post.section).map((post) => ({ ...post, iconUrl: resolveIcon(post, paths, commit), ...renderPost(post, (ref) => resolveLocal(post, ref, paths, commit, byFile)) }))
  };
}
__name(loadRepository, "loadRepository");
async function snapshot(fetcher = fetch, cache = globalThis.caches?.default) {
  const now = Date.now();
  if (hotSnapshot && hotSnapshot.until > now) return hotSnapshot.value;
  if (!refreshPromise) refreshPromise = (async () => {
    const cacheKey = new Request(`${site_config_default.url}/__nightwatch_repository_snapshot_v6`);
    if (cache) {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const value2 = await cached.json();
        hotSnapshot = { value: value2, until: now + 3e4 };
        return value2;
      }
    }
    const value = await loadRepository(fetcher);
    const ttl = value.status === "missing" ? MISSING_SECONDS : REFRESH_SECONDS;
    if (cache) await cache.put(cacheKey, new Response(JSON.stringify(value), { headers: { "Cache-Control": `public, max-age=${ttl}`, "Content-Type": "application/json" } }));
    hotSnapshot = { value, until: now + ttl * 1e3 };
    return value;
  })().finally(() => {
    refreshPromise = void 0;
  });
  try {
    return await refreshPromise;
  } catch (error2) {
    if (hotSnapshot?.value?.status === "ready") return hotSnapshot.value;
    throw error2;
  }
}
__name(snapshot, "snapshot");
function tags(post, className = "post-tags") {
  return post.tags.length ? `<div class="${className}" aria-label="Tags">${post.tags.map((tag) => `<span class="post-tag tag-${TAG_TONES.get(tag.toLowerCase()) || "violet"}">${escape3(tag)}</span>`).join("")}</div>` : "";
}
__name(tags, "tags");
function page(...args) { return layoutPage(...args); }
__name(page, "page");
function card(post) {
  const metadata = [...post.date ? [`<time datetime="${escape3(post.date)}">${prettyDate(post.date)}</time>`] : [], `<span>${post.minutes} min read</span>`].join('<span class="meta-divider" aria-hidden="true">\xB7</span>');
  const searchText = [post.title, post.description, post.category, ...post.tags].filter(Boolean).join(" ");
  return `<a class="post-card" href="${postHref(post)}" data-search="${escape3(searchText)}">${vulnerabilityIcon(post)}<div class="post-copy"><div class="post-meta">${metadata}</div><h3>${escape3(post.title)}</h3>${post.description ? `<p>${escape3(post.description)}</p>` : ""}${tags(post)}</div><span class="read-link">Read writeup <span aria-hidden="true">\u2192</span></span></a>`;
}
__name(card, "card");
function socialLinks() {
  return `<div class="social-links" role="group" aria-label="Sohrab's profiles"><a class="social-link" href="${escape3(site_config_default.x.url)}" target="_blank" rel="noopener noreferrer" aria-label="Sohrab Kaghazian on X, ${escape3(site_config_default.x.handle)}"><span class="social-mark social-mark-x" aria-hidden="true"><img src="/social/x.svg" alt="" width="24" height="24"></span><span class="social-copy"><span class="social-label">Find me on X</span><strong class="social-handle">${escape3(site_config_default.x.handle)}</strong></span><span class="social-arrow" aria-hidden="true">\u2197</span></a><a class="social-link social-link-github" href="${escape3(site_config_default.github_profile.url)}" target="_blank" rel="noopener noreferrer" aria-label="Sohrab Kaghazian on GitHub, ${escape3(site_config_default.github_profile.handle)}"><span class="social-mark social-mark-github" aria-hidden="true"><img src="/social/github.svg" alt="" width="24" height="24"></span><span class="social-copy"><span class="social-label">Explore on GitHub</span><strong class="social-handle">${escape3(site_config_default.github_profile.handle)}</strong></span><span class="social-arrow" aria-hidden="true">\u2197</span></a></div>`;
}
__name(socialLinks, "socialLinks");
function homepage(posts, showRepository) {
  const list2 = posts.length ? `<div class="post-list">${posts.map(card).join("")}</div>` : '<div class="empty"><span class="empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg></span><h3>No writeups yet</h3><p>Published research and technical notes will appear here.</p></div>';
  const search = posts.length ? `<div class="writeup-tools" data-writeup-search hidden><label class="sr-only" for="writeup-search">Search writeups</label><div class="search-field"><svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 5 5"/></svg><input id="writeup-search" type="search" data-search-input maxlength="120" autocomplete="off" spellcheck="false" placeholder="Search writeups, tags, or topics\u2026" aria-controls="writeup-results"><button type="button" class="search-clear" data-search-clear hidden>Clear</button></div><p class="search-count" data-search-count role="status" aria-live="polite" aria-atomic="true" hidden></p></div><div class="search-empty" data-search-empty hidden><strong>No matching writeups.</strong><span>Try another word or tag.</span><button type="button" data-search-reset>Show all writeups</button></div>` : "";
  return page(site_config_default.author, site_config_default.description, "/", `<main id="main"><div class="wrap"><section class="hero"><div class="author"><div><span class="author-label">Written by</span><span class="author-name">${escape3(site_config_default.author)}</span></div></div><h1>Security <span>writeups.</span></h1><p class="intro">Findings, experiments, and the lessons behind them.</p><nav class="archive-switch" aria-label="Explore Nightwatch"><a class="archive-switch-current" href="/writeups/">Writeups <span aria-hidden="true">→</span></a><a href="/notes/">Notes <span aria-hidden="true">→</span></a></nav>${socialLinks()}</section><section class="archive" id="writeups" aria-labelledby="writeups-title"><div class="section-heading"><h2 id="writeups-title">Writeups</h2></div>${search}<div id="writeup-results">${list2}</div></section></div></main>`, site_config_default.author, showRepository);
}
function writeupsPage(posts, showRepository) {
  const list2 = posts.length ? `<div class="post-list">${posts.map(card).join("")}</div>` : '<div class="empty"><span class="empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg></span><h3>No writeups yet</h3><p>Published research and technical notes will appear here.</p></div>';
  const search = posts.length ? `<div class="writeup-tools" data-writeup-search hidden><label class="sr-only" for="writeup-search">Search writeups</label><div class="search-field"><svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 5 5"/></svg><input id="writeup-search" type="search" data-search-input maxlength="120" autocomplete="off" spellcheck="false" placeholder="Search writeups, tags, or topics\u2026" aria-controls="writeup-results"><button type="button" class="search-clear" data-search-clear hidden>Clear</button></div><p class="search-count" data-search-count role="status" aria-live="polite" aria-atomic="true" hidden></p></div><div class="search-empty" data-search-empty hidden><strong>No matching writeups.</strong><span>Try another word or tag.</span><button type="button" data-search-reset>Show all writeups</button></div>` : "";
  return page("Writeups", site_config_default.description, "/writeups/", `<main id="main"><div class="wrap"><header class="writeups-hero"><h1>Writeups.</h1><p class="intro">Security research, findings, and the lessons behind them.</p></header><section class="archive" id="writeups" aria-label="Published writeups">${search}<div id="writeup-results">${list2}</div></section></div></main>`, site_config_default.author, showRepository);
}
__name(homepage, "homepage");
function article(post) {
  const byline = [`<span>By ${escape3(post.author)}</span>`, ...post.date ? [`<time datetime="${escape3(post.date)}">${prettyDate(post.date)}</time>`] : []].join('<span class="separator" aria-hidden="true">\xB7</span>');
  const contents = post.toc.length ? `<aside class="contents"><details open><summary>On this page</summary><nav aria-label="Table of contents"><ol>${post.toc.map((h) => `<li><a class="depth-${h.depth}" href="#${encodeURIComponent(h.id)}">${escape3(h.text)}</a></li>`).join("")}</ol></nav></details></aside>` : "";
  const layoutClass = post.layout === "document" ? " document-reading" : post.toc.length ? "" : " no-contents";
  return page(post.title, post.description, postHref(post), `<main id="main"><div class="wrap"><header class="article-hero"><a class="back-link" href="/writeups/">\u2190 All writeups</a><h1>${escape3(post.title)}</h1>${post.description ? `<p class="article-deck">${escape3(post.description)}</p>` : ""}<div class="article-byline">${byline}</div>${tags(post, "post-tags article-tags")}</header><div class="reading-layout${layoutClass}">${post.layout === "document" ? "" : contents}<article class="prose">${post.html}<div class="article-end"><a href="/writeups/">\u2190 All writeups</a><a href="#top">Back to top \u2191</a></div></article></div></div></main>`, post.author, true);
}
__name(article, "article");
function notFound() {
  return page("Page not found", "This page could not be found.", "/404", '<main class="wrap not-found" id="main"><p class="eyebrow">404</p><h1>Page not found.</h1><p>This writeup may have moved or is no longer available.</p><a class="button-link" href="/writeups/">Back to writeups <span aria-hidden="true">\u2192</span></a></main>');
}
__name(notFound, "notFound");
function htmlResponse(html, status = 200) {
  return new Response(html, { status, headers: { ...HEADERS, "Cache-Control": "public, max-age=60" } });
}
__name(htmlResponse, "htmlResponse");
var index_default = {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    if (url.pathname === "/index.html") return Response.redirect(`${site_config_default.url}/`, 308);
    if (url.pathname === "/llm-visuals.css" || url.pathname === "/llm-visuals.js") {
      const css = url.pathname.endsWith('.css');
      return new Response(request.method === "HEAD" ? null : css ? llmVisualsCss : llmVisualsJs, { headers: { ...HEADERS, "Content-Type": css ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
    }
    if (url.pathname === "/notes.css") return new Response(request.method === "HEAD" ? null : notesCss, { headers: { ...HEADERS, "Content-Type": "text/css; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
    if (url.pathname === "/notes/llm.svg") return new Response(request.method === "HEAD" ? null : llmIcon, { headers: { ...HEADERS, "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
    const notesIndexMatch = /^\/notes\/?$/.test(url.pathname);
    const writeupsIndexMatch = /^\/writeups\/?$/.test(url.pathname);
    const noteMatch = url.pathname.match(/^\/notes\/([^/]+)(?:\/([^/]+))?\/?$/);
    if ((notesIndexMatch || noteMatch || writeupsIndexMatch) && !url.pathname.endsWith("/")) {
      url.pathname += "/";
      return Response.redirect(url.href, 308);
    }
    const articleMatch = url.pathname.match(/^\/writeups\/([^/]+)\/?$/);
    if (url.pathname !== "/" && url.pathname !== "/sitemap.xml" && !articleMatch && !writeupsIndexMatch && !notesIndexMatch && !noteMatch) return env.ASSETS.fetch(request);
    try {
      const { posts, notes = [], status } = await snapshot(env.FETCH || fetch, env.CACHE);
      const respond = (html, code = 200) => {
        const response = htmlResponse(html, code);
        return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
      };
      if (url.pathname === "/") return respond(homepage(posts, status === "ready"));
      if (writeupsIndexMatch) return respond(writeupsPage(posts, status === "ready"));
      if (notesIndexMatch) return respond(notesIndex(notes, page));
      if (noteMatch) {
        const section = noteSections(notes).find((item) => encodeURIComponent(item.slug) === noteMatch[1]);
        if (!section) return respond(notFound(), 404);
        if (!noteMatch[2]) return respond(notesTopic(section, page));
        const note = section.notes.find((item) => encodeURIComponent(item.slug) === noteMatch[2]);
        return note ? respond(noteArticle(note, page, tags)) : respond(notFound(), 404);
      }
      if (url.pathname === "/sitemap.xml") {
        const collections = ["/writeups/", "/notes/", ...noteSections(notes).map((section) => `/notes/${encodeURIComponent(section.slug)}/`)];
        const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape3(site_config_default.url)}/</loc></url>${collections.map((route) => `<url><loc>${escape3(site_config_default.url + route)}</loc></url>`).join("")}${[...posts, ...notes].map((post2) => `<url><loc>${escape3(site_config_default.url + postHref(post2))}</loc>${post2.date ? `<lastmod>${post2.date}</lastmod>` : ""}</url>`).join("")}</urlset>`;
        return new Response(request.method === "HEAD" ? null : xml, { headers: { ...HEADERS, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=60" } });
      }
      const post = posts.find((item) => postHref(item).slice(10, -1) === articleMatch[1]);
      return post ? respond(article(post)) : respond(notFound(), 404);
    } catch (error2) {
      console.error("Nightwatch GitHub import failed:", error2);
      return htmlResponse(page("Temporarily unavailable", "Writeups are temporarily unavailable.", "/", '<main class="wrap not-found" id="main"><h1>Writeups are temporarily unavailable.</h1><p>Please try again shortly.</p></main>'), 503);
    }
  }
};
export {
  index_default as default,
  loadRepository
};
