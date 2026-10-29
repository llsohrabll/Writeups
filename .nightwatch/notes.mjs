import { escape3 as escapeHtml } from './content.mjs';

const repository = 'https://github.com/llsohrabll/Writeups';
const topicHref = (section) => `/notes/${encodeURIComponent(section)}/`;
const noteHref = (note) => `${topicHref(note.section)}${encodeURIComponent(note.slug)}/`;
const topicTitle = (slug) => slug === 'llm-attacks' ? 'LLM Attacks' : slug.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
const template = (title) => `---\ntitle: "My new note"\ndescription: "A short summary of what I learned."\ntags: [${title === 'LLM Attacks' ? 'llm' : 'learning'}]\n---\n\n## Key ideas\n\nWrite your notes here.\n\n## Examples\n\nAdd examples, code, or screenshots.\n\n## References\n\n- [Course or resource](https://example.com)\n`;

export const llmIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" role="img" aria-label="LLM Attacks">
  <rect x=".5" y=".5" width="63" height="63" rx="15.5" fill="#EAF0FF" stroke="#D5E1FC"/>
  <g stroke="#3156C8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="18" y="18" width="28" height="28" rx="8"/>
    <path d="M26 13v5m12-5v5M26 46v5m12-5v5M13 26h5m-5 12h5m28-12h5m-5 12h5"/>
    <path d="M26 25h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"/>
    <path d="M29 30h6m-6 3h3"/>
  </g>
