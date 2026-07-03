// ── Shared utilities — loaded before all modules ────
'use strict';

function iconBtn(emoji, title, extraClass, onClick) {
  const btn = document.createElement('button');
  btn.className = `icon-btn ${extraClass}`.trim();
  btn.title = title;
  btn.setAttribute('aria-label', title);
  btn.textContent = emoji;
  btn.addEventListener('click', onClick);
  return btn;
}

function inlineEdit(labelEl, item, onCommit) {
  if (labelEl.contentEditable === 'true') return;
  const original = item.text;
  let cancelled = false;

  labelEl.contentEditable = 'true';
  labelEl.focus();

  // Move cursor to end
  const range = document.createRange();
  range.selectNodeContents(labelEl);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  labelEl.addEventListener('blur', () => {
    labelEl.contentEditable = 'false';
    if (cancelled) { labelEl.textContent = original; return; }
    const newText = labelEl.textContent.trim();
    if (newText) { item.text = newText; onCommit(); }
    else { labelEl.textContent = original; }
  }, { once: true });

  labelEl.addEventListener('keydown', function handler(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      labelEl.removeEventListener('keydown', handler);
      labelEl.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelled = true;
      labelEl.removeEventListener('keydown', handler);
      labelEl.blur();
    }
  });
}
