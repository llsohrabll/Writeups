// The build prepends the trusted icon paths shared with the server-rendered page.
const svg = name => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[name] || ''}</svg>`;
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const labels = { quest: 'Quest', meet: 'Meet', shop: 'Shop', little: 'Little thing' };

async function api(path, method = 'GET', data) {
  let response;
  try {
    response = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: data ? { 'Content-Type': 'application/json' } : {}, ...(data ? { body: JSON.stringify(data) } : {}) });
  } catch { throw new Error('The connection is taking too long. Your saved plans are safe. Please try again.'); }
  const value = await response.json().catch(() => ({}));
  if (response.status === 401 && path.startsWith('/api/')) { location.assign('/'); throw new Error('Please unlock your space again.'); }
  if (!response.ok) throw new Error(value.error || 'Something went wrong. Please try again.');
  return value;
}
const loginForm = document.querySelector('#login-form');
loginForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const button = loginForm.querySelector('button');
  const error = document.querySelector('#login-error');
  error.textContent = '';
  button.disabled = true;
  try { await api('/auth/login', 'POST', { password: loginForm.elements.password.value }); location.assign('/'); }
  catch (problem) { error.textContent = problem.message; button.disabled = false; }
});

if (document.body.dataset.authenticated === 'true') {
  let items = [];
  let category = 'all';
  let status = 'open';
  let editing = null;
  let newId = null;
  let loading = null;
  let toastTimer;
  const board = document.querySelector('#items');
  const dialog = document.querySelector('#plan-dialog');
  const form = document.querySelector('#plan-form');
  const boardError = document.querySelector('#board-error');
  const formError = document.querySelector('#plan-error');
  const toast = document.querySelector('#toast');
  const toastButton = toast.querySelector('button');

  function notify(message, undo) {
    clearTimeout(toastTimer);
    toast.querySelector('span').textContent = message;
    toastButton.hidden = !undo;
    toastButton.onclick = undo || null;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, undo ? 10000 : 3500);
  }
  const matchesStatus = item => status === 'all' || (status === 'done' ? item.done : !item.done);
  function dateLabel(item) {
    if (!item.date) return '';
    const date = new Date(item.date + 'T12:00:00');
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) }).format(date) + (item.time ? ' · ' + item.time : '');
  }
  function render() {
    const available = items.filter(matchesStatus);
    const selected = available.filter(item => category === 'all' || item.type === category).sort((a, b) => Number(a.done) - Number(b.done) || (a.date || '9999').localeCompare(b.date || '9999') || b.createdAt - a.createdAt);
    for (const count of document.querySelectorAll('[data-count]')) count.textContent = count.dataset.count === 'all' ? available.length : available.filter(item => item.type === count.dataset.count).length;
    const openCount = items.filter(item => !item.done).length;
    const doneCount = items.filter(item => item.done).length;
    document.querySelector('#plan-summary').textContent = status === 'done' ? `${doneCount} ${doneCount === 1 ? 'memory made' : 'memories made'} together.` : openCount ? `${openCount} little ${openCount === 1 ? 'plan' : 'plans'} to look forward to.` : 'A place for all our little plans.';
    if (!items.length && category === 'all' && status !== 'done') {
      board.innerHTML = [['quest', 'A new adventure', 'Somewhere new. Something we’ve never tried.'], ['meet', 'Time together', 'A coffee, a movie, a long walk.'], ['shop', 'A little shopping', 'The things and places on our wishlist.']].map(([type, title, copy]) => `<button class="starter" data-starter="${type}"><span class="type-icon type-${type}">${svg(type)}</span><h3>${title}</h3><p>${copy}</p><span class="add-corner">${svg('plus')}</span></button>`).join('');
      return;
    }
    if (!selected.length) {
      board.innerHTML = `<div class="empty-message"><h3>${status === 'done' ? 'The good memories are ahead.' : 'A little room for something lovely.'}</h3><p>${status === 'done' ? 'The plans we finish together will live here.' : 'Our next little plan can start right here.'}</p>${status !== 'done' ? '<button class="primary" data-add>' + svg('plus') + ' Add a plan</button>' : ''}</div>`;
      return;
    }
    board.innerHTML = selected.map(item => `<article class="plan${item.done ? ' is-done' : ''}" data-id="${escape(item.id)}" data-type="${escape(item.type)}"><div class="plan-top"><span class="type-label">${svg(item.type)} ${labels[item.type]}</span><button class="complete" data-action="complete" aria-label="${item.done ? 'Mark still to do' : 'Mark done'}: ${escape(item.title)}" aria-pressed="${item.done}">${item.done ? svg('check') : ''}</button></div><h3>${escape(item.title)}</h3>${item.notes ? `<p class="plan-notes">${escape(item.notes)}</p>` : ''}${item.date ? `<p class="plan-meta">${svg('meet')}<time datetime="${escape(item.date + (item.time ? 'T' + item.time : ''))}">${escape(dateLabel(item))}</time></p>` : ''}${item.place ? `<p class="plan-meta">${svg('pin')} ${escape(item.place)}</p>` : ''}<div class="plan-bottom"><span class="done-label">${item.done ? 'Done together ♡' : ''}</span><div class="card-actions"><button class="icon-button" data-action="edit" aria-label="Edit ${escape(item.title)}" title="Edit plan">${svg('edit')}</button><button class="icon-button" data-action="remove" aria-label="Remove ${escape(item.title)}" title="Remove plan">${svg('bin')}</button></div></div></article>`).join('');
  }
  async function refresh() {
    if (loading) return loading;
    loading = (async () => {
      try { const value = await api('/api/items/list', 'POST', {}); items = value.items; boardError.textContent = ''; render(); }
      catch (error) { boardError.textContent = error.message; if (!items.length) board.innerHTML = '<div class="empty-message"><p>We couldn’t gather your plans.</p><button class="text-button" data-retry>Try again</button></div>'; }
      finally { loading = null; }
    })();
    return loading;
  }
  async function openForm(type = 'quest', item = null) {
    editing = item;
    newId = item ? null : crypto.randomUUID();
    form.reset();
    formError.textContent = '';
    document.querySelector('#dialog-title').textContent = item ? 'A little change of plan.' : 'Make a little plan.';
    for (const key of ['title', 'type', 'date', 'time', 'place', 'notes']) form.elements[key].value = item ? item[key] || '' : key === 'type' ? type : '';
    dialog.showModal();
    form.elements.title.focus();
  }
  document.addEventListener('click', event => {
    const add = event.target.closest('[data-add], [data-starter]');
    if (add) openForm(add.dataset.starter || (category === 'all' ? 'quest' : category));
    if (event.target.closest('[data-close]')) dialog.close();
    if (event.target.closest('[data-retry]')) refresh();
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    formError.textContent = '';
    const button = form.querySelector('[type=submit]');
    const data = Object.fromEntries(new FormData(form));
    if (editing) data.revision = editing.revision;
    else data.id = newId;
    button.disabled = true;
    try {
      const { item } = await api(editing ? '/api/items/' + editing.id : '/api/items', editing ? 'PATCH' : 'POST', data);
      items = items.filter(previous => previous.id !== item.id).concat(item);
      if (!editing && status === 'done') { status = 'open'; document.querySelector('#status-filter').value = 'open'; }
      if (category !== 'all' && category !== item.type) {
        category = item.type;
        for (const tab of document.querySelectorAll('[data-filter]')) tab.setAttribute('aria-pressed', String(tab.dataset.filter === category));
      }
      render();
      dialog.close();
      notify(editing ? 'Our plan is updated.' : 'A little plan to look forward to.');
    } catch (error) { formError.textContent = error.message; if (error.message.includes('another device') || error.message.includes('already saved')) await refresh(); }
    finally { button.disabled = false; }
  });
  for (const filter of document.querySelectorAll('[data-filter]')) filter.addEventListener('click', () => {
    category = filter.dataset.filter;
    for (const button of document.querySelectorAll('[data-filter]')) button.setAttribute('aria-pressed', String(button === filter));
    render();
  });
  document.querySelector('#status-filter').addEventListener('change', event => { status = event.target.value; render(); });
  board.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const item = items.find(item => item.id === button.closest('[data-id]').dataset.id);
    if (!item) return;
    if (button.dataset.action === 'edit') { await refresh(); return openForm(item.type, items.find(latest => latest.id === item.id) || item); }
    button.disabled = true;
    try {
      if (button.dataset.action === 'complete') {
        const { item: updated } = await api('/api/items/' + item.id, 'PATCH', { done: !item.done });
        items = items.map(previous => previous.id === item.id ? updated : previous);
        render();
        notify(updated.done ? 'Another memory made together. ♡' : 'Back on our little list.');
      } else {
        await api('/api/items/' + item.id, 'DELETE');
        items = items.filter(previous => previous.id !== item.id);
        render();
        notify('Plan removed.', async () => {
          toastButton.disabled = true;
          try { const { item: restored } = await api('/api/items/' + item.id + '/restore', 'POST'); items.push(restored); render(); notify('Plan restored.'); }
          catch (error) { notify(error.message); }
          finally { toastButton.disabled = false; }
        });
      }
    } catch (error) { boardError.textContent = error.message; button.disabled = false; }
  });
  document.querySelector('#download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), items }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'our-little-plans-' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.querySelector('#logout').addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    try { await api('/auth/logout', 'POST'); location.assign('/'); }
    catch (error) { boardError.textContent = error.message; event.target.closest('button').disabled = false; }
  });
  window.addEventListener('focus', () => { if (!dialog.open) refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !dialog.open) refresh(); });
  setInterval(() => { if (!document.hidden && !dialog.open) refresh(); }, 45000);
  refresh();
}