</svg>`;

export function noteSections(notes) {
  const slugs = [...new Set(['llm-attacks', ...notes.map((note) => note.section)])];
  return slugs.sort((a, b) => a === 'llm-attacks' ? -1 : b === 'llm-attacks' ? 1 : a.localeCompare(b)).map((slug) => ({
    slug,
    title: topicTitle(slug),
    description: slug === 'llm-attacks'
      ? 'Prompt injection, model security, and lessons from courses and labs.'
      : 'Notes, examples, and lessons collected along the way.',
    notes: notes.filter((note) => note.section === slug),
  }));
}

function addNoteUrl(section) {
  const params = new URLSearchParams({ filename: 'my-note.md', value: template(topicTitle(section)) });
  return `${repository}/new/main/notes/${encodeURIComponent(section)}?${params}`;
}

function noteCard(note) {
  const metadata = [note.date, `${note.minutes} min read`].filter(Boolean).map(escapeHtml).join(' <span aria-hidden="true">·</span> ');
  return `<a class="note-card" href="${noteHref(note)}"><div class="note-card-meta">${metadata}</div><h3>${escapeHtml(note.title)}</h3>${note.description ? `<p>${escapeHtml(note.description)}</p>` : ''}<span class="note-card-link">Read note <span aria-hidden="true">→</span></span></a>`;
}

export function notesIndex(notes, page) {
  const sections = noteSections(notes);
  const cards = sections.map((section) => `<a class="notes-topic-card" href="${topicHref(section.slug)}"><span class="notes-topic-icon" aria-hidden="true">${llmIcon}</span><div><span class="notes-kicker">${section.notes.length} ${section.notes.length === 1 ? 'note' : 'notes'}</span><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.description)}</p><span class="note-card-link">Open collection <span aria-hidden="true">→</span></span></div></a>`).join('');
  return page('Notes', 'Personal notes from academies, security classes, courses, and labs.', '/notes/', `<main id="main" class="notes-page"><div class="wrap"><header class="notes-hero"><p class="notes-eyebrow">The learning notebook</p><h1>Notes<span>.</span></h1><p class="intro">Ideas, examples, and things I learn from academies, security classes, and hands-on labs.</p></header><section class="notes-collections" aria-labelledby="collections-title"><div class="notes-section-heading"><h2 id="collections-title">Collections</h2><span>${sections.length} ${sections.length === 1 ? 'collection' : 'collections'}</span></div><div class="notes-topic-grid">${cards}</div></section></div></main>`, undefined, true);
}

export function notesTopic(section, page) {
  const list = section.notes.length
    ? `<div class="notes-list">${section.notes.map(noteCard).join('')}</div>`
    : `<div class="notes-empty"><span class="notes-empty-mark" aria-hidden="true">${llmIcon}</span><h2>A fresh page.</h2><p>No notes here yet. This is where my ${escapeHtml(section.title === 'LLM Attacks' ? 'LLM security' : section.title.toLowerCase())} learning notes will live.</p><a class="notes-button" href="${escapeHtml(addNoteUrl(section.slug))}">Add the first note on GitHub <span aria-hidden="true">↗</span></a></div>`;
  return page(section.title, section.description, topicHref(section.slug), `<main id="main" class="notes-page"><div class="wrap"><a class="notes-back" href="/notes/">← All notes</a><header class="notes-hero notes-topic-hero"><span class="notes-topic-icon" aria-hidden="true">${llmIcon}</span><div><p class="notes-eyebrow">Learning collection</p><h1>${escapeHtml(section.title)}<span>.</span></h1><p class="intro">${escapeHtml(section.description)}</p></div></header><div class="notes-section-heading"><h2>${section.notes.length} ${section.notes.length === 1 ? 'note' : 'notes'}</h2><a class="notes-add-link" href="${escapeHtml(addNoteUrl(section.slug))}">Add note on GitHub <span aria-hidden="true">↗</span></a></div>${list}</div></main>`, undefined, true);
}

export function noteArticle(note, page, tags) {
  const section = topicTitle(note.section);
  const back = `<a class="notes-back" href="${topicHref(note.section)}">← ${escapeHtml(section)}</a>`;
  const editUrl = `${repository}/edit/main/${note.file.split('/').map(encodeURIComponent).join('/')}`;
  const metadata = [`<span>By ${escapeHtml(note.author)}</span>`, note.date ? `<time datetime="${escapeHtml(note.date)}">${escapeHtml(note.date)}</time>` : '', `<span>${note.minutes} min read</span>`].filter(Boolean).join('<span class="separator" aria-hidden="true">·</span>');
  const contents = note.toc.length ? `<aside class="contents"><details open><summary>On this page</summary><nav aria-label="Table of contents"><ol>${note.toc.map((heading) => `<li><a class="depth-${heading.depth}" href="#${encodeURIComponent(heading.id)}">${escapeHtml(heading.text)}</a></li>`).join('')}</ol></nav></details></aside>` : '';
  return page(note.title, note.description, noteHref(note), `<main id="main" class="notes-page"><div class="wrap"><header class="article-hero">${back}<p class="notes-eyebrow">${escapeHtml(section)} / Note</p><h1>${escapeHtml(note.title)}</h1>${note.description ? `<p class="article-deck">${escapeHtml(note.description)}</p>` : ''}<div class="article-byline">${metadata}</div>${tags(note, 'post-tags article-tags')}<a class="notes-edit-link" href="${escapeHtml(editUrl)}">Edit note on GitHub ↗</a></header><div class="reading-layout${note.toc.length ? '' : ' no-contents'}">${contents}<article class="prose">${note.html}<div class="article-end">${back}<a href="#top">Back to top ↑</a></div></article></div></div></main>`, note.author, true);
}

export const notesCss = `
.notes-page{padding-bottom:80px}
.notes-page .wrap{max-width:1120px}
.notes-hero{padding:76px 0 54px;max-width:780px}
.notes-eyebrow,.notes-kicker{font-size:11px;font-weight:650;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.notes-eyebrow{margin:0 0 18px}
.notes-hero h1{font-size:clamp(42px,7vw,72px);letter-spacing:-.055em;line-height:1.08;margin:0 0 22px}
.notes-hero h1>span{color:var(--accent)}
.notes-hero .intro{font-size:18px;line-height:1.7;max-width:660px;margin:0;color:var(--muted)}
.notes-section-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 20px}
.notes-section-heading h2{font-size:17px;font-weight:600;margin:0;letter-spacing:-.02em}
.notes-section-heading>span{font-size:12px;opacity:.5}
.notes-topic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
.notes-topic-card{display:flex;gap:24px;padding:30px;border:1px solid var(--line);border-radius:16px;color:inherit;text-decoration:none;background:var(--white);transition:border-color .15s,background .15s}
.notes-topic-card:hover{border-color:#6388ef99;background:#6388ef0c}
.notes-topic-icon{flex-shrink:0;display:block;width:64px;height:64px}
.notes-topic-icon svg{display:block;width:100%;height:100%}
.notes-topic-card h2{font-size:24px;line-height:1.25;letter-spacing:-.035em;margin:8px 0 12px}
.notes-topic-card p{font-size:14px;line-height:1.7;margin:0 0 22px;color:var(--muted)}
.notes-topic-card>div{min-width:0;overflow-wrap:anywhere}
.note-card-link{font-size:12px;font-weight:600;display:inline-flex;gap:12px;align-items:center;color:var(--accent)}
.notes-back,.notes-add-link,.notes-edit-link{font-size:13px;text-decoration:none;color:inherit}
.notes-back{display:inline-flex;margin-top:36px;opacity:.65}
.notes-topic-hero{display:flex;gap:28px;align-items:flex-start;max-width:950px;padding:42px 0 48px}
.notes-topic-hero .notes-topic-icon{margin-top:6px}
.notes-topic-hero h1{font-size:clamp(34px,6vw,56px);margin-bottom:18px}
.notes-add-link,.notes-edit-link{color:var(--accent)}
.notes-edit-link{display:inline-block;margin-top:20px}
.notes-empty{display:flex;align-items:center;text-align:center;flex-direction:column;padding:58px 24px 64px;border:1px dashed #8394b13d;border-radius:16px}
.notes-empty-mark{width:48px;height:48px;opacity:.75}
.notes-empty-mark svg{width:100%;height:100%}
.notes-empty h2{font-size:24px;letter-spacing:-.035em;margin:22px 0 12px}
.notes-empty p{max-width:410px;line-height:1.8;font-size:14px;color:var(--muted);margin:0 0 24px}
.notes-button{display:inline-flex;align-items:center;gap:16px;border:1px solid #6388ef66;border-radius:8px;padding:12px 16px;color:inherit;background:#6388ef0d;font-size:12px;font-weight:600;text-decoration:none}
.notes-button:hover{background:#6388ef20}
.notes-list{display:grid;gap:14px}
.note-card{display:block;text-decoration:none;color:inherit;border:1px solid #8394b12b;border-radius:12px;padding:26px 28px}
.note-card:hover{border-color:#6388ef88}
.note-card-meta{display:flex;gap:10px;font-size:11px;opacity:.5}
.note-card h3{font-size:21px;letter-spacing:-.025em;margin:12px 0}
.note-card p{font-size:14px;line-height:1.7;color:var(--muted);margin:0 0 16px}
.notes-page .article-hero>.notes-back{margin-top:30px;margin-bottom:30px}
.notes-page a:focus-visible{outline:2px solid #6388ef;outline-offset:5px}
@media(max-width:700px){.notes-topic-grid{grid-template-columns:1fr}.notes-hero{padding:48px 0 38px}.notes-topic-card{padding:24px;gap:20px}.notes-topic-hero{gap:18px;padding-top:32px}.notes-topic-hero .notes-topic-icon{width:48px;height:48px}.notes-section-heading{flex-wrap:wrap}.notes-empty{padding:40px 20px}.notes-page{padding-bottom:48px}.nav{flex-wrap:wrap;gap:12px}.header-inner{gap:16px}}
@media(max-width:600px){.header-inner{flex-wrap:wrap;padding-block:14px;min-height:0}.header-inner .nav{width:100%;gap:8px}.nav a{padding-inline:8px}.notes-hero h1,.notes-page .article-hero h1{overflow-wrap:anywhere}}
@media(max-width:420px){.notes-topic-hero{display:block}.notes-topic-hero .notes-topic-icon{margin-bottom:22px}.notes-topic-card{flex-direction:column}.notes-button{max-width:100%;text-align:left}}
@media(prefers-reduced-motion:reduce){.notes-topic-card{transition:none}}
`;
