// Self-contained so the Worker can serve this function with its lesson data as one script.
export function initLLMPlayer(LESSONS) {
  const root = document.querySelector('[data-llm-player]');
  if (!root || root.dataset.ready) return;
  const $ = id => root.querySelector('#llm-' + id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = {
    browser: '<circle cx="0" cy="-2" r="10"/><path d="M-4-3v1m8-1v1M-4 2q4 5 8 0M-13 14q13-8 26 0"/>',
    client: '<rect x="-12" y="-10" width="24" height="20" rx="4"/><path d="M-12-3h24M-7-6h1m3 0h1M-4 1l-3 3 3 3M4 1l3 3-3 3"/>',
    auth: '<rect x="-12" y="-9" width="24" height="21" rx="7"/><path d="M0-9v-5m-3 0h6M-6-1v2m12-2v2M-5 6q5 3 10 0M-16-2v6m32-6v6"/>',
    api: '<path d="M-3-12h6l1 4 4 2 4-1 3 5-3 3v4l3 3-3 5-4-1-4 2-1 4h-6l-1-4-4-2-4 1-3-5 3-3V1l-3-3 3-5 4 1 4-2z" transform="scale(.75)"/><circle r="4"/>',
    source: '<path d="M-9-12h12l6 6v18H-9zM3-12v7h6M-5 0h10M-5 5h10M-5 10h5"/>',
    attacker: '<path d="M-12 0l7-12h10l7 12zM-14 1h28M-8 5v4l8 4 8-4V5M-6 6h3m6 0h3"/>',
  };
  const actors = {
    browser: { name: 'Alice', sub: 'The person asking for help' },
    client: { name: 'Bloom app', sub: 'Builds context, checks actions' },
    auth: { name: 'The language model', sub: 'Generates text & proposals' },
    api: { name: 'Tools & APIs', sub: 'Enforce their own permissions' },
    source: { name: 'External content', sub: 'Reviews, email, documents' },
    attacker: { name: 'The attacker', sub: 'Controls an input or a source' },
  };
  const actorDefaults = JSON.parse(JSON.stringify(actors));
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
      const side = compact && a.x > 240 ? -1 : 1;
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
    const svg = $('diagram'), compact = root.querySelector('.llm-flow').clientWidth < 600;
    const color = data.blocked ? 'var(--llm-good)' : data.channel === 'attack' ? 'var(--llm-attack)' : data.channel === 'back' ? 'var(--llm-back)' : 'var(--llm-front)';
    const coords = compact
      ? { browser: [100, 95], client: [380, 95], auth: [380, 315], api: [380, 550], source: [100, 315], attacker: [100, 550] }
      : { browser: [100, 100], client: [390, 100], auth: [680, 100], api: [680, 340], source: [390, 340], attacker: [100, 340] };
    for (const [id, [x, y]] of Object.entries(coords)) Object.assign(actors[id], { x, y });
    svg.setAttribute('viewBox', compact ? '0 0 480 660' : '0 0 820 435');
    const d = routePath(data.from, data.to, compact);
    let html = `<title id="llm-diagram-title">${esc(current.title)}</title><desc id="llm-diagram-desc">${esc(`${actors[data.from].name} to ${actors[data.to].name}: ${data.title}. ${data.detail}`)}</desc>`;
    html += `<defs><marker id="llm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="${color}"/></marker></defs>`;
    html += compact
      ? '<rect class="llm-boundary" x="287" y="480" width="186" height="126" rx="17"/><text class="llm-boundary-label" x="380" y="635" text-anchor="middle">PERMISSION CHECKS</text>'
      : '<rect class="llm-boundary" x="587" y="274" width="186" height="133" rx="17"/><text class="llm-boundary-label" x="680" y="427" text-anchor="middle">PERMISSION CHECKS</text>';
    html += `<text class="llm-actor-label" x="100" y="185" text-anchor="middle">USER INTENT</text><text class="llm-actor-label" x="${compact ? 380 : 390}" y="185" text-anchor="middle">APPLICATION CONTROLS</text>`;
    for (const [from, to] of [['browser', 'client'], ['client', 'auth'], ['client', 'api'], ['client', 'source'], ['attacker', 'source'], ['source', 'auth']]) {
      html += `<path d="${routePath(from, to, compact)}" class="llm-base-path"/>`;
    }
    html += `<path id="llm-current-path" d="${d}" class="llm-active-path" stroke="${color}" marker-end="url(#llm-arrow)" ${data.blocked ? 'stroke-dasharray="5 5"' : ''}/>`;
    for (const [id, actor] of Object.entries(actors)) {
      const active = id === data.from || id === data.to;
      const sub = actor.sub;
      html += `<g class="llm-actor${active ? ' is-active' : ''}${id === 'attacker' && current.type !== 'attack' ? ' is-dormant' : ''}${data.blocked && id === data.to ? ' is-blocked' : ''}" data-actor="${id}" transform="translate(${actor.x},${actor.y})">${active ? `<rect class="llm-halo" x="-81" y="-47" width="162" height="94" rx="19" stroke="${color}"/>` : ''}<rect class="llm-actor-body" x="-77" y="-43" width="154" height="86" rx="16"/><g class="llm-actor-icon" transform="translate(0,-20)">${icons[id]}</g><text class="llm-actor-name" text-anchor="middle" y="11">${esc(actor.name)}</text><text class="llm-actor-sub" text-anchor="middle" y="29">${esc(sub)}</text></g>`;
    }
    html += `<g id="llm-packet-label"></g><circle id="llm-packet" r="6" fill="${color}" stroke="var(--white)" stroke-width="2"/>`;
    svg.innerHTML = html;
    const path = $('current-path'), length = path.getTotalLength(), mid = path.getPointAtLength(length * .5), packet = $('packet');
    const label = data.blocked ? '× REQUEST BLOCKED' : data.packet;
    const width = Math.min(220, Math.max(88, label.length * 6.3 + 22));
    let x = Math.max(width / 2 + 10, Math.min((compact ? 470 : 810) - width / 2, mid.x)), y = mid.y + 22;
    if (data.from === data.to) y = actors[data.from].y + 70;
    y = Math.min(y, compact ? 620 : 397);
    $('packet-label').innerHTML = `<g transform="translate(${x},${y})"><rect class="llm-packet-bg" x="${-width / 2}" y="-12" width="${width}" height="25" rx="5" stroke="${color}"/><text class="llm-packet-text" fill="${color}" y="4" text-anchor="middle">${esc(label)}</text></g>`;
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
    const labels = current.group === 'SCANNERS IN THE SPOTLIGHT' ? ['Team', 'Runtime', 'Planner', 'Target API', 'Website', 'Attacker'] : ['User', 'App', 'LLM', 'Tools', 'Sources', 'Attacker'];
    $('sequence').innerHTML = '<div class="llm-sequence-head">' + labels.map(name => `<span>${name}</span>`).join('') + '</div>' + current.steps.map((step, i) => {
      const unit = 1000 / ids.length, from = ids.indexOf(step.from) * unit + unit / 2, to = ids.indexOf(step.to) * unit + unit / 2;
      const blocked = $('secure').checked && current.type === 'attack' && i >= current.blockAt;
      const line = from === to ? `<path d="M${from} 4h60v15h-60"/>` : `<path d="M${from} 12H${to}"/>`;
      const end = from === to ? `<path d="M${to + 9} 14l-9 5 9 5"/>` : `<path d="M${to + (from < to ? -9 : 9)} 7l${from < to ? 9 : -9} 5 ${from < to ? -9 : 9} 5"/>`;
      return `<button type="button" class="llm-seq-row${i === index ? ' is-active' : ''}${blocked ? ' is-blocked' : step.channel === 'attack' ? ' is-attack' : step.channel === 'back' ? ' is-back' : ''}" data-step="${i}"${i > lastIndex() ? ' disabled' : ''}${i === index ? ' aria-current="step"' : ''}><span class="llm-seq-title">${String(i + 1).padStart(2, '0')} · ${esc(blocked && i === current.blockAt ? 'Request blocked' : step.title)}</span><svg class="llm-seq-line" viewBox="0 0 1000 28" aria-hidden="true">${line}${end}</svg></button>`;
    }).join('');
    if (layout === 'sequence') {
      const stage = root.querySelector('.llm-stage'), row = $('sequence').querySelector('.is-active');
      const rowRect = row.getBoundingClientRect(), stageRect = stage.getBoundingClientRect();
      const zoom = stageRect.width / stage.offsetWidth || 1;
      if (rowRect.top < stageRect.top + 50 * zoom || rowRect.bottom > stageRect.bottom) stage.scrollTop += (rowRect.top - stageRect.top) / zoom - 55;
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
    const names = { front: 'Conversation · user and application', back: 'Tool call, context, or data exchange', attack: 'Untrusted input or unsafe effect', local: 'Application decision / model processing' };
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
    Object.entries(actors).forEach(([actorId, actor]) => Object.assign(actor, actorDefaults[actorId], current.actors?.[actorId] || {}));
    showLessonGroup(current.group === 'SCANNERS IN THE SPOTLIGHT' ? 'scanners' : current.type === 'attack' ? 'attacks' : 'flows');
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
    root.querySelector('.llm-stage').classList.toggle('is-sequence', name === 'sequence');
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
      const groups = ['flows', 'attacks', 'scanners'], position = groups.indexOf(category.dataset.lessonGroup);
      const name = event.key === 'Home' ? groups[0] : event.key === 'End' ? groups.at(-1) : groups[(position + (event.key === 'ArrowRight' ? 1 : -1) + groups.length) % groups.length];
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
  new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => renderDiagram(stepData(), false), 100); }).observe(root.querySelector('.llm-flow'));
  root.dataset.ready = 'true';
  loadLesson(LESSONS.some(item => '#lesson=' + item.id === location.hash) ? location.hash.slice(8) : 'chat', false);
}
