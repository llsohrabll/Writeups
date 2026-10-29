const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const messages = [
  ['Natural-language prompt', 0, 1, 'The user asks the application to perform a task. Identity comes from the authenticated session.', 'USER → BACKEND\nCheck order #4521 and email me an update if it shipped.'],
  ['Prompt + tool definitions', 1, 2, 'The backend sends the request and the tools available for this workflow to the model.', 'BACKEND → LLM\nUser request + descriptions of allowed tools'],
  ['JSON function-call arguments', 2, 1, 'The LLM proposes a function call. The application receives structured arguments, not a permission grant.', 'LLM → BACKEND\nprepare_order_update({ "order_id": "4521" })'],
  ['Execute function', 1, 3, 'After checking the arguments and the user’s access to this order, the backend invokes the function.', 'BACKEND → FUNCTION\nvalidate_user_access("4521")\nprepare_order_update("4521")'],
  ['Function result', 3, 1, 'The function returns data. Text in the result can come from external or attacker-controlled sources.', 'FUNCTION → BACKEND\n{ "status": "shipped", "notes": "...untrusted text..." }'],
  ['Append result as tool message', 1, 2, 'The backend returns the function result to the LLM. This is where untrusted API data enters the model’s context.', 'BACKEND → LLM\nrole: tool\ncontent: function_result\n\nData is not a new instruction or approval.'],
  ['Proposed external API call', 2, 1, 'The LLM proposes a second action. The backend must authorize it independently before any external request.', 'LLM → BACKEND\nsend_email({ "to": "user@example.com", "body": "Your order shipped." })'],
  ['Execute requested API action', 1, 4, 'Only an authorized action with any required approval reaches the external API. The backend performs the request.', 'BACKEND → EXTERNAL API\nVerify recipient + task + exact approval\nThen send the email'],
  ['API response', 4, 1, 'The external service reports its outcome to the backend.', 'EXTERNAL API → BACKEND\n{ "accepted": true }'],
  ['Return execution result', 1, 2, 'The backend gives the actual API outcome to the model so it can report accurately.', 'BACKEND → LLM\nEmail service accepted the message for sending.'],
  ['Summarize outcome', 2, 1, 'The model produces a user-facing summary grounded in the returned execution result.', 'LLM → BACKEND\nOrder #4521 has shipped. The email was accepted for sending.'],
  ['Final response', 1, 0, 'The application delivers the confirmed outcome to the user.', 'BACKEND → USER\nThe operation’s actual result'],
  ['Block action or request approval', 1, 0, 'If authorization or required approval is missing, the backend stops the action. No external API request is made.', 'BACKEND → USER\nAction blocked, or approval required.\nNo email sent.'],
];

function messageRow(index) {
  const [title, from, to] = messages[index];
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const response = [2, 4, 6, 8, 10, 11, 12].includes(index);
  return `<div class="seq-row"><button type="button" class="seq-message seq-edge-${start}-${end} ${to > from ? 'seq-right' : 'seq-left'}${response ? ' seq-return' : ''}" data-seq-message="${index}" aria-current="${index === 0 ? 'step' : 'false'}"><span class="seq-number">${index === 12 ? '8' : index + 1}</span><span>${escapeHtml(title)}</span></button></div>`;
}

