import { escape3 as escapeHtml } from './content.mjs';

const repository = 'https://github.com/llsohrabll/Writeups';
const template = `---\ntitle: "My first note"\ndescription: "A short summary."\ndate: "2026-11-02"\ntags: [learning]\n---\n\n## What I learned\n\nWrite your note here.\n`;
const addUrl = `${repository}/new/main/notes?${new URLSearchParams({ filename: 'my-first-note.md', value: template })}`;
export const notebookIcon = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="15" height="18" rx="2"/><path d="M9 3v18M3 7h4M3 12h4M3 17h4M12 8h5M12 12h5M12 16h3"/></svg>';
const llmIcon = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4H7a4 4 0 0 0-4 4v7a4 4 0 0 0 4 4h1v3l4-3h5a4 4 0 0 0 4-4v-3M7 10h3M7 14h8"/><path d="m18 2 1.2 3.8L23 7l-3.8 1.2L18 12l-1.2-3.8L13 7l3.8-1.2Z"/></svg>';
const oauthIcon = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="12" r="3"/><path d="M11 12h9m-4 0v3m4-3v2M4 5a10 10 0 0 1 15 0l2 2M21 3v4h-4M20 19a10 10 0 0 1-15 0l-2-2M3 21v-4h4"/></svg>';
const noteStyles = {
  llm: { tone: 'lilac', kind: 'Language models', icon: llmIcon, action: 'Explore flows' },
  oauth: { tone: 'mint', kind: 'Identity & access', icon: oauthIcon, action: 'Explore flows' },
};

