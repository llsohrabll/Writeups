// Self-contained so the Worker can serve this function with its lesson data as one script.
export function initOAuthPlayer(LESSONS) {
  const root = document.querySelector('[data-oauth-player]');
  if (!root || root.dataset.ready) return;
  const $ = id => root.querySelector('#oauth-' + id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = {
    browser: '<circle cx="0" cy="-2" r="10"/><path d="M-4-3v1m8-1v1M-4 2q4 5 8 0M-13 14q13-8 26 0"/>',
    client: '<rect x="-12" y="-10" width="24" height="20" rx="4"/><path d="M-12-3h24M-7-6h1m3 0h1M-4 1l-3 3 3 3M4 1l3 3-3 3"/>',
    auth: '<rect x="-10" y="-2" width="20" height="15" rx="4"/><path d="M-6-2v-4a6 6 0 0 1 12 0v4M0 4v4M15-7h4m-2-2v4"/>',
    api: '<rect x="-10" y="-12" width="20" height="26" rx="4"/><circle cx="0" cy="-4" r="3"/><path d="M-5 6q5-5 10 0M-13-5h3m-3 7h3m-3 7h3"/>',
    attacker: '<path d="M-12 0l7-12h10l7 12zM-14 1h28M-8 5v4l8 4 8-4V5M-6 6h3m6 0h3"/>',
  };
  const actors = {
    browser: { name: 'Alice’s browser', sub: 'The person giving access' },
    client: { name: 'Atlas app', sub: 'The app asking for access' },
    auth: { name: 'Identity provider', sub: 'id.test · authorization server' },
    api: { name: 'Contacts API', sub: 'api.test · resource server' },
    attacker: { name: 'The attacker', sub: 'evil.test · outside the trust' },
  };
  let current = LESSONS[0], index = 0, playing = false, timer, layout = 'map';
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
  function updatePlay() {
    $('play').innerHTML = playing ? '<span aria-hidden="true">Ⅱ</span> Pause' : '<span aria-hidden="true">▶</span> Play flow';
    $('play').setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
    root.classList.toggle('is-playing', playing);
  }
  function stop() { playing = false; clearTimeout(timer); updatePlay(); }
  function lastIndex() { return $('secure').checked && current.type === 'attack' ? current.blockAt : current.steps.length - 1; }
  function stepData() {
    const blocked = $('secure').checked && current.type === 'attack' && index >= current.blockAt;
    return { ...current.steps[index], ...(blocked ? current.blocked : {}), blocked };
  }
  function routePath(from, to, compact) {
    const a = actors[from], b = actors[to];
    if (from === to) {
      const side = compact ? -1 : 1;
      return `M${a.x + 70 * side},${a.y} C${a.x + 125 * side},${a.y - 65} ${a.x + 125 * side},${a.y + 65} ${a.x + 70 * side},${a.y + 20}`;
    }
    if (a.y === b.y) {
      if (Math.abs(a.x - b.x) > 400) return `M${a.x},${a.y - 42} C${a.x},-12 ${b.x},-12 ${b.x},${b.y - 42}`;
      const direction = b.x > a.x ? 1 : -1;
      return `M${a.x + 78 * direction},${a.y} L${b.x - 78 * direction},${b.y}`;
    }
    if (a.x === b.x) {
      const direction = b.y > a.y ? 1 : -1;
      return `M${a.x},${a.y + 43 * direction} L${b.x},${b.y - 43 * direction}`;
    }
    const dy = b.y > a.y ? 1 : -1;
    return `M${a.x},${a.y + 43 * dy} C${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y - 43 * dy}`;
  }
  function renderDiagram(data, animate = true) {
    const svg = $('diagram'), compact = root.querySelector('.oauth-flow').clientWidth < 600;
    const color = data.blocked ? 'var(--oauth-good)' : data.channel === 'attack' ? 'var(--oauth-attack)' : data.channel === 'back' ? 'var(--oauth-back)' : 'var(--oauth-front)';
    const coords = compact
      ? { browser: [100, 95], client: [380, 95], auth: [380, 330], api: [380, 550], attacker: [100, 550] }
      : { browser: [100, 100], client: [390, 100], auth: [680, 100], api: [680, 340], attacker: [100, 340] };
    for (const [id, [x, y]] of Object.entries(coords)) Object.assign(actors[id], { x, y });
    svg.setAttribute('viewBox', compact ? '0 0 480 660' : '0 0 820 435');
    const d = routePath(data.from, data.to, compact);
    let html = `<title id="oauth-diagram-title">${esc(current.title)}</title><desc id="oauth-diagram-desc">${esc(`${actors[data.from].name} to ${actors[data.to].name}: ${data.title}. ${data.detail}`)}</desc>`;
    html += `<defs><marker id="oauth-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="${color}"/></marker></defs>`;
    html += compact
      ? '<rect class="oauth-boundary" x="287" y="260" width="186" height="350" rx="17"/><text class="oauth-boundary-label" x="380" y="635" text-anchor="middle">PROVIDER DOMAIN</text>'
      : '<rect class="oauth-boundary" x="571" y="26" width="218" height="372" rx="17"/><text class="oauth-boundary-label" x="680" y="420" text-anchor="middle">PROVIDER TRUST DOMAIN</text>';
    html += `<text class="oauth-actor-label" x="100" y="185" text-anchor="middle">BROWSER CONTEXT</text><text class="oauth-actor-label" x="${compact ? 380 : 390}" y="185" text-anchor="middle">CLIENT BACKEND</text>`;
    for (const [from, to] of [['browser', 'client'], ['client', 'auth'], ['browser', 'auth'], ['auth', 'api'], ['client', 'api'], ['attacker', 'browser'], ['attacker', 'api']]) {
      html += `<path d="${routePath(from, to, compact)}" class="oauth-base-path"/>`;
    }
    if (!compact && !(actors[data.from].y === 340 && actors[data.to].y === 340)) {
      html += `<g transform="translate(390,333)"><rect class="oauth-ledger" x="-110" y="-36" width="220" height="75" rx="8"/><text class="oauth-actor-label" text-anchor="middle" y="-15">${data.blocked ? 'TRUST CHECK ENFORCED' : 'INSIDE THIS MESSAGE'}</text><text class="oauth-ledger-value" text-anchor="middle" y="7">${esc(data.blocked ? 'Request rejected' : (data.tokens || []).join(' + ') || 'Protocol message')}</text><text class="oauth-ledger-note" text-anchor="middle" y="26">${data.blocked ? 'No token or session is issued' : 'Step ' + (index + 1) + ' / ' + current.steps.length}</text></g>`;
    }
    html += `<path id="oauth-current-path" d="${d}" class="oauth-active-path" stroke="${color}" marker-end="url(#oauth-arrow)" ${data.blocked ? 'stroke-dasharray="5 5"' : ''}/>`;
    for (const [id, actor] of Object.entries(actors)) {
      const active = id === data.from || id === data.to;
      const sub = id === 'api' && current.id === 'registration' ? 'Internal service (example)' : id === 'api' && current.id === 'reference' ? 'Request-object host' : actor.sub;
      html += `<g class="oauth-actor${active ? ' is-active' : ''}${id === 'attacker' && current.type !== 'attack' ? ' is-dormant' : ''}${data.blocked && id === data.to ? ' is-blocked' : ''}" data-actor="${id}" transform="translate(${actor.x},${actor.y})">${active ? `<rect class="oauth-halo" x="-81" y="-47" width="162" height="94" rx="19" stroke="${color}"/>` : ''}<rect class="oauth-actor-body" x="-77" y="-43" width="154" height="86" rx="16"/><g class="oauth-actor-icon" transform="translate(0,-20)">${icons[id]}</g><text class="oauth-actor-name" text-anchor="middle" y="11">${esc(actor.name)}</text><text class="oauth-actor-sub" text-anchor="middle" y="29">${esc(sub)}</text></g>`;
    }
    html += `<g id="oauth-packet-label"></g><circle id="oauth-packet" r="6" fill="${color}" stroke="var(--white)" stroke-width="2"/>`;
    svg.innerHTML = html;
    const path = $('current-path'), length = path.getTotalLength(), mid = path.getPointAtLength(length * .5), packet = $('packet');
    const label = data.blocked ? '× REQUEST BLOCKED' : data.packet;
    const width = Math.min(220, Math.max(88, label.length * 6.3 + 22));
    let x = Math.max(width / 2 + 10, Math.min((compact ? 470 : 810) - width / 2, mid.x)), y = mid.y + 22;
    if (data.from === data.to) { x = compact ? 240 : 390; y = 231; }
    y = Math.min(y, compact ? 620 : 397);
    $('packet-label').innerHTML = `<g transform="translate(${x},${y})"><rect class="oauth-packet-bg" x="${-width / 2}" y="-12" width="${width}" height="25" rx="5" stroke="${color}"/><text class="oauth-packet-text" fill="${color}" y="4" text-anchor="middle">${esc(label)}</text></g>`;
    if (reducedMotion || data.blocked || !animate) {
      const point = path.getPointAtLength(length * (data.blocked ? .73 : .5));
      packet.setAttribute('cx', point.x); packet.setAttribute('cy', point.y);
    } else {
      const motion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
      motion.setAttribute('path', d); motion.setAttribute('dur', `${1.9 / Number($('speed').value)}s`);
      motion.setAttribute('repeatCount', playing ? 'indefinite' : '1'); motion.setAttribute('fill', 'freeze');
      packet.appendChild(motion); motion.beginElement?.();
    }
  }
  function renderSequence() {
    const ids = Object.keys(actors);
    $('sequence').innerHTML = '<div class="oauth-sequence-head">' + ['Browser', 'Client', 'Auth server', 'Resource', 'Attacker'].map(name => `<span>${name}</span>`).join('') + '</div>' + current.steps.map((step, i) => {
      const from = ids.indexOf(step.from) * 200 + 100, to = ids.indexOf(step.to) * 200 + 100;
      const blocked = $('secure').checked && current.type === 'attack' && i >= current.blockAt;
      const line = from === to ? `<path d="M${from} 4h60v15h-60"/>` : `<path d="M${from} 12H${to}"/>`;
      const end = from === to ? `<path d="M${to + 9} 14l-9 5 9 5"/>` : `<path d="M${to + (from < to ? -9 : 9)} 7l${from < to ? 9 : -9} 5 ${from < to ? -9 : 9} 5"/>`;
      return `<button type="button" class="oauth-seq-row${i === index ? ' is-active' : ''}${blocked ? ' is-blocked' : step.channel === 'attack' ? ' is-attack' : step.channel === 'back' ? ' is-back' : ''}" data-step="${i}"${i > lastIndex() ? ' disabled' : ''}${i === index ? ' aria-current="step"' : ''}><span class="oauth-seq-title">${String(i + 1).padStart(2, '0')} · ${esc(blocked && i === current.blockAt ? 'Request blocked' : step.title)}</span><svg class="oauth-seq-line" viewBox="0 0 1000 28" aria-hidden="true">${line}${end}</svg></button>`;
    }).join('');
    if (layout === 'sequence') {
      const stage = root.querySelector('.oauth-stage'), row = $('sequence').querySelector('.is-active');
      const rowRect = row.getBoundingClientRect(), stageRect = stage.getBoundingClientRect();
      if (rowRect.top < stageRect.top + 50 || rowRect.bottom > stageRect.bottom) stage.scrollTop += rowRect.top - stageRect.top - 55;
    }
  }
  function renderStep(animate = true) {
    index = Math.max(0, Math.min(index, lastIndex()));
    const data = stepData();
    $('step-route').textContent = `${actors[data.from].name} → ${actors[data.to].name}`;
    $('step-title').textContent = data.title; $('step-detail').textContent = data.detail;
    $('step-note').textContent = data.blocked ? current.invariant : data.note;
    $('step-note').hidden = !$('step-note').textContent;
    $('message-number').textContent = String(index + 1).padStart(2, '0');
    $('http-code').textContent = data.http;
    $('token-tray').innerHTML = (data.blocked ? ['Blocked'] : data.tokens || []).map(token => `<span>${esc(token)}</span>`).join('');
    const names = { front: 'Front channel · through the browser', back: 'Back channel · direct TLS exchange', attack: 'Attacker-controlled / exposed path', local: 'Local validation or state change' };
    $('channel-label').textContent = data.blocked ? 'Trust boundary enforced' : names[data.channel];
    $('channel-label').dataset.channel = data.blocked ? 'good' : data.channel;
    $('scene-state').textContent = data.blocked ? 'Attack stopped' : current.type === 'attack' ? 'Defense ' + ($('secure').checked ? 'on' : 'off') : 'Local simulation';
    $('step-counter').textContent = `${index + 1} / ${current.steps.length}`;
    $('previous').disabled = index === 0; $('next').disabled = index === lastIndex();
    $('scrub').max = lastIndex(); $('scrub').value = index;
    $('timeline').innerHTML = current.steps.map((step, i) => `<button type="button" data-step="${i}" aria-label="Step ${i + 1}: ${esc(step.title)}"${i === index ? ' aria-current="step"' : ''}${i > lastIndex() ? ' disabled' : ''}>${i < index ? '✓' : i + 1}</button>`).join('');
    renderDiagram(data, animate); renderSequence();
    if (index === lastIndex()) { stop(); renderDiagram(data, false); }
  }
  function loadLesson(id, updateHash = true) {
    const lesson = LESSONS.find(item => item.id === id);
    if (!lesson) return;
    stop(); current = lesson; index = 0; $('secure').checked = false;
    showLessonGroup(current.type === 'attack' ? 'attacks' : 'flows');
    for (const button of root.querySelectorAll('[data-lesson]')) button.setAttribute('aria-pressed', String(button.dataset.lesson === id));
    $('lesson-title').textContent = current.title; $('lesson-summary').textContent = current.summary;
    $('context').textContent = current.context; $('mechanism').textContent = current.mechanism; $('takeaway').textContent = current.takeaway;
    $('defense-title').textContent = current.defenseTitle; $('defense-text').textContent = current.defense; $('invariant').textContent = current.invariant;
    $('defense-control').hidden = current.type !== 'attack';
    $('lesson-sources').innerHTML = current.sources.map(([url, label]) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label.replace(/ ↗$/, ''))} ↗</a>`).join('');
    renderStep();
    if (updateHash) history.replaceState(null, '', '#lesson=' + current.id);
  }
  function schedule() {
    clearTimeout(timer);
    if (!playing) return;
    timer = setTimeout(() => { if (index < lastIndex()) { index++; renderStep(); schedule(); } else stop(); }, Math.max(1700, 6200 / Number($('speed').value)));
  }
  function togglePlay() {
    if (playing) { stop(); renderDiagram(stepData(), false); return; }
    if (index >= lastIndex()) index = 0;
    playing = true; updatePlay(); renderStep(); schedule();
  }
  function jump(step) { stop(); index = Number(step); renderStep(); }
  function setLayout(name) {
    layout = name; $('diagram').toggleAttribute('hidden', name !== 'map'); $('sequence').hidden = name !== 'sequence';
    root.querySelector('.oauth-stage').classList.toggle('is-sequence', name === 'sequence');
    for (const mode of ['map', 'sequence']) $(mode + '-mode').setAttribute('aria-pressed', String(name === mode));
    renderStep(false);
  }
  function showTab(name) {
    for (const tab of root.querySelectorAll('[data-tab]')) {
      const active = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      $('inspect-' + tab.dataset.tab).hidden = !active;
    }
  }
  function showLessonGroup(name) {
    for (const button of root.querySelectorAll('[data-lesson-group]')) {
      const active = button.dataset.lessonGroup === name;
      button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
      $('lessons-' + button.dataset.lessonGroup).hidden = !active;
    }
  }
  root.addEventListener('click', event => {
    const category = event.target.closest('[data-lesson-group]'); if (category) showLessonGroup(category.dataset.lessonGroup);
    const lesson = event.target.closest('[data-lesson]'); if (lesson) loadLesson(lesson.dataset.lesson);
    const tab = event.target.closest('[data-tab]'); if (tab) showTab(tab.dataset.tab);
    const step = event.target.closest('[data-step]'); if (step && !step.disabled) jump(step.dataset.step);
  });
  $('play').addEventListener('click', togglePlay);
  $('next').addEventListener('click', () => jump(index + 1)); $('previous').addEventListener('click', () => jump(index - 1));
  $('restart').addEventListener('click', () => jump(0)); $('scrub').addEventListener('input', event => jump(event.target.value));
  $('speed').addEventListener('change', () => { renderDiagram(stepData()); if (playing) schedule(); });
  $('map-mode').addEventListener('click', () => setLayout('map')); $('sequence-mode').addEventListener('click', () => setLayout('sequence'));
  $('secure').addEventListener('change', () => { stop(); index = 0; renderStep(); });
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('http-code').textContent); $('copy').textContent = 'Copied'; }
    catch {
      const selection = getSelection(), range = document.createRange(); range.selectNodeContents($('http-code')); selection.removeAllRanges(); selection.addRange(range);
      $('copy').textContent = 'Selected · Ctrl+C';
    }
    setTimeout(() => { $('copy').textContent = 'Copy'; }, 2200);
  });
  root.addEventListener('keydown', event => {
    if (event.target.matches('input,textarea,select') || event.ctrlKey || event.metaKey || event.altKey) return;
    const category = event.target.closest('[data-lesson-group]');
    if (category && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const name = event.key === 'Home' ? 'flows' : event.key === 'End' ? 'attacks' : category.dataset.lessonGroup === 'flows' ? 'attacks' : 'flows';
      showLessonGroup(name); $('category-' + name).focus(); return;
    }
    const tab = event.target.closest('[data-tab]');
    if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const tabs = [...root.querySelectorAll('[data-tab]')], position = tabs.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (position + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      showTab(tabs[next].dataset.tab); tabs[next].focus(); return;
    }
    if (event.key === ' ' && !event.target.closest('button,a,summary')) { event.preventDefault(); togglePlay(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); jump(index + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); jump(index - 1); }
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); jump(0); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); renderDiagram(stepData(), false); } });
  window.addEventListener('hashchange', () => { if (location.hash.startsWith('#lesson=')) loadLesson(location.hash.slice(8), false); });
  motionPreference.addEventListener('change', event => { reducedMotion = event.matches; renderDiagram(stepData(), false); });
  let resizeTimer;
  new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => renderDiagram(stepData(), false), 100); }).observe(root.querySelector('.oauth-flow'));
  root.dataset.ready = 'true';
  loadLesson(LESSONS.some(item => '#lesson=' + item.id === location.hash) ? location.hash.slice(8) : 'code', false);
}
