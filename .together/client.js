// The build prepends the trusted icon paths shared with the server-rendered page.
const svg = name => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[name] || ''}</svg>`;
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
async function api(path, method = 'GET', data) {
  const binary = data instanceof Blob;
  try {
    const response = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(binary ? 45000 : 15000), headers: data !== undefined ? { 'Content-Type': binary ? data.type : 'application/json' } : {}, ...(data !== undefined ? { body: binary ? data : JSON.stringify(data) } : {}) });
    const value = await response.json().catch(error => { if (error.name === 'AbortError' || error.name === 'TimeoutError') throw error; return {}; });
    if (response.status === 401 && path.startsWith('/api/')) { location.assign('/'); throw new Error('Please unlock your space again.'); }
    if (!response.ok) throw new Error(value.error || 'Something went wrong. Please try again.');
    return value;
  } catch (error) {
    if (['TypeError', 'AbortError', 'TimeoutError'].includes(error.name)) throw new Error('The connection is taking too long. Your saved memories are safe. Please try again.');
    throw error;
  }
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
async function preparePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP photo.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB.');
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('This photo could not be opened. Please choose another.')); image.src = source; });
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [.84, .72, .6, .48]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (blob && blob.size <= 2 * 1024 * 1024) return blob;
    }
    throw new Error('This photo is still too large. Please choose a smaller image.');
  } finally { URL.revokeObjectURL(source); }
}
if (document.body.dataset.authenticated === 'true') {
  let initialItems = [];
  try { initialItems = JSON.parse(document.querySelector('#initial-memories')?.textContent || '[]'); } catch {}
  let items = initialItems, editing = null, newId = null, loading = null, saving = false, toastTimer;
  let photoId = null, photoBlob = null, uploadId = null, previewUrl = null, photoGeneration = 0, preparing = false;
  const board = document.querySelector('#items');
  const dialog = document.querySelector('#plan-dialog');
  const form = document.querySelector('#plan-form');
  const boardError = document.querySelector('#board-error');
  const formError = document.querySelector('#plan-error');
  const toast = document.querySelector('#toast');
  const toastButton = toast.querySelector('button');
  const photoInput = document.querySelector('#memory-photo');
  const photoPreview = document.querySelector('#photo-preview');
  const photoPrompt = document.querySelector('#photo-prompt');
  const photoStatus = document.querySelector('#photo-status');
  const removePhoto = document.querySelector('#remove-photo');
  const submit = form.querySelector('[type=submit]');
  function notify(message, undo) {
    clearTimeout(toastTimer);
    toast.querySelector('span').textContent = message;
    toastButton.hidden = !undo;
    toastButton.onclick = undo || null;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, undo ? 10000 : 3500);
  }
  function dateLabel(item) {
    if (!item.date) return '<span>Just us</span>';
    const date = new Date(item.date + 'T12:00:00');
    const month = new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
    return `<span>${date.getDate()} ${month}</span><small>${date.getFullYear()}</small>${item.time ? `<small class="memory-time">${escape(item.time)}</small>` : ''}`;
  }
  function render() {
    const sorted = [...items].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || '') || b.createdAt - a.createdAt);
    if (!sorted.length) {
      board.innerHTML = `<div class="empty-message"><h3>Our next little memory.</h3><p>A photo, a few words, a moment worth keeping.</p><button class="primary" data-add>${svg('plus')} Add a memory</button></div>`;
      return;
    }
    board.innerHTML = sorted.map(item => `<article class="memory" data-id="${escape(item.id)}"><time class="memory-date"${item.date ? ` datetime="${escape(item.date + (item.time ? 'T' + item.time : ''))}"` : ''}>${dateLabel(item)}</time><div class="memory-card">${item.photoId ? `<img class="memory-photo" src="/api/photos/${escape(item.photoId)}" alt="${escape(item.title)}" loading="lazy" decoding="async">` : `<div class="memory-placeholder">${svg('heart')}<span>A photo of us, soon.</span></div>`}<div class="memory-copy"><div class="memory-title"><h2>${escape(item.title)}</h2><div class="memory-actions"><button class="icon-button" data-action="edit" aria-label="Edit ${escape(item.title)}" title="Edit memory">${svg('edit')}</button><button class="icon-button" data-action="remove" aria-label="Remove ${escape(item.title)}" title="Remove memory">${svg('bin')}</button></div></div>${item.notes ? `<p>${escape(item.notes)}</p>` : ''}</div></div></article>`).join('');
  }
  async function refresh() {
    if (loading) return loading;
    loading = (async () => {
      try { const value = await api('/api/items/list', 'POST', {}); items = value.items; boardError.textContent = ''; render(); }
      catch (error) { boardError.textContent = error.message; if (!items.length) board.innerHTML = '<div class="empty-message"><p>We couldn’t open your memories.</p><button class="text-button" data-retry>Try again</button></div>'; }
      finally { loading = null; }
    })();
    return loading;
  }
  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    photoPreview.removeAttribute('src');
    photoPreview.hidden = true;
    photoPrompt.hidden = false;
    removePhoto.hidden = true;
  }
  function showPhoto(source) { photoPreview.src = source; photoPreview.hidden = false; photoPrompt.hidden = true; removePhoto.hidden = false; }
  function openForm(item = null) {
    if (saving) return;
    photoGeneration++;
    preparing = false;
    submit.disabled = false;
    editing = item;
    newId = item ? null : crypto.randomUUID();
    photoId = item?.photoId || null;
    photoBlob = uploadId = null;
    form.reset();
    formError.textContent = photoStatus.textContent = '';
    clearPreview();
    if (photoId) showPhoto('/api/photos/' + photoId);
    document.querySelector('#dialog-title').textContent = item ? 'A little edit.' : 'A moment to keep.';
    for (const key of ['title', 'date', 'time', 'notes']) form.elements[key].value = item ? item[key] || '' : '';
    dialog.showModal();
  }
  photoInput.addEventListener('change', async () => {
    const file = photoInput.files[0];
    if (!file) return;
    const generation = ++photoGeneration;
    preparing = true;
    submit.disabled = true;
    formError.textContent = '';
    photoStatus.textContent = 'Preparing your photo…';
    try {
      const prepared = await preparePhoto(file);
      if (generation !== photoGeneration) return;
      clearPreview();
      photoBlob = prepared;
      photoId = null;
      uploadId = crypto.randomUUID();
      previewUrl = URL.createObjectURL(prepared);
      showPhoto(previewUrl);
      photoStatus.textContent = 'Photo ready.';
    } catch (error) { if (generation === photoGeneration) { formError.textContent = error.message; photoStatus.textContent = ''; photoInput.value = ''; } }
    finally { if (generation === photoGeneration) { preparing = false; submit.disabled = false; } }
  });
  removePhoto.addEventListener('click', () => {
    photoGeneration++;
    preparing = false;
    photoId = photoBlob = uploadId = null;
    photoInput.value = photoStatus.textContent = '';
    clearPreview();
    submit.disabled = false;
  });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-add]')) openForm();
    if (event.target.closest('[data-close]') && !saving) dialog.close();
    if (event.target.closest('[data-retry]')) refresh();
  });
  dialog.addEventListener('close', () => { photoGeneration++; });
  dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  dialog.addEventListener('click', event => { if (event.target === dialog && !saving) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (preparing || saving) return;
    formError.textContent = '';
    submit.disabled = true;
    const data = Object.fromEntries(['title', 'date', 'time', 'notes'].map(key => [key, form.elements[key].value]));
    if (editing) data.revision = editing.revision;
    else data.id = newId;
    saving = true;
    form.setAttribute('aria-busy', 'true');
    const controls = [...form.querySelectorAll('input, textarea, button')];
    controls.forEach(control => { control.disabled = true; });
    try {
      if (photoBlob) { photoStatus.textContent = 'Saving your photo…'; const uploaded = await api('/api/photos/' + uploadId, 'POST', photoBlob); photoId = uploaded.photoId; photoBlob = null; photoStatus.textContent = 'Photo saved.'; }
      data.photoId = photoId;
      const { item } = await api(editing ? '/api/items/' + editing.id : '/api/items', editing ? 'PATCH' : 'POST', data);
      items = items.filter(previous => previous.id !== item.id).concat(item);
      render();
      dialog.close();
      notify(editing ? 'Memory updated.' : 'A little memory, kept for us.');
    } catch (error) { formError.textContent = error.message; if (error.message.includes('another device') || error.message.includes('already saved')) await refresh(); }
    finally { saving = false; form.removeAttribute('aria-busy'); controls.forEach(control => { control.disabled = false; }); }
  });
  board.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const item = items.find(item => item.id === button.closest('[data-id]').dataset.id);
    if (!item) return;
    if (button.dataset.action === 'edit') return openForm(item);
    button.disabled = true;
    try {
      await api('/api/items/' + item.id, 'DELETE');
      items = items.filter(previous => previous.id !== item.id);
      render();
      notify('Memory removed.', async () => {
        toastButton.disabled = true;
        try { const { item: restored } = await api('/api/items/' + item.id + '/restore', 'POST', {}); items.push(restored); render(); notify('Memory restored.'); }
        catch (error) { notify(error.message); }
        finally { toastButton.disabled = false; }
      });
    } catch (error) { boardError.textContent = error.message; button.disabled = false; }
  });
  document.querySelector('#logout').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try { await api('/auth/logout', 'POST', {}); location.assign('/'); }
    catch (error) { boardError.textContent = error.message; button.disabled = false; }
  });
  window.addEventListener('focus', () => { if (!dialog.open) refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !dialog.open) refresh(); });
  setInterval(() => { if (!document.hidden && !dialog.open) refresh(); }, 45000);
  render();
}