function noteCard(note) {
  const style = noteStyles[note.slug] || { tone: 'blue', kind: 'Study notes', icon: notebookIcon, action: 'Read note' };
  const date = note.date ? new Date(`${note.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
  const icon = note.iconUrl ? `<img src="${escapeHtml(note.iconUrl)}" alt="" width="28" height="28" loading="lazy" decoding="async">` : style.icon;
  return `<a class="note-card note-card-${style.tone}" href="/note/${encodeURIComponent(note.slug)}/"><div class="note-card-top"><span class="note-card-symbol" aria-hidden="true">${icon}</span><span class="note-card-kind">${escapeHtml(style.kind)}</span></div><div class="note-card-copy"><h2>${escapeHtml(note.title)}</h2>${note.description ? `<p>${escapeHtml(note.description)}</p>` : ''}</div><div class="note-card-footer">${date ? `<time datetime="${escapeHtml(note.date)}">${date}</time>` : '<span></span>'}<span class="note-card-link">${style.action}<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5"/></svg></span></div></a>`;
}

export function notebookPage(notes, page) {
  const content = notes.length
    ? `<div class="note-grid">${notes.map(noteCard).join('')}</div>`
    : `<div class="notebook-empty"><span class="notebook-mark">${notebookIcon}</span><h2>A fresh page.</h2><p>No notes published yet.</p><div class="notebook-actions"><a class="notebook-button" href="${escapeHtml(addUrl)}">Add a note on GitHub <span aria-hidden="true">↗</span></a><a class="notebook-guide" href="${repository}/blob/main/Readme.md">Posting guide <span aria-hidden="true">↗</span></a></div></div>`;
  return page('Notes', 'Ideas, lessons, and things I’m learning.', '/note/', `<main id="main" class="notebook-page"><div class="wrap"><header class="hero notebook-hero"><h1>Notes<span>.</span></h1><p class="intro">Ideas, lessons, and things I’m learning.</p></header><section aria-label="Notes">${content}</section></div></main>`);
}

export const notebookCss = `
.notebook-page{padding-bottom:70px}.notebook-hero{padding-bottom:35px}
.note-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;align-items:stretch}
.note-card{--note-color:var(--accent);--note-wash:#a8c0ff0b;--note-symbol-bg:#a8c0ff10;--note-symbol-line:#a8c0ff28;display:flex;flex-direction:column;min-width:0;min-height:292px;padding:28px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(140deg,var(--note-wash),transparent 65%),var(--white);text-decoration:none;box-shadow:0 5px 22px var(--card-shadow);transition:border-color .18s,transform .18s,box-shadow .18s}
.note-card-lilac{--note-color:#c5b4ff;--note-wash:#b4a0ff0d;--note-symbol-bg:#b4a0ff13;--note-symbol-line:#b4a0ff29}.note-card-mint{--note-color:#87d9c6;--note-wash:#78d5bc0a;--note-symbol-bg:#78d5bc10;--note-symbol-line:#78d5bc28}
html[data-theme="light"] .note-card{--note-wash:#3156d307;--note-symbol-bg:#3156d309;--note-symbol-line:#3156d31c}html[data-theme="light"] .note-card-lilac{--note-color:#7050b7;--note-wash:#8560ce08;--note-symbol-bg:#8560ce0e;--note-symbol-line:#8560ce24}html[data-theme="light"] .note-card-mint{--note-color:#16745f;--note-wash:#16876b07;--note-symbol-bg:#16876b0b;--note-symbol-line:#16876b22}
.note-card:hover{color:var(--ink);border-color:var(--note-color);transform:translateY(-3px);box-shadow:0 10px 28px var(--card-shadow-hover)}.note-card:focus-visible{outline:3px solid var(--note-color);outline-offset:5px;border-radius:16px}
.note-card-top{display:flex;align-items:center;gap:15px;margin-bottom:25px}.note-card-symbol{display:grid;place-items:center;flex:none;width:52px;height:52px;border:1px solid var(--note-symbol-line);border-radius:14px;background:var(--note-symbol-bg);color:var(--note-color)}.note-card-symbol>svg,.note-card-symbol>img{display:block;width:27px;height:27px;object-fit:contain}
.note-card-kind{color:var(--note-color);font:500 12px/1.5 var(--sans);letter-spacing:.025em}
.note-card-copy{flex:1;min-width:0}.note-card-copy h2{margin:0 0 10px;font:400 34px/1.15 var(--serif);letter-spacing:-.035em;overflow-wrap:anywhere}.note-card-copy p{margin:0;color:var(--muted);font:14px/1.75 var(--sans);max-width:43ch;overflow-wrap:anywhere}
.note-card-footer{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:27px;padding-top:17px;border-top:1px solid var(--line);font:12px/1.5 var(--sans)}.note-card-footer time{color:var(--muted);font-size:11px}.note-card-link{display:inline-flex;align-items:center;gap:10px;white-space:nowrap;font-weight:500;color:var(--note-color)}.note-card-link svg{transition:transform .18s}.note-card:hover .note-card-link svg{transform:translateX(3px)}
@media(max-width:640px){.note-grid{grid-template-columns:minmax(0,1fr);gap:16px}.note-card{padding:23px;min-height:264px}.note-card-top{margin-bottom:22px}.note-card-copy h2{font-size:31px}.note-card-footer{margin-top:23px}}
@media(prefers-reduced-motion:reduce){.note-card,.note-card-link svg{transition:none}.note-card:hover,.note-card:hover .note-card-link svg{transform:none}}
.notebook-empty{border:1px solid var(--line);border-radius:14px;padding:58px 24px 64px;text-align:center;background:var(--white)}
.notebook-mark{display:inline-flex;align-items:center;justify-content:center;width:58px;height:58px;border:1px solid var(--line);border-radius:14px;color:var(--accent);margin-bottom:20px}
.notebook-empty h2{margin:0 0 12px;font-size:27px;letter-spacing:-.04em}.notebook-empty p{color:var(--muted);font-size:15px;line-height:1.6;margin:0}
.notebook-actions{display:flex;justify-content:center;align-items:center;gap:24px;flex-wrap:wrap;margin-top:27px;font-family:var(--sans);font-size:13px}
.notebook-button{padding:12px 17px;border:1px solid var(--line);border-radius:8px;text-decoration:none}.notebook-button:hover{border-color:var(--accent)}.notebook-guide{color:var(--muted);text-decoration:none}.notebook-guide:hover{color:var(--accent)}
@media(max-width:600px){.notebook-empty{padding:42px 20px 48px}.notebook-actions{flex-direction:column;gap:20px}}
`;
