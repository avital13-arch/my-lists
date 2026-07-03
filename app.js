// ── Checklist Module ──────────────────────────────
window._initChecklist = function () {
  'use strict';
  let items = JSON.parse(localStorage.getItem('checklist-items') || '[]');

  function save() { localStorage.setItem('checklist-items', JSON.stringify(items)); }

  const listActive   = document.getElementById('list-active');
  const listChecked  = document.getElementById('list-checked');
  const countActive  = document.getElementById('count-active');
  const countChecked = document.getElementById('count-checked');
  const emptyActive  = document.getElementById('empty-active');
  const emptyChecked = document.getElementById('empty-checked');
  const input        = document.getElementById('new-item-input');
  const addBtn       = document.getElementById('add-btn');
  const clearBtn     = document.getElementById('clear-checked-btn');

  function render() {
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
  }

  function createRow(item) {
    const li = document.createElement('li');
    li.className = 'item-row';
    li.dataset.id = item.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.checked;
    checkbox.addEventListener('change', () => { item.checked = !item.checked; save(); render(); });

    const label = document.createElement('span');
    label.className = 'item-label';
    label.textContent = item.text;
    label.setAttribute('tabindex', '0');
    const onEdit = () => inlineEdit(label, item, () => { save(); render(); });
    label.addEventListener('dblclick', onEdit);
    label.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); onEdit(); } });

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    actions.appendChild(iconBtn('✏️', 'Edit',   'edit',   onEdit));
    actions.appendChild(iconBtn('🗑️', 'Delete', 'delete', () => {
      items = items.filter(i => i.id !== item.id); save(); render();
    }));

    li.append(checkbox, label, actions);
    return li;
  }

  function addItem() {
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    items.push({ id: crypto.randomUUID(), text, checked: false });
    save(); render();
    input.value = ''; input.focus();
  }

  addBtn.addEventListener('click', addItem);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });
  clearBtn.addEventListener('click', () => { items = items.filter(i => !i.checked); save(); render(); });

  render();
};
