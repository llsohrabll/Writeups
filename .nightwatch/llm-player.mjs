import { oauthPlayerCss } from './oauth-player.mjs';
import { LESSONS } from './llm-lessons.mjs';
import { initLLMPlayer } from './llm-player-client.mjs';

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const groups = [
  { id: 'flows', label: 'Flows', source: 'THE NORMAL FLOWS' },
  { id: 'attacks', label: 'Attacks', source: 'WHEN TRUST BREAKS' },
  { id: 'scanners', label: 'Scanners', source: 'SCANNERS IN THE SPOTLIGHT' },
];
export const llmPlayerScript = `(${initLLMPlayer.toString()})(${JSON.stringify(LESSONS)});`;
export const llmPlayerHtml = `
<section class="llm-player" data-llm-player aria-label="Interactive LLM animation">
  <nav class="llm-library" aria-label="LLM lessons">
    <div class="llm-library-tabs" role="tablist" aria-label="Lesson category">${groups.map((group, i) => `<button type="button" role="tab" id="llm-category-${group.id}" data-lesson-group="${group.id}" aria-controls="llm-lessons-${group.id}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${group.label} <span>${String(LESSONS.filter(lesson => lesson.group === group.source).length).padStart(2, '0')}</span></button>`).join('')}</div>
    ${groups.map((group, groupIndex) => `<div class="llm-lesson-panel" id="llm-lessons-${group.id}" role="tabpanel" aria-labelledby="llm-category-${group.id}"${groupIndex ? ' hidden' : ''}><div class="llm-lesson-list">${LESSONS.filter(lesson => lesson.group === group.source).map(lesson => `<button type="button" class="llm-lesson-button" data-lesson="${lesson.id}" aria-pressed="${lesson.id === 'chat'}" aria-controls="llm-active-lesson"><span class="llm-lesson-number" aria-hidden="true">${String(LESSONS.indexOf(lesson) + 1).padStart(2, '0')}</span><span>${escape(lesson.short)}</span><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M3 8h9M8 4l4 4-4 4"/></svg></button>`).join('')}</div></div>`).join('')}
  </nav>
  <div id="llm-active-lesson" class="llm-heading"><h2 id="llm-lesson-title">${escape(LESSONS[0].title)}</h2><p id="llm-lesson-summary">${escape(LESSONS[0].summary)}</p></div>
  <noscript><p>Enable JavaScript to play the interactive flows.</p></noscript>
  <div class="llm-workspace">
    <section class="llm-flow" aria-label="Animated message flow">
      <div class="llm-toolbar"><div class="llm-segmented" aria-label="Diagram layout"><button type="button" id="llm-map-mode" aria-pressed="true">Flow map</button><button type="button" id="llm-sequence-mode" aria-pressed="false">Sequence</button></div><div class="llm-legend"><span>Conversation</span><span>Tools &amp; data</span><span>Attacker</span></div></div>
      <div class="llm-stage"><svg id="llm-diagram" viewBox="0 0 820 435" role="img" aria-labelledby="llm-diagram-title llm-diagram-desc"><title id="llm-diagram-title">LLM message flow</title><desc id="llm-diagram-desc">The step inspector describes every animated message.</desc></svg><div id="llm-sequence" class="llm-sequence" hidden></div></div>
      <div class="llm-trust-strip" aria-label="Trust separation"><span>App rules</span><b aria-hidden="true">≠</b><span>User intent</span><b aria-hidden="true">≠</b><span>External text</span></div>
      <div class="llm-caption"><span id="llm-channel-label"></span><span id="llm-scene-state"></span></div>
      <div class="llm-playback"><button type="button" id="llm-restart" class="llm-icon-button" aria-label="Restart lesson" title="Restart">↺</button><button type="button" id="llm-previous" class="llm-icon-button" aria-label="Previous step">‹</button><button type="button" id="llm-play" class="llm-play-button" aria-label="Play animation"><span aria-hidden="true">▶</span> Play flow</button><button type="button" id="llm-next" class="llm-icon-button" aria-label="Next step">›</button><span id="llm-step-counter" class="llm-step-counter">1 / 6</span><label class="llm-speed">Speed <select id="llm-speed" aria-label="Playback speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label></div>
      <div class="llm-scrubber"><input id="llm-scrub" type="range" min="0" max="5" value="0" aria-label="Lesson step"><div id="llm-timeline" class="llm-timeline" aria-label="Jump to step"></div></div>
    </section>
    <section class="llm-inspector" aria-label="Step inspector">
      <div class="llm-inspector-top"><span>Inside the message</span><span id="llm-message-number">01</span></div>
      <div class="llm-tabs" role="tablist" aria-label="Step details"><button type="button" role="tab" id="llm-tab-explain" data-tab="explain" aria-controls="llm-inspect-explain" aria-selected="true">Explain</button><button type="button" role="tab" id="llm-tab-http" data-tab="http" aria-controls="llm-inspect-http" aria-selected="false" tabindex="-1">Trace</button><button type="button" role="tab" id="llm-tab-defense" data-tab="defense" aria-controls="llm-inspect-defense" aria-selected="false" tabindex="-1">Defense</button></div>
      <div id="llm-inspect-explain" class="llm-pane" role="tabpanel" aria-labelledby="llm-tab-explain" tabindex="0"><div id="llm-step-route" class="llm-step-route"></div><h3 id="llm-step-title" aria-live="polite"></h3><p id="llm-step-detail"></p><p id="llm-step-note" class="llm-insight"></p><div id="llm-token-tray" class="llm-tokens"></div></div>
      <div id="llm-inspect-http" class="llm-pane" role="tabpanel" aria-labelledby="llm-tab-http" tabindex="0" hidden><div class="llm-code-heading"><span>Prompt / tool / result</span><button type="button" id="llm-copy">Copy</button></div><pre><code id="llm-http-code"></code></pre><p class="llm-code-note">Scripted examples. Payloads are displayed as text and never executed.</p></div>
      <div id="llm-inspect-defense" class="llm-pane" role="tabpanel" aria-labelledby="llm-tab-defense" tabindex="0" hidden><h3 id="llm-defense-title"></h3><p id="llm-defense-text"></p><span class="llm-invariant-label">Security invariant</span><p id="llm-invariant"></p></div>
      <div id="llm-defense-control" class="llm-defense-control" hidden><label for="llm-secure">Enable the defense <input id="llm-secure" type="checkbox" role="switch"></label><p>Replay to see where the attack stops.</p></div>
    </section>
  </div>
  <div class="llm-bottom"><span>Local simulation · no live AI calls or actions</span><details class="llm-context"><summary>Context &amp; sources</summary><div class="llm-context-body"><dl><div><dt>Before this flow</dt><dd id="llm-context"></dd></div><div><dt>How it works</dt><dd id="llm-mechanism"></dd></div><div><dt>What to remember</dt><dd id="llm-takeaway"></dd></div></dl><div id="llm-lesson-sources" class="llm-sources"></div></div></details></div>
</section>`;

export const llmPlayerCss = oauthPlayerCss.replaceAll('oauth-', 'llm-') + `
.llm-player{--llm-source-bg:#3b2536;--llm-source-edge:#b784a2}html[data-theme="light"] .llm-player{--llm-source-bg:#fbedf3;--llm-source-edge:#be8ba6}
.llm-actor[data-actor="auth"]{--llm-actor-fill:var(--llm-purple-bg);--llm-actor-edge:var(--llm-purple-edge)}
.llm-actor[data-actor="api"]{--llm-actor-fill:var(--llm-amber-bg);--llm-actor-edge:var(--llm-amber-edge)}
.llm-actor[data-actor="source"]{--llm-actor-fill:var(--llm-source-bg);--llm-actor-edge:var(--llm-source-edge)}
.llm-actor-sub{font-size:9px}
.llm-sequence-head{grid-template-columns:repeat(6,1fr)}
.llm-sequence{min-width:660px;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(16.6667% - 1px),var(--line) calc(16.6667% - 1px),var(--line) 16.6667%)}
.llm-trust-strip{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:9px;padding:13px 12px;border-top:1px solid var(--line);color:var(--muted);font:10px/1.5 var(--sans)}
.llm-trust-strip>span{padding:3px 7px;border:1px solid var(--line);border-radius:5px;background:var(--paper)}.llm-trust-strip>b{font-weight:400;color:var(--accent)}
@media(max-width:600px){.llm-legend{gap:6px;font-size:8px}.llm-legend span::before{margin-right:4px}.llm-trust-strip{font-size:9px;gap:6px}}
`;
const version=value=>[...value].reduce((hash,c)=>(Math.imul(31,hash)+c.charCodeAt(0))|0,0).toString(36);
export const llmPlayerVersion={css:version(llmPlayerCss),js:version(llmPlayerScript)};
