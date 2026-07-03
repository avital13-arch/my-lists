// ── Places Module ─────────────────────────────────
window._initPlaces = function () {
  'use strict';
  let places = JSON.parse(localStorage.getItem('checklist-places') || '[]');
  function save() { localStorage.setItem('checklist-places', JSON.stringify(places)); }

  const listActive   = document.getElementById('list-places-active');
  const listVisited  = document.getElementById('list-places-visited');
  const countActive  = document.getElementById('count-places-active');
  const countVisited = document.getElementById('count-places-visited');
  const emptyActive  = document.getElementById('empty-places-active');
  const emptyVisited = document.getElementById('empty-places-visited');
  const input        = document.getElementById('places-input');
  const addBtn       = document.getElementById('places-add-btn');
  const clearBtn     = document.getElementById('clear-places-btn');

  function render() {
    const active  = places.filter(p => !p.visited);
    const visited = places.filter(p =>  p.visited);
    listActive.innerHTML  = '';
    listVisited.innerHTML = '';
    active.forEach(p  => listActive.appendChild(createRow(p)));
    visited.forEach(p => listVisited.appendChild(createRow(p)));
    countActive.textContent  = active.length;
    countVisited.textContent = visited.length;
    emptyActive.classList.toggle('visible',  active.length  === 0);
    emptyVisited.classList.toggle('visible', visited.length === 0);
    clearBtn.disabled = visited.length === 0;
  }

  function createRow(place) {
    const li = document.createElement('li');
    li.className = 'item-row';
    li.dataset.id = place.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = place.visited;
    checkbox.addEventListener('change', () => { place.visited = !place.visited; save(); render(); });

    const label = document.createElement('span');
    label.className = 'item-label';
    label.textContent = place.text;
    label.setAttribute('tabindex', '0');
    const onEdit = () => inlineEdit(label, place, () => { save(); render(); });
    label.addEventListener('dblclick', onEdit);
    label.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); onEdit(); } });

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    actions.appendChild(iconBtn('✏️', 'Edit',   'edit',   onEdit));
    actions.appendChild(iconBtn('🗑️', 'Delete', 'delete', () => {
      places = places.filter(p => p.id !== place.id); save(); render();
    }));

    li.append(checkbox, label, actions);
    return li;
  }

  function addPlace() {
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    places.push({ id: crypto.randomUUID(), text, visited: false });
    save(); render();
    input.value = ''; input.focus();
  }

  addBtn.addEventListener('click', addPlace);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addPlace(); });
  clearBtn.addEventListener('click', () => { places = places.filter(p => !p.visited); save(); render(); });

  render();
};


// ── Links Module ──────────────────────────────────
window._initLinks = function () {
  'use strict';
  let links = JSON.parse(localStorage.getItem('checklist-links') || '[]');
  function save() { localStorage.setItem('checklist-links', JSON.stringify(links)); }

  const listActive  = document.getElementById('list-links-active');
  const listOpened  = document.getElementById('list-links-opened');
  const countActive = document.getElementById('count-links-active');
  const countOpened = document.getElementById('count-links-opened');
  const emptyActive = document.getElementById('empty-links-active');
  const emptyOpened = document.getElementById('empty-links-opened');
  const labelInput  = document.getElementById('link-label-input');
  const urlInput    = document.getElementById('link-url-input');
  const addBtn      = document.getElementById('link-add-btn');
  const clearBtn    = document.getElementById('clear-links-btn');

  function render() {
    const active = links.filter(l => !l.opened);
    const opened = links.filter(l =>  l.opened);
    listActive.innerHTML = '';
    listOpened.innerHTML = '';
    active.forEach(l => listActive.appendChild(createRow(l)));
    opened.forEach(l => listOpened.appendChild(createRow(l)));
    countActive.textContent = active.length;
    countOpened.textContent = opened.length;
    emptyActive.classList.toggle('visible', active.length === 0);
    emptyOpened.classList.toggle('visible', opened.length === 0);
    clearBtn.disabled = opened.length === 0;
  }

  function createRow(link) {
    const li = document.createElement('li');
    li.className = 'item-row';
    li.dataset.id = link.id;

    const openBtn = document.createElement('button');
    openBtn.className = 'icon-btn open-link';
    openBtn.title = 'Open';
    openBtn.setAttribute('aria-label', 'Open link');
    openBtn.textContent = '🔗';
    openBtn.addEventListener('click', () => openUrl(link.url));

    const meta = document.createElement('div');
    meta.className = 'link-meta';
    const labelEl = document.createElement('span');
    labelEl.className = 'link-label-text';
    labelEl.textContent = link.label;
    const urlEl = document.createElement('span');
    urlEl.className = 'link-url-text';
    urlEl.textContent = link.url;
    meta.append(labelEl, urlEl);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = link.opened;
    checkbox.addEventListener('change', () => { link.opened = !link.opened; save(); render(); });

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    actions.appendChild(iconBtn('✏️', 'Edit',   'edit',   () => startLinkEdit(li, link)));
    actions.appendChild(iconBtn('🗑️', 'Delete', 'delete', () => {
      links = links.filter(l => l.id !== link.id); save(); render();
    }));

    li.append(openBtn, meta, checkbox, actions);
    return li;
  }

  function startLinkEdit(li, link) {
    li.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'link-edit-inputs';

    const lIn = document.createElement('input');
    lIn.type = 'text'; lIn.value = link.label;
    lIn.className = 'edit-input'; lIn.placeholder = 'Label';

    const uIn = document.createElement('input');
    uIn.type = 'text'; uIn.value = link.url;
    uIn.className = 'edit-input'; uIn.placeholder = 'URL or address';

    wrapper.append(lIn, uIn);

    function commit() {
      const newLabel = lIn.value.trim();
      const newUrl   = uIn.value.trim();
      if (newLabel && newUrl) { link.label = newLabel; link.url = newUrl; save(); }
      render();
    }

    const saveBtn   = iconBtn('✓', 'Save',   '',       commit);
    const cancelBtn = iconBtn('✕', 'Cancel', 'delete', render);

    [lIn, uIn].forEach(inp => inp.addEventListener('keydown', e => {
      if (e.key === 'Enter')  commit();
      if (e.key === 'Escape') render();
    }));

    li.append(wrapper, saveBtn, cancelBtn);
    lIn.focus();
  }

  function openUrl(url) {
    const finalUrl = /^https?:\/\//i.test(url)
      ? url
      : `https://maps.google.com/?q=${encodeURIComponent(url)}`;
    window.open(finalUrl, '_blank', 'noopener');
  }

  function addLink() {
    const label = labelInput.value.trim();
    const url   = urlInput.value.trim();
    if (!label) { labelInput.focus(); return; }
    if (!url)   { urlInput.focus();   return; }
    links.push({ id: crypto.randomUUID(), label, url, opened: false });
    save(); render();
    labelInput.value = ''; urlInput.value = '';
    labelInput.focus();
  }

  addBtn.addEventListener('click', addLink);
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });
  clearBtn.addEventListener('click', () => { links = links.filter(l => !l.opened); save(); render(); });

  render();
};
