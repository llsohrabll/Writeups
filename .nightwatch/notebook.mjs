import { escape3 as escapeHtml } from './content.mjs';

const repository = 'https://github.com/llsohrabll/Writeups';
const template = `---\ntitle: "My first note"\ndescription: "A short summary."\ndate: "2026-11-02"\ntags: [learning]\n---\n\n## What I learned\n\nWrite your note here.\n`;
const addUrl = `${repository}/new/main/notes?${new URLSearchParams({ filename: 'my-first-note.md', value: template })}`;
export const notebookIcon = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="15" height="18" rx="2"/><path d="M9 3v18M3 7h4M3 12h4M3 17h4M12 8h5M12 12h5M12 16h3"/></svg>';

export function notebookPage(notes, page, card) {
  const content = notes.length
    ? `<div class="post-list">${notes.map(card).join('')}</div>`
    : `<div class="notebook-empty"><span class="notebook-mark">${notebookIcon}</span><h2>A fresh page.</h2><p>No notes published yet.</p><div class="notebook-actions"><a class="notebook-button" href="${escapeHtml(addUrl)}">Add a note on GitHub <span aria-hidden="true">↗</span></a><a class="notebook-guide" href="${repository}/blob/main/Readme.md">Posting guide <span aria-hidden="true">↗</span></a></div></div>`;
  return page('Notes', 'Ideas, lessons, and things I’m learning.', '/note/', `<main id="main" class="notebook-page"><div class="wrap"><header class="hero notebook-hero"><h1>Notes<span>.</span></h1><p class="intro">Ideas, lessons, and things I’m learning.</p></header><section aria-label="Notes">${content}</section></div></main>`);
}

export const notebookCss = `
.notebook-page{padding-bottom:70px}.notebook-hero{padding-bottom:35px}
.notebook-empty{border:1px solid var(--line);border-radius:14px;padding:58px 24px 64px;text-align:center;background:var(--white)}
.notebook-mark{display:inline-flex;align-items:center;justify-content:center;width:58px;height:58px;border:1px solid var(--line);border-radius:14px;color:var(--accent);margin-bottom:20px}
.notebook-empty h2{margin:0 0 12px;font-size:27px;letter-spacing:-.04em}.notebook-empty p{color:var(--muted);font-size:15px;line-height:1.6;margin:0}
.notebook-actions{display:flex;justify-content:center;align-items:center;gap:24px;flex-wrap:wrap;margin-top:27px;font-family:var(--sans);font-size:13px}
.notebook-button{padding:12px 17px;border:1px solid var(--line);border-radius:8px;text-decoration:none}.notebook-button:hover{border-color:var(--accent)}.notebook-guide{color:var(--muted);text-decoration:none}.notebook-guide:hover{color:var(--accent)}
@media(max-width:600px){.notebook-empty{padding:42px 20px 48px}.notebook-actions{flex-direction:column;gap:20px}}
`;