export function renderLlmSequence() {
  const details = messages.map(([title, from, to, description, code], index) => `<section data-seq-detail="${index}"${index ? ' hidden' : ''}><p class="seq-label">Message ${index === 12 ? 8 : index + 1} · ${['User', 'Backend', 'LLM', 'Function', 'External API'][from]} → ${['User', 'Backend', 'LLM', 'Function', 'External API'][to]}</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p><pre><code>${escapeHtml(code)}</code></pre></section>`).join('');
  return `<section class="llm-sequence" data-llm-sequence aria-label="Sequence diagram: who communicates with whom"><div class="seq-heading"><div><p class="seq-label">Request direction and trust boundaries</p><h2>Who communicates with whom?</h2></div><div class="seq-modes" role="group" aria-label="Authorization outcome"><button type="button" data-seq-mode="allowed" aria-pressed="true">Authorized</button><button type="button" data-seq-mode="blocked" aria-pressed="false">Blocked</button></div></div><p class="seq-intro">Follow the arrows. Select a message to inspect it; switch outcomes to see where execution stops.</p><div class="seq-scroll" role="region" aria-label="Sequence diagram lanes"><div class="seq-canvas"><div class="seq-actors"><strong>User</strong><strong>Client / Backend</strong><strong>LLM</strong><strong>Function</strong><strong>External API</strong></div><div class="seq-lifelines">${[0, 1, 2].map(messageRow).join('')}<div class="seq-policy-row"><span>Validate arguments<br>and user permissions</span></div>${[3, 4].map(messageRow).join('')}<div class="seq-risk"><p>Injection risk: untrusted API data enters model context</p>${messageRow(5)}</div>${messageRow(6)}<div class="seq-branch seq-authorized" data-seq-branch="allowed"><p class="seq-branch-title">Authorized and approved</p>${[7, 8, 9, 10, 11].map(messageRow).join('')}</div><div class="seq-branch seq-blocked" data-seq-branch="blocked" hidden><p class="seq-branch-title">Unauthorized or missing approval — no external API call</p>${messageRow(12)}</div></div></div></div><p class="seq-scroll-hint">On narrow screens, scroll the lanes horizontally.</p><div class="seq-inspector" aria-live="polite" aria-atomic="true">${details}</div></section>`;
}

