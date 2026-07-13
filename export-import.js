// ── Export / Import Orchestrator ──────────────────
window._initExportImport = function () {
  'use strict';

  const SCHEMA_VERSION = 1;

  // ── Export ─────────────────────────────────────
  function buildExport() {
    return {
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      appName: 'my-lists',
      checklist: window._exportChecklist?.() ?? null,
      places:    window._exportPlaces?.()    ?? null,
      trip:      window._exportTrip?.()      ?? null
    };
  }

  // ── Import ─────────────────────────────────────
  async function applyImport(file) {
    let data;
    try {
      data = await readJSONFile(file);
    } catch (err) {
      showFeedback(`Import failed: ${err.message}`, true);
      return;
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      showFeedback('Import failed: file does not contain a valid export object.', true);
      return;
    }

    // Warn on version mismatch but don't block
    if (typeof data.version === 'number' && data.version !== SCHEMA_VERSION) {
      const ok = window.confirm(
        `This file was exported with schema version ${data.version}.\n` +
        `The current app uses version ${SCHEMA_VERSION}.\n\n` +
        `Try to import anyway?`
      );
      if (!ok) return;
    }

    const errors = [];
    const imported = [];

    if (data.checklist) {
      try {
        window._importChecklist(data.checklist);
        imported.push('Checklist');
      } catch (err) {
        errors.push(`Checklist: ${err.message}`);
      }
    }

    if (data.places) {
      try {
        window._importPlaces(data.places);
        imported.push('Places / Links');
      } catch (err) {
        errors.push(`Places/Links: ${err.message}`);
      }
    }

    // Trip can be null (intentional empty) or missing (not included)
    if (Object.prototype.hasOwnProperty.call(data, 'trip')) {
      try {
        window._importTrip(data.trip);
        if (data.trip) imported.push('Trip Planner');
      } catch (err) {
        errors.push(`Trip Planner: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      showFeedback(`Import completed with errors:\n${errors.join('\n')}`, true);
    } else if (imported.length === 0) {
      showFeedback('Nothing to import — the file contained no recognisable data.', true);
    } else {
      showFeedback(`Imported: ${imported.join(', ')}.`);
    }
  }

  // ── Feedback banner ────────────────────────────
  let feedbackTimer = null;
  function showFeedback(msg, isError = false) {
    const el = document.getElementById('export-import-feedback');
    if (!el) return;
    el.textContent = msg;
    el.className = 'export-import-feedback' + (isError ? ' export-import-feedback--error' : ' export-import-feedback--ok');
    el.removeAttribute('hidden');
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => {
      el.setAttribute('hidden', '');
    }, isError ? 6000 : 3500);
  }

  // ── Wire UI ────────────────────────────────────
  const exportBtn = document.getElementById('export-all-btn');
  const importBtn = document.getElementById('import-all-btn');
  const fileInput = document.getElementById('import-file-input');

  exportBtn.addEventListener('click', () => {
    const data = buildExport();
    const date = new Date().toISOString().slice(0, 10);
    downloadJSON(data, `my-lists-${date}.json`);
    showFeedback('Export downloaded.');
  });

  importBtn.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await applyImport(file);
    fileInput.value = '';
  });
};
