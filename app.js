// ── Checklist Module ──────────────────────────────
window._initChecklist = function () {
  'use strict';
  const STORAGE_KEY = 'checklist-persons';
  const LEGACY_KEY = 'checklist-items';
  const CURRENT_PERSON_KEY = 'checklist-current-person';

  function normalizeItem(raw) {
    return {
      id: raw?.id || crypto.randomUUID(),
      text: String(raw?.text || '').trim(),
      checked: !!raw?.checked
    };
  }

  function migrateLegacyItems() {
    const oldItems = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    if (!Array.isArray(oldItems) || oldItems.length === 0) return null;
    const migrated = oldItems.map(normalizeItem).filter(i => i.text);
    return { Me: migrated };
  }

  function loadPersons() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      const out = {};
      for (const [name, list] of Object.entries(saved)) {
        if (!name.trim()) continue;
        const items = Array.isArray(list) ? list.map(normalizeItem).filter(i => i.text) : [];
        out[name] = items;
      }
      if (Object.keys(out).length > 0) return out;
    }
    const migrated = migrateLegacyItems();
    if (migrated) return migrated;
    return { Me: [] };
  }

  let persons = loadPersons();
  let currentPerson = localStorage.getItem(CURRENT_PERSON_KEY) || Object.keys(persons)[0] || 'Me';
  if (!persons[currentPerson]) {
    currentPerson = Object.keys(persons)[0] || 'Me';
    if (!persons[currentPerson]) persons[currentPerson] = [];
  }

  function saveAll() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persons));
    localStorage.setItem(CURRENT_PERSON_KEY, currentPerson);
  }

  function currentItems() {
    if (!persons[currentPerson]) persons[currentPerson] = [];
    return persons[currentPerson];
  }

  const listActive   = document.getElementById('list-active');
  const listChecked  = document.getElementById('list-checked');
  const countActive  = document.getElementById('count-active');
  const countChecked = document.getElementById('count-checked');
  const emptyActive  = document.getElementById('empty-active');
  const emptyChecked = document.getElementById('empty-checked');
  const input        = document.getElementById('new-item-input');
  const addBtn       = document.getElementById('add-btn');
  const clearBtn     = document.getElementById('clear-checked-btn');
  const personSelect = document.getElementById('checklist-person-select');
  const personNameInput = document.getElementById('checklist-person-name-input');
  const clearPersonNameBtn = document.getElementById('checklist-person-clear-name-btn');
  const addPersonBtn = document.getElementById('checklist-person-add-btn');
  const delPersonBtn = document.getElementById('checklist-person-delete-btn');
  const personFeedback = document.getElementById('checklist-person-feedback');

  function findPersonName(name) {
    const normalized = String(name || '').trim().toLowerCase();
    if (!normalized) return null;
    return Object.keys(persons).find(n => n.toLowerCase() === normalized) || null;
  }

  function setPersonFeedback(msg, isError = false) {
    personFeedback.textContent = msg || '';
    personFeedback.classList.toggle('error', !!isError && !!msg);
  }

  function refreshAddPersonState() {
    const hasValue = !!(personNameInput.value || '').trim();
    addPersonBtn.disabled = !hasValue;
  }

  function renderPersonOptions() {
    personSelect.innerHTML = '';
    Object.keys(persons).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      personSelect.appendChild(option);
    });
    personSelect.value = currentPerson;
    delPersonBtn.disabled = Object.keys(persons).length <= 1;
  }

  function render() {
    const items = currentItems();
    const active  = items.filter(i => !i.checked);
    const checked = items.filter(i =>  i.checked);
    listActive.innerHTML  = '';
    listChecked.innerHTML = '';
    active.forEach(item  => listActive.appendChild(createRow(item)));
    checked.forEach(item => listChecked.appendChild(createRow(item)));
    countActive.textContent  = active.length;
    countChecked.textContent = checked.length;
    emptyActive.classList.toggle('visible',  active.length  === 0);
    emptyChecked.classList.toggle('visible', checked.length === 0);
    clearBtn.disabled = checked.length === 0;
    renderPersonOptions();
  }

  function createRow(item) {
    const li = document.createElement('li');
    li.className = 'item-row';
    li.dataset.id = item.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.checked;
    checkbox.addEventListener('change', () => { item.checked = !item.checked; saveAll(); render(); });

    const label = document.createElement('span');
    label.className = 'item-label';
    label.textContent = item.text;
    label.setAttribute('tabindex', '0');
    const onEdit = () => inlineEdit(label, item, () => { saveAll(); render(); });
    label.addEventListener('dblclick', onEdit);
    label.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); onEdit(); } });

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    actions.appendChild(iconBtn('✏️', 'Edit',   'edit',   onEdit));
    actions.appendChild(iconBtn('🗑️', 'Delete', 'delete', () => {
      persons[currentPerson] = currentItems().filter(i => i.id !== item.id);
      saveAll();
      render();
    }));

    li.append(checkbox, label, actions);
    return li;
  }

  function addItem() {
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    currentItems().push({ id: crypto.randomUUID(), text, checked: false });
    saveAll();
    render();
    input.value = ''; input.focus();
  }

  addBtn.addEventListener('click', addItem);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });
  clearBtn.addEventListener('click', () => {
    persons[currentPerson] = currentItems().filter(i => !i.checked);
    saveAll();
    render();
  });

  personSelect.addEventListener('change', () => {
    const selected = personSelect.value;
    if (!selected || !persons[selected]) return;
    currentPerson = selected;
    saveAll();
    render();
    input.focus();
  });

  function addPersonFromInput() {
    const name = (personNameInput.value || '').trim();
    if (!name) {
      setPersonFeedback('Enter a name first.', true);
      refreshAddPersonState();
      return;
    }

    const existingName = findPersonName(name);
    if (existingName) {
      currentPerson = existingName;
      saveAll();
      render();
      personNameInput.value = '';
      personNameInput.focus();
      setPersonFeedback(`${existingName} already exists. Switched to that list.`);
      refreshAddPersonState();
      return;
    }

    persons[name] = [];
    currentPerson = name;
    saveAll();
    render();
    personNameInput.value = '';
    personNameInput.focus();
    setPersonFeedback(`Created checklist for ${name}.`);
    refreshAddPersonState();
  }

  addPersonBtn.addEventListener('click', () => {
    addPersonFromInput();
    input.focus();
  });

  personNameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPersonFromInput();
      input.focus();
    }
  });

  personNameInput.addEventListener('input', () => {
    if (personFeedback.textContent) setPersonFeedback('');
    refreshAddPersonState();
  });

  clearPersonNameBtn.addEventListener('click', () => {
    personNameInput.value = '';
    setPersonFeedback('');
    refreshAddPersonState();
    personNameInput.focus();
  });

  delPersonBtn.addEventListener('click', () => {
    const names = Object.keys(persons);
    if (names.length <= 1) return;
    const target = currentPerson;
    const ok = window.confirm(`Delete checklist for ${target}? This cannot be undone.`);
    if (!ok) return;
    delete persons[target];
    currentPerson = Object.keys(persons)[0] || 'Me';
    if (!persons[currentPerson]) persons[currentPerson] = [];
    saveAll();
    render();
  });

  saveAll();
  refreshAddPersonState();
  render();
};