function initSequences() {
  document.querySelectorAll('[data-llm-sequence]').forEach((root) => {
    let mode = 'allowed';
    let selected = 0;
    const draw = () => {
      root.querySelectorAll('[data-seq-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.seqMode === mode)));
      root.querySelectorAll('[data-seq-branch]').forEach((branch) => { branch.hidden = branch.dataset.seqBranch !== mode; });
      root.querySelectorAll('[data-seq-message]').forEach((button) => button.setAttribute('aria-current', Number(button.dataset.seqMessage) === selected ? 'step' : 'false'));
      root.querySelectorAll('[data-seq-detail]').forEach((panel) => { panel.hidden = Number(panel.dataset.seqDetail) !== selected; });
    };
    root.querySelectorAll('[data-seq-mode]').forEach((button) => button.addEventListener('click', () => { mode = button.dataset.seqMode; selected = mode === 'blocked' ? 12 : 7; draw(); }));
    root.querySelectorAll('[data-seq-message]').forEach((button) => button.addEventListener('click', () => { selected = Number(button.dataset.seqMessage); draw(); }));
    draw();
  });
}

export const sequenceJs = `(${initSequences.toString()})();`;
export const sequenceCss = `
.llm-sequence{--seq-blue:#75b8ff;--seq-teal:#55d9bf;--seq-purple:#c3a3ff;--seq-orange:#ffc17d;--seq-red:#ff9e9b;background:#0b1423;color:#e9effb;border:1px solid #26354d;border-radius:16px;padding:22px;margin:32px 0;font-family:var(--sans);font-size:13px;line-height:1.6;color-scheme:dark}
.llm-sequence [hidden]{display:none!important}.llm-sequence *{box-sizing:border-box}
.llm-sequence h2{color:#fff;font-size:23px;line-height:1.3;letter-spacing:-.035em;margin:6px 0 0}.llm-sequence h3{font-size:20px;line-height:1.3;color:#fff;margin:8px 0 12px}
.llm-sequence p{margin:0 0 16px}.llm-sequence .seq-label{color:#91a8c6;text-transform:uppercase;font-size:11px;letter-spacing:.08em;margin:0}
.seq-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.seq-modes{display:flex;gap:6px}.seq-modes button{font:600 12px var(--sans);background:#1c2940;border:1px solid #30435e;border-radius:8px;padding:10px 13px;color:#b8c9e0;cursor:pointer}
.seq-modes button[aria-pressed=true]{background:#55d9bf;color:#082821;border-color:#55d9bf}.seq-modes button[data-seq-mode=blocked][aria-pressed=true]{background:#ff9e9b;color:#38151a;border-color:#ff9e9b}
.llm-sequence .seq-intro{font-size:13px;color:#a4b2c9;margin:16px 0 22px}
.seq-scroll{overflow-x:auto;max-width:100%;border:1px solid #293b54;border-radius:10px}.seq-canvas{min-width:790px;padding:18px 0 8px;background:#111d30}
.seq-actors{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));text-align:center}.seq-actors strong{margin-inline:8px;padding:11px 5px;border:1px solid #344258;border-radius:8px;font-size:12px;background:#17263c;color:#d9e5f7}
.seq-actors strong:nth-child(1){color:#75b8ff}.seq-actors strong:nth-child(2){color:#55d9bf}.seq-actors strong:nth-child(3){color:#c3a3ff}.seq-actors strong:nth-child(4){color:#55d9bf}.seq-actors strong:nth-child(5){color:#ffc17d}
.seq-lifelines{margin-top:8px;background-image:linear-gradient(to right,transparent calc(10% - .5px),#31435b calc(10% - .5px),#31435b calc(10% + .5px),transparent calc(10% + .5px),transparent calc(30% - .5px),#31435b calc(30% - .5px),#31435b calc(30% + .5px),transparent calc(30% + .5px),transparent calc(50% - .5px),#31435b calc(50% - .5px),#31435b calc(50% + .5px),transparent calc(50% + .5px),transparent calc(70% - .5px),#31435b calc(70% - .5px),#31435b calc(70% + .5px),transparent calc(70% + .5px),transparent calc(90% - .5px),#31435b calc(90% - .5px),#31435b calc(90% + .5px),transparent calc(90% + .5px))}
.seq-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));min-height:72px;align-items:center}
.seq-message{font:12px/1.35 var(--sans);color:#9bcaff;display:flex;align-items:center;justify-content:center;position:relative;gap:7px;padding:0 2px 10px;border:0;border-bottom:2px solid currentColor;background:transparent;cursor:pointer;min-height:48px;text-align:center}
.seq-message span{background:#111d30}.seq-message .seq-number{font-size:10px;font-weight:700;padding:2px 5px;background:#233b58;color:#bedbff;border-radius:4px;flex-shrink:0}
.seq-message:hover,.seq-message[aria-current=step]{color:#55d9bf}.seq-message[aria-current=step] .seq-number{background:#55d9bf;color:#082821}
.seq-return{border-bottom-style:dashed;color:#c3a3ff}.seq-right:after,.seq-left:after{content:'';position:absolute;bottom:-5px;border-top:4px solid transparent;border-bottom:4px solid transparent}.seq-right:after{right:-2px;border-left:7px solid currentColor}.seq-left:after{left:-2px;border-right:7px solid currentColor}
.seq-edge-0-1{grid-column:1/3;margin-inline:25%}.seq-edge-1-2{grid-column:2/4;margin-inline:25%}.seq-edge-1-3{grid-column:2/5;margin-inline:calc(50% / 3)}.seq-edge-1-4{grid-column:2/6;margin-inline:12.5%}
.seq-policy-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));padding:6px 0}.seq-policy-row span{grid-column:2;font-size:11px;padding:8px;color:#a3ead7;background:#142f31;border:1px solid #2e635b;border-radius:5px;text-align:center}
.seq-risk{background:#41282880;border-block:1px solid #7d4752;margin:8px 0}.llm-sequence .seq-risk>p{font-size:11px;color:#ffc1be;text-align:center;margin:8px 0 0}.seq-risk .seq-message{color:#ff9e9b}.seq-risk .seq-message span{background:#35252d}
.seq-branch{border-block:1px dashed #365b57;margin-top:12px}.llm-sequence .seq-branch-title{color:#7fe1bb;font-size:11px;font-weight:600;margin:10px 16px 0}.seq-blocked{border-color:#7d4752;background:#37232b55}.seq-blocked .seq-branch-title,.seq-blocked .seq-message{color:#ffada9}
.llm-sequence .seq-scroll-hint{font-size:11px;color:#91a8c6;margin:10px 0 0}.seq-inspector{padding:20px 0 0;margin-top:18px;border-top:1px solid #293b54}.seq-inspector p{font-size:13px;color:#bac9de}.seq-inspector pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#08111f;border:1px solid #293b54;color:#a0e4cb;font:12px/1.7 var(--mono);padding:16px;border-radius:8px;margin:14px 0 0}.seq-inspector code{background:transparent;color:inherit;font:inherit;padding:0}
.llm-sequence button:focus-visible{outline:2px solid #75b8ff;outline-offset:4px}
@media(max-width:600px){.llm-sequence{padding:14px}.seq-heading{display:block}.seq-modes{margin-top:18px}.llm-sequence h2{font-size:21px}}
`;
