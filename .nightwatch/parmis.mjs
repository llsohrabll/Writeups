const heart = '<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><path d="M24 39S7 29 7 17a9 9 0 0 1 17-4 9 9 0 0 1 17 4c0 12-17 22-17 22Z"/></svg>';

export const parmisCss = `
:root{color-scheme:light;--paper:#fcf9f6;--ink:#4c343b;--rose:#a3455d;--muted:#8b7378}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}
.love-page{min-height:100svh;display:grid;grid-template-rows:1fr auto;padding:32px 24px 26px;text-align:center}
.love-note{align-self:center;justify-self:center;width:100%;max-width:560px;padding:52px 0 66px}
.heart{display:inline-grid;place-items:center;width:80px;height:80px;margin:0 0 28px;padding:0;background:none;border:1px solid #eadbdc;border-radius:50%;color:var(--rose);cursor:pointer;transition:background .25s,border-color .25s,transform .25s}
.heart svg{width:36px;height:36px;fill:transparent;stroke:currentColor;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round;transition:fill .25s}
.heart:hover{background:#f7ecec;border-color:#dcbfc6;transform:translateY(-2px)}
.heart[aria-pressed="true"] svg{fill:var(--rose)}
.heart:focus-visible,.home:focus-visible{outline:2px solid var(--rose);outline-offset:6px}
.eyebrow{margin:0 0 14px;color:var(--muted);font-size:10px;font-weight:400;letter-spacing:.23em;text-transform:uppercase}
h1{margin:0;font-family:Georgia,'Times New Roman',serif;font-size:clamp(76px,15vw,120px);font-style:italic;font-weight:400;letter-spacing:-.065em;line-height:1.15}
h1 span{color:var(--rose)}
.message{min-height:24px;margin:23px 0 0;color:var(--muted);font-size:15px;line-height:1.6}
.signature{margin:44px 0 0;color:var(--muted);font-family:Georgia,'Times New Roman',serif;font-size:15px;font-style:italic}
.signature::before{content:'';display:block;width:24px;height:1px;margin:0 auto 22px;background:#d8bec4}
.home{justify-self:center;padding:8px;color:var(--muted);font-size:10px;letter-spacing:.08em;text-decoration:none;transition:color .2s}
.home:hover{color:var(--rose)}
.heart.is-loved{animation:beat .5s ease-in-out}
@keyframes beat{0%,100%{transform:scale(1)}45%{transform:scale(1.12)}}
@media(max-width:420px){.love-page{padding:24px 20px 18px}.love-note{padding:36px 0 52px}.heart{width:72px;height:72px;margin-bottom:26px}.message{font-size:14px}}
@media(prefers-reduced-motion:reduce){*,*::before{animation:none!important;transition:none!important}}
`;

export const parmisJs = `
const heart = document.querySelector('[data-love-heart]');
const message = document.querySelector('[data-love-message]');
heart?.addEventListener('click', () => {
  const loved = heart.getAttribute('aria-pressed') !== 'true';
  heart.setAttribute('aria-pressed', String(loved));
  heart.classList.toggle('is-loved', loved);
  message.textContent = loved ? 'I love you, Parmis.' : 'Life is a little sweeter with you.';
});
`;

const version = [...parmisCss + parmisJs].reduce((hash, character) => (Math.imul(31, hash) + character.charCodeAt(0)) | 0, 0).toString(36);

export function parmisPage() {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#fcf9f6"><meta name="robots" content="noindex">
<title>For Parmis</title><meta name="description" content="A little love note, just for you.">
<link rel="canonical" href="https://nightwatch.team/parmis/">
<link rel="stylesheet" href="/parmis.css?v=${version}"><script defer src="/parmis.js?v=${version}"></script>
</head><body><main class="love-page">
<section class="love-note" aria-labelledby="parmis-title">
<button class="heart" type="button" data-love-heart aria-label="A little love for Parmis" aria-pressed="false">${heart}</button>
<p class="eyebrow">For my favorite person</p>
<h1 id="parmis-title">Parmis<span>.</span></h1>
<p class="message" data-love-message aria-live="polite">Life is a little sweeter with you.</p>
<p class="signature">With love, Sohrab</p>
</section><a class="home" href="/">\u2190 home</a>
</main></body></html>`;
}
