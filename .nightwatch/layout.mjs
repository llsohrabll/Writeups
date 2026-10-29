import site from './site.mjs';
import { escape3 as escapeHtml } from './content.mjs';
import { notesCss } from './notes.mjs';

const notesCssVersion = [...notesCss].reduce((hash, character) => (Math.imul(31, hash) + character.charCodeAt(0)) | 0, 0).toString(36);

export function page(title, description, route, body, author = site.author, showRepository = false) {
  const notes = route.startsWith('/notes/');
  const article = route.startsWith('/writeups/') || /^\/notes\/[^/]+\/[^/]+\/$/.test(route);
  const canonical = escapeHtml(site.url + route);
  const navLink = (href, label, current) => `<a${current ? ' class="nav-current" aria-current="page"' : ''} href="${href}">${label}</a>`;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0c1321"><title>${escapeHtml(route === '/' ? site.author : title + ' — ' + site.name)}</title>
<meta name="description" content="${escapeHtml(description)}"><meta name="author" content="${escapeHtml(author)}">
<link rel="canonical" href="${canonical}"><meta property="og:type" content="${article ? 'article' : 'website'}">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg"><script src="/theme.js"></script>
${route === '/' ? '<script type="module" src="/search.js"></script>' : ''}
<link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/notes.css?v=${notesCssVersion}">
</head><body id="top"><a class="skip" href="#main">Skip to content</a>
<header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="Nightwatch home"><img class="brand-mark" src="/favicon.svg" alt="" width="32" height="32">Nightwatch</a>
<nav class="nav" aria-label="Main navigation">${navLink('/#writeups', 'Writeups', !notes)}${navLink('/notes/', 'Notes', notes)}
${showRepository ? `<a class="source-link" href="${escapeHtml(site.repository)}" rel="noopener noreferrer">Source ↗</a>` : ''}
<button class="theme-toggle" type="button" data-theme-toggle hidden aria-label="Switch to light mode" title="Switch to light mode"><span class="theme-toggle-icon" aria-hidden="true">☀</span><span class="theme-toggle-label">Light mode</span></button>
</nav></div></header>${body}
<footer class="site-footer"><div class="wrap footer-inner"><span>Nightwatch <span class="footer-dot" aria-hidden="true">·</span> ${escapeHtml(site.author)}</span><a href="#top">Back to top ↑</a></div></footer>
</body></html>`;
}
