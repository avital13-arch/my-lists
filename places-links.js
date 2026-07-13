// ── Merged Places + Links Module ─────────────────
window._initPlaces = function () {
  'use strict';

  const STORAGE_KEY = 'checklist-places-merged';
  const LEGACY_PLACES_KEY = 'checklist-places';
  const LEGACY_LINKS_KEY = 'checklist-links';

  function normalizeItem(raw) {
    const name = String(raw?.name || '').trim();
    const value = String(raw?.value || '').trim();
    return {
      id: raw?.id || crypto.randomUUID(),
      name,
      value,
      done: !!raw?.done
    };
  }

  function migrateLegacyData() {
    const oldPlaces = JSON.parse(localStorage.getItem(LEGACY_PLACES_KEY) || '[]');
    const oldLinks = JSON.parse(localStorage.getItem(LEGACY_LINKS_KEY) || '[]');

    const fromPlaces = Array.isArray(oldPlaces)
      ? oldPlaces.map(p => normalizeItem({
          id: p?.id,
          name: p?.text,
          value: p?.text,
          done: !!p?.visited
        }))
      : [];

    const fromLinks = Array.isArray(oldLinks)
      ? oldLinks.map(l => normalizeItem({
          id: l?.id,
          name: l?.label,
          value: l?.url,
          done: !!l?.opened
        }))
      : [];

    const merged = [...fromPlaces, ...fromLinks].filter(i => i.name || i.value);
    const byKey = new Map();

    merged.forEach(item => {
      const key = `${item.name.toLowerCase()}|${item.value.toLowerCase()}`;
      if (!byKey.has(key)) {
        byKey.set(key, item);
        return;
      }
      const existing = byKey.get(key);
      existing.done = existing.done || item.done;
    });

    return Array.from(byKey.values());
  }

  function loadItems() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map(normalizeItem).filter(i => i.name || i.value);
    }

    const migrated = migrateLegacyData();
    if (migrated.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    if (Array.isArray(saved)) return [];
    return [];
  }

  let items = loadItems();
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

  const listActive = document.getElementById('list-places-active');
  const listDone = document.getElementById('list-places-visited');
  const countActive = document.getElementById('count-places-active');
  const countDone = document.getElementById('count-places-visited');
  const emptyActive = document.getElementById('empty-places-active');
  const emptyDone = document.getElementById('empty-places-visited');
  const nameInput = document.getElementById('places-input');
  const valueInput = document.getElementById('places-value-input');
  const addBtn = document.getElementById('places-add-btn');
  const clearBtn = document.getElementById('clear-places-btn');

  function openTarget(item) {
    const raw = (item.value || item.name || '').trim();
    if (!raw) return;

    if (/^https?:\/\//i.test(raw)) {
      window.open(raw, '_blank', 'noopener');
      return;
    }

    const query = encodeURIComponent(raw);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const mapUrl = isIOS
      ? `https://maps.apple.com/?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;

    window.open(mapUrl, '_blank', 'noopener');
  }

  function render() {
    const active = items.filter(i => !i.done);
    const done = items.filter(i => i.done);

    listActive.innerHTML = '';
    listDone.innerHTML = '';

    active.forEach(i => listActive.appendChild(createRow(i)));
    done.forEach(i => listDone.appendChild(createRow(i)));

    countActive.textContent = String(active.length);
    countDone.textContent = String(done.length);
    emptyActive.classList.toggle('visible', active.length === 0);
    emptyDone.classList.toggle('visible', done.length === 0);
    clearBtn.disabled = done.length === 0;
  }

  function startEdit(li, item) {
    li.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'link-edit-inputs';

    const nameIn = document.createElement('input');
    nameIn.type = 'text';
    nameIn.value = item.name;
    nameIn.className = 'edit-input';
    nameIn.placeholder = 'Name';

    const valueIn = document.createElement('input');
    valueIn.type = 'text';
    valueIn.value = item.value;
    valueIn.className = 'edit-input';
    valueIn.placeholder = 'Address or URL';

    wrapper.append(nameIn, valueIn);

    function commit() {
      const nextName = nameIn.value.trim();
      const nextValue = valueIn.value.trim();
      if (!nextName && !nextValue) {
        render();
        return;
      }
      item.name = nextName || nextValue;
      item.value = nextValue || nextName;
      save();
      render();
    }

    const saveBtn = iconBtn('✓', 'Save', '', commit);
    const cancelBtn = iconBtn('✕', 'Cancel', 'delete', render);

    [nameIn, valueIn].forEach(inp => inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') render();
    }));

    li.append(wrapper, saveBtn, cancelBtn);
    nameIn.focus();
  }

  function createRow(item) {
    const li = document.createElement('li');
    li.className = 'item-row';
    li.dataset.id = item.id;

    const openBtn = document.createElement('button');
    openBtn.className = 'icon-btn open-link';
    openBtn.title = 'Open';
    openBtn.setAttribute('aria-label', 'Open address or link');
    openBtn.textContent = '🔗';
    openBtn.addEventListener('click', () => openTarget(item));

    const meta = document.createElement('div');
    meta.className = 'link-meta';

    const nameEl = document.createElement('span');
    nameEl.className = 'link-label-text place-map-link';
    nameEl.textContent = item.name || item.value;
    nameEl.setAttribute('tabindex', '0');
    nameEl.setAttribute('role', 'link');
    nameEl.setAttribute('title', 'Open');
    nameEl.addEventListener('click', () => openTarget(item));
    nameEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openTarget(item);
      }
    });

    const valueEl = document.createElement('span');
    valueEl.className = 'link-url-text';
    valueEl.textContent = item.value || item.name;

    meta.append(nameEl, valueEl);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.done;
    checkbox.addEventListener('change', () => {
      item.done = !item.done;
      save();
      render();
    });

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    actions.appendChild(iconBtn('✏️', 'Edit', 'edit', () => startEdit(li, item)));
    actions.appendChild(iconBtn('🗑️', 'Delete', 'delete', () => {
      items = items.filter(i => i.id !== item.id);
      save();
      render();
    }));

    li.append(openBtn, meta, checkbox, actions);
    return li;
  }

  function addItem() {
    const name = (nameInput.value || '').trim();
    const value = (valueInput.value || '').trim();

    if (!name && !value) {
      nameInput.focus();
      return;
    }

    const finalName = name || value;
    const finalValue = value || name;

    items.push({
      id: crypto.randomUUID(),
      name: finalName,
      value: finalValue,
      done: false
    });

    save();
    render();
    nameInput.value = '';
    valueInput.value = '';
    nameInput.focus();
  }

  addBtn.addEventListener('click', addItem);
  valueInput.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });
  clearBtn.addEventListener('click', () => {
    items = items.filter(i => !i.done);
    save();
    render();
  });

  render();

  // ── Export / Import hooks ──────────────────────
  window._exportPlaces = function () {
    const snapshot = JSON.parse(JSON.stringify(items));
    // Legacy split for backward compatibility
    const legacyPlaces = snapshot
      .filter(i => !i.value || i.value === i.name || !/^https?:\/\//i.test(i.value))
      .map(i => ({ id: i.id, text: i.name, visited: i.done }));
    const legacyLinks = snapshot
      .filter(i => i.value && i.value !== i.name && /^https?:\/\//i.test(i.value))
      .map(i => ({ id: i.id, label: i.name, url: i.value, opened: i.done }));
    return {
      merged: snapshot,
      legacy: { places: legacyPlaces, links: legacyLinks }
    };
  };

  window._importPlaces = function (data) {
    if (!data || typeof data !== 'object') return;

    let incoming = [];
    if (Array.isArray(data.merged)) {
      incoming = data.merged.map(normalizeItem).filter(i => i.name || i.value);
    } else if (data.legacy) {
      const fromPlaces = Array.isArray(data.legacy.places)
        ? data.legacy.places.map(p => normalizeItem({ id: p.id, name: p.text, value: p.text, done: !!p.visited }))
        : [];
      const fromLinks = Array.isArray(data.legacy.links)
        ? data.legacy.links.map(l => normalizeItem({ id: l.id, name: l.label, value: l.url, done: !!l.opened }))
        : [];
      incoming = [...fromPlaces, ...fromLinks].filter(i => i.name || i.value);
    }

    const existingKeys = new Set(
      items.map(i => `${i.name.toLowerCase()}|${i.value.toLowerCase()}`)
    );
    incoming.forEach(item => {
      const key = `${item.name.toLowerCase()}|${item.value.toLowerCase()}`;
      if (existingKeys.has(key)) {
        const existing = items.find(
          i => `${i.name.toLowerCase()}|${i.value.toLowerCase()}` === key
        );
        if (existing) existing.done = existing.done || item.done;
      } else {
        existingKeys.add(key);
        items.push({ ...item, id: crypto.randomUUID() });
      }
    });

    save();
    render();
  };
};

// Backward compatibility for older bootstraps.
window._initLinks = function () {};
